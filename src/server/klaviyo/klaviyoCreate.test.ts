import { afterEach, describe, expect, it, vi } from 'vitest';

import { klaviyoCreate, klaviyoPhoneNumberNormalize } from './klaviyoCreate';

describe('klaviyoPhoneNumberNormalize', () => {
    it('accepts E.164 numbers', () => {
        expect(klaviyoPhoneNumberNormalize('+4915123456789')).toBe('+4915123456789');
    });

    it('rejects missing or non-E.164 values', () => {
        expect(klaviyoPhoneNumberNormalize(null)).toBeUndefined();
        expect(klaviyoPhoneNumberNormalize('')).toBeUndefined();
        expect(klaviyoPhoneNumberNormalize('015123456789')).toBeUndefined();
        expect(klaviyoPhoneNumberNormalize('+0123')).toBeUndefined();
    });
});

describe('klaviyoCreate', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('isConfigured is true when wired with a boot-required API key', () => {
        const log = { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() };
        const klaviyo = klaviyoCreate({ privateApiKey: 'pk_test', log: log as never });
        expect(klaviyo.isConfigured()).toBe(true);
    });

    it('POSTs create-or-update profile with external_id and omits invalid phone', async () => {
        let capturedUrl: string | undefined;
        let capturedInit: RequestInit | undefined;
        vi.stubGlobal('fetch', async (url: string | URL | Request, init?: RequestInit) => {
            capturedUrl = String(url);
            capturedInit = init;
            return new Response(null, { status: 201 });
        });
        const log = { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() };
        const klaviyo = klaviyoCreate({ privateApiKey: 'pk_test', log: log as never });

        await klaviyo.profileUpsert({
            externalId: 'user-1',
            email: 'Ada@Example.com',
            firstName: 'Ada',
            lastName: 'Lovelace',
            phoneNumber: '0151',
        });

        expect(capturedUrl).toBe('https://a.klaviyo.com/api/profile-import/');
        expect(capturedInit?.method).toBe('POST');
        expect(capturedInit?.headers).toMatchObject({
            Authorization: 'Klaviyo-API-Key pk_test',
            revision: '2025-01-15',
        });
        expect(JSON.parse(String(capturedInit?.body))).toEqual({
            data: {
                type: 'profile',
                attributes: {
                    email: 'ada@example.com',
                    external_id: 'user-1',
                    first_name: 'Ada',
                    last_name: 'Lovelace',
                },
            },
        });
    });

    it('includes E.164 phone numbers', async () => {
        let capturedInit: RequestInit | undefined;
        vi.stubGlobal('fetch', async (_url: string | URL | Request, init?: RequestInit) => {
            capturedInit = init;
            return new Response(null, { status: 200 });
        });
        const log = { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() };
        const klaviyo = klaviyoCreate({ privateApiKey: 'pk_test', log: log as never });

        await klaviyo.profileUpsert({
            externalId: 'user-1',
            email: 'ada@example.com',
            firstName: 'Ada',
            lastName: 'Lovelace',
            phoneNumber: '+4915123456789',
        });

        const body = JSON.parse(String(capturedInit?.body));
        expect(body.data.attributes.phone_number).toBe('+4915123456789');
    });

    it('throws when Klaviyo returns a non-OK status', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response('nope', { status: 429 })),
        );
        const log = { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() };
        const klaviyo = klaviyoCreate({ privateApiKey: 'pk_test', log: log as never });

        await expect(
            klaviyo.profileUpsert({
                externalId: 'user-1',
                email: 'ada@example.com',
                firstName: 'Ada',
                lastName: 'Lovelace',
            }),
        ).rejects.toThrow(/klaviyo.profileUpsert failed \(429\)/);
    });
});
