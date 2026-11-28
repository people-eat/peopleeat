import type { WebPageKey } from '../../shared/webPage';
import { webPageDefaults } from '../../shared/webPage';
import type { WebPage } from '../db/schema';
import type { GqlSPublicWebPage } from '../graphql/generated';

export function toGqlPublicWebPage(row: WebPage): GqlSPublicWebPage {
    return {
        webPageKey: row.webPageKey,
        titleDe: row.titleDe,
        titleEn: row.titleEn,
        titleNl: row.titleNl,
        descriptionDe: row.descriptionDe,
        descriptionEn: row.descriptionEn,
        descriptionNl: row.descriptionNl,
    };
}

export function toGqlPublicWebPageFromDefaults(webPageKey: WebPageKey): GqlSPublicWebPage {
    const defaults = webPageDefaults[webPageKey];
    return {
        webPageKey,
        titleDe: defaults.titleDe,
        titleEn: defaults.titleEn,
        titleNl: defaults.titleNl,
        descriptionDe: defaults.descriptionDe,
        descriptionEn: defaults.descriptionEn,
        descriptionNl: defaults.descriptionNl,
    };
}
