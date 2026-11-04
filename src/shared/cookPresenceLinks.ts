import { z } from 'zod';

import { textNormalizeTitledOrNull } from './textNormalize';

/** Private review links on a cook. Null in the database when nothing is saved. */
export const cookPresenceOtherPlatforms = ['YHUNGRY', 'COZYMEAL', 'EATWITH', 'CHEF_MAISON', 'OTHER'] as const;

export type CookPresenceOtherPlatform = (typeof cookPresenceOtherPlatforms)[number];

export type CookPresenceOtherProfile = {
    platform: CookPresenceOtherPlatform;
    /** Set for `OTHER`. Null for a named platform. */
    label: string | null;
    url: string;
};

export type CookPresenceLinks = {
    websiteUrl: string | null;
    instagramUrl: string | null;
    googleProfileUrl: string | null;
    takeAChefUrl: string | null;
    otherProfiles: CookPresenceOtherProfile[];
};

export type CookPresenceLinksInput = {
    websiteUrl?: string | null;
    instagramUrl?: string | null;
    googleProfileUrl?: string | null;
    takeAChefUrl?: string | null;
    otherProfiles: Array<{
        platform: CookPresenceOtherPlatform;
        label?: string | null;
        url: string;
    }>;
};

export type CookPresenceLinksFormValue = {
    websiteUrl: string;
    instagramUrl: string;
    googleProfileUrl: string;
    takeAChefUrl: string;
    otherProfiles: Array<{
        platform: CookPresenceOtherPlatform;
        label: string;
        url: string;
    }>;
};

export type CookPresenceLinkField = 'websiteUrl' | 'instagramUrl' | 'googleProfileUrl' | 'takeAChefUrl' | 'otherProfiles';

export type CookPresenceLinksIssueCode =
    | 'url'
    | 'https'
    | 'credentials'
    | 'tooLong'
    | 'instagramHost'
    | 'googleHost'
    | 'takeAChefHost'
    | 'labelRequired'
    | 'labelTooLong'
    | 'duplicatePlatform'
    | 'tooMany';

export type CookPresenceLinksIssue = {
    code: CookPresenceLinksIssueCode;
    field: CookPresenceLinkField;
    /** Index in the submitted other-profile list, when `field` is `otherProfiles`. */
    index?: number;
};

export const COOK_PRESENCE_URL_MAX_LENGTH = 500;
export const COOK_PRESENCE_LABEL_MAX_LENGTH = 80;
export const COOK_PRESENCE_OTHER_PROFILES_MAX = 5;

const storedOtherProfileSchema = z.object({
    platform: z.enum(cookPresenceOtherPlatforms),
    label: z.string().nullable(),
    url: z.string(),
});

const storedSchema = z.object({
    websiteUrl: z.string().nullable(),
    instagramUrl: z.string().nullable(),
    googleProfileUrl: z.string().nullable(),
    takeAChefUrl: z.string().nullable(),
    otherProfiles: z.array(storedOtherProfileSchema),
});

export const cookPresenceLinksFormEmpty: CookPresenceLinksFormValue = {
    websiteUrl: '',
    instagramUrl: '',
    googleProfileUrl: '',
    takeAChefUrl: '',
    otherProfiles: [],
};

export function cookPresenceOtherPlatformLabel(platform: CookPresenceOtherPlatform): string {
    switch (platform) {
        case 'YHUNGRY':
            return 'Yhangry';
        case 'COZYMEAL':
            return 'Cozymeal';
        case 'EATWITH':
            return 'Eatwith';
        case 'CHEF_MAISON':
            return 'ChefMaison';
        case 'OTHER':
            return 'Other';
    }
}

