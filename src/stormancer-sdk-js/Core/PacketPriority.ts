/**
Available packet priorities
@alias PacketPriority
@enum {number}
@memberof Stormancer
*/

/*export*/ enum PacketPriority {
    IMMEDIATE_PRIORITY = 0,
    HIGH_PRIORITY = 1,
    MEDIUM_PRIORITY = 2,
    LOW_PRIORITY = 3
}

/**
Different available reliability levels when sending a packet.
@alias PacketReliability
@enum {number}
@memberof Stormancer
*/

/*export*/ enum PacketReliability {
    UNRELIABLE = 0,
    UNRELIABLE_SEQUENCED = 1,
    RELIABLE = 2,
    RELIABLE_ORDERED = 3,
    RELIABLE_SEQUENCED = 4
}
