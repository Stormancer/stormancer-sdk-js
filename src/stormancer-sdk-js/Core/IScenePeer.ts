/**
A remote scene.
@interface IScenePeer
@memberof Stormancer
*/
/**
Unique id of the peer in the Stormancer cluster
@member Stormancer.IScenePeer#id
@type {string}
*/
/**
The serializer to use with the peer.
@member Stormancer.IScenePeer#getComponent
@type {Stormancer.ISerializer}
*/
/**
Returns a component registered for the peer.
@method Stormancer.IScenePeer#getComponent
@param {string} componentName The name of the component.
@return {object} The requested component.
*/
/**
Sends a message to the remote peer.
@method Stormancer.IScenePeer#send
@param {string} route The route on which the message will be sent.
@param {Uint8Array} data A method called to write the message.
@param {PacketPriority} priority The message priority.
@param {PacketReliability} reliability The message requested reliability.
*/

namespace Stormancer {
    // A remote scene.
    export interface IScenePeer {
        // Sends a message to the remote scene.
        send(route: string, data: Uint8Array, priority: PacketPriority, reliability: PacketReliability): void;

        id: number;

        getComponent<T>(componentName: string): T;

        serializer: ISerializer;
    }
}