export function cookPresenceLinksFormFrom(
    links:
        | {
              websiteUrl?: string | null;
              instagramUrl?: string | null;
              googleProfileUrl?: string | null;
              takeAChefUrl?: string | null;
              otherProfiles?: ReadonlyArray<{
                  platform: CookPresenceOtherPlatform;
                  label?: string | null;
                  url: string;
              }> | null;
          }
        | null
        | undefined,
): CookPresenceLinksFormValue {
    if (links == null) return { ...cookPresenceLinksFormEmpty, otherProfiles: [] };
    return {
        websiteUrl: links.websiteUrl ?? '',
        instagramUrl: links.instagramUrl ?? '',
        googleProfileUrl: links.googleProfileUrl ?? '',
        takeAChefUrl: links.takeAChefUrl ?? '',
        otherProfiles: (links.otherProfiles ?? []).map((profile) => ({
            platform: profile.platform,
            label: profile.label ?? '',
            url: profile.url,
        })),
    };
}

export function cookPresenceLinksInputFrom(value: CookPresenceLinksFormValue): CookPresenceLinksInput {
    return {
        websiteUrl: value.websiteUrl,
        instagramUrl: value.instagramUrl,
        googleProfileUrl: value.googleProfileUrl,
        takeAChefUrl: value.takeAChefUrl,
        otherProfiles: value.otherProfiles.map((profile) => ({
            platform: profile.platform,
            label: profile.label,
            url: profile.url,
        })),
    };
}

/** Drop corrupt stored JSON. Empty documents become null. */
export function cookPresenceLinksFromStored(value: unknown): CookPresenceLinks | null {
    const parsed = storedSchema.safeParse(value);
    if (!parsed.success) return null;
    return canonicalOrNull(parsed.data);
}

export function cookPresenceLinksEqual(left: CookPresenceLinks | null, right: CookPresenceLinks | null): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

export function cookPresenceLinksNormalize(
    input: CookPresenceLinksInput,
): { ok: true; value: CookPresenceLinks | null } | { ok: false; issue: CookPresenceLinksIssue } {
    const websiteUrl = readUrl(input.websiteUrl, 'websiteUrl');
    if (!websiteUrl.ok) return websiteUrl;
    const instagramUrl = readUrl(input.instagramUrl, 'instagramUrl', 'instagram');
    if (!instagramUrl.ok) return instagramUrl;
    const googleProfileUrl = readUrl(input.googleProfileUrl, 'googleProfileUrl', 'google');
    if (!googleProfileUrl.ok) return googleProfileUrl;
    const takeAChefUrl = readUrl(input.takeAChefUrl, 'takeAChefUrl', 'takeAChef');
    if (!takeAChefUrl.ok) return takeAChefUrl;

    const otherProfiles: CookPresenceOtherProfile[] = [];
    const seenPlatforms = new Set<CookPresenceOtherPlatform>();
    for (const [index, row] of input.otherProfiles.entries()) {
        const urlRaw = row.url.trim();
        const labelRaw = row.label?.trim() ?? '';
        if (urlRaw.length === 0 && labelRaw.length === 0) continue;

        const url = readUrl(urlRaw, 'otherProfiles', 'https');
        if (!url.ok) return { ok: false, issue: { ...url.issue, index } };
        if (url.value == null) {
            return { ok: false, issue: { code: 'url', field: 'otherProfiles', index } };
        }

        if (row.platform === 'OTHER') {
            const label = textNormalizeTitledOrNull(labelRaw);
            if (label == null) {
                return { ok: false, issue: { code: 'labelRequired', field: 'otherProfiles', index } };
            }
            if (label.length > COOK_PRESENCE_LABEL_MAX_LENGTH) {
                return { ok: false, issue: { code: 'labelTooLong', field: 'otherProfiles', index } };
            }
            otherProfiles.push({ platform: 'OTHER', label, url: url.value });
            continue;
        }

        if (seenPlatforms.has(row.platform)) {
            return { ok: false, issue: { code: 'duplicatePlatform', field: 'otherProfiles', index } };
        }
        seenPlatforms.add(row.platform);
        otherProfiles.push({ platform: row.platform, label: null, url: url.value });
    }

    if (otherProfiles.length > COOK_PRESENCE_OTHER_PROFILES_MAX) {
        return { ok: false, issue: { code: 'tooMany', field: 'otherProfiles' } };
    }

    return {
        ok: true,
        value: canonicalOrNull({
            websiteUrl: websiteUrl.value,
            instagramUrl: instagramUrl.value,
            googleProfileUrl: googleProfileUrl.value,
            takeAChefUrl: takeAChefUrl.value,
            otherProfiles,
        }),
    };
}

