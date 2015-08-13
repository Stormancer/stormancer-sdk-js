module Stormancer {

    /**
    Available packet priorities
    @alias PacketPriority
    @enum {number}
    @memberof Stormancer
    */
    var _ = // Fake object for jsdoc enum PacketPriority
        {
            /** 0 - The packet is sent immediately without aggregation. */
            IMMEDIATE_PRIORITY: 0,
            /** 1 - The packet is sent at high priority level. */
            HIGH_PRIORITY: 1,
            /** 2 - The packet is sent at medium priority level. */
            MEDIUM_PRIORITY: 2,
            /** 3 - The packet is sent at low priority level. */
            LOW_PRIORITY: 3
        };

    export enum PacketPriority {
        IMMEDIATE_PRIORITY = 0,
        HIGH_PRIORITY = 1,
        MEDIUM_PRIORITY = 2,
        LOW_PRIORITY = 3
    }
}
