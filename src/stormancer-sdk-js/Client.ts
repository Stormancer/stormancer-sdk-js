/// <reference path="Scripts/promise.d.ts" />

module Stormancer {
    export class ConnectionHandler implements IConnectionManager {
        private _current = 0;

        // Generates an unique connection id for this node.
        public generateNewConnectionId(): number {
            return this._current++;
        }

        // Adds a connection to the manager
        public newConnection(connection: IConnection): void { }

        // Returns a connection by id.
        public getConnection(id: number): IConnection {
            throw new Error("Not implemented.");
        }

        // Closes the target connection.
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

        private _cts: Cancellation.tokenSource;

        private _metadata: Map;

        private _pluginCtx: PluginBuildContext = new PluginBuildContext();

        public applicationName: string;

        public _logger: ILogger;

        public id: number;

        public serverTransportType: string;

        constructor(config: Configuration) {
            this._accountId = config.account;
            this._applicationName = config.application;
            this._apiClient = new ApiClient(config, this._tokenHandler);
            this._transport = config.transport;
            this._dispatcher = config.dispatcher;
            this._requestProcessor = new RequestProcessor(this._logger, []);

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
            }
        }

        private transportPacketReceived(packet: Packet<IConnection>): void {
            for (var i = 0; i < this._pluginCtx.packetReceived.length; i++) {
                this._pluginCtx.packetReceived[i](packet);
            }
            this._dispatcher.dispatchPacket(packet);
        }

        public getPublicScene(sceneId: string, userData: any): Promise<IScene> {
            return this._apiClient.getSceneEndpoint(this._accountId, this._applicationName, sceneId, userData)
                .then<IScene>(ci => this.getSceneImpl(sceneId, ci));
        }

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
            this._cts = new Cancellation.tokenSource();
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
                    Handle: r.index,
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

        public lastPing: number;
        private _offset: number;
        private _pingInterval = 5000;
        private syncClockIntervalId: number;
        private getCurrentTimestamp(): number {
            return (window.performance && window.performance.now && window.performance.now()) || Date.now();
        }
        private startAsyncClock(): void {
            if (!this.syncClockIntervalId) {
                this.syncClockIntervalId = setInterval(this.syncClockImpl.bind(this), this._pingInterval);
            }
        }
        private stopAsyncClock(): void {
            clearInterval(this.syncClockIntervalId);
            this.syncClockIntervalId = null;
        }
        private syncClockImpl(): void {
            try {
                var timeStart = Math.floor(this.getCurrentTimestamp());
                var data = new Uint32Array(2);
                data[0] = timeStart;
                data[1] = Math.floor(timeStart / Math.pow(2, 32));
                this._requestProcessor.sendSystemRequest(this._serverConnection, SystemRequestIDTypes.ID_PING, new Uint8Array(data.buffer), PacketPriority.IMMEDIATE_PRIORITY).then(packet => {
                    var timeEnd = this.getCurrentTimestamp();
                    var data = new Uint8Array(packet.data.buffer, packet.data.byteOffset, 8);
                    var timeRef = 0;
                    for (var i = 0; i < 8; i++) {
                        timeRef += (data[i] * Math.pow(2, (i * 8)));
                    }
                    this.lastPing = timeEnd - timeStart;
                    this._offset = timeRef - (this.lastPing / 2) - timeStart;
                }).catch(e => console.error("ping: Failed to ping server.", e));
            }
            catch (e) {
                console.error("ping: Failed to ping server.", e);
            }
        }
        public clock(): number {
            return Math.floor(this.getCurrentTimestamp()) + this._offset;
        }
    }
}
