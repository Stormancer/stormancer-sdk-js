module Stormancer {

    /**
    Message types understood by the agent.
    @alias MessageIDTypes
    @enum {number}
    @memberof Stormancer
    */
    var _ = // Fake jsdoc enum MessageIDTypes
        {
            /** 134 - System request */
            ID_SYSTEM_REQUEST: 134,
            /** 137 - Sends a reponse to a system request */
            ID_REQUEST_RESPONSE_MSG: 137,
            /** 138 - Sends a "request complete" message to close a system request channel */
            ID_REQUEST_RESPONSE_COMPLETE: 138,
            /** 139 - Sends an error as aresponse to a system request and close the request channel */
            ID_REQUEST_RESPONSE_ERROR: 139,
            /** 140 - Identifies a response to a connect to scene message */
            ID_CONNECTION_RESULT: 140,
            /** 141 - First id for scene handles */
            ID_SCENES: 141
        };
    
    /**
    Message types understood by the agent.
    @alias SystemRequestIDTypes
    @enum {number}
    @memberof Stormancer
    */
    var _2 = // Fake jsdoc enum SystemRequestIDTypes
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

    export class MessageIDTypes {
        public static ID_SYSTEM_REQUEST = 134;
        public static ID_REQUEST_RESPONSE_MSG = 137;
        public static ID_REQUEST_RESPONSE_COMPLETE = 138;
        public static ID_REQUEST_RESPONSE_ERROR = 139;
        public static ID_CONNECTION_RESULT = 140;
        public static ID_SCENES = 141;
    }

    export class SystemRequestIDTypes {
        public static ID_GET_SCENE_INFOS = 136;
        public static ID_CONNECT_TO_SCENE = 134;
        public static ID_SET_METADATA = 0;
        public static ID_SCENE_READY = 1;
        public static ID_PING = 2;
        public static ID_DISCONNECT_FROM_SCENE = 135;
    }

}
