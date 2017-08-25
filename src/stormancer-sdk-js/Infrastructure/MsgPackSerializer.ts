/// <reference path="../../../libs/msgpack5.no-module.d.ts" />
/// <reference path="../Core/ISerializer.ts"/>

/*export*/ class MsgPackSerializer implements ISerializer {

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
        return <Uint8Array>this._msgpack.encode(data);
    }

    /**
    Deserializes an object from a byte array.
    @method Stormancer.MsgPackSerializer#deserialize
    @memberof Stormancer.MsgPackSerializer
    @param {Uint8Array} bytes The byte array
    @return {object} The deserialized data.
    */
    public deserialize<T>(bytes: Uint8Array): T {
        return this._msgpack.decode<T>(bytes);
    }

    /**
    The name of the serializer.
    */
    public name: string = "msgpack/map";

    private _msgpack: msgpack5.MessagePack = msgpack5();
}
