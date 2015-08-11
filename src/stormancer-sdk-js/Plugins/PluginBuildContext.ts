/**
@namespace Stormancer
*/
module Stormancer {
    export class PluginBuildContext {
        /// <summary>
        /// Event fired when a scene object is created.
        /// </summary>
        public sceneCreated: ((scene: IScene) => void)[] = [];

        /// <summary>
        /// Event fired when a client object is created.
        /// </summary>
        public clientCreated: ((client: IClient) => void)[] = [];

        /// <summary>
        /// Event fired when a a scene is connected to the server.
        /// </summary>
        public sceneConnected : ((scene: IScene) => void)[] = [];
     
        /// <summary>
        /// Event fired when a scene is disconnected.
        /// </summary>
        public sceneDisconnected : ((scene: IScene) => void)[] = [];
      
        /// <summary>
        /// Event fired when a packet is received from a remote peer.
        /// </summary>
        public packetReceived: ((packet: Packet<IConnection>) => void)[] = [];
    }
} 