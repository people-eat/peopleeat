import type { Locale } from './locale';

export function cookMenuDraftTitle(locale: Locale): string {
    return { de: 'Neues Menü', en: 'New menu' }[locale];
}

/** Three empty courses inserted when a cook (or admin) creates a draft menu. */
export function cookMenuDefaultCourseTitles(locale: Locale): readonly [string, string, string] {
    return {
        de: ['Vorspeise', 'Hauptspeise', 'Dessert'] as const,
        en: ['Starter', 'Main course', 'Dessert'] as const,
    }[locale];
}
