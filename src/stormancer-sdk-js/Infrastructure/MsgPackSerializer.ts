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
        function checkTimestamp(obj) {
            return obj instanceof Date;
        }
        function decodeTimestamp(data: Buffer) {
            var length = data.length;
            switch (length) {
                case 4:
                    return new Date(data.readUInt32BE(0) * 1000);
                case 8:
                    var data64 = data.readUIntBE(0, 8);
                    var date = new Date((data64 & 0x00000003ffffffff) * 1000);
                    return date;

                case 12:
                    var data32 = data.readUIntBE(0, 4);
                    var data64 = data.readIntBE(0, 8);
                    return new Date(data64 * 1000);
                default:
                    throw Error("Failed to unpack date");
            }

        }
        function encodeTimestamp(obj: Date): Buffer {
            var buffer = Buffer.allocUnsafe(5);
            buffer.writeUInt8(0xFF, 0);
            buffer.writeUInt32BE(obj.getTime() / 1000, 0);
            return buffer;
        }

        this._msgpack.registerEncoder(checkTimestamp, encodeTimestamp);
        this._msgpack.registerDecoder(0xFF, decodeTimestamp);
    }

    /**
    Serializes an object into a byte array.
    @method Stormancer.MsgPackSerializer#serialize
    @param {object} data The data to serialize.
    @return {Uint8Array} The byte array.
    */
    public serialize<T>(data: T): Uint8Array {
        return <any>this._msgpack.encode(data);
    }

    /**
    Deserializes an object from a byte array.
    @method Stormancer.MsgPackSerializer#deserialize
    @memberof Stormancer.MsgPackSerializer
    @param {Uint8Array} bytes The byte array
    @return {object} The deserialized data.
    */
    public deserialize<T>(bytes: Uint8Array): T {
        return <T>this._msgpack.decode(<any>bytes);
    }

    /**
    The name of the serializer.
    */
    public name: string = "msgpack/map";

    private _msgpack: msgpack5.MessagePack = msgpack5();
}
