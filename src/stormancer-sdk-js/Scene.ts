module Stormancer {

    export class Scene implements IScene {
        public id: string;
        
        // A byte representing the index of the scene for this peer.
        public handle: number;

        // A boolean representing whether the scene is connected or not.
        public connected: boolean;

        public hostConnection: IConnection;
        private _token: string;
        private _metadata: Map;
        private _remoteRoutesMap: IMap<Route> = {};
        private _localRoutesMap: IMap<Route> = {};
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
                this._remoteRoutesMap[route.Name] = new Route(this, route.Name, route.Handle, route.Metadata);
            }
        }

        // Returns metadata informations for the remote scene host.
        getHostMetadata(key: string): string {
            return this._metadata[key];
        }
        
        // Registers a route on the local peer.
        public addRoute(route: string, handler: (packet: Packet<IScenePeer>) => void, metadata: Map = {}): void {
            if (route[0] === `@`) {
                throw new Error("A route cannot start with the @ character.");
            }

            if (this.connected) {
                throw new Error("You cannot register handles once the scene is connected.");
            }

            var routeObj = this._localRoutesMap[route];
            if (!routeObj) {
                routeObj = new Route(this, route, 0, metadata);
                this._localRoutesMap[route] = routeObj;
            }

            this.onMessageImpl(routeObj, handler);
        }
        
        /**
        Allows to receive messages on a route. A route is an easy way to get messages of only one type.
        @method Stormancer.Scene#registerRoute
        @param {string} route The route name
        @param {function} handler Function for handling the received messages. This function is called any time a data is received by the server on this route. The data is the first parameter of the function.
        */
        public registerRoute<T>(route: string, handler: (message: T) => void): void {
            this.addRoute(route,(packet: Packet<IScenePeer>) => {
                var message = this.hostConnection.serializer.deserialize<T>(packet.data);
                handler(message);
            });
        }
        
        /**
        Allows to receive messages on a route without using any built-in serializers. Use this method for serialize and deserialize data by yourself.
        @method Stormancer.Scene#registerRouteRaw
        @param {string} route The route name
        @param {function} handler Function for handling the received messages. This function is called any time a data is received by the server on this route. The data is the first parameter of the function.
        */
        public registerRouteRaw(route: string, handler: (dataView: DataView) => void): void {
            this.addRoute(route,(packet: Packet<IScenePeer>) => {
                handler(new DataView(packet.data.buffer, packet.data.byteOffset));
            });
        }

        private onMessageImpl(route: Route, handler: (packet: Packet<IScenePeer>) => void): void {
            var action = (p: Packet<IConnection>) => {
                var packet = new Packet(this.host(), p.data, p.getMetadata());
                handler(packet);
            };
            route.handlers.push(p => action(p));
        }

        // Sends a binary packet to the scene.
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

            var routeObj = this._remoteRoutesMap[route];
            if (!routeObj) {
                throw new Error("The route " + route + " doesn't exist on the scene.");
            }

            this.hostConnection.sendToScene(this.handle, routeObj.index, data, priority, reliability);
        }

        public send<T>(route: string, data: T, priority: PacketPriority = PacketPriority.MEDIUM_PRIORITY, reliability: PacketReliability = PacketReliability.RELIABLE): void {
            return this.sendPacket(route, this.hostConnection.serializer.serialize(data), priority, reliability);
        }
        
        /**
        Connect the Scene to the Stormancer application scene.
        @method Stormancer.Scene#connect
        @return {Promise} A promise which complete when the Scene is connected.
        */
        public connect(): JQueryPromise<void> {
            return this._client.connectToScene(this, this._token, Helpers.mapValues(this._localRoutesMap))
                .then(() => {
                this.connected = true;
            });
        }
        
        /**
        Disconnect the Scene.
        @method Stormancer.Scene#disconnect
        @return {Promise} A promise which complete when the Scene is disconnected.
        */
        public disconnect(): JQueryPromise<void> {
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

            for (var key in this._localRoutesMap) {
                var route = this._localRoutesMap[key];
                route.index = cr.RouteMappings[key];
                this._handlers[route.index] = route.handlers;
            }
        }

        private _handlers: IMap<((packet: Packet<IConnection>) => void)[]> = {};
        
        /**
        Pool of functions called when a packet is received.
        @member Stormancer.Scene#packetReceived
        */
        public packetReceived: ((packet: Packet<IConnection>) => void)[] = [];

        public host(): IScenePeer {
            return new ScenePeer(this.hostConnection, this.handle, this._remoteRoutesMap, this);
        }
        
        private _registeredComponents: IMap<() => any> = {}
        
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
        public getComponent<T>(componentName): T {
            return this._registeredComponents[componentName]();
        }

        getRemoteRoutes(): Route[] {
            var result: Route[] = [];

            for (var key in this._remoteRoutesMap) {
                result.push(this._remoteRoutesMap[key]);
            }
            return result;
        }
    }
}
