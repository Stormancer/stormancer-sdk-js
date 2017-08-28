/*export*/ class Packet<T> {

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
    A byte representing the index of the scene for this peer.
    @member Stormancer.Packet#connection
    @type {Object}
    */
    public connection: T = null;

    /**
    Data contained in the packet.
    @member Stormancer.Packet#data
    @type {Uint8Array}
    */
    public data: Uint8Array = null;

    /**
    Get a DataView on the internal data buffer
    @method Stormancer.Packet#getDataView
    @return {DataView}
    */
    public getDataView(): DataView {
        return new DataView(this.data.buffer, this.data.byteOffset, this.data.byteLength);
    }

    /**
    Deserialize the internal data to an object by using MsgPack and return this object.
    @method Stormancer.Packet#readObject
    @return {Object}
    */
    public readObject(): any {
        var msgpackSerializer = new MsgPackSerializer();
        return msgpackSerializer.deserialize<any>(this.data);
    }

    private metadata: IMap<any> = null;

    /**
    Set the metadatas of the packet. This action will overwrite the existing metadatas.
    @method Stormancer.Packet#setMetadata
    @param {Object} metadata
    */
    public setMetadata(metadata: IMap<any>) {
        this.metadata = metadata;
    }

    /**
    Get the metadatas from the packet.
    @method Stormancer.Packet#getMetadata
    @return {Object.<string, Object>}
    */
    public getMetadata(): IMap<any> {
        if (!this.metadata) {
            this.metadata = {};
        }
        return this.metadata;
    }

    /**
    Set a metadata in the packet
    @method Stormancer.Packet#setMetadataValue
    @param {string} key
    @param {Object} value
    */
    public setMetadataValue(key: string, value): void {
        if (!this.metadata) {
            this.metadata = {};
        }
        this.metadata[key] = value;
    }

    /**
    Returns metadata
    @method Stormancer.Packet#getMetadataValue
    @param {string} key
    @return {string} Key associated object
    */
    public getMetadataValue(key: string): any {
        if (!this.metadata) {
            this.metadata = {};
        }
        return this.metadata[key];
    }
}
