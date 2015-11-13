/// <reference path="Scripts/promise.d.ts" />

module Stormancer {

    /**
    ConnectionHandler
    */
    export class ConnectionHandler implements IConnectionManager {
        private _current = 0;

        /**
        Generates an unique connection id for this node.
        */
        public generateNewConnectionId(): number {
            return this._current++;
        }

        public connectionCount: number = null;

        /**
        Adds a connection to the manager
        */
        public newConnection(connection: IConnection): void { }

        /**
        Returns a connection by id
        */
        public getConnection(id: number): IConnection {
            throw new Error("Not implemented.");
        }

        /**
        Closes the target connection
        */
        public closeConnection(connection: IConnection, reason: string): void { }
    }

    export class Client implements IClient {

        private _apiClient: ApiClient;
        private _accountId: string;
        private _applicationName: string;

        private _transport: ITransport;
        private _dispatcher: IPacketDispatcher;

        private _initialized: boolean;

        private _tokenHandler: ITokenHandler = new TokenHandler();

        private _requestProcessor: RequestProcessor;
        private _scenesDispatcher: SceneDispatcher;

        private _serializers: IMap<ISerializer> = { "msgpack/map": new MsgPackSerializer() };

        private _cts: Cancellation.TokenSource;

        private _metadata: Map = {};

        private _pluginCtx: PluginBuildContext = new PluginBuildContext();
        
        /**
        The name of the Stormancer server application the client is connected to.
        @member Stormancer.Client#applicationName
        @type {string}
        */
        public applicationName: string = null;
        
        /**
        An user specified logger.
        @member Stormancer.Client#logger
        @type {object}
        */
        public logger: ILogger = null;
        
        /**
        The client's unique stormancer ID. Returns null if the ID has not been acquired yet (connection still in progress).
        @member Stormancer.Client#id
        @type {string}
        */
        public id: number = null;

        public serverTransportType: string = null;

        /**
        Creates a client. You need to construct a configuration before using this method.
        @class Client
        @classdesc A Stormancer client for connecting to Stormancer server applications.
        @memberof Stormancer
        @param {Stormancer.Configuration} config The configuration object for constructing the Client.
        */
        constructor(config: Configuration) {
            this._accountId = config.account;
            this._applicationName = config.application;
            this._apiClient = new ApiClient(config, this._tokenHandler);
            this._transport = config.transport;
            this._dispatcher = config.dispatcher;
            this._requestProcessor = new RequestProcessor(this.logger, []);

            this._scenesDispatcher = new SceneDispatcher();
            this._dispatcher.addProcessor(this._requestProcessor);
            this._dispatcher.addProcessor(this._scenesDispatcher);
            this._metadata = config.metadata;

            for (var i = 0; i < config.serializers.length; i++) {
                var serializer = config.serializers[i];
                this._serializers[serializer.name] = serializer;
            }

            this._metadata["serializers"] = Helpers.mapKeys(this._serializers).join(',');
            this._metadata["transport"] = this._transport.name;
            this._metadata["version"] = "1.0.0a";
            this._metadata["platform"] = "JS";
            this._metadata["protocol"] = "2";

            for (var i = 0; i < config.plugins.length; i++) {
                config.plugins[i].build(this._pluginCtx);
            }

            for (var i = 0; i < this._pluginCtx.clientCreated.length; i++) {
                this._pluginCtx.clientCreated[i](this);
            }

            this.initialize();
        }

        private initialize(): void {
            if (!this._initialized) {
                this._initialized = true;
                this._transport.packetReceived.push(packet => this.transportPacketReceived(packet));
                this._watch.start();
            }
        }

        private transportPacketReceived(packet: Packet<IConnection>): void {
            for (var i = 0; i < this._pluginCtx.packetReceived.length; i++) {
                this._pluginCtx.packetReceived[i](packet);
            }
            this._dispatcher.dispatchPacket(packet);
        }
        
        /**
        Retrieve a public scene object from its ID.
        @method Stormancer.Client#getPublicScene
        @param {string} sceneId The scene ID
        @param {object} userData User data to send
        @return {Promise} Promise which complete when the scene is ready to connect.
        */
        public getPublicScene(sceneId: string, userData: any): Promise<IScene> {
            return this._apiClient.getSceneEndpoint(this._accountId, this._applicationName, sceneId, userData)
                .then<IScene>(ci => this.getSceneImpl(sceneId, ci));
        }
        
