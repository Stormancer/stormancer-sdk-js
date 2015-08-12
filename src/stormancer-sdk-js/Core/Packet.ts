module Stormancer {

    export class Packet<T> {
        
        /**
        A packet sent by a remote peer to the running peer.
        @class Packet
        @classdesc A packet sent by a remote peer to the running peer.
        @memberof Stormancer
        */
        constructor(source: T, data: Uint8Array, metadata?: IMap<any>) {
            this.connection = source;
            this.data = data;
            this.metadata = metadata;
        }
        
        /**
        Data contained in the packet.
        @member Stormancer.Packet#data
        @type {Uint8Array}
        */
        public data: Uint8Array;
        
        /**
        Metadata stored by the packet.
        @member Stormancer.Packet#metadata
        @type {object.<string, object>}
        */
        private metadata: IMap<any> = {};

        public setMetadata(metadata: IMap<any>) {
            this.metadata = metadata;
        }

        public getMetadata(): IMap<any> {
            if (!this.metadata) {
                this.metadata = {};
            }
            return this.metadata;
        }

        public setMetadataValue(key: string, value): void {
            if (!this.metadata) {
                this.metadata = {};
            }
            this.metadata[key] = value;
        }
        
        /**
        Returns metadata
        @param {string} key
        @return {string} Key associated object
        */
        public getMetadataValue(key: string): any {
            if (!this.metadata) {
                this.metadata = {};
            }
            return this.metadata[key];
        }
        
        /**
        A byte representing the index of the scene for this peer.
        @member Stormancer.Packet#handle
        @type {number}
        */
        public connection: T;
    }
}
