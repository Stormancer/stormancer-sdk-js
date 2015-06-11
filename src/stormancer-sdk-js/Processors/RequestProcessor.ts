///<reference path="../MessageIDTypes.ts"/>
module Stormancer {
    interface SystemRequest {
        lastRefresh: Date;
        id: number;
        observer: IObserver<Packet<IConnection>>;
        deferred: JQueryDeferred<void>;
    }

    export class RequestProcessor implements IPacketProcessor {
        private _pendingRequests: IMap<SystemRequest> = {};
        private _logger: ILogger;
        private _isRegistered: boolean = false;
        private _handlers: IMap<(context: RequestContext) => JQueryPromise<void>> = {};

        constructor(logger: ILogger, modules: IRequestModule[]) {
            this._pendingRequests = {};
            this._logger = logger;
            for (var key in modules) {
                var mod = modules[key];
                mod.register(this.addSystemRequestHandler);
            }
        }

        public registerProcessor(config: PacketProcessorConfig): void {
            this._isRegistered = true;
            for (var key in this._handlers) {
                var handler = this._handlers[key];
                config.addProcessor(key,(p: Packet<IConnection>) => {
                    var context = new RequestContext(p);

                    var continuation = (fault: any) => {
                        if (!context.isComplete) {
                            if (fault) {
                                context.error(p.connection.serializer.serialize(fault));
                            }
                            else {
                                context.complete();
                            }
                        }
                    };

                    handler(context)
                        .done(() => continuation(null))
                        .fail(error => continuation(error));

                    return true;
                });
            }

            config.addProcessor(MessageIDTypes.ID_REQUEST_RESPONSE_MSG, p => {
                var id = new DataView(p.data.buffer, p.data.byteOffset).getUint16(0, true);
                var request: SystemRequest = this._pendingRequests[id];
                if (request) {
                    p.setMetadataValue["request"] = request;
                    request.lastRefresh = new Date();
                    p.data = p.data.subarray(2);
                    request.observer.onNext(p);
                    request.deferred.resolve();
                }
                else {
                    console.error("Unknow request id.");
                    return true;
                }

                return true;
            });

            config.addProcessor(MessageIDTypes.ID_REQUEST_RESPONSE_COMPLETE, p => {
                var id = new DataView(p.data.buffer, p.data.byteOffset).getUint16(0, true);

                var request = this._pendingRequests[id];
                if (request) {
                    p.setMetadataValue("request", request);
                }
                else {
                    console.error("Unknow request id.");
                    return true;
                }

                delete this._pendingRequests[id];
                if (p.data[3]) {
                    request.deferred.promise().always(() => request.observer.onCompleted());
                }
                else {
                    request.observer.onCompleted();
                }

                return true;
            });

            config.addProcessor(MessageIDTypes.ID_REQUEST_RESPONSE_ERROR, p => {
                var id = new DataView(p.data.buffer, p.data.byteOffset).getUint16(0, true);

                var request = this._pendingRequests[id];
                if (request) {
                    p.setMetadataValue("request", request);
                }
                else {
                    console.error("Unknow request id.");
                    return true;
                }

                delete this._pendingRequests[id];

                var msg = p.connection.serializer.deserialize<string>(p.data.subarray(2));

                request.observer.onError(new Error(msg));

                return true;
            });
        }

        public addSystemRequestHandler(msgId: number, handler: (context: RequestContext) => JQueryPromise<void>): void {
            if (this._isRegistered) {
                throw new Error("Can only add handler before 'registerProcessor' is called.");
            }
            this._handlers[msgId] = handler;
        }

        private reserveRequestSlot(observer: IObserver<Packet<IConnection>>) {
            var id = 0;
            (<any>this).toto = 1;
            while (id < 65535) {
                if (!this._pendingRequests[id]) {
                    var request: SystemRequest = { lastRefresh: new Date, id: id, observer: observer, deferred: jQuery.Deferred<void>() };
                    this._pendingRequests[id] = request;
                    return request;
                }
                id++;
            }

            throw new Error("Unable to create new request: Too many pending requests.");
        }

        public sendSystemRequest(peer: IConnection, msgId: number, data: Uint8Array): JQueryPromise<Packet<IConnection>> {
            var deferred = $.Deferred<Packet<IConnection>>();

            var request = this.reserveRequestSlot({
                onNext(packet) { deferred.resolve(packet); },
                onError(e) { deferred.reject(e) },
                onCompleted() {
                    deferred.resolve();
                }
            });

            var dataToSend = new Uint8Array(3 + data.length);
            var idArray = new Uint16Array([request.id]);
            dataToSend.set([msgId],0);
            dataToSend.set(new Uint8Array(idArray.buffer), 1);
            dataToSend.set(data, 3);
            peer.sendSystem(MessageIDTypes.ID_SYSTEM_REQUEST, dataToSend);

            return deferred.promise();
        }
    }
}