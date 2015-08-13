/**
Contract for the binary serializers used by Stormancer applications.
@interface ISerializer
@memberof Stormancer
*/
/**
The serializer format.
@member Stormancer.ISerializer#name
@type {string}
*/
/**
Serialize an object into a stream.
@method Stormancer.ISerializer#serialize
@param {object} data The object to serialize.
@return {Uint8Array} The byte array.
*/
/**
Deserialize an object from a stream.
@method Stormancer.ISerializer#deserialize
@param {Uint8Array} bytes The byte array to deserialize.
@return {object} The deserialized object.
*/

module Stormancer {

    export interface ISerializer {

        serialize<T>(data: T): Uint8Array;

        deserialize<T>(bytes: Uint8Array): T;

        name: string;
    }
}
