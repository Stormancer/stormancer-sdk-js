module Stormancer {
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
                str = str.replace('{' + i + '}', args[i]);
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
                if (context) {
                    return action.call(context);
                }
                else {
                    return action();
                }
            } else {
                return Promise.resolve();
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

        private _promise: Promise<T>;
        public promise(): Promise<T> {
            return this._promise;
        }

        private _state: string = "pending";
        public state(): string {
            return this._state;
        }

        private _resolve: any;
        private _reject: any;

        public resolve(value?: T) {
            this._resolve(value);
            this._state = "resolved";
        }

        public reject(error?: any) {
            this._reject(error);
            this._state = "rejected";
        }
    }
}
