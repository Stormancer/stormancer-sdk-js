/**
Represents a packet processor. Packet processors handle packets received from remote peers.
@interface IPacketProcessor
@memberof Stormancer
*/
/**
Method called by the packet dispatcher to register the packet processor.
@method Stormancer.IPacketProcessor#registerProcessor
@param {Stormancer.PacketProcessorConfig} config The packet processor configuration.
*/

/*export*/ class PacketProcessorConfig {

    /**
    Creates a packet processor configuration.
    @class PacketProcessorConfig
    @classdesc Contains method to register handlers for message types when passed to the IPacketProcessor.RegisterProcessor method.
    @memberof Stormancer
    @param {object.<string, function>} handlers Specified message handlers map by message type.
    @param {function[]} defaultProcessors The default message processors.
    */
    constructor(handlers: IMap<(packet: Packet<IConnection>) => boolean>, defaultProcessors: ((n: number, p: Packet<IConnection>) => boolean)[]) {
        this._handlers = handlers;
        this._defaultProcessors = defaultProcessors;
    }

    private _handlers: IMap<(packet: Packet<IConnection>) => boolean>;

    private _defaultProcessors: ((n: number, p: Packet<IConnection>) => boolean)[];

    /**
    Adds an handler for the specified message type.
    @method Stormancer.PacketProcessorConfig#addProcessor
    @param {number} msgId A byte representing the message type.
    @param {function} handler A function(Packet) to be executed when receiving a packet with the message type.
    */
    public addProcessor(msgId: number, handler: (p: Packet<IConnection>) => boolean): void {
        if (this._handlers[msgId]) {
            throw new Error("An handler is already registered for id " + msgId);
        }
        this._handlers[msgId] = handler;
    }

    /**
    Adds an handler for all message types.
    @method Stormancer.PacketProcessorConfig#addCatchAllProcessor
    @param {function} handler The default message processors.
    */
    public addCatchAllProcessor(handler: (n: number, p: Packet<IConnection>) => boolean): void {
        this._defaultProcessors.push((n, p) => handler(n, p));
    }
}

/*export*/ interface IPacketProcessor {
    registerProcessor(config: PacketProcessorConfig): void;
}
