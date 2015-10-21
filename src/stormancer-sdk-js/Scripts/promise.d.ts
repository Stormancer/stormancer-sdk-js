declare class Promise<T> {
    constructor(f?: any);
    then<U>(onFulfilled?: any, onRejected?: any): Promise<U>;
    catch(onRejected?: any): Promise<void>;

    static all<T>(iterable?: any[]): Promise<T>;
    static race<T>(iterable?: any[]): Promise<T>;
    static reject<T>(reason?: T): Promise<T>;
    static resolve<T>(value?: T): Promise<T>;
}
