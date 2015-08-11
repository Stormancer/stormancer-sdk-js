declare class Promise<T> {
    constructor(f: any);
    then(onFulfilled: any, onRejected: any): Promise<T>;
    catch(onRejected: any): Promise<T>;

    static all<T>(iterable?: any[]): Promise<T>;
    static race<T>(iterable?: any[]): Promise<T>;
    static reject<T>(reason?: any): Promise<T>;
    static resolve<T>(value?: any): Promise<T>;
}
declare var $http: any;
