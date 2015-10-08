module Stormancer {
    export class RpcClientPlugin implements IClientPlugin {
        static NextRouteName = "stormancer.rpc.next";
        static ErrorRouteName = "stormancer.rpc.error";
        static CompletedRouteName = "stormancer.rpc.completed";
        static CancellationRouteName = "stormancer.rpc.cancel";
        static Version = "1.1.0";
        static PluginName = "stormancer.plugins.rpc";
        static ServiceName = "rpcService";

        public build(ctx: PluginBuildContext): void {
            ctx.sceneCreated.push((scene: Scene) => {
                var rpcParams = scene.getHostMetadata(RpcClientPlugin.PluginName);

                if (rpcParams == RpcClientPlugin.Version) {
                    var processor = new RpcService(scene);
                    scene.registerComponent(RpcClientPlugin.ServiceName, () => processor);
                    scene.addRoute(RpcClientPlugin.NextRouteName, p => {
                        processor.next(p);
                    });
                    scene.addRoute(RpcClientPlugin.CancellationRouteName, p => {
                        processor.cancel(p);
                    });
                    scene.addRoute(RpcClientPlugin.ErrorRouteName, p => {
                        processor.error(p);
                    });
                    scene.addRoute(RpcClientPlugin.CompletedRouteName, p => {
                        processor.complete(p);
                    });
                }
            });
            ctx.sceneDisconnected.push((scene: Scene) => {
                var processor = scene.getComponent<RpcService>(RpcClientPlugin.ServiceName);
                processor.disconnected();
            });
        }
    }
}
