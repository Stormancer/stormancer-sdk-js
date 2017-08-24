namespace Stormancer {
    export interface Map {
        [key: string]: string;
    }

    export interface IMap<T> {
        [key: string]: T;
    }

    export class Helpers {
        static base64ToByteArray(data: string): Uint8Array {
            return new Uint8Array(atob(data).split('').map(function (c) { return c.charCodeAt(0) }));
        }

        static stringFormat(str: string, ...args: any[]): string {
            for (var i in args) {
                var regexp: RegExp = new RegExp("\\{" + i + "\\}", "g");
                str = str.replace(regexp, args[i]);
            }
            return str;
        }

        static mapKeys(map: { [key: string]: any }): string[] {
            var keys: string[] = [];
            for (var key in map) {
                if (map.hasOwnProperty(key)) {
                    keys.push(key);
                }
            }
            return keys;
        }

        static mapValues<T>(map: IMap<T>): T[] {
            var result: T[] = [];
            for (var key in map) {
                result.push(map[key]);
            }

            return result;
        }

        static promiseIf(condition: boolean, action: () => Promise<void>, context?: any): Promise<void> {
            if (condition) {
                return action.call(context);
            } else {
                return Promise.resolve();
            }
        }
        
        static invokeWrapping<TResult>(func: (arg?: any) => TResult, arg?: any): Promise<TResult> {
            try {
                return Promise.resolve(func(arg));
            }
            catch (exception) {
                return Promise.reject(exception);
            }
        }
    }

    export interface IObserver<T> {
        onCompleted(): void;
        onError(error: any): void;
        onNext(value: T): void;
    }

    export class Deferred<T> {
        constructor() {
            this._promise = new Promise<T>((resolve, reject) => {
                this._resolve = resolve;
                this._reject = reject;
            });
        }

        public promise(): Promise<T> {
            return this._promise;
        }

        public state(): string {
            return this._state;
        }

        public resolve(value?: T) {
            this._resolve(value);
            this._state = "resolved";
        }

        public reject(error?: any) {
            this._reject(error);
            this._state = "rejected";
        }

        private _promise: Promise<T>;
        private _state: string = "pending";
        private _resolve: any;
        private _reject: any
    }
}
