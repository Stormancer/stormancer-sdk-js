/**
Message types understood by the agent.
@alias SystemRequestIDTypes
@enum {number}
@memberof Stormancer
*/

export class SystemRequestIDTypes {
    public static ID_SET_METADATA = 0;
    public static ID_SCENE_READY = 1;
    public static ID_PING = 2;
    // ...
    public static ID_CONNECT_TO_SCENE = 134;
    public static ID_DISCONNECT_FROM_SCENE = 135;
    public static ID_GET_SCENE_INFOS = 136;
}
