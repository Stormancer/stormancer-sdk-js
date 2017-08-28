/**
A Stormancer network transport.
@interface ITransport
@memberof Stormancer
*/
/**
Fires when a connection to a remote peer is closed.
@member Stormancer.ITransport#connectionClosed
@type {function[]}
*/
/**
Fires when a remote peer has opened a connection.
@member Stormancer.ITransport#connectionOpened
@type {function[]}
*/
/**
Id of the local peer.
@member Stormancer.ITransport#id
@type {number}
*/
/**
Gets a boolean indicating if the transport is currently running.
@member Stormancer.ITransport#isRunning
@type {boolean}
*/
/**
The name of the transport.
@member Stormancer.ITransport#name
@type {string}
*/
/**
Fires when the transport recieves new packets.
@member Stormancer.ITransport#packetReceived
@type {function[]}
*/
/**
Connects the transport to a remote host.
@method Stormancer.ITransport#connect
@param {string} endpoint A string containing the target endpoint the expected format is `host:port`.
@return {Promise<Stormancer.IConnection>} A `Task<IConnection>` object completing with the connection process and returning the corresponding `IConnection`.
*/
/**
Starts the transport.
@method Stormancer.ITransport#getComponent
@param {string} name The name of the transport if several are started.
@param {Stormancer.IConnectionManager} handler The connection handler used by the connection.
@param {object} token A `CancellationToken`. It will be cancelled when the transport has to be shutdown.
@return {Promise} A `Task` completing when the transport is started.
*/

/*export*/ interface ITransport {

    // Starts the transport
    start(type: string, handler: IConnectionManager, token: Cancellation.Token): Promise<void>;

    isRunning: boolean;

    // Connects the transport to a remote host.
    connect(endpoint: string): Promise<IConnection>;

    packetReceived: ((packet: Packet<IConnection>) => void)[];

    connectionOpened: ((connection: IConnection) => void)[];

    connectionClosed: ((connection: IConnection) => void)[];

    name: string;

    id: Uint8Array;
}
