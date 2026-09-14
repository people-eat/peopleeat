import type { WebPageKey } from '../../shared/webPage';
import { webPageDefaults } from '../../shared/webPage';
import type { WebPage } from '../db/schema';
import type { GqlSAdminWebPage } from '../graphql/generated';

export function toGqlAdminWebPage(row: WebPage): GqlSAdminWebPage {
    return {
        webPageKey: row.webPageKey,
        titleDe: row.titleDe,
        titleEn: row.titleEn,
        descriptionDe: row.descriptionDe,
        descriptionEn: row.descriptionEn,
        persisted: true,
        updatedAt: row.updatedAt,
    };
}

export function toGqlAdminWebPageGhost(webPageKey: WebPageKey): GqlSAdminWebPage {
    const defaults = webPageDefaults[webPageKey];
    return {
        webPageKey,
        titleDe: defaults.titleDe,
        titleEn: defaults.titleEn,
        descriptionDe: defaults.descriptionDe,
        descriptionEn: defaults.descriptionEn,
        persisted: false,
        updatedAt: null,
    };
}
