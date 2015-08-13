module Stormancer {
    
    /**
    A connection to a remote peer.
    @interface IConnection
    @memberof Stormancer
    */
    /**
    @member Stormancer.IConnection#account
    @type {string}
    @desc Account of the application which the peer is connected to.
    */
    /**
    @desc Name of the application to which the peer is connected.
    @member Stormancer.IConnection#application
    @type {string}
    */
    /**
    @desc Event fired when the connection has been closed.
    @member Stormancer.IConnection#ConnectionClosed
    @type {function[]}
    */
    /**
    @desc Connection date.
    @member Stormancer.IConnection#connectionDate
    @type {date}
    */
    /**
    @desc Unique id in the node for the connection.
    @member Stormancer.IConnection#id
    @type {string}
    */
    /**
    @desc Metadata associated with the connection.
    @member Stormancer.IConnection#metadata
    @type {metadata}
    */
    /**
    @desc The connection's Ping in milliseconds.
    @member Stormancer.IConnection#ping
    @type {number}
    */
    /**
    State of the connection.
    @member Stormancer.IConnection#state
    @type {Stormancer.ConnectionState}
    */
    /**
    Close the connection.
    @method Stormancer.IConnection#close
    */
    /**
    Gets a service from the object.
    @method Stormancer.IConnection#getComponent
    @param {string} componentName Type of the service to fetch.
    @return {object} The requested component.
    */
    /**
    Register components.
    @method Stormancer.IConnection#registerComponent
    @param {object} component The component to register.
    */
    /**
    Sends a system message to the peer. (System reserved)
    @method Stormancer.IConnection#sendSystem
    @param {number} msgId Message ID.
    @param {Uint8Array} data The data to send.
    @param {Stormancer.PacketPriority} priority Priority of the message.
    */
    /**
    Sends a packet to the target remote scene. (System reserved)
    @method Stormancer.IConnection#sendToScene
    @param {number} sceneIndex Scene index.
    @param {number} route Route index.
    @param {Uint8Array} data Data to send.
    @param {Stormancer.PacketPriority} priority Priority of the message.
    @param {Stormancer.PacketReliability} reliability Reliability of the message.
    */
    /**
    Sets the account and application associated with this object. Used only serverside.
    @method Stormancer.IConnection#setApplication
    @param {string} account The account ID.
    @param {string} application The application name.
    */

    /**
    @alias ConnectionState
    @enum {number}
    @memberof Stormancer
    */
    var _ = // Fake object for jsdoc enum ConnectionState
        {
            /** 0 */
            Disconnected: 0,
            /** 1 */
            Connecting: 1,
            /** 2 */
            Connected: 2
        };

    export enum ConnectionState {
        Disconnected = 0,
        Connecting = 1,
        Connected = 2
    }

    export interface IConnection {
        // Unique id in the node for the connection.
        id: number;

        // Connection date.
        connectionDate: Date;

        // Metadata associated with the connection.
        metadata: Map;

        // Account of the application which the peer is connected to.
        account: string

        // Name of the application to which the peer is connected.
        application: string;

        // State of the connection.
        state: ConnectionState;

        // Close the connection
        close(): void;

        // Event fired when the connection has been closed
        connectionClosed: ((reason: string) => void)[];

        // The connection's Ping in milliseconds
        ping: number;

        serializerChosen: boolean;

        serializer: ISerializer;

        // Register components.
        registerComponent<T>(componentName: string, component: T): void;

        // Gets a service from the object.
        getComponent<T>(componenentName: string): T;

        // Sends a system message to the peer.
        sendSystem(msgId: number, data: Uint8Array, priority?: PacketPriority): void;
 
        // Sends a packet to the target remote scene.
        sendToScene(sceneIndex: number, route: number, data: Uint8Array, priority: PacketPriority, reliability: PacketReliability): void;

        // Set account and application infos.
        setApplication(account: string, application: string): void;
    }
}
