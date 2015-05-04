module Stormancer {
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
        public static ID_DISCONNECT_FROM_SCENE = 135;

    }
}
