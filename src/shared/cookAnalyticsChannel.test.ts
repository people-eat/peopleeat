import { describe, expect, it } from 'vitest';

import {
    COOK_ANALYTICS_CHANNEL_DEFAULT,
    cookAnalyticsChannelParse,
    cookAnalyticsChannels,
    cookAnalyticsFunnelChannels,
} from './cookAnalyticsChannel';

describe('cookAnalyticsChannel', () => {
    it('parses known channels and rejects unknown values', () => {
        expect(cookAnalyticsChannelParse('DIRECT')).toBe('DIRECT');
        expect(cookAnalyticsChannelParse('POOL')).toBe('POOL');
        expect(cookAnalyticsChannelParse('ALL')).toBe('ALL');
        expect(cookAnalyticsChannelParse('nope')).toBeUndefined();
        expect(cookAnalyticsChannelParse(1)).toBeUndefined();
    });

    it('exposes defaults and funnel channels', () => {
        expect(COOK_ANALYTICS_CHANNEL_DEFAULT).toBe('ALL');
        expect(cookAnalyticsChannels).toEqual(['ALL', 'DIRECT', 'POOL']);
        expect(cookAnalyticsFunnelChannels).toEqual(['DIRECT', 'POOL']);
    });
});
