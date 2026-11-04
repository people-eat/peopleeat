import { describe, expect, it } from 'vitest';

import { cookPresenceLinksFromStored, cookPresenceLinksNormalize } from './cookPresenceLinks';

describe('cookPresenceLinksNormalize', () => {
    it('stores nothing when every field is blank', () => {
        const result = cookPresenceLinksNormalize({
            websiteUrl: '  ',
            instagramUrl: '',
            googleProfileUrl: null,
            takeAChefUrl: null,
            otherProfiles: [{ platform: 'OTHER', label: '  ', url: '' }],
        });
        expect(result).toEqual({ ok: true, value: null });
    });

    it('keeps https links and drops a blank extra row', () => {
        const result = cookPresenceLinksNormalize({
            websiteUrl: 'https://anna.example/about',
            instagramUrl: 'https://www.instagram.com/anna.cooks/',
            googleProfileUrl: 'https://maps.app.goo.gl/abc',
            takeAChefUrl: 'https://www.takeachef.com/de-de/chef/anna',
            otherProfiles: [
                { platform: 'YHUNGRY', label: 'ignored', url: 'https://www.yhangry.com/chefs/anna' },
                { platform: 'OTHER', label: '  local supper club ', url: 'https://supper.example' },
                { platform: 'COZYMEAL', label: '', url: '   ' },
            ],
        });
        expect(result).toEqual({
            ok: true,
            value: {
                websiteUrl: 'https://anna.example/about',
                instagramUrl: 'https://www.instagram.com/anna.cooks/',
                googleProfileUrl: 'https://maps.app.goo.gl/abc',
                takeAChefUrl: 'https://www.takeachef.com/de-de/chef/anna',
                otherProfiles: [
                    { platform: 'YHUNGRY', label: null, url: 'https://www.yhangry.com/chefs/anna' },
                    { platform: 'OTHER', label: 'Local supper club', url: 'https://supper.example/' },
                ],
            },
        });
    });

    it('accepts Google Maps, g.page, and Business Profile hosts', () => {
        for (const googleProfileUrl of [
            'https://www.google.com/maps/place/Anna',
            'https://www.google.de/maps/place/Anna',
            'https://g.page/r/abc',
            'https://business.google.com/dashboard',
            'https://maps.google.com/?cid=1',
        ]) {
            const result = cookPresenceLinksNormalize({ googleProfileUrl, otherProfiles: [] });
            expect(result.ok).toBe(true);
        }
    });

    it('rejects a non-https URL, credentials, a bare Instagram host, and a Google search link', () => {
        expect(cookPresenceLinksNormalize({ websiteUrl: 'http://anna.example', otherProfiles: [] }).ok).toBe(false);
        expect(cookPresenceLinksNormalize({ websiteUrl: 'https://user:secret@anna.example', otherProfiles: [] })).toMatchObject({
            ok: false,
            issue: { code: 'credentials', field: 'websiteUrl' },
        });
        expect(cookPresenceLinksNormalize({ instagramUrl: 'https://instagram.com', otherProfiles: [] })).toMatchObject({
            ok: false,
            issue: { code: 'instagramHost' },
        });
        expect(cookPresenceLinksNormalize({ instagramUrl: 'https://facebook.com/anna', otherProfiles: [] })).toMatchObject({
            ok: false,
            issue: { code: 'instagramHost' },
        });
        expect(cookPresenceLinksNormalize({ googleProfileUrl: 'https://www.google.com/search?q=anna', otherProfiles: [] })).toMatchObject({
            ok: false,
            issue: { code: 'googleHost' },
        });
        expect(cookPresenceLinksNormalize({ takeAChefUrl: 'https://example.com/chef', otherProfiles: [] })).toMatchObject({
            ok: false,
            issue: { code: 'takeAChefHost' },
        });
    });

    it('requires a name for other platforms and rejects a duplicate named platform', () => {
        expect(
            cookPresenceLinksNormalize({
                otherProfiles: [{ platform: 'OTHER', label: ' ', url: 'https://supper.example' }],
            }),
        ).toMatchObject({ ok: false, issue: { code: 'labelRequired', index: 0 } });

        expect(
            cookPresenceLinksNormalize({
                otherProfiles: [
                    { platform: 'EATWITH', url: 'https://www.eatwith.com/a' },
                    { platform: 'EATWITH', url: 'https://www.eatwith.com/b' },
                ],
            }),
        ).toMatchObject({ ok: false, issue: { code: 'duplicatePlatform', index: 1 } });
    });

    it('rejects more than five other profiles', () => {
        const result = cookPresenceLinksNormalize({
            otherProfiles: Array.from({ length: 6 }, (_, index) => ({
                platform: 'OTHER' as const,
                label: `Club ${index}`,
                url: `https://club-${index}.example`,
            })),
        });
        expect(result).toMatchObject({ ok: false, issue: { code: 'tooMany' } });
    });
});

describe('cookPresenceLinksFromStored', () => {
    it('returns null for corrupt or empty documents', () => {
        expect(cookPresenceLinksFromStored(null)).toBeNull();
        expect(cookPresenceLinksFromStored({ websiteUrl: 1 })).toBeNull();
        expect(
            cookPresenceLinksFromStored({
                websiteUrl: null,
                instagramUrl: null,
                googleProfileUrl: null,
                takeAChefUrl: null,
                otherProfiles: [],
            }),
        ).toBeNull();
    });
});
