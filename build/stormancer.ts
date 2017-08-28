///<reference path="msgpack5.no-module.d.ts"/>

namespace Stormancer
{
export  class ApiClient {

    constructor(config: Configuration, tokenHandler: ITokenHandler) {
        this._config = config;
        this._tokenHandler = tokenHandler;
    }

    private _config: Configuration;

    private createTokenUri = "{0}/{1}/scenes/{2}/token";

    private _tokenHandler: ITokenHandler;

    public getSceneEndpoint(accountId: string, applicationName: string, sceneId: string, userData: any): Promise<SceneEndpoint> {
        var url = this._config.getApiEndpoint() + Helpers.stringFormat(this.createTokenUri, accountId, applicationName, sceneId);

        var promise = $http(url).post<string>({}, {
            type: "POST",
            url: url,
            headers: {
                "Accept": "application/json",
                "x-version": "1.0.0"
            },
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify(userData)
        }).then(result => this._tokenHandler.decodeToken(JSON.parse(result)))
        promise.catch(error => console.error("get token error:" + error));
        return promise;
    }
}

export  module Cancellation {

    /**
    TokenSource
    */
    export  class TokenSource {

        /**
        Constructor
        */
        constructor() {
        }

        /**
        Cancel
        */
        public cancel(reason?: string): void {
            this._data.isCancelled = true;
            reason = reason || 'Operation Cancelled';

            this._data.reason = reason;

            setTimeout(() => {
                for (var i = 0; i < this._data.listeners.length; i++) {
                    if (typeof this._data.listeners[i] === 'function') {
                        this._data.listeners[i](reason);
                    }
                }
            }, 0);
        }

        public getToken(): Token {
            return this._token;
        }

        private _data: sourceData = {
            reason: <string>null,
            isCancelled: false,
            listeners: []
        };

        /**
        Token
        */
        private _token: Token = new Token(this._data);
    }

    /**
    Token
    */
    export  class Token {

        /**
        Constructor
        */
        constructor(data: sourceData) {
            this._data = data;
        }

        /**
        To know if the token has been cancelled.
        */
        public isCancelled(): boolean {
            return this._data.isCancelled;
        }

        /**
        Throw an exception if the token is cancelled.
        */
        public throwIfCancelled(): void {
            if (this.isCancelled()) {
                throw this._data.reason;
            }
        }

        /**
        Call a function when the token is cancelled.
        */
        public onCancelled(callBack: (reason: string) => void) {
            if (this.isCancelled()) {
                setTimeout(() => {
                    callBack(this._data.reason);
                }, 0);
            } else {
                this._data.listeners.push(callBack);
            }
        }

        private _data: sourceData;
    }

    /**
    sourceData
    */
    export  interface sourceData {

        /**
        Cancellation reason
        */
        reason: string;

        /**
        token is cancelled
        */
        isCancelled: boolean;

        /**
        Listeners array
        */
        listeners: ((reason: string) => void)[]
    }
}

/**
ConnectionHandler
*/
export  class ConnectionHandler implements IConnectionManager {
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

export  class Client implements IClient {

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
    public getPublicScene(sceneId: string, userData: any): Promise<Scene> {
        return this._apiClient.getSceneEndpoint(this._accountId, this._applicationName, sceneId, userData)
            .then<Scene>(ci => this.getSceneImpl(sceneId, ci));
    }

    /**
    Retrieve a scene object from its ID.
    @method Stormancer.Client#getScene
    @param {string} token Scene token
    @return {Promise} Promise which complete when the scene is ready to connect.
    */
    public getScene(token: string): Promise<Scene> {
        var ci = this._tokenHandler.decodeToken(token);
        return this.getSceneImpl(ci.tokenData.SceneId, ci);
    }

