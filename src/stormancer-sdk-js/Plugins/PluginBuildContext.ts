namespace Stormancer {

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
        public sceneConnected : ((scene: Scene) => void)[] = [];
     
        /**
        Event fired when a scene is disconnected. That's an array of functions which are called and have the scene instance as first parameter.
        @member Stormancer.PluginBuildContext#sceneDisconnected
        @type {sceneHandler[]}
        */
        public sceneDisconnected : ((scene: Scene) => void)[] = [];
      
        /**
        Event fired when a packet is received from a remote peer. That's an array of functions which are called and have the scene instance as first parameter.
        @member Stormancer.PluginBuildContext#packetReceived
        @type {packetHandler[]}
        */
        public packetReceived: ((packet: Packet<IConnection>) => void)[] = [];
    }
} 