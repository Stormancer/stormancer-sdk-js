module Stormancer {
    export interface IScene {
        // Represents a Stormancer scene.
        id: string;

        // Returns metadata informations for the remote scene host.
        getHostMetadata(key: string): string;

        // A byte representing the index of the scene for this peer.
        handle: number;

        // A boolean representing whether the scene is connected or not.
        connected: boolean;

        hostConnection: IConnection;

        // Adds a route on the local scene, handling packets.
        addRoute(route: string, handler: (packet: Packet<IScenePeer>) => void, metadata?: Map): void;

        // Registers a route on the local scene, handling deserialized messages.
        registerRoute<T>(route: string, handler: (message: T) => void): void;

        // Sends a binary packet to the scene.
        sendPacket(route: string, data: Uint8Array, priority?: PacketPriority, reliability?: PacketReliability): void;

        // Serialize and sends an object to the scene
        send<T>(route: string, data: T, priority?: PacketPriority, reliability?: PacketReliability): void;

        // Disconnects the scene.
        disconnect(): IPromise<void>;

        // Connects the scene to the server.
        connect(): IPromise<void>;

        // Fires when packet are received on the scene.
        packetReceived: ((packet: Packet<IConnection>) => void)[];

        host(): IScenePeer;

        //Registers a component to the scene
        registerComponent<T>(componentName: string, factory: () => T): void;

        //Gets a registered comonent from the scene
        getComponent<T>(componentName): T;

        //Gets the list of declared remote routes
        getRemoteRoutes(): Route[];
    }
}
