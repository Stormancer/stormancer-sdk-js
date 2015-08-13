module Stormancer {

    export class PluginBuildContext {

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
        @type {function[]}
        */
        public sceneCreated: ((scene: IScene) => void)[] = [];
        
        /**
        Event fired when a client object is created. That's an array of functions which are called and have the scene instance as first parameter.
        @member Stormancer.PluginBuildContext#clientCreated
        @type {function[]}
        */
        public clientCreated: ((client: IClient) => void)[] = [];
        
        /**
        Event fired when a a scene is connected to the server. That's an array of functions which are called and have the scene instance as first parameter.
        @member Stormancer.PluginBuildContext#sceneConnected
        @type {function[]}
        */
        public sceneConnected : ((scene: IScene) => void)[] = [];
     
        /**
        Event fired when a scene is disconnected. That's an array of functions which are called and have the scene instance as first parameter.
        @member Stormancer.PluginBuildContext#sceneDisconnected
        @type {function[]}
        */
        public sceneDisconnected : ((scene: IScene) => void)[] = [];
      
        /**
        Event fired when a packet is received from a remote peer. That's an array of functions which are called and have the scene instance as first parameter.
        @member Stormancer.PluginBuildContext#packetReceived
        @type {function[]}
        */
        public packetReceived: ((packet: Packet<IConnection>) => void)[] = [];
    }
} 