        /**
        Retrieve a scene object from its ID.
        @method Stormancer.Client#getScene
        @param {string} token Scene token
        @return {Promise} Promise which complete when the scene is ready to connect.
        */
        public getScene(token: string): Promise<IScene> {
            var ci = this._tokenHandler.decodeToken(token);
            return this.getSceneImpl(ci.tokenData.SceneId, ci);
        }

        private getSceneImpl(sceneId: string, ci: SceneEndpoint): Promise<IScene> {
            var self = this;
            return this.ensureTransportStarted(ci).then(() => {
                if (ci.tokenData.Version > 0) {
                    this.startAsyncClock();
                }
                var parameter: SceneInfosRequestDto = { Metadata: self._serverConnection.metadata, Token: ci.token };
                return self.sendSystemRequest<SceneInfosRequestDto, SceneInfosDto>(SystemRequestIDTypes.ID_GET_SCENE_INFOS, parameter);
            }).then((result: SceneInfosDto) => {
                if (!self._serverConnection.serializerChosen) {
                    if (!result.SelectedSerializer) {
                        throw new Error("No serializer selected.");
                    }
                    self._serverConnection.serializer = self._serializers[result.SelectedSerializer];
                    self._serverConnection.metadata["serializer"] = result.SelectedSerializer;
                    self._serverConnection.serializerChosen = true;
                }
                return self.updateMetadata().then(_=> result);
            }).then((r: SceneInfosDto) => {
                var scene = new Scene(self._serverConnection, self, sceneId, ci.token, r);

                for (var i = 0; i < this._pluginCtx.sceneCreated.length; i++) {
                    this._pluginCtx.sceneCreated[i](scene);
                }
                return scene;
            });
        }

        private updateMetadata(): Promise<Packet<IConnection>> {
            return this._requestProcessor.sendSystemRequest(this._serverConnection, SystemRequestIDTypes.ID_SET_METADATA, this._systemSerializer.serialize(this._serverConnection.metadata));
        }

        private sendSystemRequest<T, U>(id: number, parameter: T): Promise<U> {
            return this._requestProcessor.sendSystemRequest(this._serverConnection, id, this._systemSerializer.serialize(parameter))
                .then(packet => this._systemSerializer.deserialize<U>(packet.data));
        }

        private _systemSerializer: ISerializer = new MsgPackSerializer();

        private ensureTransportStarted(ci: SceneEndpoint): Promise<void> {
            var self = this;
            return Helpers.promiseIf(self._serverConnection == null, () => {
                return Helpers.promiseIf(!self._transport.isRunning, self.startTransport, self)
                    .then(() => {
                        return self._transport.connect(ci.tokenData.Endpoints[self._transport.name])
                            .then(c => {
                                self.registerConnection(c);
                                return self.updateMetadata();
                            });
                    });
            }, self);
        }

        private startTransport(): Promise<void> {
            this._cts = new Cancellation.TokenSource();
            return this._transport.start("client", new ConnectionHandler(), this._cts.token);
        }

        private registerConnection(connection: IConnection) {
            this._serverConnection = connection;
            for (var key in this._metadata) {
                this._serverConnection.metadata[key] = this._metadata[key];
            }
        }

        private _serverConnection: IConnection;

        public disconnectScene(scene: IScene, sceneHandle: number): Promise<void> {
            return this.sendSystemRequest(SystemRequestIDTypes.ID_DISCONNECT_FROM_SCENE, sceneHandle)
                .then(() => {
                    this._scenesDispatcher.removeScene(sceneHandle);
                    for (var i = 0; i < this._pluginCtx.sceneConnected.length; i++) {
                        this._pluginCtx.sceneConnected[i](scene);
                    }
                });
        }
        
        /**
        Disconnects the client.
        @method Stormancer.Client#disconnect
        */
        public disconnect(): void {
            if (this._serverConnection) {
                this._serverConnection.close();
            }
        }

        public connectToScene(scene: Scene, token: string, localRoutes: Route[]): Promise<void> {
            var parameter: ConnectToSceneMsg = {
                Token: token,
                Routes: [],
                ConnectionMetadata: this._serverConnection.metadata
            };

            for (var i = 0; i < localRoutes.length; i++) {
                var r = localRoutes[i];
                parameter.Routes.push({
                    Handle: r.handle,
                    Metadata: r.metadata,
                    Name: r.name
                });
            }

            return this.sendSystemRequest<ConnectToSceneMsg, ConnectionResult>(SystemRequestIDTypes.ID_CONNECT_TO_SCENE, parameter)
                .then(result => {
                    scene.completeConnectionInitialization(result);
                    this._scenesDispatcher.addScene(scene);
                    for (var i = 0; i < this._pluginCtx.sceneConnected.length; i++) {
                        this._pluginCtx.sceneConnected[i](scene);
                    }
                });
        }

