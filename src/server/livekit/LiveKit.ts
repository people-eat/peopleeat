import type { EgressClient, RoomServiceClient } from 'livekit-server-sdk';

export interface LiveKitAccessTokenCreateArgs {
    identity: string;
    name: string | undefined;
    roomName: string;
    /** Token lifetime; default 2h. */
    ttl?: string;
}

export interface LiveKit {
    /** WebSocket URL for browser clients (`wss://…`). */
    url: () => string;
    /** Prefix baked into LiveKit room names so multi-env DBs don't collide. */
    roomPrefix: () => string;
    roomService: () => RoomServiceClient;
    egress: () => EgressClient;
    accessTokenCreate: (args: LiveKitAccessTokenCreateArgs) => Promise<string>;
}
