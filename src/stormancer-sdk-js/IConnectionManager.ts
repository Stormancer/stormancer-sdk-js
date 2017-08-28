/**
Manages connections.
@interface IConnectionManager
@memberof Stormancer
*/
/**
Number of connections managed by the object.
@member Stormancer.IConnectionManager#connectionCount
@type {number}
*/
/**
Generates an unique connection id for this node. Only used on servers.
@method Stormancer.IConnectionManager#generateNewConnectionId
@return {number} A number containing an unique ID.
*/
/**
Adds a connection to the manager. This method is called by the infrastructure when a new connection connects to a transport.
@method Stormancer.IConnectionManager#newConnection
@param {Stormancer.IConnection} connection The connection object to add.
*/
/**
Closes the target connection.
@method Stormancer.IConnectionManager#closeConnection
@param {Stormancer.IConnection} connection The connection to close.
@param {string} reason The reason why the connection was closed.
*/
/**
Returns a connection by ID.
@method Stormancer.IConnectionManager#getConnection
@param {number} id The connection ID.
@return {Stormancer.IConnection} The connection attached to this ID.
*/

/*export*/ interface IConnectionManager {

    generateNewConnectionId(): number;

    newConnection(connection: IConnection): void;

    closeConnection(connection: IConnection, reason: string): void;

    getConnection(id: number): IConnection;

    connectionCount: number;
}
