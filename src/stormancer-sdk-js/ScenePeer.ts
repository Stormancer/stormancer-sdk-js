/*export*/ class ScenePeer implements IScenePeer {
    private _connection: IConnection;
    private _sceneHandle: number;
    private _routeMapping: IMap<Route>;
    private _scene: Scene;

    public constructor(connection: IConnection, sceneHandle: number, routeMapping: IMap<Route>, scene: Scene) {
        this._connection = connection;
        this._sceneHandle = sceneHandle;
        this._routeMapping = routeMapping;
        this._scene = scene;
        this.serializer = connection.serializer;
        this.id = this._connection.id;
    }

    public serializer: ISerializer;

    public id: number = null;

    public send(route: string, data: Uint8Array, priority: PacketPriority, reliability: PacketReliability) {
        var r = this._routeMapping[route];
        if (!r) {
            throw new Error("The route " + route + " is not declared on the server.");
        }
        this._connection.sendToScene(this._sceneHandle, r.handle, data, priority, reliability);
    }

    public getComponent<T>(componentName: string): T {
        return this._connection.getComponent<T>(componentName);
    }
}
