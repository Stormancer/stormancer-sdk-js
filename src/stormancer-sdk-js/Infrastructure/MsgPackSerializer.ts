declare function msgpack5(): msgpack;

declare class msgpack {
    constructor(options?: msgpack5Options);
    encode(object: any): Uint8Array;
    decode(buf: Uint8Array | Array<number>): any;
}

interface msgpack5Options {
    forceFloat64?: boolean;
    compatibilityMode?: boolean;
}

export class MsgPackSerializer implements ISerializer {

    /**
    Creates a new MsgPackSerializer.
    @class MsgPackSerializer
    @classdesc Serializer based on MessagePack.
    @memberof Stormancer
    */
    constructor() {
    }

    /**
    Serializes an object into a byte array.
    @method Stormancer.MsgPackSerializer#serialize
    @param {object} data The data to serialize.
    @return {Uint8Array} The byte array.
    */
    public serialize<T>(data: T): Uint8Array {
        return new Uint8Array(this._msgpack.encode(data));
    }

    /**
    Deserializes an object from a byte array.
    @method Stormancer.MsgPackSerializer#deserialize
    @memberof Stormancer.MsgPackSerializer
    @param {Uint8Array} bytes The byte array
    @return {object} The deserialized data.
    */
    public deserialize<T>(bytes: Uint8Array): T {
        return this._msgpack.decode(bytes);
    }

    /**
    The name of the serializer.
    */
    public name: string = "msgpack/map";

    private _msgpack: msgpack = msgpack5();
}
