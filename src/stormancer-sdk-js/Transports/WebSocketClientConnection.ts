/*export*/ class WebSocketConnection implements IConnection {
    private _socket: WebSocket;

    public constructor(id: number, socket: WebSocket) {
        this.id = id;
        this._socket = socket;
        this.connectionDate = new Date();
        this.state = ConnectionState.Connected;
    }

    // Unique id in the node for the connection.
    public id: number;

    // Connection date.
    public connectionDate: Date;

    // Metadata associated with the connection.
    public metadata: Map = {};

    // Account of the application which the peer is connected to.
    public account: string

    // Name of the application to which the peer is connected.
    public application: string;

    // State of the connection.
    public state: ConnectionState;

    public ping: number = null;

    // Close the connection
    public close(): void {
        this._socket.close();
    }

    // Sends a system message to the peer.
    public sendSystem(msgId: number, data: Uint8Array, priority: PacketPriority = PacketPriority.MEDIUM_PRIORITY): void {
        var bytes = new Uint8Array(data.length + 1);
        bytes[0] = msgId;
        bytes.set(data, 1);
        this._socket.send(bytes.buffer);
    }

    // Sends a packet to the target remote scene.
    public sendToScene(sceneIndex: number, route: number, data: Uint8Array, priority: PacketPriority, reliability: PacketReliability): void {
        var bytes = new Uint8Array(data.length + 3);
        bytes[0] = sceneIndex;
        var ushorts = new Uint16Array(1);
        ushorts[0] = route;
        bytes.set(new Uint8Array(ushorts.buffer), 1);
        bytes.set(data, 3);
        this._socket.send(bytes.buffer);
    }

    // Event fired when the connection has been closed
    public connectionClosed: ((reason: string) => void)[];

    public setApplication(account: string, application: string): void {
        this.account = account;
        this.application = application;
    }

    public serializerChosen: boolean = false;
    public serializer: ISerializer = new MsgPackSerializer();

    private _registeredComponents: IMap<any> = { "serializer": this.serializer };

    public registerComponent<T>(componentName: string, component: T): void {
        this._registeredComponents[componentName] = component;
    }

    getComponent<T>(componentName): T {
        return this._registeredComponents[componentName]();
    }
}
