export class SceneDispatcher implements IPacketProcessor {
    private _scenes: Scene[] = [];
    private _buffers: Packet<IConnection>[][] = [];
    public registerProcessor(config: PacketProcessorConfig): void {
        config.addCatchAllProcessor((handler, packet) => this.handler(handler, packet));
    }

    private handler(sceneHandle: number, packet: Packet<IConnection>): boolean {
        if (sceneHandle < MessageIDTypes.ID_SCENES) {
            return false;
        }
        var scene = this._scenes[sceneHandle - MessageIDTypes.ID_SCENES];
        if (!scene) {
            var buffer: Packet<IConnection>[];
            if (this._buffers[sceneHandle] == undefined) {
                buffer = [];
                this._buffers[sceneHandle] = buffer;
            }
            else {
                buffer = this._buffers[sceneHandle];
            }
            buffer.push(packet);
            return true;
        } else {
            packet.setMetadataValue("scene", scene);
            scene.handleMessage(packet);
            return true;
        }
    }

    public addScene(scene: Scene): void {
        this._scenes[scene.handle - MessageIDTypes.ID_SCENES] = scene;
        if (this._buffers[scene.handle] != undefined) {
            var buffer = this._buffers[scene.handle];
            delete this._buffers[scene.handle];
            while (buffer.length > 0) {
                var packet = buffer.pop();
                packet.setMetadataValue("scene", scene);
                scene.handleMessage(packet);
            }

        }
    }

    public removeScene(sceneHandle: number) {
        delete this._scenes[sceneHandle - MessageIDTypes.ID_SCENES];
    }
}
