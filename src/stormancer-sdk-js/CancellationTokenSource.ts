/*export*/ module Cancellation {

    /**
    TokenSource
    */
    /*export*/ class TokenSource {

        /**
        Constructor
        */
        constructor() {
        }

        /**
        Cancel
        */
        public cancel(reason?: string): void {
            this._data.isCancelled = true;
            reason = reason || 'Operation Cancelled';

            this._data.reason = reason;

            setTimeout(() => {
                for (var i = 0; i < this._data.listeners.length; i++) {
                    if (typeof this._data.listeners[i] === 'function') {
                        this._data.listeners[i](reason);
                    }
                }
            }, 0);
        }

        public getToken(): Token {
            return this._token;
        }

        private _data: sourceData = {
            reason: <string>null,
            isCancelled: false,
            listeners: []
        };

        /**
        Token
        */
        private _token: Token = new Token(this._data);
    }

    /**
    Token
    */
    /*export*/ class Token {

        /**
        Constructor
        */
        constructor(data: sourceData) {
            this._data = data;
        }

        /**
        To know if the token has been cancelled.
        */
        public isCancelled(): boolean {
            return this._data.isCancelled;
        }

        /**
        Throw an exception if the token is cancelled.
        */
        public throwIfCancelled(): void {
            if (this.isCancelled()) {
                throw this._data.reason;
            }
        }

        /**
        Call a function when the token is cancelled.
        */
        public onCancelled(callBack: (reason: string) => void) {
            if (this.isCancelled()) {
                setTimeout(() => {
                    callBack(this._data.reason);
                }, 0);
            } else {
                this._data.listeners.push(callBack);
            }
        }

        private _data: sourceData;
    }

    /**
    sourceData
    */
    /*export*/ interface sourceData {

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
