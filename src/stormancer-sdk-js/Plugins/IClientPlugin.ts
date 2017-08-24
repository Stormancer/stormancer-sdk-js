namespace Stormancer {
    export interface IClientPlugin {
        build(ctx: PluginBuildContext): void;
    }
} 