function canonicalOrNull(links: CookPresenceLinks): CookPresenceLinks | null {
    const canonical: CookPresenceLinks = {
        websiteUrl: links.websiteUrl,
        instagramUrl: links.instagramUrl,
        googleProfileUrl: links.googleProfileUrl,
        takeAChefUrl: links.takeAChefUrl,
        otherProfiles: links.otherProfiles.map((profile) => ({
            platform: profile.platform,
            label: profile.label,
            url: profile.url,
        })),
    };
    const empty =
        canonical.websiteUrl == null &&
        canonical.instagramUrl == null &&
        canonical.googleProfileUrl == null &&
        canonical.takeAChefUrl == null &&
        canonical.otherProfiles.length === 0;
    return empty ? null : canonical;
}

type UrlKind = 'https' | 'instagram' | 'google' | 'takeAChef';

function readUrl(
    raw: string | null | undefined,
    field: CookPresenceLinkField,
    kind: UrlKind = 'https',
): { ok: true; value: string | null } | { ok: false; issue: CookPresenceLinksIssue } {
    if (raw == null) return { ok: true, value: null };
    const trimmed = raw.trim();
    if (trimmed.length === 0) return { ok: true, value: null };
    if (trimmed.length > COOK_PRESENCE_URL_MAX_LENGTH) {
        return { ok: false, issue: { code: 'tooLong', field } };
    }

    let url: URL;
    try {
        url = new URL(trimmed);
    } catch {
        return { ok: false, issue: { code: 'url', field } };
    }

    if (url.protocol !== 'https:') {
        return { ok: false, issue: { code: 'https', field } };
    }
    if (url.username.length > 0 || url.password.length > 0) {
        return { ok: false, issue: { code: 'credentials', field } };
    }
    if (url.hostname.length === 0) {
        return { ok: false, issue: { code: 'url', field } };
    }

    url.hash = '';
    const host = url.hostname.toLowerCase().replace(/^www\./u, '');

    if (kind === 'instagram') {
        if (host !== 'instagram.com') {
            return { ok: false, issue: { code: 'instagramHost', field } };
        }
        if (url.pathname.split('/').filter(Boolean).length === 0) {
            return { ok: false, issue: { code: 'instagramHost', field } };
        }
    } else if (kind === 'google') {
        if (!isGoogleProfileUrl(url, host)) {
            return { ok: false, issue: { code: 'googleHost', field } };
        }
    } else if (kind === 'takeAChef' && host !== 'takeachef.com') {
        return { ok: false, issue: { code: 'takeAChefHost', field } };
    }

    return { ok: true, value: url.toString() };
}

function isGoogleProfileUrl(url: URL, host: string): boolean {
    if (host === 'g.page' || host === 'maps.app.goo.gl' || host === 'business.google.com' || host === 'share.google') {
        return true;
    }
    if (host.startsWith('maps.google.')) return true;
    if (host === 'goo.gl') {
        return url.pathname === '/maps' || url.pathname.startsWith('/maps/');
    }
    if (!isGoogleSearchHost(host)) return false;
    return url.pathname === '/maps' || url.pathname.startsWith('/maps/');
}

function isGoogleSearchHost(host: string): boolean {
    if (host === 'google.com' || host.endsWith('.google.com')) return true;
    return /^google\.(?:[a-z]{2,3}|co\.[a-z]{2}|com\.[a-z]{2})$/u.test(host);
}
