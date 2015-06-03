/// <reference path="../src/stormancer-sdk-js/Scripts/typings/jquery/jquery.d.ts" />
declare module Stormancer {
    class ApiClient {
        constructor(config: Configuration, tokenHandler: ITokenHandler);
        private _config;
        private createTokenUri;
        private _tokenHandler;
        getSceneEndpoint<T>(accountId: string, applicationName: string, sceneId: string, userData: T): JQueryPromise<SceneEndpoint>;
    }
}
declare module Cancellation {
    class tokenSource {
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
declare module Stormancer {
    class ConnectionHandler implements IConnectionManager {
        private _current;
        generateNewConnectionId(): number;
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
        applicationName: string;
        _logger: ILogger;
        constructor(config: Configuration);
        private initialize();
        private transportPacketReceived(packet);
        getPublicScene<T>(sceneId: string, userData: T): JQueryPromise<IScene>;
        getScene(token: string): JQueryPromise<IScene>;
        private getSceneImpl(sceneId, ci);
        private updateMetadata();
        private sendSystemRequest<T, U>(id, parameter);
        private _systemSerializer;
        private ensureTransportStarted(ci);
        private startTransport();
        private registerConnection(connection);
        private _serverConnection;
        disconnectScene(scene: IScene, sceneHandle: number): JQueryPromise<void>;
        disconnect(): void;
        connectToScene(scene: Scene, token: string, localRoutes: Route[]): JQueryPromise<void>;
        id: number;
        serverTransportType: string;
    }
}
declare module Stormancer {
    class Configuration {
        constructor();
        static apiEndpoint: string;
        serverEndpoint: string;
        account: string;
        application: string;
        getApiEndpoint(): string;
        static forAccount(accountId: string, applicationName: string): Configuration;
        metadata: Map;
        Metadata(key: string, value: string): Configuration;
        dispatcher: IPacketDispatcher;
        transport: ITransport;
        serializers: ISerializer[];
    }
}
declare module Stormancer {
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
        sendSystem(msgId: number, data: Uint8Array): void;
        sendToScene(sceneIndex: number, route: number, data: Uint8Array, priority: PacketPriority, reliability: PacketReliability): void;
        connectionClosed: ((reason: string) => void)[];
        setApplication(account: string, application: string): void;
        serializerChosen: boolean;
        serializer: ISerializer;
    }
}
declare module Stormancer {
    interface IConnectionStatistics {
        packetLossRate: number;
        bytesPerSecondLimitationType: any;
        bytesPerSecondLimit: number;
        queuedBytes: number;
        queuedBytesForPriority(priority: PacketPriority): number;
        queuedPackets: number;
        queuedPacketsForPriority(priority: PacketPriority): number;
    }
}
declare module Stormancer {
    interface ILogger {
        trace(message: string): void;
        debug(message: string): void;
        error(ex: ExceptionInformation): void;
        error(format: string): void;
        info(format: string): void;
    }
}
declare module Stormancer {
    interface IScene {
        id: string;
        getHostMetadata(key: string): string;
        handle: number;
        connected: boolean;
        hostConnection: IConnection;
        addRoute(route: string, handler: (packet: Packet<IScenePeer>) => void, metadata?: Map): void;
        registerRoute<T>(route: string, handler: (message: T) => void): void;
        sendPacket(route: string, data: Uint8Array, priority?: PacketPriority, reliability?: PacketReliability): void;
        send<T>(route: string, data: T, priority?: PacketPriority, reliability?: PacketReliability): void;
        disconnect(): JQueryPromise<void>;
        connect(): JQueryPromise<void>;
        packetReceived: ((packet: Packet<IConnection>) => void)[];
        host(): IScenePeer;
    }
}
declare module Stormancer {
    interface IScenePeer {
        send(route: string, data: Uint8Array, priority?: PacketPriority, reliability?: PacketReliability): void;
        id(): number;
    }
}
declare module Stormancer {
    interface ISerializer {
        serialize<T>(data: T): Uint8Array;
        deserialize<T>(bytes: Uint8Array): T;
        name: string;
    }
}
declare module Stormancer {
    interface RouteDto {
        Name: string;
        Handle: number;
        Metadata: Map;
    }
}
declare module Stormancer {
    class Packet<T> {
        constructor(source: T, data: Uint8Array, metadata?: IMap<any>);
        data: Uint8Array;
        private _metadata;
        setMetadata(metadata: IMap<any>): void;
        getMetadata(): IMap<any>;
        setMetadataValue(key: string, value: any): void;
        getMetadataValue(key: string): any;
        connection: T;
    }
}
declare module Stormancer {
    enum PacketPriority {
        IMMEDIATE_PRIORITY = 0,
        HIGH_PRIORITY = 1,
        MEDIUM_PRIORITY = 2,
        LOW_PRIORITY = 3,
    }
}
declare module Stormancer {
    enum PacketReliability {
        UNRELIABLE = 0,
        UNRELIABLE_SEQUENCED = 1,
        RELIABLE = 2,
        RELIABLE_ORDERED = 3,
        RELIABLE_SEQUENCED = 4,
    }
}
declare module Stormancer {
    class Route {
        scene: IScene;
        name: string;
        index: number;
        metadata: Map;
        handlers: ((packet: Packet<IConnection>) => void)[];
        constructor(scene: IScene, name: string, index?: number, metadata?: Map);
    }
}
declare module Stormancer {
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
        static promiseFromResult<T>(result: T): JQueryPromise<T>;
        static promiseIf(condition: boolean, action: () => JQueryPromise<void>, context?: any): JQueryPromise<void>;
    }
    interface IObserver<T> {
        onCompleted(): void;
        onError(error: any): void;
        onNext(value: T): void;
    }
}
declare module Stormancer {
    interface IClient {
        applicationName: string;
        _logger: ILogger;
        getPublicScene<T>(sceneId: string, userData: T): JQueryPromise<IScene>;
        getScene(token: string): JQueryPromise<IScene>;
        disconnect(): void;
        id: number;
        serverTransportType: string;
    }
}
declare module Stormancer {
    interface IConnectionManager {
        generateNewConnectionId(): number;
        newConnection(connection: IConnection): void;
        closeConnection(connection: IConnection, reason: string): void;
        getConnection(id: number): IConnection;
    }
}
declare module Stormancer {
    class DefaultPacketDispatcher implements IPacketDispatcher {
        private _handlers;
        private _defaultProcessors;
        dispatchPacket(packet: Packet<IConnection>): void;
        addProcessor(processor: IPacketProcessor): void;
    }
}
declare module Stormancer {
    interface IPacketDispatcher {
        dispatchPacket(packet: Packet<IConnection>): void;
        addProcessor(processor: IPacketProcessor): void;
    }
}
declare module Stormancer {
    interface ITokenHandler {
        decodeToken(token: string): SceneEndpoint;
    }
    class TokenHandler implements ITokenHandler {
        private _tokenSerializer;
        constructor();
        decodeToken(token: string): SceneEndpoint;
    }
}
declare module Stormancer {
    interface IRequestModule {
        register(builder: (msgId: number, handler: (context: RequestContext) => JQueryPromise<void>) => void): void;
    }
}
declare module Stormancer {
    class MsgPackSerializer implements ISerializer {
        serialize<T>(data: T): Uint8Array;
        deserialize<T>(bytes: Uint8Array): T;
        name: string;
    }
}
declare module Stormancer {
    class PacketProcessorConfig {
        constructor(handlers: IMap<(packet: Packet<IConnection>) => boolean>, defaultprocessors: ((n: number, p: Packet<IConnection>) => boolean)[]);
        private _handlers;
        private _defaultProcessors;
        addProcessor(msgId: number, handler: (p: Packet<IConnection>) => boolean): void;
        addCatchAllProcessor(handler: (n: number, p: Packet<IConnection>) => boolean): void;
    }
    interface IPacketProcessor {
        registerProcessor(config: PacketProcessorConfig): void;
    }
}
declare module Stormancer {
    interface IRequest {
        lastRefresh: Date;
        id: number;
        observer: IObserver<Packet<IConnection>>;
        deferred: JQueryDeferred<void>;
    }
}
declare module Stormancer {
    interface ITransport {
        start(type: string, handler: IConnectionManager, token: Cancellation.token): JQueryPromise<void>;
        isRunning: boolean;
        connect(endpoint: string): JQueryPromise<IConnection>;
        packetReceived: ((packet: Packet<IConnection>) => void)[];
        connectionOpened: ((connection: IConnection) => void)[];
        connectionClosed: ((connection: IConnection) => void)[];
        name: string;
        id: Uint8Array;
    }
}
declare module Stormancer {
    class MessageIDTypes {
        static ID_SYSTEM_REQUEST: number;
        static ID_REQUEST_RESPONSE_MSG: number;
        static ID_REQUEST_RESPONSE_COMPLETE: number;
        static ID_REQUEST_RESPONSE_ERROR: number;
        static ID_CONNECTION_RESULT: number;
        static ID_SCENES: number;
    }
    class SystemRequestIDTypes {
        static ID_GET_SCENE_INFOS: number;
        static ID_CONNECT_TO_SCENE: number;
        static ID_SET_METADATA: number;
        static ID_SCENE_READY: number;
        static ID_DISCONNECT_FROM_SCENE: number;
    }
}
declare module Stormancer {
    interface Request {
        lastRefresh: Date;
        id: number;
        observer: IObserver<Packet<IConnection>>;
        deferred: JQueryDeferred<void>;
    }
}
declare module Stormancer {
    class RequestContext {
        private _packet;
        private _requestId;
        private _didSendValues;
        inputData: Uint8Array;
        isComplete: boolean;
        constructor(p: Packet<IConnection>);
        send(data: Uint8Array): void;
        complete(): void;
        error(data: Uint8Array): void;
    }
}
declare module Stormancer {
    class RequestProcessor implements IPacketProcessor {
        private _pendingRequests;
        private _logger;
        private _isRegistered;
        private _handlers;
        constructor(logger: ILogger, modules: IRequestModule[]);
        registerProcessor(config: PacketProcessorConfig): void;
        addSystemRequestHandler(msgId: number, handler: (context: RequestContext) => JQueryPromise<void>): void;
        private reserveRequestSlot(observer);
        sendSystemRequest(peer: IConnection, msgId: number, data: Uint8Array): JQueryPromise<Packet<IConnection>>;
    }
}
declare module Stormancer {
    class SceneDispatcher implements IPacketProcessor {
        private _scenes;
        private _buffers;
        registerProcessor(config: PacketProcessorConfig): void;
        private handler(sceneHandle, packet);
        addScene(scene: Scene): void;
        removeScene(sceneHandle: number): void;
    }
}
declare module Stormancer {
    class Scene implements IScene {
        id: string;
        handle: number;
        connected: boolean;
        hostConnection: IConnection;
        private _token;
        private _metadata;
        private _remoteRoutesMap;
        private _localRoutesMap;
        private _client;
        constructor(connection: IConnection, client: Client, id: string, token: string, dto: SceneInfosDto);
        getHostMetadata(key: string): string;
        addRoute(route: string, handler: (packet: Packet<IScenePeer>) => void, metadata?: Map): void;
        registerRoute<T>(route: string, handler: (message: T, dataView: DataView) => void): void;
        private onMessageImpl(route, handler);
        sendPacket(route: string, data: Uint8Array, priority?: PacketPriority, reliability?: PacketReliability): void;
        send<T>(route: string, data: T, priority?: PacketPriority, reliability?: PacketReliability): void;
        connect(): JQueryPromise<void>;
        disconnect(): JQueryPromise<void>;
        handleMessage(packet: Packet<IConnection>): void;
        completeConnectionInitialization(cr: ConnectionResult): void;
        private _handlers;
        packetReceived: ((packet: Packet<IConnection>) => void)[];
        host(): IScenePeer;
    }
}
declare module Stormancer {
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
    }
}
declare module Stormancer {
    class ScenePeer implements IScenePeer {
        private _connection;
        private _sceneHandle;
        private _routeMapping;
        private _scene;
        id(): number;
        constructor(connection: IConnection, sceneHandle: number, routeMapping: IMap<Route>, scene: IScene);
        send(route: string, data: Uint8Array, priority: PacketPriority, reliability: PacketReliability): void;
    }
}
declare function vblen(b: any): any;
declare function vbstr(b: any): any;
declare module Stormancer {
    class jQueryWrapper {
        static $: JQueryStatic;
        static initWrapper(jquery: JQueryStatic): void;
    }
}
interface JQueryStatic {
    stormancer: (configuration: Stormancer.Configuration) => Stormancer.IClient;
}
declare module Stormancer {
    interface ConnectToSceneMsg {
        Token: string;
        Routes: RouteDto[];
        ConnectionMetadata: Map;
    }
}
declare module Stormancer {
    interface ConnectionResult {
        SceneHandle: number;
        RouteMappings: IMap<number>;
    }
}
declare module Stormancer {
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
}
declare module Stormancer {
    class WebSocketConnection implements IConnection {
        private _socket;
        constructor(id: number, socket: WebSocket);
        id: number;
        connectionDate: Date;
        metadata: Map;
        account: string;
        application: string;
        state: ConnectionState;
        close(): void;
        sendSystem(msgId: number, data: Uint8Array): void;
        sendToScene(sceneIndex: number, route: number, data: Uint8Array, priority: PacketPriority, reliability: PacketReliability): void;
        connectionClosed: ((reason: string) => void)[];
        setApplication(account: string, application: string): void;
        serializerChosen: boolean;
        serializer: ISerializer;
    }
}
declare module Stormancer {
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
        start(type: string, handler: IConnectionManager, token: Cancellation.token): JQueryPromise<void>;
        private stop();
        connect(endpoint: string): JQueryPromise<IConnection>;
        private createNewConnection(socket);
        private onOpen(deferred);
        private onMessage(buffer);
        private onClose(deferred, closeEvent);
    }
}
