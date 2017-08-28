interface RpcRequest {
    observer: IObserver<Packet<IScenePeer>>;
    deferred: Deferred<void>;
    receivedMessages: number;
    id: number;
}

/*export*/ class RpcService {
    private _currentRequestId: number = 0;
    private _scene: Scene;
    private _pendingRequests: IMap<RpcRequest> = {};
    private _runningRequests: IMap<Cancellation.TokenSource> = {};
    private _msgpackSerializer: MsgPackSerializer = new MsgPackSerializer();

    /**
    @class RpcService
    @memberof Stormancer
    @classdesc Used to send remote procedure call through the RPC plugin.
    If your scene uses the RPC plugin, use `scene.getComponent("rpcService")` to get an instance of this class.
    */
    constructor(scene: Scene) {
        this._scene = scene;
    }

    /**
    @method Stormancer.RpcService#rpc
    @return {ISubscription}
    */
    public rpc(route: string, objectOrData: any,
        onNext: (packet: Packet<IScenePeer>) => void,
        onError: (error: string) => void = (error) => { },
        onCompleted: () => void = () => { },
        priority: PacketPriority = PacketPriority.MEDIUM_PRIORITY): ISubscription {
        var data: Uint8Array | ArrayLike<number>;
        if (objectOrData instanceof Uint8Array) {
            data = objectOrData;
        }
        else {
            if (objectOrData instanceof Array || objectOrData instanceof ArrayBuffer) {
                var data2: ArrayBuffer | ArrayLike<number> = objectOrData;
                data = new Uint8Array(<ArrayBuffer>(data2));
            }
            else if (objectOrData instanceof DataView || objectOrData instanceof Int8Array || objectOrData instanceof Int16Array || objectOrData instanceof Int32Array || objectOrData instanceof Uint8Array || objectOrData instanceof Uint16Array || objectOrData instanceof Uint32Array || objectOrData instanceof Float32Array || objectOrData instanceof Float64Array) {
                data = new Uint8Array(objectOrData.buffer, objectOrData.byteOffset, objectOrData.byteLength);
            }
            else {
                data = this._msgpackSerializer.serialize(objectOrData);
            }
        }

        var remoteRoutes = this._scene.remoteRoutes;
        var relevantRoute: Route;

        for (var i in remoteRoutes) {
            if (remoteRoutes[i].name == route) {
                relevantRoute = remoteRoutes[i];
                break;
            }
        }
        if (!relevantRoute) {
            throw new Error("The target route does not exist on the remote host.");
        }

        if (relevantRoute.metadata[RpcClientPlugin.PluginName] != RpcClientPlugin.Version) {
            throw new Error("The target remote route does not support the plugin RPC version " + RpcClientPlugin.Version);
        }

        var deferred = new Deferred<void>();
        var observer: IObserver<Packet<IScenePeer>> = {
            onNext: onNext,
            onError(error) {
                onError(error);
                deferred.reject(error);
            },
            onCompleted() {
                onCompleted();
                deferred.resolve();
            }
        };

        var id = this.reserveId();
        var request: RpcRequest = {
            observer: observer,
            deferred: deferred,
            receivedMessages: 0,
            id: id
        };

        this._pendingRequests[id] = request;

        var dataToSend = new Uint8Array(2 + data.length);
        (new DataView(dataToSend.buffer)).setUint16(0, id, true);
        dataToSend.set(data, 2);

        this._scene.sendPacket(route, dataToSend, priority, PacketReliability.RELIABLE_ORDERED);

        return {
            unsubscribe: () => {
                if (this._pendingRequests[id]) {
                    delete this._pendingRequests[id];
                    var buffer = new ArrayBuffer(2);
                    new DataView(buffer).setUint16(0, id, true);
                    this._scene.sendPacket("stormancer.rpc.cancel", new Uint8Array(buffer));
                }
            }
        };
    }

    public addProcedure(route: string, handler: (ctx: RpcRequestContext) => any, ordered: boolean): void {
        var metadatas: Map = {};
        metadatas[RpcClientPlugin.PluginName] = RpcClientPlugin.Version;
        this._scene.addRoute(route, p => {
            var requestId = p.getDataView().getUint16(0, true);
            var id = this.computeId(p);
            p.data = p.data.subarray(2);
            var cts = new Cancellation.TokenSource();
            var ctx = new RpcRequestContext(p.connection, this._scene, requestId, ordered, p.data, cts.getToken());
            if (!this._runningRequests[id]) {
                this._runningRequests[id] = cts;
                Helpers.invokeWrapping(handler, ctx).then(() => {
                    delete this._runningRequests[id];
                    ctx.sendCompleted();
                }, reason => {
                    delete this._runningRequests[id];
                    ctx.sendError(reason);
                });
            }
            else {
                throw new Error("Request already exists");
            }
        }, metadatas);
    }

    private reserveId(): number {
        var i = 0;
        while (i <= 0xFFFF) {
            i++;
            this._currentRequestId = (this._currentRequestId + 1) & 0xFFFF;
            if (!this._pendingRequests[this._currentRequestId]) {
                return this._currentRequestId;
            }
        }

        throw new Error("Too many requests in progress, unable to start a new one.");
    }

    private computeId(packet: Packet<IScenePeer>): string {
        var requestId = packet.getDataView().getUint16(0, true);
        var id = packet.connection.id.toString() + "-" + requestId.toString();
        return id;
    }

    //finds the appropriate pending request and consumes the first 2 bytes of the packet.
    private getPendingRequest(packet: Packet<IScenePeer>): RpcRequest {
        var dv = packet.getDataView();
        var id = packet.getDataView().getUint16(0, true);
        packet.data = packet.data.subarray(2);
        return this._pendingRequests[id];
    }

    next(packet: Packet<IScenePeer>): void {
        var request = this.getPendingRequest(packet);
        if (request) {
            request.receivedMessages++;
            request.observer.onNext(packet);
            if (request.deferred.state() === "pending") {
                request.deferred.resolve();
            }
        }
    }

    error(packet: Packet<IScenePeer>): void {
        var request = this.getPendingRequest(packet);
        if (request) {
            delete this._pendingRequests[request.id];
            request.observer.onError(packet.connection.serializer.deserialize<string>(packet.data));
        }
    }

    complete(packet: Packet<IScenePeer>): void {
        var messageSent = packet.data[0];
        packet.data = packet.data.subarray(1);

        var request = this.getPendingRequest(packet);
        if (request) {
            if (messageSent) {
                request.deferred.promise().then(() => {
                    delete this._pendingRequests[request.id];
                    request.observer.onCompleted();
                });
            }
            else {
                delete this._pendingRequests[request.id];
                request.observer.onCompleted();
            }
        }
    }

    cancel(packet: Packet<IScenePeer>): void {
        var id = this.computeId(packet);
        var cts = this._runningRequests[id];
        if (cts) {
            cts.cancel();
        }
    }

    disconnected(): void {
        for (var i in this._runningRequests) {
            if (this._runningRequests.hasOwnProperty(i)) {
                this._runningRequests[i].cancel();
            }
        }
    }
}
