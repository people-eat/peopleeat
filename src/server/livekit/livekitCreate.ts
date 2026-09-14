import { AccessToken, EgressClient, RoomServiceClient } from 'livekit-server-sdk';

import type { LiveKit, LiveKitAccessTokenCreateArgs } from './LiveKit';

export interface LiveKitCreateOptions {
    url: string;
    apiKey: string;
    apiSecret: string;
    /** Explicit room-name prefix; when unset, derived from `webPageUrl` hostname. */
    roomPrefix: string | undefined;
    webPageUrl: string;
}

function roomPrefixFromWebPageUrl(webPageUrl: string): string {
    try {
        const host = new URL(webPageUrl).hostname.replace(/\./g, '-');
        return host.length > 0 ? host : 'peopleeat';
    } catch {
        return 'peopleeat';
    }
}

export function livekitCreate({ url, apiKey, apiSecret, roomPrefix, webPageUrl }: LiveKitCreateOptions): LiveKit {
    let roomServiceClient: RoomServiceClient | undefined;
    let egressClient: EgressClient | undefined;

    return {
        url: () => url,
        roomPrefix: () => roomPrefix?.trim() || roomPrefixFromWebPageUrl(webPageUrl),
        roomService: () => {
            roomServiceClient ??= new RoomServiceClient(url, apiKey, apiSecret);
            return roomServiceClient;
        },
        egress: () => {
            egressClient ??= new EgressClient(url, apiKey, apiSecret);
            return egressClient;
        },
        accessTokenCreate: async (args: LiveKitAccessTokenCreateArgs) => {
            const token = new AccessToken(apiKey, apiSecret, {
                identity: args.identity,
                name: args.name,
                ttl: args.ttl ?? '2h',
            });
            token.addGrant({ roomJoin: true, room: args.roomName });
            return token.toJwt();
        },
    };
}
