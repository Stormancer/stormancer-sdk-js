// Type definitions for msgpack5 v3.4.0
// Project: https://github.com/mcollina/msgpack5/
// Definitions by: Wonshik Kim <https://github.com/wokim/>
// Definitions by: Kei Son <https://github.com/heycalmdown/>

//import stream = require('stream');
declare namespace stream {
    var Transform: any;
}

//import bl = require('bl');
declare class bl { }
declare class Buffer {
    public length: number;
    public readUInt32BE(a: any): any;
    public readUIntBE(a: any, b: any): any;
    public readIntBE(a: any, b: any): any;
    public static allocUnsafe(a: any): any;
}

interface Options {
    forceFloat64: boolean;
    compatibilityMode: boolean;
}

declare namespace msgpack5 {
    interface Options {
        header?: boolean;
        msgpack?: any;
    }

    class Base extends stream.Transform {
        protected _header;
        protected _msgpack;
    }

    class Encoder extends Base {
        constructor(opts?: Options);
        public _transform(obj: any, enc: any, done: Function);
    }

    class Decoder extends Base {
        constructor(opts?: Options);
        public _chunks: bl;
        public _length: number;
        public _transform(buf: any, enc: any, done: Function);
    }

    interface MessagePack {
        encode(obj: any): bl;
        decode<T>(buf: Buffer): T;
        decode<T>(buf: bl): T;
        register(type: number, $constructor: any, encode: (obj: any) => Buffer, decode: (data: Buffer) => any);
        registerEncoder(check: (obj: any) => boolean, encode: (obj: any) => Buffer);
        registerDecoder(type: number, decode: (data: Buffer) => any);
        encoder(opts?: Options): Encoder;
        decoder(opts?: Options): Decoder;
    }
}

declare function msgpack5(Options?): msgpack5.MessagePack;

//export = msgpack5;
