/**
@namespace Stormancer
*/
module Stormancer {
    export class RpcClientPlugin implements IClientPlugin {
        static NextRouteName = "stormancer.rpc.next";
        static ErrorRouteName = "stormancer.rpc.error";
        static CompletedRouteName = "stormancer.rpc.completed";
        static Version = "1.0.0";
        static PluginName = "stormancer.plugins.rpc";
        static ServiceName = "rpcService";

        public build(ctx: PluginBuildContext): void {
            ctx.sceneCreated.push((scene: IScene) => {
                var rpcParams = scene.getHostMetadata(RpcClientPlugin.PluginName);

                if (rpcParams == RpcClientPlugin.Version) {
                    var processor = new RpcService(scene);
                    scene.registerComponent(RpcClientPlugin.ServiceName, () => processor);
                    scene.addRoute(RpcClientPlugin.NextRouteName, p => {
                        processor.next(p);
                    });
                    scene.addRoute(RpcClientPlugin.ErrorRouteName, p => {
                        processor.error(p);
                    });
                    scene.addRoute(RpcClientPlugin.CompletedRouteName, p => {
                        processor.complete(p);
                    });
                }
            });
        }

        
         
    }
} 