        /**
        The server connection's ping in milliseconds.
        @member Stormancer.Client#serverPing
        @type {number}
        */
        public lastPing(): number {
            return this._lastPing;
        }

        private _lastPing: number = null;
        private _clockValues = [];
        private _offset = 0;
        private _medianLatency = 0;
        private _standardDeviationLatency = 0;
        private _pingInterval = 5000;
        private _pingIntervalAtStart = 200;
        private _maxClockValues = 24;
        private _watch: Watch = new Watch();
        private _syncclockstarted = false;
        private startAsyncClock(): void {
            this._syncclockstarted = true;
            this.syncClockImpl();
        }
        private stopAsyncClock(): void {
            this._syncclockstarted = false;
        }
        private syncClockImpl(): void {
            try {
                var timeStart = this._watch.getElapsedTime();
                var data = new Uint32Array(2);
                data[0] = timeStart;
                data[1] = (timeStart >> 32);
                this._requestProcessor.sendSystemRequest(this._serverConnection, SystemRequestIDTypes.ID_PING, new Uint8Array(data.buffer), PacketPriority.IMMEDIATE_PRIORITY).then(packet => {
                    var timeEnd = this._watch.getElapsedTime();
                    
                    // get server clock
                    var dataView = packet.getDataView();
                    var timeServer = dataView.getUint32(0, true) + (dataView.getUint32(4, true) << 32);

                    // compute ping
                    var ping = timeEnd - timeStart;
                    this._lastPing = ping;
                    var latency = ping / 2;

                    // compute offest
                    var offset = timeServer - timeEnd + latency;

                    // add
                    this._clockValues.push({
                        latency: latency,
                        offset: offset
                    });
                    if (this._clockValues.length > this._maxClockValues) {
                        this._clockValues.shift();
                    }
                    var len = this._clockValues.length;
                    
                    // Compute the standard deviation
                    var latencies = this._clockValues.map((v) => { return v.latency; }).sort();
                    this._medianLatency = latencies[Math.floor(len / 2)];
                    var pingAvg = 0;
                    for (var i = 0; i < len; i++) {
                        pingAvg += latencies[i];
                    }
                    pingAvg /= len;
                    var varianceLatency = 0;
                    for (var i = 0; i < len; i++) {
                        var tmp = latencies[i] - pingAvg;
                        varianceLatency += (tmp * tmp);
                    }
                    varianceLatency /= len;
                    this._standardDeviationLatency = Math.sqrt(varianceLatency);

                    // Compute the average offset by discarding the 'abnormal' pings
                    var offsetAvg = 0;
                    var lenOffsets = 0;
                    var latencyMax = this._medianLatency + this._standardDeviationLatency;
                    for (var i = 0; i < len; i++) {
                        var v = this._clockValues[i];
                        if (v.latency < latencyMax) {
                            offsetAvg += v.offset;
                            lenOffsets++;
                        }
                    }
                    this._offset = offsetAvg / lenOffsets;

                    // restart the next syncclock check
                    if (this._syncclockstarted) {
                        var delay = (this._clockValues.length < this._maxClockValues ? this._pingIntervalAtStart : this._pingInterval);
                        setTimeout(this.syncClockImpl.bind(this), delay);
                    }
                }, e => {
                    throw "ping: Failed to ping server. (" + e + ")";
                });
            }
            catch (e) {
                throw "ping: Failed to ping server. (" + e + ")";
            }
        }
        
        /**
        Get the server clock. Represented by the count of milliseconds since the cluster started.
        @method Stormancer.Client#clock
        @return {number} The number of milliseconds since the application started.
        */
        public clock(): number {
            if (this._offset) {
                return Math.floor(this._watch.getElapsedTime()) + this._offset;
            }
            return 0;
        }
    }

    class Watch {
        constructor() {
            this._baseTime = this.now();
        }
        private _baseTime: number = 0;
        public start(): void {
            this._baseTime = this.now();
        }
        private now(): number {
            return (typeof (window) !== "undefined" && window.performance && window.performance.now && window.performance.now()) || Date.now();
        }
        public getElapsedTime(): number {
            return this.now() - this._baseTime;
        }
    }
}
