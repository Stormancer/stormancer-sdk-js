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

    export class MessageIDTypes {
        public static ID_SYSTEM_REQUEST = 134;
        public static ID_REQUEST_RESPONSE_MSG = 137;
        public static ID_REQUEST_RESPONSE_COMPLETE = 138;
        public static ID_REQUEST_RESPONSE_ERROR = 139;
        public static ID_CONNECTION_RESULT = 140;
        public static ID_SCENES = 141;
    }
}
