module Stormancer {

    export class Scene implements IScene {

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
            return this._client.connectToScene(this, this._token, Helpers.mapValues(this.localRoutes))
                .then(() => {
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
}
