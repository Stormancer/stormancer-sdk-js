module Stormancer {

    /**
    Different available reliability levels when sending a packet.
    @alias PacketReliability
    @enum {number}
    @memberof Stormancer
    */
    var _ = // Fake object for jsdoc enum PacketReliability
        {
            /** 0 - The packet may be lost, or arrive out of order. There are no guarantees whatsoever. */
            UNRELIABLE: 0,
            /** 1 - The packets arrive in order, but may be lost. If a packet arrives out of order, it is discarded.
            The last packet may also never arrive. */
            UNRELIABLE_SEQUENCED: 1,
            /** 2 - The packets always reach destination, but may do so out of order. */
            RELIABLE: 2,
            /** 3 - The packets always reach destination and in order. */
            RELIABLE_ORDERED: 3,
            /** 4 - The packets arrive at destination in order. If a packet arrive out of order, it is ignored.
            That mean that packets may disappear, but the last one always reach destination. */
            RELIABLE_SEQUENCED: 4
        };

    export enum PacketReliability {
        UNRELIABLE = 0,
        UNRELIABLE_SEQUENCED = 1,
        RELIABLE = 2,
        RELIABLE_ORDERED = 3,
        RELIABLE_SEQUENCED = 4
    }
}