    private getSceneImpl(sceneId: string, ci: SceneEndpoint): Promise<Scene> {
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
            return self.updateMetadata().then(_ => result);
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
                            return self.updateMetadata().then(() => { });
                        });
                });
        }, this);
    }

    private startTransport(): Promise<void> {
        this._cts = new Cancellation.TokenSource();
        return this._transport.start("client", new ConnectionHandler(), this._cts.getToken());
    }

    private registerConnection(connection: IConnection) {
        this._serverConnection = connection;
        for (var key in this._metadata) {
            this._serverConnection.metadata[key] = this._metadata[key];
        }
    }

    private _serverConnection: IConnection;

    public disconnectScene(scene: Scene, sceneHandle: number): Promise<void> {
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

export  class Configuration {

    /**
    Creates a Configuration. Prefer the **Configuration.forAccount** method instead of this constructor.
    @class Configuration
    @classdesc Represents the configuration of a Stormancer client. Use the static method **Configuration.forAccount** for creating a Configuration with an account ID and an application name.
    @memberof Stormancer
    */
    constructor() {
        this.transport = new WebSocketTransport();
        this.dispatcher = new DefaultPacketDispatcher();
        this.serializers = [];
        this.serializers.push(new MsgPackSerializer());
        this.plugins.push(new RpcClientPlugin());
    }

    /**
    Creates a Configuration object targeting the public online platform.
    @method Stormancer.Configuration#forAccount
    @param {string} accountId Account ID
    @param {string} applicationName Application name
    @return {Stormancer.Configuration} The configuration object
    */
    static forAccount(accountId: string, applicationName: string): Configuration {
        var config = new Configuration();
        config.account = accountId;
        config.application = applicationName;
        return config;
    }
    
    /**
    A string containing the target server endpoint.
    This value overrides the *apiEndpoint* property.
    @member Stormancer.Configuration#serverEndpoint
    @type {string}
    */
    public serverEndpoint: string;

    /**
    A string containing the account name of the application.
    @member Stormancer.Configuration#account
    @type {string}
    */
    public account: string = "";

    /**
    A string containing the name of the application.
    @member Stormancer.Configuration#application
    @type {string}
    */
    public application: string = "";

    /**
    The plugins list
    */
    public plugins: IClientPlugin[] = [];

    /**
    Returns the API Endpoint URI to use.
    @return {string} API Endpoint URI
    */
    getApiEndpoint(): string {
        if (!this.serverEndpoint) {
            throw new Error("server endpoint not set");
        }
        return this.serverEndpoint;
    }

    /**
    The metadatas to send for connexion
    */
    public metadata: Map = {};

    /**
    Adds metadata to the connection.
    @param {string} key
    @param {string} value
    @return {Configuration} this
    */
    public Metadata(key: string, value: string): Configuration {
        this.metadata[key] = value;
        return this;
    }

    /**
    Gets or Sets the dispatcher to be used by the client.
    @member Stormancer.Configuration#dispatcher
    @type {object}
    */
    public dispatcher: IPacketDispatcher = null;

    /**
    Gets or sets the transport to be used by the client.
    @member Stormancer.Configuration#transport
    @type {object}
    */
    public transport: ITransport = null;

    /**
    List of available serializers for the client.
    When negotiating which serializer should be used for a given remote peer, the first compatible serializer in the list is the one prefered.
    @member Stormancer.Configuration#serializers
    @type {object[]}
    */
    public serializers: ISerializer[] = [];
}

export  interface Map {
    [key: string]: string;
}

export  interface IMap<T> {
    [key: string]: T;
}

export  class Helpers {
    static base64ToByteArray(data: string): Uint8Array {
        return new Uint8Array(atob(data).split('').map(function (c) { return c.charCodeAt(0) }));
    }

    static stringFormat(str: string, ...args: any[]): string {
        for (var i in args) {
            var regexp: RegExp = new RegExp("\\{" + i + "\\}", "g");
            str = str.replace(regexp, args[i]);
        }
        return str;
    }

    static mapKeys(map: { [key: string]: any }): string[] {
        var keys: string[] = [];
        for (var key in map) {
            if (map.hasOwnProperty(key)) {
                keys.push(key);
            }
        }
        return keys;
    }

    static mapValues<T>(map: IMap<T>): T[] {
        var result: T[] = [];
        for (var key in map) {
            result.push(map[key]);
        }

        return result;
    }

    static promiseIf(condition: boolean, action: () => Promise<void>, context?: any): Promise<void> {
        if (condition) {
            return action.call(context);
        } else {
            return Promise.resolve();
        }
    }

    static invokeWrapping<TResult>(func: (arg?: any) => TResult, arg?: any): Promise<TResult> {
        try {
            return Promise.resolve(func(arg));
        }
        catch (exception) {
            return Promise.reject(exception);
        }
    }
}

export  interface IObserver<T> {
    onCompleted(): void;
    onError(error: any): void;
    onNext(value: T): void;
}

export  class Deferred<T> {
    constructor() {
        this._promise = new Promise<T>((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }

    public promise(): Promise<T> {
        return this._promise;
    }

    public state(): string {
        return this._state;
    }

    public resolve(value?: T) {
        this._resolve(value);
        this._state = "resolved";
    }

    public reject(error?: any) {
        this._reject(error);
        this._state = "rejected";
    }

    private _promise: Promise<T>;
    private _state: string = "pending";
    private _resolve: any;
    private _reject: any
}

export  interface IClient {
    // The name of the Stormancer server application the client is connected to.
    applicationName: string;

    // An user specified logger.
    logger: ILogger;

    // Returns a public scene (accessible without authentication)
    getPublicScene<T>(sceneId: string, userData: T): Promise<Scene>;

    // Returns a private scene (requires a token obtained from strong authentication with the Stormancer API.
    getScene(token: string): Promise<Scene>;

    // Disconnects the client.
    disconnect(): void;

    // The client's unique stormancer Id. Returns null if the Id has not been acquired yet (connection still in progress).
    id: number;

    // The name of the transport used for connecting to the server.
    serverTransportType: string;

    clock(): number;
    lastPing(): number;
}

/**
Manages connections.
@interface IConnectionManager
@memberof Stormancer
*/
/**
Number of connections managed by the object.
@member Stormancer.IConnectionManager#connectionCount
@type {number}
*/
/**
Generates an unique connection id for this node. Only used on servers.
@method Stormancer.IConnectionManager#generateNewConnectionId
@return {number} A number containing an unique ID.
*/
/**
Adds a connection to the manager. This method is called by the infrastructure when a new connection connects to a transport.
@method Stormancer.IConnectionManager#newConnection
@param {Stormancer.IConnection} connection The connection object to add.
*/
/**
Closes the target connection.
@method Stormancer.IConnectionManager#closeConnection
@param {Stormancer.IConnection} connection The connection to close.
@param {string} reason The reason why the connection was closed.
*/
/**
Returns a connection by ID.
@method Stormancer.IConnectionManager#getConnection
@param {number} id The connection ID.
@return {Stormancer.IConnection} The connection attached to this ID.
*/

export  interface IConnectionManager {

    generateNewConnectionId(): number;

    newConnection(connection: IConnection): void;

    closeConnection(connection: IConnection, reason: string): void;

    getConnection(id: number): IConnection;

    connectionCount: number;
}

/**
Represents a packet processor. Packet processors handle packets received from remote peers.
@interface IPacketProcessor
@memberof Stormancer
*/
/**
Method called by the packet dispatcher to register the packet processor.
@method Stormancer.IPacketProcessor#registerProcessor
@param {Stormancer.PacketProcessorConfig} config The packet processor configuration.
*/

export  class PacketProcessorConfig {

    /**
    Creates a packet processor configuration.
    @class PacketProcessorConfig
    @classdesc Contains method to register handlers for message types when passed to the IPacketProcessor.RegisterProcessor method.
    @memberof Stormancer
    @param {object.<string, function>} handlers Specified message handlers map by message type.
    @param {function[]} defaultProcessors The default message processors.
    */
    constructor(handlers: IMap<(packet: Packet<IConnection>) => boolean>, defaultProcessors: ((n: number, p: Packet<IConnection>) => boolean)[]) {
        this._handlers = handlers;
        this._defaultProcessors = defaultProcessors;
    }

    private _handlers: IMap<(packet: Packet<IConnection>) => boolean>;

    private _defaultProcessors: ((n: number, p: Packet<IConnection>) => boolean)[];

    /**
    Adds an handler for the specified message type.
    @method Stormancer.PacketProcessorConfig#addProcessor
    @param {number} msgId A byte representing the message type.
    @param {function} handler A function(Packet) to be executed when receiving a packet with the message type.
    */
    public addProcessor(msgId: number, handler: (p: Packet<IConnection>) => boolean): void {
        if (this._handlers[msgId]) {
            throw new Error("An handler is already registered for id " + msgId);
        }
        this._handlers[msgId] = handler;
    }

    /**
    Adds an handler for all message types.
    @method Stormancer.PacketProcessorConfig#addCatchAllProcessor
    @param {function} handler The default message processors.
    */
    public addCatchAllProcessor(handler: (n: number, p: Packet<IConnection>) => boolean): void {
        this._defaultProcessors.push((n, p) => handler(n, p));
    }
}

export  interface IPacketProcessor {
    registerProcessor(config: PacketProcessorConfig): void;
}

/**
A Stormancer network transport.
@interface ITransport
@memberof Stormancer
*/
/**
Fires when a connection to a remote peer is closed.
@member Stormancer.ITransport#connectionClosed
@type {function[]}
*/
/**
Fires when a remote peer has opened a connection.
@member Stormancer.ITransport#connectionOpened
@type {function[]}
*/
/**
Id of the local peer.
@member Stormancer.ITransport#id
@type {number}
*/
/**
Gets a boolean indicating if the transport is currently running.
@member Stormancer.ITransport#isRunning
@type {boolean}
*/
/**
The name of the transport.
@member Stormancer.ITransport#name
@type {string}
*/
/**
Fires when the transport recieves new packets.
@member Stormancer.ITransport#packetReceived
@type {function[]}
*/
/**
Connects the transport to a remote host.
@method Stormancer.ITransport#connect
@param {string} endpoint A string containing the target endpoint the expected format is `host:port`.
@return {Promise<Stormancer.IConnection>} A `Task<IConnection>` object completing with the connection process and returning the corresponding `IConnection`.
*/
/**
Starts the transport.
@method Stormancer.ITransport#getComponent
@param {string} name The name of the transport if several are started.
@param {Stormancer.IConnectionManager} handler The connection handler used by the connection.
@param {object} token A `CancellationToken`. It will be cancelled when the transport has to be shutdown.
@return {Promise} A `Task` completing when the transport is started.
*/

export  interface ITransport {

    // Starts the transport
    start(type: string, handler: IConnectionManager, token: Cancellation.Token): Promise<void>;

    isRunning: boolean;

    // Connects the transport to a remote host.
    connect(endpoint: string): Promise<IConnection>;

    packetReceived: ((packet: Packet<IConnection>) => void)[];

    connectionOpened: ((connection: IConnection) => void)[];

    connectionClosed: ((connection: IConnection) => void)[];

    name: string;

    id: Uint8Array;
}

/**
Message types understood by the agent.
@alias MessageIDTypes
@enum {number}
@memberof Stormancer
*/

export  class MessageIDTypes {
    public static ID_SYSTEM_REQUEST = 134;
    public static ID_REQUEST_RESPONSE_MSG = 137;
    public static ID_REQUEST_RESPONSE_COMPLETE = 138;
    public static ID_REQUEST_RESPONSE_ERROR = 139;
    public static ID_CONNECTION_RESULT = 140;
    public static ID_SCENES = 141;
}

export  class Scene {

    /**
    A string representing the unique ID of the scene.
    @member Stormancer.Scene#id
    @type {string}
    */
    public id: string;

    /**
    True if the instance is an host. False if it's a client.
    @member Stormancer.Scene#isHost
    @type {boolean}
    */
    public isHost: boolean = false;

    /**
    A byte representing the index of the scene for this peer.
    @member Stormancer.Scene#handle
    @type {number}
    */
    public handle: number = null;

    /**
    A boolean representing whether the scene is connected or not.
    @member Stormancer.Scene#connected
    @type {boolean}
    */
    public connected: boolean = false;

    public hostConnection: IConnection;

    /**
    Returns a list of the routes registered on the local peer.
    @member Stormancer.Scene#localRoutes
    @type {Object.<string, object>}
    */
    public localRoutes: IMap<Route> = {};

    /**
    Returns a list of the routes available on the remote peer.
    @member Stormancer.Scene#remoteRoutes
    @type {Object.<string, object>}
    */
    public remoteRoutes: IMap<Route> = {};

    private _token: string;
    private _metadata: Map;
    private _client: Client;

    /**
    A Scene should not be created by the user. Get a Scene by using **Client#getPublicScene** or **Client#getScene**.
    @class Scene
    @classdesc A Stormancer scene. Peers connected to a Scene can interact between themself.
    @memberof Stormancer
    */
    constructor(connection: IConnection, client: Client, id: string, token: string, dto: SceneInfosDto) {
        this.id = id;
        this.hostConnection = connection;
        this._token = token;
        this._client = client;
        this._metadata = dto.Metadata;

        for (var i = 0; i < dto.Routes.length; i++) {
            var route = dto.Routes[i];
            this.remoteRoutes[route.Name] = new Route(this, route.Name, route.Handle, route.Metadata);
        }
    }

    /**
    Returns metadata informations for the remote scene host.
    @method Stormancer.Scene#getHostMetadata
    @param {string} key
    @return {string} Key associated value
    */
    getHostMetadata(key: string): string {
        return this._metadata[key];
    }

    /**
    Registers a route on the local peer for receiving data packets. See the {Stormancer.Packet} class to know how to get the data.
    @method Stormancer.Scene#addRoute
    @param {string} route The route name
    @param {packetHandler} handler Function for handling the received messages. This function is called any time a Packet is received by the server on this route.
    @param {object.<string, string>} [metadata={}] Some metadata attached to this route.
    */
    public addRoute(route: string, handler: (packet: Packet<IScenePeer>) => void, metadata: Map = {}): void {
        if (route[0] === `@`) {
            throw new Error("A route cannot start with the @ character.");
        }

        if (this.connected) {
            throw new Error("You cannot register handles once the scene is connected.");
        }

        var routeObj = this.localRoutes[route];
        if (!routeObj) {
            routeObj = new Route(this, route, 0, metadata);
            this.localRoutes[route] = routeObj;
        }

        this.onMessageImpl(routeObj, handler);
    }

    /**
    This callback handles a received packet.
    @callback packetHandler
    @param {Stormancer.Packet} packet The packet containing some data.
    */

    /**
    Registers a route on the local peer for receiving deserialised javascript objects. See {Stormancer.Scene.addRoute} to have more flexibility on the data.
    @method Stormancer.Scene#registerRoute
    @param {string} route The route name
    @param {dataHandler} handler Function for handling the received messages. This function is called any time a data is received by the server on this route.
    @param {object.<string, string>} [metadata={}] Some metadata attached to this route.
    */
    public registerRoute<T>(route: string, handler: (data: T) => void, metadata: Map = {}): void {
        this.addRoute(route, (packet: Packet<IScenePeer>) => {
            var data = this.hostConnection.serializer.deserialize<T>(packet.data);
            handler(data);
        }, metadata);
    }

    /**
    This callback handles a received data object.
    @callback dataHandler
    @param {Object} object The data object.
    */

    private onMessageImpl(route: Route, handler: (packet: Packet<IScenePeer>) => void): void {
        var action = (p: Packet<IConnection>) => {
            var packet = new Packet(this.host(), p.data, p.getMetadata());
            handler(packet);
        };
        route.handlers.push(p => action(p));
    }

    /**
    Sends a binary packet to the scene.
    @method Stormancer.Scene#sendPacket
    @param {string} route The route name.
    @param {Uint8Array} data The data to send.
    @param {number} priority The packet priority on the stormancer network.
    @param {number} reliability The packet reliability on the stormancer network.
    */
    public sendPacket(route: string, data: Uint8Array, priority: PacketPriority = PacketPriority.MEDIUM_PRIORITY, reliability: PacketReliability = PacketReliability.RELIABLE): void {
        if (!route) {
            throw new Error("route is null or undefined!");
        }
        if (!data) {
            throw new Error("data is null or undefind!");
        }
        if (!this.connected) {
            throw new Error("The scene must be connected to perform this operation.");
        }

        var routeObj = this.remoteRoutes[route];
        if (!routeObj) {
            throw new Error("The route " + route + " doesn't exist on the scene.");
        }

        this.hostConnection.sendToScene(this.handle, routeObj.handle, data, priority, reliability);
    }

    /**
    Sends an object to the scene.
    @method Stormancer.Scene#send
    @param {string} route The route name.
    @param {object} data The data to send.
    @param {number} priority The packet priority on the stormancer network.
    @param {number} reliability The packet reliability on the stormancer network.
    */
    public send<T>(route: string, data: T, priority: PacketPriority = PacketPriority.MEDIUM_PRIORITY, reliability: PacketReliability = PacketReliability.RELIABLE): void {
        return this.sendPacket(route, this.hostConnection.serializer.serialize(data), priority, reliability);
    }

    /**
    Connect the Scene to the Stormancer application scene.
    @method Stormancer.Scene#connect
    @return {Promise} A promise which complete when the Scene is connected.
    */
    public connect(): Promise<void> {
        var promise = this._client.connectToScene(this, this._token, Helpers.mapValues(this.localRoutes))
        return promise.then(() => {
            this.connected = true;
        });
    }

    /**
    Disconnect the Scene.
    @method Stormancer.Scene#disconnect
    @return {Promise} A promise which complete when the Scene is disconnected.
    */
    public disconnect(): Promise<void> {
        return this._client.disconnectScene(this, this.handle);
    }

    public handleMessage(packet: Packet<IConnection>): void {
        var ev = this.packetReceived;
        ev && ev.map((value) => {
            value(packet);
        });

        // extract the route id
        var routeId = new DataView(packet.data.buffer, packet.data.byteOffset).getUint16(0, true);
        packet.data = packet.data.subarray(2);
        packet.setMetadataValue("routeId", routeId);

        var observer = this._handlers[routeId];
        observer && observer.map(value => {
            value(packet);
        });
    }

    public completeConnectionInitialization(cr: ConnectionResult): void {
        this.handle = cr.SceneHandle;

        for (var key in this.localRoutes) {
            var route = this.localRoutes[key];
            route.handle = cr.RouteMappings[key];
            this._handlers[route.handle] = route.handlers;
        }
    }

    private _handlers: IMap<((packet: Packet<IConnection>) => void)[]> = {};

    /**
    Pool of functions called when a packet is received.
    @member Stormancer.Scene#packetReceived
    @type {function[]}
    */
    public packetReceived: ((packet: Packet<IConnection>) => void)[] = [];

    /**
    Returns an Scene peer object that represents the scene host.
    @method Stormancer.Scene#host
    @return {object} A Scene peer object.
    */
    public host(): IScenePeer {
        return new ScenePeer(this.hostConnection, this.handle, this.remoteRoutes, this);
    }
    a: IMap<string>;

    private _registeredComponents: IMap<() => any> = {};

    /**
    Registers a component and provide a factory for getting it.
    @method Stormancer.Scene#registerComponent
    @param {string} componentName The component game.
    @param {function} factory The factory function for getting the component.
    */
    public registerComponent<T>(componentName: string, factory: () => T): void {
        this._registeredComponents[componentName] = factory;
    }

    /**
    Returns a specific registered component.
    @method Stormancer.Scene#getComponent
    @return {object} The wanted object.
    */
    public getComponent<T>(componentName: string): T {
        if (!this._registeredComponents[componentName]) {
            throw new Error("Component not found");
        }
        return this._registeredComponents[componentName]();
    }
}

export  class SceneEndpoint {
    public tokenData: ConnectionData;

    public token: string;
}

export  class ConnectionData {
    public Endpoints: Map;

    public AccountId: string;
    public Application: string;

    public SceneId: string;

    public Routing: string;

    public Issued: Date;

    public Expiration: Date;

    public UserData: Uint8Array;

    public ContentType: string;

    public Version: number;
}

export  class ScenePeer implements IScenePeer {
    private _connection: IConnection;
    private _sceneHandle: number;
    private _routeMapping: IMap<Route>;
    private _scene: Scene;

    public constructor(connection: IConnection, sceneHandle: number, routeMapping: IMap<Route>, scene: Scene) {
        this._connection = connection;
        this._sceneHandle = sceneHandle;
        this._routeMapping = routeMapping;
        this._scene = scene;
        this.serializer = connection.serializer;
        this.id = this._connection.id;
    }

    public serializer: ISerializer;

    public id: number = null;

    public send(route: string, data: Uint8Array, priority: PacketPriority, reliability: PacketReliability) {
        var r = this._routeMapping[route];
        if (!r) {
            throw new Error("The route " + route + " is not declared on the server.");
        }
        this._connection.sendToScene(this._sceneHandle, r.handle, data, priority, reliability);
    }

    public getComponent<T>(componentName: string): T {
        return this._connection.getComponent<T>(componentName);
    }
}

/**
Message types understood by the agent.
@alias SystemRequestIDTypes
@enum {number}
@memberof Stormancer
*/

export  class SystemRequestIDTypes {
    public static ID_SET_METADATA = 0;
    public static ID_SCENE_READY = 1;
    public static ID_PING = 2;
    // ...
    public static ID_CONNECT_TO_SCENE = 134;
    public static ID_DISCONNECT_FROM_SCENE = 135;
    public static ID_GET_SCENE_INFOS = 136;
}

export  class Watch {
    constructor() {
        this.start();
    }

    public start(): void {
        this._baseTime = this.now();
    }

    private now(): number {
        return (typeof (window) !== "undefined" && window.performance && window.performance.now && window.performance.now()) || Date.now();
    }

    public getElapsedTime(): number {
        return this.now() - this._baseTime;
    }

    private _baseTime: number = 0;
}

/**
A connection to a remote peer.
@interface IConnection
@memberof Stormancer
*/
/**
@member Stormancer.IConnection#account
@type {string}
@desc Account of the application which the peer is connected to.
*/
/**
@desc Name of the application to which the peer is connected.
@member Stormancer.IConnection#application
@type {string}
*/
/**
@desc Event fired when the connection has been closed.
@member Stormancer.IConnection#ConnectionClosed
@type {function[]}
*/
/**
@desc Connection date.
@member Stormancer.IConnection#connectionDate
@type {date}
*/
/**
@desc Unique id in the node for the connection.
@member Stormancer.IConnection#id
@type {string}
*/
/**
@desc Metadata associated with the connection.
@member Stormancer.IConnection#metadata
@type {metadata}
*/
/**
@desc The connection's Ping in milliseconds.
@member Stormancer.IConnection#ping
@type {number}
*/
/**
State of the connection.
@member Stormancer.IConnection#state
@type {Stormancer.ConnectionState}
*/
/**
Close the connection.
@method Stormancer.IConnection#close
*/
/**
Gets a service from the object.
@method Stormancer.IConnection#getComponent
@param {string} componentName Type of the service to fetch.
@return {object} The requested component.
*/
/**
Register components.
@method Stormancer.IConnection#registerComponent
@param {object} component The component to register.
*/
/**
Sends a system message to the peer. (System reserved)
@method Stormancer.IConnection#sendSystem
@param {number} msgId Message ID.
@param {Uint8Array} data The data to send.
@param {Stormancer.PacketPriority} priority Priority of the message.
*/
/**
Sends a packet to the target remote scene. (System reserved)
@method Stormancer.IConnection#sendToScene
@param {number} sceneIndex Scene index.
@param {number} route Route index.
@param {Uint8Array} data Data to send.
@param {Stormancer.PacketPriority} priority Priority of the message.
@param {Stormancer.PacketReliability} reliability Reliability of the message.
*/
/**
Sets the account and application associated with this object. Used only serverside.
@method Stormancer.IConnection#setApplication
@param {string} account The account ID.
@param {string} application The application name.
*/

/**
@alias ConnectionState
@enum {number}
@memberof Stormancer
*/

export  enum ConnectionState {
    Disconnected = 0,
    Connecting = 1,
    Connected = 2
}

export  interface IConnection {
    // Unique id in the node for the connection.
    id: number;

    // Connection date.
    connectionDate: Date;

    // Metadata associated with the connection.
    metadata: Map;

    // Account of the application which the peer is connected to.
    account: string

    // Name of the application to which the peer is connected.
    application: string;

    // State of the connection.
    state: ConnectionState;

    // Close the connection
    close(): void;

    // Event fired when the connection has been closed
    connectionClosed: ((reason: string) => void)[];

    // The connection's Ping in milliseconds
    ping: number;

    serializerChosen: boolean;

    serializer: ISerializer;

    // Register components.
    registerComponent<T>(componentName: string, component: T): void;

    // Gets a service from the object.
    getComponent<T>(componenentName: string): T;

    // Sends a system message to the peer.
    sendSystem(msgId: number, data: Uint8Array, priority?: PacketPriority): void;

    // Sends a packet to the target remote scene.
    sendToScene(sceneIndex: number, route: number, data: Uint8Array, priority: PacketPriority, reliability: PacketReliability): void;

    // Set account and application infos.
    setApplication(account: string, application: string): void;
}

export  interface IConnectionStatistics {
    /// Number of packets lost in the last second.
    packetLossRate: number;

    // Get the kind of limitation on the outgoing flux.
    bytesPerSecondLimitationType: any;//BPSLimitationType;

    // If the outgoing flux is limited, gets the limit rate.
    bytesPerSecondLimit: number;

    // Gets the number of bytes in the sending queue.
    queuedBytes: number;

    // Gets the number of bytes in the sending queue for a given priority.
    queuedBytesForPriority(priority: PacketPriority): number;

    // Gets the number of packets in the sending queue.
    queuedPackets: number;

    // Gets the number of packets in the sending queue for a given priority.
    queuedPacketsForPriority(priority: PacketPriority): number;
}

/**
Contract for a Logger in Stormancer.
@interface ILogger
@memberof Stormancer
*/
/**
Logs a json message.
@method Stormancer.ILogger#log
@param {Stormancer.LogLevel} level Log level.
@param {string} category Log category. Typically where the log was generated.
@param {string} message Log message. Description of the lof.
@param {object} data Detailed informations about the log.
*/

/**
Available log levels
@alias LogLevel
@enum {number}
@memberof Stormancer
*/

export  enum LogLevel {
    fatal = 0,
    error = 1,
    warn = 2,
    info = 3,
    debug = 4,
    trace = 5
}

export  interface ILogger {

    log(level: LogLevel, category: string, message: string, data: any);
}

/**
A remote scene.
@interface IScenePeer
@memberof Stormancer
*/
/**
Unique id of the peer in the Stormancer cluster
@member Stormancer.IScenePeer#id
@type {string}
*/
/**
The serializer to use with the peer.
@member Stormancer.IScenePeer#getComponent
@type {Stormancer.ISerializer}
*/
/**
Returns a component registered for the peer.
@method Stormancer.IScenePeer#getComponent
@param {string} componentName The name of the component.
@return {object} The requested component.
*/
/**
Sends a message to the remote peer.
@method Stormancer.IScenePeer#send
@param {string} route The route on which the message will be sent.
@param {Uint8Array} data A method called to write the message.
@param {PacketPriority} priority The message priority.
@param {PacketReliability} reliability The message requested reliability.
*/

// A remote scene.
export  interface IScenePeer {
    // Sends a message to the remote scene.
    send(route: string, data: Uint8Array, priority: PacketPriority, reliability: PacketReliability): void;

    id: number;

    getComponent<T>(componentName: string): T;

    serializer: ISerializer;
}

/**
Contract for the binary serializers used by Stormancer applications.
@interface ISerializer
@memberof Stormancer
*/
/**
The serializer format.
@member Stormancer.ISerializer#name
@type {string}
*/
/**
Serialize an object into a stream.
@method Stormancer.ISerializer#serialize
@param {object} data The object to serialize.
@return {Uint8Array} The byte array.
*/
/**
Deserialize an object from a stream.
@method Stormancer.ISerializer#deserialize
@param {Uint8Array} bytes The byte array to deserialize.
@return {object} The deserialized object.
*/

export  interface ISerializer {

    serialize<T>(data: T): Uint8Array;

    deserialize<T>(bytes: Uint8Array): T;

    name: string;
}

export  class Packet<T> {

    /**
    A packet sent by a remote peer to the running peer.
    @class Packet
    @classdesc A packet sent by a remote peer to the running peer.
    @memberof Stormancer
    */
    constructor(source: T, data: Uint8Array, metadata?: IMap<any>) {
        this.connection = source;
        this.data = data;
        this.metadata = metadata;
    }

    /**
    A byte representing the index of the scene for this peer.
    @member Stormancer.Packet#connection
    @type {Object}
    */
    public connection: T = null;

    /**
    Data contained in the packet.
    @member Stormancer.Packet#data
    @type {Uint8Array}
    */
    public data: Uint8Array = null;

    /**
    Get a DataView on the internal data buffer
    @method Stormancer.Packet#getDataView
    @return {DataView}
    */
    public getDataView(): DataView {
        return new DataView(this.data.buffer, this.data.byteOffset, this.data.byteLength);
    }

    /**
    Deserialize the internal data to an object by using MsgPack and return this object.
    @method Stormancer.Packet#readObject
    @return {Object}
    */
    public readObject(): any {
        var msgpackSerializer = new MsgPackSerializer();
        return msgpackSerializer.deserialize<any>(this.data);
    }

    private metadata: IMap<any> = null;

    /**
    Set the metadatas of the packet. This action will overwrite the existing metadatas.
    @method Stormancer.Packet#setMetadata
    @param {Object} metadata
    */
    public setMetadata(metadata: IMap<any>) {
        this.metadata = metadata;
    }

    /**
    Get the metadatas from the packet.
    @method Stormancer.Packet#getMetadata
    @return {Object.<string, Object>}
    */
    public getMetadata(): IMap<any> {
        if (!this.metadata) {
            this.metadata = {};
        }
        return this.metadata;
    }

    /**
    Set a metadata in the packet
    @method Stormancer.Packet#setMetadataValue
    @param {string} key
    @param {Object} value
    */
    public setMetadataValue(key: string, value): void {
        if (!this.metadata) {
            this.metadata = {};
        }
        this.metadata[key] = value;
    }

    /**
    Returns metadata
    @method Stormancer.Packet#getMetadataValue
    @param {string} key
    @return {string} Key associated object
    */
    public getMetadataValue(key: string): any {
        if (!this.metadata) {
            this.metadata = {};
        }
        return this.metadata[key];
    }
}

/**
Available packet priorities
@alias PacketPriority
@enum {number}
@memberof Stormancer
*/

export  enum PacketPriority {
    IMMEDIATE_PRIORITY = 0,
    HIGH_PRIORITY = 1,
    MEDIUM_PRIORITY = 2,
    LOW_PRIORITY = 3
}

/**
Different available reliability levels when sending a packet.
@alias PacketReliability
@enum {number}
@memberof Stormancer
*/

export  enum PacketReliability {
    UNRELIABLE = 0,
    UNRELIABLE_SEQUENCED = 1,
    RELIABLE = 2,
    RELIABLE_ORDERED = 3,
    RELIABLE_SEQUENCED = 4
}

export  class Route {

    /**
    Creates a new route instance.
    @class Route
    @classdesc Represents a Route on a Scene.
    @memberof Stormancer
    @param {Stormancer.Scene} scene The scene instance
    @param {string} name The route name.
    @param {number} handle Handle of the route (16 bits unsigned integer).
    @param {object.<string, string>} metadata Metadata attached to this route.
    */
    public constructor(scene: Scene, name: string, handle = 0, metadata: Map = {}) {
        this.scene = scene;
        this.name = name;
        this.handle = handle;
        this.metadata = metadata;
    }

    /**
    The Scene instance which contains this route.
    @member Stormancer.Route#scene
    @type {Stormancer.Scene}
    */
    public scene: Scene = null;

    /**
    A string containing the name of the route.
    @member Stormancer.Route#name
    @type {string}
    */
    public name: string = null;

    /**
    Route handle.
    @member Stormancer.Route#handle
    @type {number}
    */
    public handle: number = null;

    /**
    Route metadata.
    @member Stormancer.Route#metadata
    @type {object.<string, string>}
    */
    public metadata: Map = {};

    /**
    Contains the handlers that are run when packets are received.
    @member Stormancer.Route#handlers
    @type {function[]}
    */
    public handlers: ((packet: Packet<IConnection>) => void)[] = [];
}

export  class DefaultPacketDispatcher implements IPacketDispatcher {
    private _handlers: IMap<(packet: Packet<IConnection>) => boolean> = {};
    private _defaultProcessors: ((msgType: number, packet: Packet<IConnection>) => boolean)[] = [];

    public dispatchPacket(packet: Packet<IConnection>): void {
        var processed = false;
        var count = 0;
        var msgType = 0;
        while (!processed && count < 40) {
            msgType = packet.data[0];
            packet.data = packet.data.subarray(1);
            if (this._handlers[msgType]) {
                processed = this._handlers[msgType](packet);
                count++;
            }
            else {
                break;
            }
        }
        for (var i = 0, len = this._defaultProcessors.length; i < len; i++) {
            if (this._defaultProcessors[i](msgType, packet)) {
                processed = true;
                break;
            }
        }
        if (!processed) {
            throw new Error("Couldn't process message. msgId: " + msgType);
        }
    }

    public addProcessor(processor: IPacketProcessor): void {
        processor.registerProcessor(new PacketProcessorConfig(this._handlers, this._defaultProcessors));
    }
}

export  interface IRequestModule {
    register(builder: (msgId: number, handler: (context: RequestContext) => Promise<void>) => void): void;
}

/**
Interface describing a message dispatcher.
@interface IPacketDispatcher
@memberof Stormancer
*/
/**
Adds a packet processor to the dispatcher.
@method Stormancer.IPacketDispatcher#addProcessor
@param {Stormancer.IPacketProcessor} processor An `IPacketProcessor` object
*/
/**
Dispatches a packet to the system.
@method Stormancer.IPacketDispatcher#dispatchPacket
@param {Stormancer.Packet} packet Packet to dispatch.
*/

export  interface IPacketDispatcher {

    addProcessor(processor: IPacketProcessor): void;

    dispatchPacket(packet: Packet<IConnection>): void;
}

export  interface ISubscription {
    unsubscribe(): void;
}

export  interface ITokenHandler {
    decodeToken(token: string): SceneEndpoint;
}

export  class TokenHandler implements ITokenHandler {
    private _tokenSerializer: ISerializer;

    public constructor() {
        this._tokenSerializer = new MsgPackSerializer();
    }

    public decodeToken(token: string): SceneEndpoint {
        var data = token.split('-')[0];
        var buffer = Helpers.base64ToByteArray(data);
        var result = this._tokenSerializer.deserialize<ConnectionData>(buffer);

        var sceneEndpoint = new SceneEndpoint();
        sceneEndpoint.token = token;
        sceneEndpoint.tokenData = result;
        return sceneEndpoint;
    }
}

/// <reference path="../../../libs/msgpack5.no-module.d.ts" />
/// <reference path="../Core/ISerializer.ts"/>

export  class MsgPackSerializer implements ISerializer {

    /**
    Creates a new MsgPackSerializer.
    @class MsgPackSerializer
    @classdesc Serializer based on MessagePack.
    @memberof Stormancer
    */
    constructor() {
    }

    /**
    Serializes an object into a byte array.
    @method Stormancer.MsgPackSerializer#serialize
    @param {object} data The data to serialize.
    @return {Uint8Array} The byte array.
    */
    public serialize<T>(data: T): Uint8Array {
        return <Uint8Array>this._msgpack.encode(data);
    }

    /**
    Deserializes an object from a byte array.
    @method Stormancer.MsgPackSerializer#deserialize
    @memberof Stormancer.MsgPackSerializer
    @param {Uint8Array} bytes The byte array
    @return {object} The deserialized data.
    */
    public deserialize<T>(bytes: Uint8Array): T {
        return this._msgpack.decode<T>(bytes);
    }

    /**
    The name of the serializer.
    */
    public name: string = "msgpack/map";

    private _msgpack: msgpack5.MessagePack = msgpack5();
}

export  interface IClientPlugin {
    build(ctx: PluginBuildContext): void;
}

export  class PluginBuildContext {

    /**
    Initializes a new instance of the PluginBuildContext class.
    @class PluginBuildContext
    @classdesc Object passed to the Build method of plugins to register to the available Stormancer client events.
    @memberof Stormancer
    */
    constructor() {
    }

    /**
    Event fired when a scene object is created. That's an array of functions which are called and have the scene instance as first parameter.
    @member Stormancer.PluginBuildContext#sceneCreated
    @type {sceneHandler[]}
    */
    public sceneCreated: ((scene: Scene) => void)[] = [];

    /**
    Event fired when a client object is created. That's an array of functions which are called and have the scene instance as first parameter.
    @member Stormancer.PluginBuildContext#clientCreated
    @type {clientHandler[]}
    */
    public clientCreated: ((client: IClient) => void)[] = [];

    /**
    Event fired when a a scene is connected to the server. That's an array of functions which are called and have the scene instance as first parameter.
    @member Stormancer.PluginBuildContext#sceneConnected
    @type {sceneHandler[]}
    */
    public sceneConnected: ((scene: Scene) => void)[] = [];

    /**
    Event fired when a scene is disconnected. That's an array of functions which are called and have the scene instance as first parameter.
    @member Stormancer.PluginBuildContext#sceneDisconnected
    @type {sceneHandler[]}
    */
    public sceneDisconnected: ((scene: Scene) => void)[] = [];

    /**
    Event fired when a packet is received from a remote peer. That's an array of functions which are called and have the scene instance as first parameter.
    @member Stormancer.PluginBuildContext#packetReceived
    @type {packetHandler[]}
    */
    public packetReceived: ((packet: Packet<IConnection>) => void)[] = [];
}

export  class RpcClientPlugin implements IClientPlugin {
    static NextRouteName = "stormancer.rpc.next";
    static ErrorRouteName = "stormancer.rpc.error";
    static CompletedRouteName = "stormancer.rpc.completed";
    static CancellationRouteName = "stormancer.rpc.cancel";
    static Version = "1.1.0";
    static PluginName = "stormancer.plugins.rpc";
    static ServiceName = "rpcService";

    public build(ctx: PluginBuildContext): void {
        ctx.sceneCreated.push((scene: Scene) => {
            var rpcParams = scene.getHostMetadata(RpcClientPlugin.PluginName);

            if (rpcParams == RpcClientPlugin.Version) {
                var processor = new RpcService(scene);
                scene.registerComponent(RpcClientPlugin.ServiceName, () => processor);
                scene.addRoute(RpcClientPlugin.NextRouteName, p => {
                    processor.next(p);
                });
                scene.addRoute(RpcClientPlugin.CancellationRouteName, p => {
                    processor.cancel(p);
                });
                scene.addRoute(RpcClientPlugin.ErrorRouteName, p => {
                    processor.error(p);
                });
                scene.addRoute(RpcClientPlugin.CompletedRouteName, p => {
                    processor.complete(p);
                });
            }
        });
        ctx.sceneDisconnected.push((scene: Scene) => {
            var processor = scene.getComponent<RpcService>(RpcClientPlugin.ServiceName);
            processor.disconnected();
        });
    }
}

export  class RpcRequestContext {

    private _scene: Scene = null;
    private id: number = null;
    private _ordered: boolean = null;
    private _peer: IScenePeer = null;
    private _msgSent: number = null;
    private _data: Uint8Array = null;
    private _cancellationToken: Cancellation.Token = null;

    public remotePeer(): IScenePeer {
        return this._peer;
    }

    public data(): Uint8Array {
        return this._data;
    }

    public cancellationToken(): Cancellation.Token {
        return this._cancellationToken;
    }

    constructor(peer: IScenePeer, scene: Scene, id: number, ordered: boolean, data: Uint8Array, token: Cancellation.Token) {
        this._scene = scene;
        this.id = id;
        this._ordered = ordered;
        this._peer = peer;
        this._data = data;
        this._cancellationToken = token;
    }

    private writeRequestId(data: Uint8Array): Uint8Array {
        var newData = new Uint8Array(2 + data.byteLength);
        (new DataView(newData.buffer)).setUint16(0, this.id, true);
        newData.set(data, 2);
        return newData;
    }

    public sendValue(data: Uint8Array, priority: PacketPriority): void {
        data = this.writeRequestId(data);
        this._scene.sendPacket(RpcClientPlugin.NextRouteName, data, priority, (this._ordered ? PacketReliability.RELIABLE_ORDERED : PacketReliability.RELIABLE));
        this._msgSent = 1;
    }

    public sendError(errorMsg: string): void {
        var data = this._peer.serializer.serialize(errorMsg);
        data = this.writeRequestId(data);
        this._scene.sendPacket(RpcClientPlugin.ErrorRouteName, data, PacketPriority.MEDIUM_PRIORITY, PacketReliability.RELIABLE_ORDERED);
    }

    public sendCompleted(): void {
        var data = new Uint8Array(0);
        var data = this.writeRequestId(data);
        var data2 = new Uint8Array(1 + data.byteLength);
        data2[0] = this._msgSent;
        this._scene.sendPacket(RpcClientPlugin.CompletedRouteName, data, PacketPriority.MEDIUM_PRIORITY, PacketReliability.RELIABLE_ORDERED);
    }
}

interface RpcRequest {
    observer: IObserver<Packet<IScenePeer>>;
    deferred: Deferred<void>;
    receivedMessages: number;
    id: number;
}

export  class RpcService {
    private _currentRequestId: number = 0;
    private _scene: Scene;
    private _pendingRequests: IMap<RpcRequest> = {};
    private _runningRequests: IMap<Cancellation.TokenSource> = {};
    private _msgpackSerializer: MsgPackSerializer = new MsgPackSerializer();

    /**
    @class RpcService
    @memberof Stormancer
    @classdesc Used to send remote procedure call through the RPC plugin.
    If your scene uses the RPC plugin, use `scene.getComponent("rpcService")` to get an instance of this class.
    */
    constructor(scene: Scene) {
        this._scene = scene;
    }

    /**
    @method Stormancer.RpcService#rpc
    @return {ISubscription}
    */
    public rpc(route: string, objectOrData: any,
        onNext: (packet: Packet<IScenePeer>) => void,
        onError: (error: string) => void = (error) => { },
        onCompleted: () => void = () => { },
        priority: PacketPriority = PacketPriority.MEDIUM_PRIORITY): ISubscription {
        var data: Uint8Array | ArrayLike<number>;
        if (objectOrData instanceof Uint8Array) {
            data = objectOrData;
        }
        else {
            if (objectOrData instanceof Array || objectOrData instanceof ArrayBuffer) {
                var data2: ArrayBuffer | ArrayLike<number> = objectOrData;
                data = new Uint8Array(<ArrayBuffer>(data2));
            }
            else if (objectOrData instanceof DataView || objectOrData instanceof Int8Array || objectOrData instanceof Int16Array || objectOrData instanceof Int32Array || objectOrData instanceof Uint8Array || objectOrData instanceof Uint16Array || objectOrData instanceof Uint32Array || objectOrData instanceof Float32Array || objectOrData instanceof Float64Array) {
                data = new Uint8Array(objectOrData.buffer, objectOrData.byteOffset, objectOrData.byteLength);
            }
            else {
                data = this._msgpackSerializer.serialize(objectOrData);
            }
        }

        var remoteRoutes = this._scene.remoteRoutes;
        var relevantRoute: Route;

        for (var i in remoteRoutes) {
            if (remoteRoutes[i].name == route) {
                relevantRoute = remoteRoutes[i];
                break;
            }
        }
        if (!relevantRoute) {
            throw new Error("The target route does not exist on the remote host.");
        }

        if (relevantRoute.metadata[RpcClientPlugin.PluginName] != RpcClientPlugin.Version) {
            throw new Error("The target remote route does not support the plugin RPC version " + RpcClientPlugin.Version);
        }

        var deferred = new Deferred<void>();
        var observer: IObserver<Packet<IScenePeer>> = {
            onNext: onNext,
            onError(error) {
                onError(error);
                deferred.reject(error);
            },
            onCompleted() {
                onCompleted();
                deferred.resolve();
            }
        };

        var id = this.reserveId();
        var request: RpcRequest = {
            observer: observer,
            deferred: deferred,
            receivedMessages: 0,
            id: id
        };

        this._pendingRequests[id] = request;

        var dataToSend = new Uint8Array(2 + data.length);
        (new DataView(dataToSend.buffer)).setUint16(0, id, true);
        dataToSend.set(data, 2);

        this._scene.sendPacket(route, dataToSend, priority, PacketReliability.RELIABLE_ORDERED);

        return {
            unsubscribe: () => {
                if (this._pendingRequests[id]) {
                    delete this._pendingRequests[id];
                    var buffer = new ArrayBuffer(2);
                    new DataView(buffer).setUint16(0, id, true);
                    this._scene.sendPacket("stormancer.rpc.cancel", new Uint8Array(buffer));
                }
            }
        };
    }

    public addProcedure(route: string, handler: (ctx: RpcRequestContext) => any, ordered: boolean): void {
        var metadatas: Map = {};
        metadatas[RpcClientPlugin.PluginName] = RpcClientPlugin.Version;
        this._scene.addRoute(route, p => {
            var requestId = p.getDataView().getUint16(0, true);
            var id = this.computeId(p);
            p.data = p.data.subarray(2);
            var cts = new Cancellation.TokenSource();
            var ctx = new RpcRequestContext(p.connection, this._scene, requestId, ordered, p.data, cts.getToken());
            if (!this._runningRequests[id]) {
                this._runningRequests[id] = cts;
                Helpers.invokeWrapping(handler, ctx).then(() => {
                    delete this._runningRequests[id];
                    ctx.sendCompleted();
                }, reason => {
                    delete this._runningRequests[id];
                    ctx.sendError(reason);
                });
            }
            else {
                throw new Error("Request already exists");
            }
        }, metadatas);
    }

    private reserveId(): number {
        var i = 0;
        while (i <= 0xFFFF) {
            i++;
            this._currentRequestId = (this._currentRequestId + 1) & 0xFFFF;
            if (!this._pendingRequests[this._currentRequestId]) {
                return this._currentRequestId;
            }
        }

        throw new Error("Too many requests in progress, unable to start a new one.");
    }

    private computeId(packet: Packet<IScenePeer>): string {
        var requestId = packet.getDataView().getUint16(0, true);
        var id = packet.connection.id.toString() + "-" + requestId.toString();
        return id;
    }

    //finds the appropriate pending request and consumes the first 2 bytes of the packet.
    private getPendingRequest(packet: Packet<IScenePeer>): RpcRequest {
        var dv = packet.getDataView();
        var id = packet.getDataView().getUint16(0, true);
        packet.data = packet.data.subarray(2);
        return this._pendingRequests[id];
    }

    next(packet: Packet<IScenePeer>): void {
        var request = this.getPendingRequest(packet);
        if (request) {
            request.receivedMessages++;
            request.observer.onNext(packet);
            if (request.deferred.state() === "pending") {
                request.deferred.resolve();
            }
        }
    }

    error(packet: Packet<IScenePeer>): void {
        var request = this.getPendingRequest(packet);
        if (request) {
            delete this._pendingRequests[request.id];
            request.observer.onError(packet.connection.serializer.deserialize<string>(packet.data));
        }
    }

    complete(packet: Packet<IScenePeer>): void {
        var messageSent = packet.data[0];
        packet.data = packet.data.subarray(1);

        var request = this.getPendingRequest(packet);
        if (request) {
            if (messageSent) {
                request.deferred.promise().then(() => {
                    delete this._pendingRequests[request.id];
                    request.observer.onCompleted();
                });
            }
            else {
                delete this._pendingRequests[request.id];
                request.observer.onCompleted();
            }
        }
    }

    cancel(packet: Packet<IScenePeer>): void {
        var id = this.computeId(packet);
        var cts = this._runningRequests[id];
        if (cts) {
            cts.cancel();
        }
    }

    disconnected(): void {
        for (var i in this._runningRequests) {
            if (this._runningRequests.hasOwnProperty(i)) {
                this._runningRequests[i].cancel();
            }
        }
    }
}

export  class RequestContext {

    private _packet: Packet<IConnection>;
    private _requestId: Uint8Array;
    private _didSendValues = false;

    public inputData: Uint8Array;
    public isComplete = false;

    /**
    @class RequestContext
    @classdesc Context object that provides informations about a running request.
    @memberof Stormancer
    @param {Stormancer.Packet} packet The Packet on which we create the RequestContext.
    */
    constructor(packet: Packet<IConnection>) {
        this._packet = packet;
        this._requestId = packet.data.subarray(0, 2);
        this.inputData = packet.data.subarray(2);
    }

    /**
    Sends a partial response to the client through the request channel
    @method Stormancer.RequestContext#send
    @param {Uint8Array} data The data to send.
    */
    public send(data: Uint8Array): void {
        if (this.isComplete) {
            throw new Error("The request is already completed.");
        }
        this._didSendValues = true;
        var dataToSend = new Uint8Array(2 + data.length);
        dataToSend.set(this._requestId);
        dataToSend.set(data, 2);
        this._packet.connection.sendSystem(MessageIDTypes.ID_REQUEST_RESPONSE_MSG, dataToSend);
    }

    /**
    Completes the request.
    @method Stormancer.RequestContext#complete
    */
    public complete(): void {
        var dataToSend = new Uint8Array(3);
        dataToSend.set(this._requestId);
        dataToSend[2] = (this._didSendValues ? 1 : 0);
        this._packet.connection.sendSystem(MessageIDTypes.ID_REQUEST_RESPONSE_COMPLETE, dataToSend);
    }

    /**
    Error on the request.
    @method Stormancer.RequestContext#error
    @param {Uint8Array} data The received data error.
    */
    public error(data: Uint8Array): void {
        var dataToSend = new Uint8Array(2 + data.length);
        dataToSend.set(this._requestId);
        dataToSend.set(data, 2);
        this._packet.connection.sendSystem(MessageIDTypes.ID_REQUEST_RESPONSE_ERROR, dataToSend);
    }
}

///<reference path="../MessageIDTypes.ts"/>

interface SystemRequest {
    lastRefresh: Date;
    id: number;
    observer: IObserver<Packet<IConnection>>;
    deferred: Deferred<void>;
}

export  class RequestProcessor implements IPacketProcessor {
    private _pendingRequests: IMap<SystemRequest> = {};
    private _logger: ILogger;
    private _isRegistered: boolean = false;
    private _handlers: IMap<(context: RequestContext) => Promise<void>> = {};
    private _currentId = 0;

    constructor(logger: ILogger, modules: IRequestModule[]) {
        this._pendingRequests = {};
        this._logger = logger;
        for (var key in modules) {
            var mod = modules[key];
            mod.register(this.addSystemRequestHandler);
        }
    }

    public registerProcessor(config: PacketProcessorConfig): void {
        this._isRegistered = true;

        for (var key in this._handlers) {
            var handler = this._handlers[key];
            config.addProcessor(parseInt(key), (p: Packet<IConnection>) => {
                var context = new RequestContext(p);

                var continuation = (fault: any) => {
                    if (!context.isComplete) {
                        if (fault) {
                            context.error(p.connection.serializer.serialize(fault));
                        }
                        else {
                            context.complete();
                        }
                    }
                };

                handler(context)
                    .then(() => continuation(null))
                    .catch(error => continuation(error));

                return true;
            });
        }

        config.addProcessor(MessageIDTypes.ID_REQUEST_RESPONSE_MSG, p => {
            var id = new DataView(p.data.buffer, p.data.byteOffset).getUint16(0, true);
            var request: SystemRequest = this._pendingRequests[id];
            if (request) {
                p.setMetadataValue["request"] = request;
                request.lastRefresh = new Date();
                p.data = p.data.subarray(2);
                request.observer.onNext(p);
                request.deferred.resolve();
            }
            else {
                console.error("Unknow request id.");
                return true;
            }

            return true;
        });

        config.addProcessor(MessageIDTypes.ID_REQUEST_RESPONSE_COMPLETE, p => {
            var id = new DataView(p.data.buffer, p.data.byteOffset).getUint16(0, true);

            var request = this._pendingRequests[id];
            if (request) {
                p.setMetadataValue("request", request);
            }
            else {
                console.error("Unknow request id.");
                return true;
            }

            delete this._pendingRequests[id];
            if (p.data[3]) {
                request.deferred.promise().then(() => request.observer.onCompleted(), () => request.observer.onCompleted());
            }
            else {
                request.observer.onCompleted();
            }

            return true;
        });

        config.addProcessor(MessageIDTypes.ID_REQUEST_RESPONSE_ERROR, p => {
            var id = new DataView(p.data.buffer, p.data.byteOffset).getUint16(0, true);

            var request = this._pendingRequests[id];
            if (request) {
                p.setMetadataValue("request", request);
            }
            else {
                console.error("Unknow request id.");
                return true;
            }

            delete this._pendingRequests[id];

            var msg = p.connection.serializer.deserialize<string>(p.data.subarray(2));

            request.observer.onError(new Error(msg));

            return true;
        });
    }

    public addSystemRequestHandler(msgId: number, handler: (context: RequestContext) => Promise<void>): void {
        if (this._isRegistered) {
            throw new Error("Can only add handler before 'registerProcessor' is called.");
        }
        this._handlers[msgId] = handler;
    }

    private reserveRequestSlot(observer: IObserver<Packet<IConnection>>) {
        var i = 0;
        while (i < 0xFFFF) {
            i++;
            this._currentId = (this._currentId + 1) & 0xFFFF;
            if (!this._pendingRequests[this._currentId]) {
                var request: SystemRequest = { lastRefresh: new Date, id: this._currentId, observer: observer, deferred: new Deferred<void>() };
                this._pendingRequests[this._currentId] = request;
                return request;
            }
        }

        throw new Error("Unable to create new request: Too many pending requests.");
    }

    public sendSystemRequest(peer: IConnection, msgId: number, data: Uint8Array, priority: PacketPriority = PacketPriority.MEDIUM_PRIORITY): Promise<Packet<IConnection>> {
        var deferred = new Deferred<Packet<IConnection>>();

        var request = this.reserveRequestSlot({
            onNext(packet) { deferred.resolve(packet); },
            onError(e) { deferred.reject(e) },
            onCompleted() {
                deferred.resolve();
            }
        });

        var dataToSend = new Uint8Array(3 + data.length);
        var idArray = new Uint16Array([request.id]);
        dataToSend.set(<any>[msgId], 0);
        dataToSend.set(new Uint8Array(idArray.buffer), 1);
        dataToSend.set(data, 3);
        peer.sendSystem(MessageIDTypes.ID_SYSTEM_REQUEST, dataToSend, priority);

        return deferred.promise();
    }
}

export  class SceneDispatcher implements IPacketProcessor {
    private _scenes: Scene[] = [];
    private _buffers: Packet<IConnection>[][] = [];
    public registerProcessor(config: PacketProcessorConfig): void {
        config.addCatchAllProcessor((handler, packet) => this.handler(handler, packet));
    }

    private handler(sceneHandle: number, packet: Packet<IConnection>): boolean {
        if (sceneHandle < MessageIDTypes.ID_SCENES) {
            return false;
        }
        var scene = this._scenes[sceneHandle - MessageIDTypes.ID_SCENES];
        if (!scene) {
            var buffer: Packet<IConnection>[];
            if (this._buffers[sceneHandle] == undefined) {
                buffer = [];
                this._buffers[sceneHandle] = buffer;
            }
            else {
                buffer = this._buffers[sceneHandle];
            }
            buffer.push(packet);
            return true;
        } else {
            packet.setMetadataValue("scene", scene);
            scene.handleMessage(packet);
            return true;
        }
    }

    public addScene(scene: Scene): void {
        this._scenes[scene.handle - MessageIDTypes.ID_SCENES] = scene;
        if (this._buffers[scene.handle] != undefined) {
            var buffer = this._buffers[scene.handle];
            delete this._buffers[scene.handle];
            while (buffer.length > 0) {
                var packet = buffer.pop();
                packet.setMetadataValue("scene", scene);
                scene.handleMessage(packet);
            }

        }
    }

    public removeScene(sceneHandle: number) {
        delete this._scenes[sceneHandle - MessageIDTypes.ID_SCENES];
    }
}

// $http function is implemented in order to follow the standard Adapter pattern
export  function $http(url, options?) {

    // A small example of object
    var core = {

        // Method that performs the ajax request
        ajax: function <T>(method, url, args, options): Promise<T> {

            // Creating a promise
            var promise = new Promise<T>(function (resolve, reject) {

                // Instantiates the XMLHttpRequest
                var xhr = new XMLHttpRequest();
                var uri = url;

                if (args && (method === 'POST' || method === 'PUT')) {
                    uri += '?';
                    var argcount = 0;
                    for (var key in args) {
                        if (args.hasOwnProperty(key)) {
                            if (argcount++) {
                                uri += '&';
                            }
                            uri += encodeURIComponent(key) + '=' + encodeURIComponent(args[key]);
                        }
                    }
                }

                xhr.open(method, uri);

                // set options
                var data = null;
                if (options) {
                    if (options.contentType) {
                        xhr.setRequestHeader("Content-Type", options.contentType);
                    }
                    if (options.headers) {
                        for (var key in options.headers) {
                            if (options.headers.hasOwnProperty(key)) {
                                xhr.setRequestHeader(key, options.headers[key]);
                            }
                        }
                    }
                    if (options.data) {
                        data = options.data
                    }
                }

                xhr.send(data);

                xhr.onload = function () {
                    if (xhr.status == 200) {
                        // Performs the function "resolve" when this.status is equal to 200
                        resolve(xhr.response);
                    }
                    else {
                        // Performs the function "reject" when this.status is different than 200
                        reject(xhr.statusText);
                    }
                };
                xhr.onerror = function () {
                    reject(xhr.statusText);
                };
            });

            // Return the promise
            return promise;
        }
    };

    // Adapter pattern
    return {
        'get': function <T>(args, options): Promise<T> {
            return core.ajax('GET', url, args, options);
        },
        'post': function <T>(args, options): Promise<T> {
            return core.ajax('POST', url, args, options);
        },
        'put': function <T>(args, options): Promise<T> {
            return core.ajax('PUT', url, args, options);
        },
        'delete': function <T>(args, options): Promise<T> {
            return core.ajax('DELETE', url, args, options);
        }
    };
};

export  interface ConnectToSceneMsg {
    Token: string;
    Routes: RouteDto[];
    ConnectionMetadata: Map;
}

export  interface ConnectionResult {
    SceneHandle: number;
    RouteMappings: IMap<number>;
}

export  interface RouteDto {
    Name: string;
    Handle: number;
    Metadata: Map;
}

export  interface SceneInfosRequestDto {
    Token: string;
    Metadata: Map;
}

export  interface SceneInfosDto {
    SceneId: string;
    Metadata: Map;
    Routes: RouteDto[];
    SelectedSerializer: string;
}

export  class WebSocketConnection implements IConnection {
    private _socket: WebSocket;

    public constructor(id: number, socket: WebSocket) {
        this.id = id;
        this._socket = socket;
        this.connectionDate = new Date();
        this.state = ConnectionState.Connected;
    }

    // Unique id in the node for the connection.
    public id: number;

    // Connection date.
    public connectionDate: Date;

    // Metadata associated with the connection.
    public metadata: Map = {};

    // Account of the application which the peer is connected to.
    public account: string

    // Name of the application to which the peer is connected.
    public application: string;

    // State of the connection.
    public state: ConnectionState;

    public ping: number = null;

    // Close the connection
    public close(): void {
        this._socket.close();
    }

    // Sends a system message to the peer.
    public sendSystem(msgId: number, data: Uint8Array, priority: PacketPriority = PacketPriority.MEDIUM_PRIORITY): void {
        var bytes = new Uint8Array(data.length + 1);
        bytes[0] = msgId;
        bytes.set(data, 1);
        this._socket.send(bytes.buffer);
    }

    // Sends a packet to the target remote scene.
    public sendToScene(sceneIndex: number, route: number, data: Uint8Array, priority: PacketPriority, reliability: PacketReliability): void {
        var bytes = new Uint8Array(data.length + 3);
        bytes[0] = sceneIndex;
        var ushorts = new Uint16Array(1);
        ushorts[0] = route;
        bytes.set(new Uint8Array(ushorts.buffer), 1);
        bytes.set(data, 3);
        this._socket.send(bytes.buffer);
    }

    // Event fired when the connection has been closed
    public connectionClosed: ((reason: string) => void)[];

    public setApplication(account: string, application: string): void {
        this.account = account;
        this.application = application;
    }

    public serializerChosen: boolean = false;
    public serializer: ISerializer = new MsgPackSerializer();

    private _registeredComponents: IMap<any> = { "serializer": this.serializer };

    public registerComponent<T>(componentName: string, component: T): void {
        this._registeredComponents[componentName] = component;
    }

    getComponent<T>(componentName): T {
        return this._registeredComponents[componentName]();
    }
}

export  class WebSocketTransport implements ITransport {
    public name: string = "websocket";
    public id: Uint8Array;
    // Gets a boolean indicating if the transport is currently running.
    public isRunning: boolean = false;

    private _type: string;
    private _connectionManager: IConnectionManager;
    private _socket: WebSocket;
    private _connecting = false;
    private _connection: WebSocketConnection;

    // Fires when the transport recieves new packets.
    public packetReceived: ((packet: Packet<IConnection>) => void)[] = [];

    // Fires when a remote peer has opened a connection.
    public connectionOpened: ((connection: IConnection) => void)[] = [];

    // Fires when a connection to a remote peer is closed.
    public connectionClosed: ((connection: IConnection) => void)[] = [];

    // Starts the transport
    public start(type: string, handler: IConnectionManager, token: Cancellation.Token): Promise<void> {
        this._type = this.name;
        this._connectionManager = handler;

        this.isRunning = true;

        token.onCancelled(this.stop);

        return Promise.resolve();
    }

    private stop() {
        this.isRunning = false;
        if (this._socket) {
            this._socket.close();
            this._socket = null;
        }
    }

    // Connects the transport to a remote host.
    public connect(endpoint: string): Promise<IConnection> {
        if (!this._socket && !this._connecting) {
            this._connecting = true;

            var socket = new WebSocket(endpoint + "/");
            socket.binaryType = "arraybuffer";

            socket.onmessage = args => this.onMessage(args.data);

            this._socket = socket;

            var deferred = new Deferred<IConnection>();
            socket.onclose = args => this.onClose(deferred, args);
            socket.onopen = () => this.onOpen(deferred);
            return deferred.promise();
        }
        throw new Error("This transport is already connected.");
    }

    private createNewConnection(socket: WebSocket): WebSocketConnection {
        var cid = this._connectionManager.generateNewConnectionId();
        return new WebSocketConnection(cid, socket);
    }

    private onOpen(deferred: Deferred<IConnection>) {
        this._connecting = false;

        var connection = this.createNewConnection(this._socket);

        this._connectionManager.newConnection(connection);

        this.connectionOpened.map(action => {
            action(connection);
        });

        this._connection = connection;

        deferred.resolve(connection);
    }

    private onMessage(buffer: ArrayBuffer) {
        var data = new Uint8Array(buffer);
        if (this._connection) {
            var packet = new Packet<IConnection>(this._connection, data);

            if (data[0] === MessageIDTypes.ID_CONNECTION_RESULT) {
                this.id = data.subarray(1, 9);
            }
            else {
                this.packetReceived.map(action => {
                    action(packet);
                });
            }
        }
    }

    private onClose(deferred: Deferred<IConnection>, closeEvent: CloseEvent) {
        if (!this._connection) {
            this._connecting = false;

            deferred.reject(new Error("Can't connect WebSocket to server. Error code: " + closeEvent.code + ". Reason: " + closeEvent.reason + "."));
            this._socket = null;
        }
        else {
            var reason = closeEvent.wasClean ? "CLIENT_DISCONNECTED" : "CONNECTION_LOST";

            if (this._connection) {
                this._connectionManager.closeConnection(this._connection, reason);

                this.connectionClosed.map(action => {
                    action(this._connection);
                });
            }
        }
    }
}

}
