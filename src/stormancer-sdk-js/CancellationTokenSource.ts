module Cancellation {

    /**
    TokenSource
    */
    export class TokenSource {

        /**
        Constructor
        */
        constructor() {
        }

        private data: sourceData = {
            reason: <string>null,
            isCancelled: false,
            listeners: []
        };
        
        /**
        Cancel
        */
        public cancel(reason?: string): void {
            this.data.isCancelled = true;
            reason = reason || 'Operation Cancelled';

            this.data.reason = reason;

            setTimeout(function () {
                for (var i = 0; i < this.data.listeners.length; i++) {
                    if (typeof this.data.listeners[i] === 'function') {
                        this.data.listeners[i](reason);
                    }
                }
            }, 0);
        }
        
        /**
        Token
        */
        public token: token = new token(this.data);
    }
    
    /**
    Token
    */
    export class token {
        
        /**
        Constructor
        */
        constructor(data: sourceData) {
            this.data = data;
        }

        private data: sourceData;
        
        /**
        To know if the token has been cancelled.
        */
        public isCancelled(): boolean {
            return this.data.isCancelled;
        }

        /**
        Throw an exception if the token is cancelled.
        */
        public throwIfCancelled(): void {
            if (this.isCancelled()) {
                throw this.data.reason;
            }
        }

        /**
        Call a function when the token is cancelled.
        */
        public onCancelled(callBack: (reason: string) => void) {
            if (this.isCancelled()) {
                setTimeout(function () {
                    callBack(this.data.reason);
                }, 0);
            } else {
                this.data.listeners.push(callBack);
            }
        }
    }

    /**
    sourceData
    */
    export interface sourceData {

        /**
        Cancellation reason
        */
        reason: string;
        
        /**
        token is cancelled
        */
        isCancelled: boolean;
        
        /**
        Listeners array
        */
        listeners: ((reason: string) => void)[]
    }
}