import { t } from '../i18n/t';
import type { Locale } from './locale';

export function cookMenuDraftTitle(locale: Locale): string {
    return t(locale, 'common', 'cookMenu.draftTitle');
}

/** Three empty courses inserted when a cook (or admin) creates a draft menu. */
export function cookMenuDefaultCourseTitles(locale: Locale): readonly [string, string, string] {
    return [
        t(locale, 'common', 'cookMenu.courseStarter'),
        t(locale, 'common', 'cookMenu.courseMain'),
        t(locale, 'common', 'cookMenu.courseDessert'),
    ] as const;
}
