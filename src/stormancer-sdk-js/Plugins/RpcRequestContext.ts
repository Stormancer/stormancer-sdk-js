/*export*/ class RpcRequestContext {

    private _scene: Scene = null;
    private id: number = null;
    private _ordered: boolean = null;
    private _peer: IScenePeer = null;
    private _msgSent: number = null;
    private _data: Uint8Array = null;
    private _cancellationToken: Cancellation.Token = null;

    public remotePeer(): IScenePeer {
        return this._peer;
    }

    public data(): Uint8Array {
        return this._data;
    }

    public cancellationToken(): Cancellation.Token {
        return this._cancellationToken;
    }

    constructor(peer: IScenePeer, scene: Scene, id: number, ordered: boolean, data: Uint8Array, token: Cancellation.Token) {
        this._scene = scene;
        this.id = id;
        this._ordered = ordered;
        this._peer = peer;
        this._data = data;
        this._cancellationToken = token;
    }

    private writeRequestId(data: Uint8Array): Uint8Array {
        var newData = new Uint8Array(2 + data.byteLength);
        (new DataView(newData.buffer)).setUint16(0, this.id, true);
        newData.set(data, 2);
        return newData;
    }

    public sendValue(data: Uint8Array, priority: PacketPriority): void {
        data = this.writeRequestId(data);
        this._scene.sendPacket(RpcClientPlugin.NextRouteName, data, priority, (this._ordered ? PacketReliability.RELIABLE_ORDERED : PacketReliability.RELIABLE));
        this._msgSent = 1;
    }

    public sendError(errorMsg: string): void {
        var data = this._peer.serializer.serialize(errorMsg);
        data = this.writeRequestId(data);
        this._scene.sendPacket(RpcClientPlugin.ErrorRouteName, data, PacketPriority.MEDIUM_PRIORITY, PacketReliability.RELIABLE_ORDERED);
    }

    public sendCompleted(): void {
        var data = new Uint8Array(0);
        var data = this.writeRequestId(data);
        var data2 = new Uint8Array(1 + data.byteLength);
        data2[0] = this._msgSent;
        this._scene.sendPacket(RpcClientPlugin.CompletedRouteName, data, PacketPriority.MEDIUM_PRIORITY, PacketReliability.RELIABLE_ORDERED);
    }
}
