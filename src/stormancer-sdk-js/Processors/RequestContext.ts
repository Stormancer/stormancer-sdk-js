module Stormancer {

    export class RequestContext {

        private _packet: Packet<IConnection>;
        private _requestId: Uint8Array;
        private _didSendValues = false;

        public inputData: Uint8Array;
        public isComplete = false;

        /**
        @class RequestContext
        @classdesc Context object that provides informations about a running request.
        @memberof Stormancer
        @param {Stormancer.Packet} packet The Packet on which we create the RequestContext.
        */
        constructor(packet: Packet<IConnection>) {
            this._packet = packet;
            this._requestId = packet.data.subarray(0, 2);
            this.inputData = packet.data.subarray(2);
        }

        /**
        Sends a partial response to the client through the request channel
        @method Stormancer.RequestContext#send
        @param {Uint8Array} data The data to send.
        */
        public send(data: Uint8Array): void {
            if (this.isComplete) {
                throw new Error("The request is already completed.");
            }
            this._didSendValues = true;
            var dataToSend = new Uint8Array(2 + data.length);
            dataToSend.set(this._requestId);
            dataToSend.set(data, 2);
            this._packet.connection.sendSystem(MessageIDTypes.ID_REQUEST_RESPONSE_MSG, dataToSend);
        }

        /**
        Completes the request.
        @method Stormancer.RequestContext#complete
        */
        public complete(): void {
            var dataToSend = new Uint8Array(3);
            dataToSend.set(this._requestId);
            dataToSend.set(2, this._didSendValues ? 1 : 0);
            this._packet.connection.sendSystem(MessageIDTypes.ID_REQUEST_RESPONSE_COMPLETE, dataToSend);
        }
        
        /**
        Error on the request.
        @method Stormancer.RequestContext#error
        @param {Uint8Array} data The received data error.
        */
        public error(data: Uint8Array): void {
            var dataToSend = new Uint8Array(2 + data.length);
            dataToSend.set(this._requestId);
            dataToSend.set(data, 2);
            this._packet.connection.sendSystem(MessageIDTypes.ID_REQUEST_RESPONSE_ERROR, dataToSend);
        }
    }
}
