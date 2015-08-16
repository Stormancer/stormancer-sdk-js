module Stormancer {
    interface RpcRequest {
        observer: IObserver<Packet<IScenePeer>>;
        deferred: JQueryDeferred<void>;
        receivedMessages: number;
        id: number;
    }

    export class RpcService {
        private _currentRequestId: number = 0;
        private _scene: Scene;
        private _pendingRequests: IMap<RpcRequest> = {};

        constructor(scene: Scene) {
            this._scene = scene;
        }

        public RpcRaw(route: string, data: Uint8Array,
            onNext: (packet: Packet<IScenePeer>) => void,
            onError: (error: string) => void = (error) => { },
            onCompleted: () => void = () => { },
            priority: PacketPriority = PacketPriority.MEDIUM_PRIORITY): ISubscription {

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

            var deferred = jQuery.Deferred<void>();
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
                id : id
            };

            this._pendingRequests[id] = request;

            var dataToSend = new Uint8Array(2 + data.length);
            dataToSend.set(<any>[i & 255, i >>> 8]);
            dataToSend.set(data, 2);

            this._scene.sendPacket(route, dataToSend, priority, PacketReliability.RELIABLE_ORDERED);

            return {
                unsubscribe: () => {
                    delete this._pendingRequests[id];
                }
            };
        }

        private reserveId(): number {
            var loop = 0;
            while (this._pendingRequests[this._currentRequestId]) {
                loop++;
                this._currentRequestId = (this._currentRequestId + 1) & 65535;

                if (loop > 65535) {
                    throw new Error("Too many requests in progress, unable to start a new one.");
                }
            }

            return this._currentRequestId;
        }

        //finds the appropriate pending request and consumes the first 2 bytes of the packet.
        private getPendingRequest(packet: Packet<IScenePeer>): RpcRequest {
            var id = packet.data[0] + 256 * packet.data[1];

            packet.data = packet.data.subarray(2);

            return this._pendingRequests[id];
        }

        next(packet: Packet<IScenePeer>): void {
            var request = this.getPendingRequest(packet);
            if (request) {
                request.receivedMessages++;
                request.observer.onNext(packet);
                if (request.deferred.state() == "pending") {
                    request.deferred.resolve();
                }
            }
        }

        error(packet: Packet<IScenePeer>): void {
            var request = this.getPendingRequest(packet);
            if (request) {
                request.observer.onError(packet.connection.serializer.deserialize<string>(packet.data));
                delete this._pendingRequests[request.id];
            }
        }

        complete(packet: Packet<IScenePeer>): void {
            var messageSent = packet.data[0];
            packet.data = packet.data.subarray(1);
            
            var request = this.getPendingRequest(packet);
            if (request) {
                if (messageSent) {
                    request.deferred.then(() => {
                        request.observer.onCompleted();
                        delete this._pendingRequests[request.id];
                    });
                }
                else {
                    request.observer.onCompleted();
                    delete this._pendingRequests[request.id];
                }
            }
        }
    }
} 