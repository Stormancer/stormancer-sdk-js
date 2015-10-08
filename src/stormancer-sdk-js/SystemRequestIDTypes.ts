module Stormancer {

    /**
    Message types understood by the agent.
    @alias SystemRequestIDTypes
    @enum {number}
    @memberof Stormancer
    */
    var _ = // Fake jsdoc enum SystemRequestIDTypes
        {
            /** 134 - Connects the user to a scene */
            ID_CONNECT_TO_SCENE: 134,
            /** 135 - Used to disconnect the user from a scene */
            ID_DISCONNECT_FROM_SCENE: 135,
            /** 136 - Retrives runtime informations about a scene */
            ID_GET_SCENE_INFOS: 136,
            /** 0 - Set metadata */
            ID_SET_METADATA: 0,
            /** 1 - Scene is ready */
            ID_SCENE_READY: 1,
            /** 2 - Ping request */
            ID_PING: 2
        };

    export class SystemRequestIDTypes {
        public static ID_SET_METADATA = 0;
        public static ID_SCENE_READY = 1;
        public static ID_PING = 2;
        // ...
        public static ID_CONNECT_TO_SCENE = 134;
        public static ID_DISCONNECT_FROM_SCENE = 135;
        public static ID_GET_SCENE_INFOS = 136;
    }
}
