/**
@namespace Stormancer
*/
module Stormancer {
    export interface IClientPlugin {
        build(ctx: PluginBuildContext): void;
    }
} 