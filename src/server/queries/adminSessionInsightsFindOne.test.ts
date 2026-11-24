import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { sessions } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminSessionInsightsFindOne } from './adminSessionInsightsFindOne';

const IPHONE_SAFARI =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const MAC_SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const WINDOWS_EDGE =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';

describe('adminSessionInsightsFindOne', () => {
    it('ranks attribution and buckets device / OS / browser for human sessions in range', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser({
            firstName: 'session-insights-admin',
            lastName: 'User',
        });
        const token = `insights-${idCreate().slice(0, 8)}`;
        const millisecondOffset = Number.parseInt(idCreate().slice(0, 8), 36);
        const createdAt = new Date(Date.UTC(2097, 4, 1) + millisecondOffset);
        const range = { startDateTime: createdAt, endDateTime: createdAt };
        const chatgpt = `https://${token}.chatgpt.com/`;
        const returnSessionId = idCreate();
        await testDb.insert(sessions).values({
            sessionId: returnSessionId,
            userAgent: MAC_SAFARI,
            isBot: false,
            // Outside the insights range so it only exists as the FK target.
            createdAt: new Date(createdAt.getTime() - 86_400_000),
        });

        for (let index = 0; index < 2; index += 1) {
            await testDb.insert(sessions).values({
                sessionId: idCreate(),
                landingPath: `/${token}/home`,
                referrer: chatgpt,
                userAgent: IPHONE_SAFARI,
                isBot: false,
                createdAt,
            });
        }
        await testDb.insert(sessions).values({
            sessionId: idCreate(),
            landingPath: `/${token}/chefs`,
            referrer: null,
            userAgent: ANDROID_CHROME,
            isBot: false,
            createdAt,
        });
        await testDb.insert(sessions).values({
            sessionId: idCreate(),
            landingPath: `/${token}/home`,
            referrer: chatgpt,
            userAgent: MAC_SAFARI,
            isBot: false,
            createdAt,
        });
        await testDb.insert(sessions).values({
            sessionId: idCreate(),
            landingPath: `/${token}/home`,
            referrer: chatgpt,
            userAgent: WINDOWS_EDGE,
            isBot: false,
            createdAt,
        });
        await testDb.insert(sessions).values({
            sessionId: idCreate(),
            landingPath: `/${token}/home`,
            referrer: chatgpt,
            userAgent: IPHONE_SAFARI,
            isBot: true,
            createdAt,
        });
        await testDb.insert(sessions).values({
            sessionId: idCreate(),
            landingPath: `/${token}/home`,
            referrer: chatgpt,
            userAgent: IPHONE_SAFARI,
            isBot: false,
            impersonationReturnSessionId: returnSessionId,
            createdAt,
        });

        // Act
        const insights = await adminSessionInsightsFindOne({ take: 10, range }, requestingSession, serverRuntime);

        // Assert
        expect(insights.sessionCount).toBe(5);
        expect(insights.landingPaths[0]).toEqual({ landingPath: `/${token}/home`, count: 4 });
        expect(insights.landingPaths.find((row) => row.landingPath === `/${token}/chefs`)?.count).toBe(1);
        expect(insights.referrers[0]).toEqual({ referrer: chatgpt, count: 4 });
        expect(insights.referrers.find((row) => row.referrer == null)?.count).toBe(1);

        expect(insights.devices.find((row) => row.deviceClass === 'mobile')?.count).toBe(3);
        expect(insights.devices.find((row) => row.deviceClass === 'desktop')?.count).toBe(2);

        expect(insights.operatingSystems.find((row) => row.operatingSystem === 'ios')?.count).toBe(2);
        expect(insights.operatingSystems.find((row) => row.operatingSystem === 'android')?.count).toBe(1);
        expect(insights.operatingSystems.find((row) => row.operatingSystem === 'macos')?.count).toBe(1);
        expect(insights.operatingSystems.find((row) => row.operatingSystem === 'windows')?.count).toBe(1);

        expect(insights.browsers.find((row) => row.browser === 'safari')?.count).toBe(3);
        expect(insights.browsers.find((row) => row.browser === 'chrome')?.count).toBe(1);
        expect(insights.browsers.find((row) => row.browser === 'edge')?.count).toBe(1);
    });
});
