module Stormancer {

    export class Route {

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
        public constructor(scene: IScene, name: string, handle = 0, metadata: Map = {}) {
            this.scene = scene;
            this.name = name;
            this.handle = handle;
            this.metadata = metadata;
        }
        
        /**
        The Scene instance which contains this route.
        @member Stormancer.Packet#scene
        @type {Stormancer.Scene}
        */
        public scene: IScene = null;
        
        /**
        A string containing the name of the route.
        @member Stormancer.Packet#name
        @type {string}
        */
        public name: string = null;
        
        /**
        Route handle.
        @member Stormancer.Packet#handle
        @type {number}
        */
        public handle: number = null;
        
        /**
        Route metadata.
        @member Stormancer.Packet#metadata
        @type {object.<string, string>}
        */
        public metadata: Map = {};
        
        /**
        Contains the handlers that are run when packets are received.
        @member Stormancer.Packet#handlers
        @type {function[]}
        */
        public handlers: ((packet: Packet<IConnection>) => void)[] = [];
    }
}
