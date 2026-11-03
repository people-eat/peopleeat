import { describe, expect, it } from 'vitest';

import { notificationLastChannelNeedsConfirm, notificationWhatsAppSwitchChecked } from './AccountNotificationSettings';

describe('AccountNotificationSettings', () => {
    it('shows WhatsApp off without a number and does not treat that as a stored off', () => {
        expect(notificationWhatsAppSwitchChecked(false, true)).toBe(false);
        expect(notificationWhatsAppSwitchChecked(true, true)).toBe(true);
        expect(notificationWhatsAppSwitchChecked(true, false)).toBe(false);
    });

    it('confirms only when the last delivering channel of an evening or offer row is turned off', () => {
        expect(
            notificationLastChannelNeedsConfirm({
                confirmLastChannel: true,
                enabled: false,
                hasPhoneNumber: false,
                emailOn: true,
                whatsAppOn: true,
                channel: 'email',
            }),
        ).toBe(true);
        expect(
            notificationLastChannelNeedsConfirm({
                confirmLastChannel: true,
                enabled: false,
                hasPhoneNumber: true,
                emailOn: true,
                whatsAppOn: true,
                channel: 'email',
            }),
        ).toBe(false);
        expect(
            notificationLastChannelNeedsConfirm({
                confirmLastChannel: true,
                enabled: false,
                hasPhoneNumber: true,
                emailOn: false,
                whatsAppOn: true,
                channel: 'whatsApp',
            }),
        ).toBe(true);
        expect(
            notificationLastChannelNeedsConfirm({
                confirmLastChannel: false,
                enabled: false,
                hasPhoneNumber: false,
                emailOn: true,
                whatsAppOn: true,
                channel: 'email',
            }),
        ).toBe(false);
    });
});
