/**
Interface describing a message dispatcher.
@interface IPacketDispatcher
@memberof Stormancer
*/
/**
Adds a packet processor to the dispatcher.
@method Stormancer.IPacketDispatcher#addProcessor
@param {Stormancer.IPacketProcessor} processor An `IPacketProcessor` object
*/
/**
Dispatches a packet to the system.
@method Stormancer.IPacketDispatcher#dispatchPacket
@param {Stormancer.Packet} packet Packet to dispatch.
*/

/*export*/ interface IPacketDispatcher {

    addProcessor(processor: IPacketProcessor): void;

    dispatchPacket(packet: Packet<IConnection>): void;
}
