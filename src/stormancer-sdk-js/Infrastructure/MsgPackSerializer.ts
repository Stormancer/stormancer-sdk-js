module Stormancer {

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
            return new Uint8Array(msgpack.pack(data));
        }
        
        /**
        Deserializes an object from a byte array.
        @method Stormancer.MsgPackSerializer#deserialize
        @memberof Stormancer.MsgPackSerializer
        @param {Uint8Array} bytes The byte array
        @return {object} The deserialized data.
        */
        public deserialize<T>(bytes: Uint8Array): T {
            return msgpack.unpack(bytes);
        }

        /**
        The name of the serializer.
        */
        name: string = "msgpack/map";
    }
}
