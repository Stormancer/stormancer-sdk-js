/// <reference path="msgpack5.no-module.d.ts" />
declare namespace Stormancer {
    class ApiClient {
        constructor(config: Configuration, tokenHandler: ITokenHandler);
        private _config;
        private createTokenUri;
        private _tokenHandler;
        getSceneEndpoint(accountId: string, applicationName: string, sceneId: string, userData: any): Promise<SceneEndpoint>;
    }
    module Cancellation {
        class TokenSource {
            constructor();
            private data;
            cancel(reason?: string): void;
            token: token;
        }
        class token {
            constructor(data: sourceData);
            private data;
            isCancelled(): boolean;
            throwIfCancelled(): void;
            onCancelled(callBack: (reason: string) => void): void;
        }
        interface sourceData {
            reason: string;
            isCancelled: boolean;
            listeners: ((reason: string) => void)[];
        }
    }
    class ConnectionHandler implements IConnectionManager {
        private _current;
        generateNewConnectionId(): number;
        connectionCount: number;
        newConnection(connection: IConnection): void;
        getConnection(id: number): IConnection;
        closeConnection(connection: IConnection, reason: string): void;
    }
    class Client implements IClient {
        private _apiClient;
        private _accountId;
        private _applicationName;
        private _transport;
        private _dispatcher;
        private _initialized;
        private _tokenHandler;
        private _requestProcessor;
        private _scenesDispatcher;
        private _serializers;
        private _cts;
        private _metadata;
        private _pluginCtx;
        applicationName: string;
        logger: ILogger;
        id: number;
        serverTransportType: string;
        constructor(config: Configuration);
        private initialize();
        private transportPacketReceived(packet);
        getPublicScene(sceneId: string, userData: any): Promise<Scene>;
        getScene(token: string): Promise<Scene>;
        private getSceneImpl(sceneId, ci);
        private updateMetadata();
        private sendSystemRequest<T, U>(id, parameter);
        private _systemSerializer;
        private ensureTransportStarted(ci);
        private startTransport();
        private registerConnection(connection);
        private _serverConnection;
        disconnectScene(scene: Scene, sceneHandle: number): Promise<void>;
        disconnect(): void;
        connectToScene(scene: Scene, token: string, localRoutes: Route[]): Promise<void>;
        lastPing(): number;
        private _lastPing;
        private _clockValues;
        private _offset;
        private _medianLatency;
        private _standardDeviationLatency;
        private _pingInterval;
        private _pingIntervalAtStart;
        private _maxClockValues;
        private _watch;
        private _syncclockstarted;
        private startAsyncClock();
        private stopAsyncClock();
        private syncClockImpl();
        clock(): number;
    }
    class Configuration {
        constructor();
        static forAccount(accountId: string, applicationName: string): Configuration;
        serverEndpoint: string;
        account: string;
        application: string;
        plugins: IClientPlugin[];
        getApiEndpoint(): string;
        metadata: Map;
        Metadata(key: string, value: string): Configuration;
        dispatcher: IPacketDispatcher;
        transport: ITransport;
        serializers: ISerializer[];
    }
    interface Map {
        [key: string]: string;
    }
    interface IMap<T> {
        [key: string]: T;
    }
    class Helpers {
        static base64ToByteArray(data: string): Uint8Array;
        static stringFormat(str: string, ...args: any[]): string;
        static mapKeys(map: {
            [key: string]: any;
        }): string[];
        static mapValues<T>(map: IMap<T>): T[];
        static promiseIf(condition: boolean, action: () => Promise<void>, context?: any): Promise<void>;
        static invokeWrapping<TResult>(func: (arg?: any) => TResult, arg?: any): Promise<TResult>;
    }
    interface IObserver<T> {
        onCompleted(): void;
        onError(error: any): void;
        onNext(value: T): void;
    }
    class Deferred<T> {
        constructor();
        promise(): Promise<T>;
        state(): string;
        resolve(value?: T): void;
        reject(error?: any): void;
        private _promise;
        private _state;
        private _resolve;
        private _reject;
    }
    interface IClient {
        applicationName: string;
        logger: ILogger;
        getPublicScene<T>(sceneId: string, userData: T): Promise<Scene>;
        getScene(token: string): Promise<Scene>;
        disconnect(): void;
        id: number;
        serverTransportType: string;
        clock(): number;
        lastPing(): number;
    }
    interface IConnectionManager {
        generateNewConnectionId(): number;
        newConnection(connection: IConnection): void;
        closeConnection(connection: IConnection, reason: string): void;
        getConnection(id: number): IConnection;
        connectionCount: number;
    }
    class PacketProcessorConfig {
        constructor(handlers: IMap<(packet: Packet<IConnection>) => boolean>, defaultProcessors: ((n: number, p: Packet<IConnection>) => boolean)[]);
        private _handlers;
        private _defaultProcessors;
        addProcessor(msgId: number, handler: (p: Packet<IConnection>) => boolean): void;
        addCatchAllProcessor(handler: (n: number, p: Packet<IConnection>) => boolean): void;
    }
    interface IPacketProcessor {
        registerProcessor(config: PacketProcessorConfig): void;
    }
    interface ITransport {
        start(type: string, handler: IConnectionManager, token: Cancellation.token): Promise<void>;
        isRunning: boolean;
        connect(endpoint: string): Promise<IConnection>;
        packetReceived: ((packet: Packet<IConnection>) => void)[];
        connectionOpened: ((connection: IConnection) => void)[];
        connectionClosed: ((connection: IConnection) => void)[];
        name: string;
        id: Uint8Array;
    }
    class MessageIDTypes {
        static ID_SYSTEM_REQUEST: number;
        static ID_REQUEST_RESPONSE_MSG: number;
        static ID_REQUEST_RESPONSE_COMPLETE: number;
        static ID_REQUEST_RESPONSE_ERROR: number;
        static ID_CONNECTION_RESULT: number;
        static ID_SCENES: number;
    }
    class Scene {
        id: string;
        isHost: boolean;
        handle: number;
        connected: boolean;
        hostConnection: IConnection;
        localRoutes: IMap<Route>;
        remoteRoutes: IMap<Route>;
        private _token;
        private _metadata;
        private _client;
        constructor(connection: IConnection, client: Client, id: string, token: string, dto: SceneInfosDto);
        getHostMetadata(key: string): string;
        addRoute(route: string, handler: (packet: Packet<IScenePeer>) => void, metadata?: Map): void;
        registerRoute<T>(route: string, handler: (data: T) => void, metadata?: Map): void;
        private onMessageImpl(route, handler);
        sendPacket(route: string, data: Uint8Array, priority?: PacketPriority, reliability?: PacketReliability): void;
        send<T>(route: string, data: T, priority?: PacketPriority, reliability?: PacketReliability): void;
        connect(): Promise<void>;
        disconnect(): Promise<void>;
        handleMessage(packet: Packet<IConnection>): void;
        completeConnectionInitialization(cr: ConnectionResult): void;
        private _handlers;
        packetReceived: ((packet: Packet<IConnection>) => void)[];
        host(): IScenePeer;
        a: IMap<string>;
        private _registeredComponents;
        registerComponent<T>(componentName: string, factory: () => T): void;
        getComponent<T>(componentName: string): T;
    }
    class SceneEndpoint {
        tokenData: ConnectionData;
        token: string;
    }
    class ConnectionData {
        Endpoints: Map;
        AccountId: string;
        Application: string;
        SceneId: string;
        Routing: string;
        Issued: Date;
        Expiration: Date;
        UserData: Uint8Array;
        ContentType: string;
        Version: number;
    }
    class ScenePeer implements IScenePeer {
        private _connection;
        private _sceneHandle;
        private _routeMapping;
        private _scene;
        constructor(connection: IConnection, sceneHandle: number, routeMapping: IMap<Route>, scene: Scene);
        serializer: ISerializer;
        id: number;
        send(route: string, data: Uint8Array, priority: PacketPriority, reliability: PacketReliability): void;
        getComponent<T>(componentName: string): T;
    }
    class SystemRequestIDTypes {
        static ID_SET_METADATA: number;
        static ID_SCENE_READY: number;
        static ID_PING: number;
        static ID_CONNECT_TO_SCENE: number;
        static ID_DISCONNECT_FROM_SCENE: number;
        static ID_GET_SCENE_INFOS: number;
    }
    enum ConnectionState {
        Disconnected = 0,
        Connecting = 1,
        Connected = 2,
    }
    interface IConnection {
        id: number;
        connectionDate: Date;
        metadata: Map;
        account: string;
        application: string;
        state: ConnectionState;
        close(): void;
        connectionClosed: ((reason: string) => void)[];
        ping: number;
        serializerChosen: boolean;
        serializer: ISerializer;
        registerComponent<T>(componentName: string, component: T): void;
        getComponent<T>(componenentName: string): T;
        sendSystem(msgId: number, data: Uint8Array, priority?: PacketPriority): void;
        sendToScene(sceneIndex: number, route: number, data: Uint8Array, priority: PacketPriority, reliability: PacketReliability): void;
        setApplication(account: string, application: string): void;
    }
    interface IConnectionStatistics {
        packetLossRate: number;
        bytesPerSecondLimitationType: any;
        bytesPerSecondLimit: number;
        queuedBytes: number;
        queuedBytesForPriority(priority: PacketPriority): number;
        queuedPackets: number;
        queuedPacketsForPriority(priority: PacketPriority): number;
    }
    enum LogLevel {
        fatal = 0,
        error = 1,
        warn = 2,
        info = 3,
        debug = 4,
        trace = 5,
    }
    interface ILogger {
        log(level: LogLevel, category: string, message: string, data: any): any;
    }
    interface IScenePeer {
        send(route: string, data: Uint8Array, priority: PacketPriority, reliability: PacketReliability): void;
        id: number;
        getComponent<T>(componentName: string): T;
        serializer: ISerializer;
    }
    interface ISerializer {
        serialize<T>(data: T): Uint8Array;
        deserialize<T>(bytes: Uint8Array): T;
        name: string;
    }
    class Packet<T> {
        constructor(source: T, data: Uint8Array, metadata?: IMap<any>);
        connection: T;
        data: Uint8Array;
        getDataView(): DataView;
        readObject(): any;
        private metadata;
        setMetadata(metadata: IMap<any>): void;
        getMetadata(): IMap<any>;
        setMetadataValue(key: string, value: any): void;
        getMetadataValue(key: string): any;
    }
    enum PacketPriority {
        IMMEDIATE_PRIORITY = 0,
        HIGH_PRIORITY = 1,
        MEDIUM_PRIORITY = 2,
        LOW_PRIORITY = 3,
    }
    enum PacketReliability {
        UNRELIABLE = 0,
        UNRELIABLE_SEQUENCED = 1,
        RELIABLE = 2,
        RELIABLE_ORDERED = 3,
        RELIABLE_SEQUENCED = 4,
    }
    class Route {
        constructor(scene: Scene, name: string, handle?: number, metadata?: Map);
        scene: Scene;
        name: string;
        handle: number;
        metadata: Map;
        handlers: ((packet: Packet<IConnection>) => void)[];
    }
    class DefaultPacketDispatcher implements IPacketDispatcher {
        private _handlers;
        private _defaultProcessors;
        dispatchPacket(packet: Packet<IConnection>): void;
        addProcessor(processor: IPacketProcessor): void;
    }
    interface IRequestModule {
        register(builder: (msgId: number, handler: (context: RequestContext) => Promise<void>) => void): void;
    }
    interface IPacketDispatcher {
        addProcessor(processor: IPacketProcessor): void;
        dispatchPacket(packet: Packet<IConnection>): void;
    }
    interface ISubscription {
        unsubscribe(): void;
    }
    interface ITokenHandler {
        decodeToken(token: string): SceneEndpoint;
    }
    class TokenHandler implements ITokenHandler {
        private _tokenSerializer;
        constructor();
        decodeToken(token: string): SceneEndpoint;
    }
    class MsgPackSerializer implements ISerializer {
        constructor();
        serialize<T>(data: T): Uint8Array;
        deserialize<T>(bytes: Uint8Array): T;
        name: string;
        private _msgpack;
    }
    interface IClientPlugin {
        build(ctx: PluginBuildContext): void;
    }
    class PluginBuildContext {
        constructor();
        sceneCreated: ((scene: Scene) => void)[];
        clientCreated: ((client: IClient) => void)[];
        sceneConnected: ((scene: Scene) => void)[];
        sceneDisconnected: ((scene: Scene) => void)[];
        packetReceived: ((packet: Packet<IConnection>) => void)[];
    }
    class RpcClientPlugin implements IClientPlugin {
        static NextRouteName: string;
        static ErrorRouteName: string;
        static CompletedRouteName: string;
        static CancellationRouteName: string;
        static Version: string;
        static PluginName: string;
        static ServiceName: string;
        build(ctx: PluginBuildContext): void;
    }
    class RpcRequestContext {
        private _scene;
        private id;
        private _ordered;
        private _peer;
        private _msgSent;
        private _data;
        private _cancellationToken;
        remotePeer(): IScenePeer;
        data(): Uint8Array;
        cancellationToken(): Cancellation.token;
        constructor(peer: IScenePeer, scene: Scene, id: number, ordered: boolean, data: Uint8Array, token: Cancellation.token);
        private writeRequestId(data);
        sendValue(data: Uint8Array, priority: PacketPriority): void;
        sendError(errorMsg: string): void;
        sendCompleted(): void;
    }
    class RpcService {
        private _currentRequestId;
        private _scene;
        private _pendingRequests;
        private _runningRequests;
        private _msgpackSerializer;
        constructor(scene: Scene);
        rpc(route: string, objectOrData: any, onNext: (packet: Packet<IScenePeer>) => void, onError?: (error: string) => void, onCompleted?: () => void, priority?: PacketPriority): ISubscription;
        addProcedure(route: string, handler: (ctx: RpcRequestContext) => any, ordered: boolean): void;
        private reserveId();
        private computeId(packet);
        private getPendingRequest(packet);
        next(packet: Packet<IScenePeer>): void;
        error(packet: Packet<IScenePeer>): void;
        complete(packet: Packet<IScenePeer>): void;
        cancel(packet: Packet<IScenePeer>): void;
        disconnected(): void;
    }
    class RequestContext {
        private _packet;
        private _requestId;
        private _didSendValues;
        inputData: Uint8Array;
        isComplete: boolean;
        constructor(packet: Packet<IConnection>);
        send(data: Uint8Array): void;
        complete(): void;
        error(data: Uint8Array): void;
    }
    class RequestProcessor implements IPacketProcessor {
        private _pendingRequests;
        private _logger;
        private _isRegistered;
        private _handlers;
        private _currentId;
        constructor(logger: ILogger, modules: IRequestModule[]);
        registerProcessor(config: PacketProcessorConfig): void;
        addSystemRequestHandler(msgId: number, handler: (context: RequestContext) => Promise<void>): void;
        private reserveRequestSlot(observer);
        sendSystemRequest(peer: IConnection, msgId: number, data: Uint8Array, priority?: PacketPriority): Promise<Packet<IConnection>>;
    }
    class SceneDispatcher implements IPacketProcessor {
        private _scenes;
        private _buffers;
        registerProcessor(config: PacketProcessorConfig): void;
        private handler(sceneHandle, packet);
        addScene(scene: Scene): void;
        removeScene(sceneHandle: number): void;
    }
    function $http(url: any, options?: any): {
        'get': <T>(args: any, options: any) => Promise<T>;
        'post': <T>(args: any, options: any) => Promise<T>;
        'put': <T>(args: any, options: any) => Promise<T>;
        'delete': <T>(args: any, options: any) => Promise<T>;
    };
    interface ConnectToSceneMsg {
        Token: string;
        Routes: RouteDto[];
        ConnectionMetadata: Map;
    }
    interface ConnectionResult {
        SceneHandle: number;
        RouteMappings: IMap<number>;
    }
    interface RouteDto {
        Name: string;
        Handle: number;
        Metadata: Map;
    }
    interface SceneInfosRequestDto {
        Token: string;
        Metadata: Map;
    }
    interface SceneInfosDto {
        SceneId: string;
        Metadata: Map;
        Routes: RouteDto[];
        SelectedSerializer: string;
    }
    class WebSocketConnection implements IConnection {
        private _socket;
        constructor(id: number, socket: WebSocket);
        id: number;
        connectionDate: Date;
        metadata: Map;
        account: string;
        application: string;
        state: ConnectionState;
        ping: number;
        close(): void;
        sendSystem(msgId: number, data: Uint8Array, priority?: PacketPriority): void;
        sendToScene(sceneIndex: number, route: number, data: Uint8Array, priority: PacketPriority, reliability: PacketReliability): void;
        connectionClosed: ((reason: string) => void)[];
        setApplication(account: string, application: string): void;
        serializerChosen: boolean;
        serializer: ISerializer;
        private _registeredComponents;
        registerComponent<T>(componentName: string, component: T): void;
        getComponent<T>(componentName: any): T;
    }
    class WebSocketTransport implements ITransport {
        name: string;
        id: Uint8Array;
        isRunning: boolean;
        private _type;
        private _connectionManager;
        private _socket;
        private _connecting;
        private _connection;
        packetReceived: ((packet: Packet<IConnection>) => void)[];
        connectionOpened: ((connection: IConnection) => void)[];
        connectionClosed: ((connection: IConnection) => void)[];
        start(type: string, handler: IConnectionManager, token: Cancellation.token): Promise<void>;
        private stop();
        connect(endpoint: string): Promise<IConnection>;
        private createNewConnection(socket);
        private onOpen(deferred);
        private onMessage(buffer);
        private onClose(deferred, closeEvent);
    }
}
