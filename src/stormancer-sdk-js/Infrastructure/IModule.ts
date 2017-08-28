/*export*/ interface IRequestModule {
    register(builder: (msgId: number, handler: (context: RequestContext) => Promise<void>) => void): void;
}
