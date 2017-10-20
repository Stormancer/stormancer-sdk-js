import * as msgpack5 from 'msgpack5';
export var Stormancer;
(function (Stormancer) {
    class ApiClient {
        constructor(config, tokenHandler) {
            this.createTokenUri = "{0}/{1}/scenes/{2}/token";
            this._config = config;
            this._tokenHandler = tokenHandler;
        }
        getSceneEndpoint(accountId, applicationName, sceneId, userData) {
            var url = this._config.getApiEndpoint() + Helpers.stringFormat(this.createTokenUri, accountId, applicationName, sceneId);
            var promise = $http(url).post({}, {
                type: "POST",
                url: url,
                headers: {
                    "Accept": "application/json",
                    "x-version": "1.0.0"
                },
                dataType: "json",
                contentType: "application/json",
                data: JSON.stringify(userData)
            }).then(result => this._tokenHandler.decodeToken(JSON.parse(result)));
            promise.catch(error => console.error("get token error:" + error));
            return promise;
        }
    }
    Stormancer.ApiClient = ApiClient;
    var Cancellation;
    (function (Cancellation) {
        class TokenSource {
            constructor() {
                this._data = {
                    reason: null,
                    isCancelled: false,
                    listeners: []
                };
                this._token = new Token(this._data);
            }
            cancel(reason) {
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
            getToken() {
                return this._token;
            }
        }
        Cancellation.TokenSource = TokenSource;
        class Token {
            constructor(data) {
                this._data = data;
            }
            isCancelled() {
                return this._data.isCancelled;
            }
            throwIfCancelled() {
                if (this.isCancelled()) {
                    throw this._data.reason;
                }
            }
            onCancelled(callBack) {
                if (this.isCancelled()) {
                    setTimeout(() => {
                        callBack(this._data.reason);
                    }, 0);
                }
                else {
                    this._data.listeners.push(callBack);
                }
            }
        }
        Cancellation.Token = Token;
    })(Cancellation = Stormancer.Cancellation || (Stormancer.Cancellation = {}));
    class ConnectionHandler {
        constructor() {
            this._current = 0;
            this.connectionCount = null;
        }
        generateNewConnectionId() {
            return this._current++;
        }
        newConnection(connection) { }
        getConnection(id) {
            throw new Error("Not implemented.");
        }
        closeConnection(connection, reason) { }
    }
    Stormancer.ConnectionHandler = ConnectionHandler;
    class Client {
        constructor(config) {
            this._tokenHandler = new TokenHandler();
            this._serializers = { "msgpack/map": new MsgPackSerializer() };
            this._metadata = {};
            this._pluginCtx = new PluginBuildContext();
            this.applicationName = null;
            this.logger = null;
            this.id = null;
            this.serverTransportType = null;
            this._systemSerializer = new MsgPackSerializer();
            this._lastPing = null;
            this._clockValues = [];
            this._offset = 0;
            this._medianLatency = 0;
            this._standardDeviationLatency = 0;
            this._pingInterval = 5000;
            this._pingIntervalAtStart = 200;
            this._maxClockValues = 24;
            this._watch = new Watch();
            this._syncclockstarted = false;
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
        initialize() {
            if (!this._initialized) {
                this._initialized = true;
                this._transport.packetReceived.push(packet => this.transportPacketReceived(packet));
                this._watch.start();
            }
        }
        transportPacketReceived(packet) {
            for (var i = 0; i < this._pluginCtx.packetReceived.length; i++) {
                this._pluginCtx.packetReceived[i](packet);
            }
            this._dispatcher.dispatchPacket(packet);
        }
        getPublicScene(sceneId, userData) {
            return this._apiClient.getSceneEndpoint(this._accountId, this._applicationName, sceneId, userData)
                .then(ci => this.getSceneImpl(sceneId, ci));
        }
        getScene(token) {
            var ci = this._tokenHandler.decodeToken(token);
            return this.getSceneImpl(ci.tokenData.SceneId, ci);
        }
        getSceneImpl(sceneId, ci) {
            var self = this;
            return this.ensureTransportStarted(ci).then(() => {
                if (ci.tokenData.Version > 0) {
                    this.startAsyncClock();
                }
                var parameter = { Metadata: self._serverConnection.metadata, Token: ci.token };
                return self.sendSystemRequest(SystemRequestIDTypes.ID_GET_SCENE_INFOS, parameter);
            }).then((result) => {
                if (!self._serverConnection.serializerChosen) {
                    if (!result.SelectedSerializer) {
                        throw new Error("No serializer selected.");
                    }
                    self._serverConnection.serializer = self._serializers[result.SelectedSerializer];
                    self._serverConnection.metadata["serializer"] = result.SelectedSerializer;
                    self._serverConnection.serializerChosen = true;
                }
                return self.updateMetadata().then(_ => result);
            }).then((r) => {
                var scene = new Scene(self._serverConnection, self, sceneId, ci.token, r);
                for (var i = 0; i < this._pluginCtx.sceneCreated.length; i++) {
                    this._pluginCtx.sceneCreated[i](scene);
                }
                return scene;
            });
        }
        updateMetadata() {
            return this._requestProcessor.sendSystemRequest(this._serverConnection, SystemRequestIDTypes.ID_SET_METADATA, this._systemSerializer.serialize(this._serverConnection.metadata));
        }
        sendSystemRequest(id, parameter) {
            return this._requestProcessor.sendSystemRequest(this._serverConnection, id, this._systemSerializer.serialize(parameter))
                .then(packet => this._systemSerializer.deserialize(packet.data));
        }
        ensureTransportStarted(ci) {
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
        startTransport() {
            this._cts = new Cancellation.TokenSource();
            return this._transport.start("client", new ConnectionHandler(), this._cts.getToken());
        }
        registerConnection(connection) {
            this._serverConnection = connection;
            for (var key in this._metadata) {
                this._serverConnection.metadata[key] = this._metadata[key];
            }
        }
        disconnectScene(scene, sceneHandle) {
            return this.sendSystemRequest(SystemRequestIDTypes.ID_DISCONNECT_FROM_SCENE, sceneHandle)
                .then(() => {
                this._scenesDispatcher.removeScene(sceneHandle);
                for (var i = 0; i < this._pluginCtx.sceneConnected.length; i++) {
                    this._pluginCtx.sceneConnected[i](scene);
                }
            });
        }
        disconnect() {
            if (this._serverConnection) {
                this._serverConnection.close();
            }
        }
        connectToScene(scene, token, localRoutes) {
            var parameter = {
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
            return this.sendSystemRequest(SystemRequestIDTypes.ID_CONNECT_TO_SCENE, parameter)
                .then(result => {
                scene.completeConnectionInitialization(result);
                this._scenesDispatcher.addScene(scene);
                for (var i = 0; i < this._pluginCtx.sceneConnected.length; i++) {
                    this._pluginCtx.sceneConnected[i](scene);
                }
            });
        }
        lastPing() {
            return this._lastPing;
        }
        startAsyncClock() {
            this._syncclockstarted = true;
            this.syncClockImpl();
        }
        stopAsyncClock() {
            this._syncclockstarted = false;
        }
        syncClockImpl() {
            try {
                var timeStart = this._watch.getElapsedTime();
                var data = new Uint32Array(2);
                data[0] = timeStart;
                data[1] = (timeStart >> 32);
                this._requestProcessor.sendSystemRequest(this._serverConnection, SystemRequestIDTypes.ID_PING, new Uint8Array(data.buffer), PacketPriority.IMMEDIATE_PRIORITY).then(packet => {
                    var timeEnd = this._watch.getElapsedTime();
                    var dataView = packet.getDataView();
                    var timeServer = dataView.getUint32(0, true) + (dataView.getUint32(4, true) << 32);
                    var ping = timeEnd - timeStart;
                    this._lastPing = ping;
                    var latency = ping / 2;
                    var offset = timeServer - timeEnd + latency;
                    this._clockValues.push({
                        latency: latency,
                        offset: offset
                    });
                    if (this._clockValues.length > this._maxClockValues) {
                        this._clockValues.shift();
                    }
                    var len = this._clockValues.length;
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
        clock() {
            if (this._offset) {
                return Math.floor(this._watch.getElapsedTime()) + this._offset;
            }
            return 0;
        }
    }
    Stormancer.Client = Client;
    class Configuration {
        constructor() {
            this.account = "";
            this.application = "";
            this.plugins = [];
            this.metadata = {};
            this.dispatcher = null;
            this.transport = null;
            this.serializers = [];
            this.transport = new WebSocketTransport();
            this.dispatcher = new DefaultPacketDispatcher();
            this.serializers = [];
            this.serializers.push(new MsgPackSerializer());
            this.plugins.push(new RpcClientPlugin());
        }
        static forAccount(accountId, applicationName) {
            var config = new Configuration();
            config.account = accountId;
            config.application = applicationName;
            return config;
        }
        getApiEndpoint() {
            if (!this.serverEndpoint) {
                throw new Error("server endpoint not set");
            }
            return this.serverEndpoint;
        }
        Metadata(key, value) {
            this.metadata[key] = value;
            return this;
        }
    }
    Stormancer.Configuration = Configuration;
    class Helpers {
        static base64ToByteArray(data) {
            return new Uint8Array(atob(data).split('').map(function (c) { return c.charCodeAt(0); }));
        }
        static stringFormat(str, ...args) {
            for (var i in args) {
                var regexp = new RegExp("\\{" + i + "\\}", "g");
                str = str.replace(regexp, args[i]);
            }
            return str;
        }
        static mapKeys(map) {
            var keys = [];
            for (var key in map) {
                if (map.hasOwnProperty(key)) {
                    keys.push(key);
                }
            }
            return keys;
        }
        static mapValues(map) {
            var result = [];
            for (var key in map) {
                result.push(map[key]);
            }
            return result;
        }
        static promiseIf(condition, action, context) {
            if (condition) {
                return action.call(context);
            }
            else {
                return Promise.resolve();
            }
        }
        static invokeWrapping(func, arg) {
            try {
                return Promise.resolve(func(arg));
            }
            catch (exception) {
                return Promise.reject(exception);
            }
        }
    }
    Stormancer.Helpers = Helpers;
    class Deferred {
        constructor() {
            this._state = "pending";
            this._promise = new Promise((resolve, reject) => {
                this._resolve = resolve;
                this._reject = reject;
            });
        }
        promise() {
            return this._promise;
        }
        state() {
            return this._state;
        }
        resolve(value) {
            this._resolve(value);
            this._state = "resolved";
        }
        reject(error) {
            this._reject(error);
            this._state = "rejected";
        }
    }
    Stormancer.Deferred = Deferred;
    class PacketProcessorConfig {
        constructor(handlers, defaultProcessors) {
            this._handlers = handlers;
            this._defaultProcessors = defaultProcessors;
        }
        addProcessor(msgId, handler) {
            if (this._handlers[msgId]) {
                throw new Error("An handler is already registered for id " + msgId);
            }
            this._handlers[msgId] = handler;
        }
        addCatchAllProcessor(handler) {
            this._defaultProcessors.push((n, p) => handler(n, p));
        }
    }
    Stormancer.PacketProcessorConfig = PacketProcessorConfig;
    class MessageIDTypes {
    }
    MessageIDTypes.ID_SYSTEM_REQUEST = 134;
    MessageIDTypes.ID_REQUEST_RESPONSE_MSG = 137;
    MessageIDTypes.ID_REQUEST_RESPONSE_COMPLETE = 138;
    MessageIDTypes.ID_REQUEST_RESPONSE_ERROR = 139;
    MessageIDTypes.ID_CONNECTION_RESULT = 140;
    MessageIDTypes.ID_SCENES = 141;
    Stormancer.MessageIDTypes = MessageIDTypes;
    class Scene {
        constructor(connection, client, id, token, dto) {
            this.isHost = false;
            this.handle = null;
            this.connected = false;
            this.localRoutes = {};
            this.remoteRoutes = {};
            this._handlers = {};
            this.packetReceived = [];
            this._registeredComponents = {};
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
        getHostMetadata(key) {
            return this._metadata[key];
        }
        addRoute(route, handler, metadata = {}) {
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
        registerRoute(route, handler, metadata = {}) {
            this.addRoute(route, (packet) => {
                var data = this.hostConnection.serializer.deserialize(packet.data);
                handler(data);
            }, metadata);
        }
        onMessageImpl(route, handler) {
            var action = (p) => {
                var packet = new Packet(this.host(), p.data, p.getMetadata());
                handler(packet);
            };
            route.handlers.push(p => action(p));
        }
        sendPacket(route, data, priority = PacketPriority.MEDIUM_PRIORITY, reliability = PacketReliability.RELIABLE) {
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
        send(route, data, priority = PacketPriority.MEDIUM_PRIORITY, reliability = PacketReliability.RELIABLE) {
            return this.sendPacket(route, this.hostConnection.serializer.serialize(data), priority, reliability);
        }
        connect() {
            var promise = this._client.connectToScene(this, this._token, Helpers.mapValues(this.localRoutes));
            return promise.then(() => {
                this.connected = true;
            });
        }
        disconnect() {
            return this._client.disconnectScene(this, this.handle);
        }
        handleMessage(packet) {
            var ev = this.packetReceived;
            ev && ev.map((value) => {
                value(packet);
            });
            var routeId = new DataView(packet.data.buffer, packet.data.byteOffset).getUint16(0, true);
            packet.data = packet.data.subarray(2);
            packet.setMetadataValue("routeId", routeId);
            var observer = this._handlers[routeId];
            observer && observer.map(value => {
                value(packet);
            });
        }
        completeConnectionInitialization(cr) {
            this.handle = cr.SceneHandle;
            for (var key in this.localRoutes) {
                var route = this.localRoutes[key];
                route.handle = cr.RouteMappings[key];
                this._handlers[route.handle] = route.handlers;
            }
        }
        host() {
            return new ScenePeer(this.hostConnection, this.handle, this.remoteRoutes, this);
        }
        registerComponent(componentName, factory) {
            this._registeredComponents[componentName] = factory;
        }
        getComponent(componentName) {
            if (!this._registeredComponents[componentName]) {
                throw new Error("Component not found");
            }
            return this._registeredComponents[componentName]();
        }
    }
    Stormancer.Scene = Scene;
    class SceneEndpoint {
    }
    Stormancer.SceneEndpoint = SceneEndpoint;
    class ConnectionData {
    }
    Stormancer.ConnectionData = ConnectionData;
    class ScenePeer {
        constructor(connection, sceneHandle, routeMapping, scene) {
            this.id = null;
            this._connection = connection;
            this._sceneHandle = sceneHandle;
            this._routeMapping = routeMapping;
            this._scene = scene;
            this.serializer = connection.serializer;
            this.id = this._connection.id;
        }
        send(route, data, priority, reliability) {
            var r = this._routeMapping[route];
            if (!r) {
                throw new Error("The route " + route + " is not declared on the server.");
            }
            this._connection.sendToScene(this._sceneHandle, r.handle, data, priority, reliability);
        }
        getComponent(componentName) {
            return this._connection.getComponent(componentName);
        }
    }
    Stormancer.ScenePeer = ScenePeer;
    class SystemRequestIDTypes {
    }
    SystemRequestIDTypes.ID_SET_METADATA = 0;
    SystemRequestIDTypes.ID_SCENE_READY = 1;
    SystemRequestIDTypes.ID_PING = 2;
    SystemRequestIDTypes.ID_CONNECT_TO_SCENE = 134;
    SystemRequestIDTypes.ID_DISCONNECT_FROM_SCENE = 135;
    SystemRequestIDTypes.ID_GET_SCENE_INFOS = 136;
    Stormancer.SystemRequestIDTypes = SystemRequestIDTypes;
    class Watch {
        constructor() {
            this._baseTime = 0;
            this.start();
        }
        start() {
            this._baseTime = this.now();
        }
        now() {
            return (typeof (window) !== "undefined" && window.performance && window.performance.now && window.performance.now()) || Date.now();
        }
        getElapsedTime() {
            return this.now() - this._baseTime;
        }
    }
    Stormancer.Watch = Watch;
    var ConnectionState;
    (function (ConnectionState) {
        ConnectionState[ConnectionState["Disconnected"] = 0] = "Disconnected";
        ConnectionState[ConnectionState["Connecting"] = 1] = "Connecting";
        ConnectionState[ConnectionState["Connected"] = 2] = "Connected";
    })(ConnectionState = Stormancer.ConnectionState || (Stormancer.ConnectionState = {}));
    var LogLevel;
    (function (LogLevel) {
        LogLevel[LogLevel["fatal"] = 0] = "fatal";
        LogLevel[LogLevel["error"] = 1] = "error";
        LogLevel[LogLevel["warn"] = 2] = "warn";
        LogLevel[LogLevel["info"] = 3] = "info";
        LogLevel[LogLevel["debug"] = 4] = "debug";
        LogLevel[LogLevel["trace"] = 5] = "trace";
    })(LogLevel = Stormancer.LogLevel || (Stormancer.LogLevel = {}));
    class Packet {
        constructor(source, data, metadata) {
            this.connection = null;
            this.data = null;
            this.metadata = null;
            this.connection = source;
            this.data = data;
            this.metadata = metadata;
        }
        getDataView() {
            return new DataView(this.data.buffer, this.data.byteOffset, this.data.byteLength);
        }
        readObject() {
            var msgpackSerializer = new MsgPackSerializer();
            return msgpackSerializer.deserialize(this.data);
        }
        setMetadata(metadata) {
            this.metadata = metadata;
        }
        getMetadata() {
            if (!this.metadata) {
                this.metadata = {};
            }
            return this.metadata;
        }
        setMetadataValue(key, value) {
            if (!this.metadata) {
                this.metadata = {};
            }
            this.metadata[key] = value;
        }
        getMetadataValue(key) {
            if (!this.metadata) {
                this.metadata = {};
            }
            return this.metadata[key];
        }
    }
    Stormancer.Packet = Packet;
    var PacketPriority;
    (function (PacketPriority) {
        PacketPriority[PacketPriority["IMMEDIATE_PRIORITY"] = 0] = "IMMEDIATE_PRIORITY";
        PacketPriority[PacketPriority["HIGH_PRIORITY"] = 1] = "HIGH_PRIORITY";
        PacketPriority[PacketPriority["MEDIUM_PRIORITY"] = 2] = "MEDIUM_PRIORITY";
        PacketPriority[PacketPriority["LOW_PRIORITY"] = 3] = "LOW_PRIORITY";
    })(PacketPriority = Stormancer.PacketPriority || (Stormancer.PacketPriority = {}));
    var PacketReliability;
    (function (PacketReliability) {
        PacketReliability[PacketReliability["UNRELIABLE"] = 0] = "UNRELIABLE";
        PacketReliability[PacketReliability["UNRELIABLE_SEQUENCED"] = 1] = "UNRELIABLE_SEQUENCED";
        PacketReliability[PacketReliability["RELIABLE"] = 2] = "RELIABLE";
        PacketReliability[PacketReliability["RELIABLE_ORDERED"] = 3] = "RELIABLE_ORDERED";
        PacketReliability[PacketReliability["RELIABLE_SEQUENCED"] = 4] = "RELIABLE_SEQUENCED";
    })(PacketReliability = Stormancer.PacketReliability || (Stormancer.PacketReliability = {}));
    class Route {
        constructor(scene, name, handle = 0, metadata = {}) {
            this.scene = null;
            this.name = null;
            this.handle = null;
            this.metadata = {};
            this.handlers = [];
            this.scene = scene;
            this.name = name;
            this.handle = handle;
            this.metadata = metadata;
        }
    }
    Stormancer.Route = Route;
    class DefaultPacketDispatcher {
        constructor() {
            this._handlers = {};
            this._defaultProcessors = [];
        }
        dispatchPacket(packet) {
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
        addProcessor(processor) {
            processor.registerProcessor(new PacketProcessorConfig(this._handlers, this._defaultProcessors));
        }
    }
    Stormancer.DefaultPacketDispatcher = DefaultPacketDispatcher;
    class TokenHandler {
        constructor() {
            this._tokenSerializer = new MsgPackSerializer();
        }
        decodeToken(token) {
            var data = token.split('-')[0];
            var buffer = Helpers.base64ToByteArray(data);
            var result = this._tokenSerializer.deserialize(buffer);
            var sceneEndpoint = new SceneEndpoint();
            sceneEndpoint.token = token;
            sceneEndpoint.tokenData = result;
            return sceneEndpoint;
        }
    }
    Stormancer.TokenHandler = TokenHandler;
    class MsgPackSerializer {
        constructor() {
            this.name = "msgpack/map";
            this._msgpack = msgpack5();
            function checkTimestamp(obj) {
                return obj instanceof Date;
            }
            function decodeTimestamp(data) {
                var length = data.length;
                switch (length) {
                    case 4:
                        return new Date(data.readUInt32BE(0) * 1000);
                    case 8:
                        var data64 = data.readUIntBE(0, 8);
                        var date = new Date((data64 & 0x00000003ffffffff) * 1000);
                        return date;
                    case 12:
                        var data32 = data.readUIntBE(0, 4);
                        var data64 = data.readIntBE(0, 8);
                        return new Date(data64 * 1000);
                    default:
                        throw Error("Failed to unpack date");
                }
            }
            function encodeTimestamp(obj) {
                var buffer = Buffer.allocUnsafe(5);
                buffer.writeUInt8(0xFF, 0);
                buffer.writeUInt32BE(obj.getTime() / 1000, 0);
                return buffer;
            }
            this._msgpack.registerEncoder(checkTimestamp, encodeTimestamp);
            this._msgpack.registerDecoder(0xFF, decodeTimestamp);
        }
        serialize(data) {
            return this._msgpack.encode(data);
        }
        deserialize(bytes) {
            return this._msgpack.decode(bytes);
        }
    }
    Stormancer.MsgPackSerializer = MsgPackSerializer;
    class PluginBuildContext {
        constructor() {
            this.sceneCreated = [];
            this.clientCreated = [];
            this.sceneConnected = [];
            this.sceneDisconnected = [];
            this.packetReceived = [];
        }
    }
    Stormancer.PluginBuildContext = PluginBuildContext;
    class RpcClientPlugin {
        build(ctx) {
            ctx.sceneCreated.push((scene) => {
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
            ctx.sceneDisconnected.push((scene) => {
                var processor = scene.getComponent(RpcClientPlugin.ServiceName);
                processor.disconnected();
            });
        }
    }
    RpcClientPlugin.NextRouteName = "stormancer.rpc.next";
    RpcClientPlugin.ErrorRouteName = "stormancer.rpc.error";
    RpcClientPlugin.CompletedRouteName = "stormancer.rpc.completed";
    RpcClientPlugin.CancellationRouteName = "stormancer.rpc.cancel";
    RpcClientPlugin.Version = "1.1.0";
    RpcClientPlugin.PluginName = "stormancer.plugins.rpc";
    RpcClientPlugin.ServiceName = "rpcService";
    Stormancer.RpcClientPlugin = RpcClientPlugin;
    class RpcRequestContext {
        constructor(peer, scene, id, ordered, data, token) {
            this._scene = null;
            this.id = null;
            this._ordered = null;
            this._peer = null;
            this._msgSent = null;
            this._data = null;
            this._cancellationToken = null;
            this._scene = scene;
            this.id = id;
            this._ordered = ordered;
            this._peer = peer;
            this._data = data;
            this._cancellationToken = token;
        }
        remotePeer() {
            return this._peer;
        }
        data() {
            return this._data;
        }
        cancellationToken() {
            return this._cancellationToken;
        }
        writeRequestId(data) {
            var newData = new Uint8Array(2 + data.byteLength);
            (new DataView(newData.buffer)).setUint16(0, this.id, true);
            newData.set(data, 2);
            return newData;
        }
        sendValue(data, priority) {
            data = this.writeRequestId(data);
            this._scene.sendPacket(RpcClientPlugin.NextRouteName, data, priority, (this._ordered ? PacketReliability.RELIABLE_ORDERED : PacketReliability.RELIABLE));
            this._msgSent = 1;
        }
        sendError(errorMsg) {
            var data = this._peer.serializer.serialize(errorMsg);
            data = this.writeRequestId(data);
            this._scene.sendPacket(RpcClientPlugin.ErrorRouteName, data, PacketPriority.MEDIUM_PRIORITY, PacketReliability.RELIABLE_ORDERED);
        }
        sendCompleted() {
            var data = new Uint8Array(0);
            var data = this.writeRequestId(data);
            var data2 = new Uint8Array(1 + data.byteLength);
            data2[0] = this._msgSent;
            this._scene.sendPacket(RpcClientPlugin.CompletedRouteName, data, PacketPriority.MEDIUM_PRIORITY, PacketReliability.RELIABLE_ORDERED);
        }
    }
    Stormancer.RpcRequestContext = RpcRequestContext;
    class RpcService {
        constructor(scene) {
            this._currentRequestId = 0;
            this._pendingRequests = {};
            this._runningRequests = {};
            this._msgpackSerializer = new MsgPackSerializer();
            this._scene = scene;
        }
        rpc(route, objectOrData, onNext, onError = (error) => { }, onCompleted = () => { }, priority = PacketPriority.MEDIUM_PRIORITY) {
            var data;
            if (objectOrData instanceof Uint8Array) {
                data = objectOrData;
            }
            else {
                if (objectOrData instanceof Array || objectOrData instanceof ArrayBuffer) {
                    var data2 = objectOrData;
                    data = new Uint8Array((data2));
                }
                else if (objectOrData instanceof DataView || objectOrData instanceof Int8Array || objectOrData instanceof Int16Array || objectOrData instanceof Int32Array || objectOrData instanceof Uint8Array || objectOrData instanceof Uint16Array || objectOrData instanceof Uint32Array || objectOrData instanceof Float32Array || objectOrData instanceof Float64Array) {
                    data = new Uint8Array(objectOrData.buffer, objectOrData.byteOffset, objectOrData.byteLength);
                }
                else {
                    data = this._msgpackSerializer.serialize(objectOrData);
                }
            }
            var remoteRoutes = this._scene.remoteRoutes;
            var relevantRoute;
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
            var deferred = new Deferred();
            var observer = {
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
            var request = {
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
        addProcedure(route, handler, ordered) {
            var metadatas = {};
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
        reserveId() {
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
        computeId(packet) {
            var requestId = packet.getDataView().getUint16(0, true);
            var id = packet.connection.id.toString() + "-" + requestId.toString();
            return id;
        }
        getPendingRequest(packet) {
            var dv = packet.getDataView();
            var id = packet.getDataView().getUint16(0, true);
            packet.data = packet.data.subarray(2);
            return this._pendingRequests[id];
        }
        next(packet) {
            var request = this.getPendingRequest(packet);
            if (request) {
                request.receivedMessages++;
                request.observer.onNext(packet);
                if (request.deferred.state() === "pending") {
                    request.deferred.resolve();
                }
            }
        }
        error(packet) {
            var request = this.getPendingRequest(packet);
            if (request) {
                delete this._pendingRequests[request.id];
                request.observer.onError(packet.connection.serializer.deserialize(packet.data));
            }
        }
        complete(packet) {
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
        cancel(packet) {
            var id = this.computeId(packet);
            var cts = this._runningRequests[id];
            if (cts) {
                cts.cancel();
            }
        }
        disconnected() {
            for (var i in this._runningRequests) {
                if (this._runningRequests.hasOwnProperty(i)) {
                    this._runningRequests[i].cancel();
                }
            }
        }
    }
    Stormancer.RpcService = RpcService;
    class RequestContext {
        constructor(packet) {
            this._didSendValues = false;
            this.isComplete = false;
            this._packet = packet;
            this._requestId = packet.data.subarray(0, 2);
            this.inputData = packet.data.subarray(2);
        }
        send(data) {
            if (this.isComplete) {
                throw new Error("The request is already completed.");
            }
            this._didSendValues = true;
            var dataToSend = new Uint8Array(2 + data.length);
            dataToSend.set(this._requestId);
            dataToSend.set(data, 2);
            this._packet.connection.sendSystem(MessageIDTypes.ID_REQUEST_RESPONSE_MSG, dataToSend);
        }
        complete() {
            var dataToSend = new Uint8Array(3);
            dataToSend.set(this._requestId);
            dataToSend[2] = (this._didSendValues ? 1 : 0);
            this._packet.connection.sendSystem(MessageIDTypes.ID_REQUEST_RESPONSE_COMPLETE, dataToSend);
        }
        error(data) {
            var dataToSend = new Uint8Array(2 + data.length);
            dataToSend.set(this._requestId);
            dataToSend.set(data, 2);
            this._packet.connection.sendSystem(MessageIDTypes.ID_REQUEST_RESPONSE_ERROR, dataToSend);
        }
    }
    Stormancer.RequestContext = RequestContext;
    class RequestProcessor {
        constructor(logger, modules) {
            this._pendingRequests = {};
            this._isRegistered = false;
            this._handlers = {};
            this._currentId = 0;
            this._pendingRequests = {};
            this._logger = logger;
            for (var key in modules) {
                var mod = modules[key];
                mod.register(this.addSystemRequestHandler);
            }
        }
        registerProcessor(config) {
            this._isRegistered = true;
            for (var key in this._handlers) {
                var handler = this._handlers[key];
                config.addProcessor(parseInt(key), (p) => {
                    var context = new RequestContext(p);
                    var continuation = (fault) => {
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
                var request = this._pendingRequests[id];
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
                var msg = p.connection.serializer.deserialize(p.data.subarray(2));
                request.observer.onError(new Error(msg));
                return true;
            });
        }
        addSystemRequestHandler(msgId, handler) {
            if (this._isRegistered) {
                throw new Error("Can only add handler before 'registerProcessor' is called.");
            }
            this._handlers[msgId] = handler;
        }
        reserveRequestSlot(observer) {
            var i = 0;
            while (i < 0xFFFF) {
                i++;
                this._currentId = (this._currentId + 1) & 0xFFFF;
                if (!this._pendingRequests[this._currentId]) {
                    var request = { lastRefresh: new Date, id: this._currentId, observer: observer, deferred: new Deferred() };
                    this._pendingRequests[this._currentId] = request;
                    return request;
                }
            }
            throw new Error("Unable to create new request: Too many pending requests.");
        }
        sendSystemRequest(peer, msgId, data, priority = PacketPriority.MEDIUM_PRIORITY) {
            var deferred = new Deferred();
            var request = this.reserveRequestSlot({
                onNext(packet) { deferred.resolve(packet); },
                onError(e) { deferred.reject(e); },
                onCompleted() {
                    deferred.resolve();
                }
            });
            var dataToSend = new Uint8Array(3 + data.length);
            var idArray = new Uint16Array([request.id]);
            dataToSend.set([msgId], 0);
            dataToSend.set(new Uint8Array(idArray.buffer), 1);
            dataToSend.set(data, 3);
            peer.sendSystem(MessageIDTypes.ID_SYSTEM_REQUEST, dataToSend, priority);
            return deferred.promise();
        }
    }
    Stormancer.RequestProcessor = RequestProcessor;
    class SceneDispatcher {
        constructor() {
            this._scenes = [];
            this._buffers = [];
        }
        registerProcessor(config) {
            config.addCatchAllProcessor((handler, packet) => this.handler(handler, packet));
        }
        handler(sceneHandle, packet) {
            if (sceneHandle < MessageIDTypes.ID_SCENES) {
                return false;
            }
            var scene = this._scenes[sceneHandle - MessageIDTypes.ID_SCENES];
            if (!scene) {
                var buffer;
                if (this._buffers[sceneHandle] == undefined) {
                    buffer = [];
                    this._buffers[sceneHandle] = buffer;
                }
                else {
                    buffer = this._buffers[sceneHandle];
                }
                buffer.push(packet);
                return true;
            }
            else {
                packet.setMetadataValue("scene", scene);
                scene.handleMessage(packet);
                return true;
            }
        }
        addScene(scene) {
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
        removeScene(sceneHandle) {
            delete this._scenes[sceneHandle - MessageIDTypes.ID_SCENES];
        }
    }
    Stormancer.SceneDispatcher = SceneDispatcher;
    function $http(url, options) {
        var core = {
            ajax: function (method, url, args, options) {
                var promise = new Promise(function (resolve, reject) {
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
                            data = options.data;
                        }
                    }
                    xhr.send(data);
                    xhr.onload = function () {
                        if (xhr.status == 200) {
                            resolve(xhr.response);
                        }
                        else {
                            reject(xhr.statusText);
                        }
                    };
                    xhr.onerror = function () {
                        reject(xhr.statusText);
                    };
                });
                return promise;
            }
        };
        return {
            'get': function (args, options) {
                return core.ajax('GET', url, args, options);
            },
            'post': function (args, options) {
                return core.ajax('POST', url, args, options);
            },
            'put': function (args, options) {
                return core.ajax('PUT', url, args, options);
            },
            'delete': function (args, options) {
                return core.ajax('DELETE', url, args, options);
            }
        };
    }
    Stormancer.$http = $http;
    ;
    class WebSocketConnection {
        constructor(id, socket) {
            this.metadata = {};
            this.ping = null;
            this.serializerChosen = false;
            this.serializer = new MsgPackSerializer();
            this._registeredComponents = { "serializer": this.serializer };
            this.id = id;
            this._socket = socket;
            this.connectionDate = new Date();
            this.state = ConnectionState.Connected;
        }
        close() {
            this._socket.close();
        }
        sendSystem(msgId, data, priority = PacketPriority.MEDIUM_PRIORITY) {
            var bytes = new Uint8Array(data.length + 1);
            bytes[0] = msgId;
            bytes.set(data, 1);
            this._socket.send(bytes.buffer);
        }
        sendToScene(sceneIndex, route, data, priority, reliability) {
            var bytes = new Uint8Array(data.length + 3);
            bytes[0] = sceneIndex;
            var ushorts = new Uint16Array(1);
            ushorts[0] = route;
            bytes.set(new Uint8Array(ushorts.buffer), 1);
            bytes.set(data, 3);
            this._socket.send(bytes.buffer);
        }
        setApplication(account, application) {
            this.account = account;
            this.application = application;
        }
        registerComponent(componentName, component) {
            this._registeredComponents[componentName] = component;
        }
        getComponent(componentName) {
            return this._registeredComponents[componentName]();
        }
    }
    Stormancer.WebSocketConnection = WebSocketConnection;
    class WebSocketTransport {
        constructor() {
            this.name = "websocket";
            this.isRunning = false;
            this._connecting = false;
            this.packetReceived = [];
            this.connectionOpened = [];
            this.connectionClosed = [];
        }
        start(type, handler, token) {
            this._type = this.name;
            this._connectionManager = handler;
            this.isRunning = true;
            token.onCancelled(this.stop);
            return Promise.resolve();
        }
        stop() {
            this.isRunning = false;
            if (this._socket) {
                this._socket.close();
                this._socket = null;
            }
        }
        connect(endpoint) {
            if (!this._socket && !this._connecting) {
                this._connecting = true;
                var socket = new WebSocket(endpoint + "/");
                socket.binaryType = "arraybuffer";
                socket.onmessage = args => this.onMessage(args.data);
                this._socket = socket;
                var deferred = new Deferred();
                socket.onclose = args => this.onClose(deferred, args);
                socket.onopen = () => this.onOpen(deferred);
                return deferred.promise();
            }
            throw new Error("This transport is already connected.");
        }
        createNewConnection(socket) {
            var cid = this._connectionManager.generateNewConnectionId();
            return new WebSocketConnection(cid, socket);
        }
        onOpen(deferred) {
            this._connecting = false;
            var connection = this.createNewConnection(this._socket);
            this._connectionManager.newConnection(connection);
            this.connectionOpened.map(action => {
                action(connection);
            });
            this._connection = connection;
            deferred.resolve(connection);
        }
        onMessage(buffer) {
            var data = new Uint8Array(buffer);
            if (this._connection) {
                var packet = new Packet(this._connection, data);
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
        onClose(deferred, closeEvent) {
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
    Stormancer.WebSocketTransport = WebSocketTransport;
})(Stormancer || (Stormancer = {}));
//# sourceMappingURL=stormancer-module.js.map