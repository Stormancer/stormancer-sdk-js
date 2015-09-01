/**
Represents a Stormancer scene.
@interface IScene
@memberof Stormancer
*/
/**
Gets a string representing the scene id.
@member Stormancer.IScene#id
@type {string}
*/
/**
True if the instance is an host. False if it's a client.
@member Stormancer.IScene#isHost
@type {boolean}
*/
/**
Gets a component registered in the scene.
@method Stormancer.IScene#getComponent
@param {string} componentName The name of the component.
@return {object} The requested component.
*/
/**
Gets a component registered in the scene for a type
@method Stormancer.IScene#registerComponent
@param {string} componentName The component to register.
@param {function} factory The component factory to get an instance of the requested component.
*/

module Stormancer {
    export interface IScene {
        
        id: string;
        
        isHost: boolean;

        getComponent<T>(componentName: string): T;

        registerComponent<T>(componentName: string, factory: () => T): void;
    }
}
