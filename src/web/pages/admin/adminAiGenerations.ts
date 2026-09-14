import type { Locale } from '../../utils/locale';

export type AdminAiGenerationsSection = 'list';

export const ADMIN_AI_GENERATIONS_SECTIONS: AdminAiGenerationsSection[] = ['list'];

export type AdminAiGenerationsSectionTo = '/{-$locale}/admin/ai-generations/list';

export function adminAiGenerationsSectionLabel(section: AdminAiGenerationsSection, locale: Locale): string {
    return (
        {
            list: { de: 'Liste', en: 'List' },
        } as const
    )[section][locale];
}

export function adminAiGenerationsSectionPath(section: AdminAiGenerationsSection): `/admin/ai-generations/${AdminAiGenerationsSection}` {
    return `/admin/ai-generations/${section}`;
}

export function adminAiGenerationsSectionTo(section: AdminAiGenerationsSection): AdminAiGenerationsSectionTo {
    return `/{-$locale}/admin/ai-generations/${section}`;
}

export function parseAdminAiGenerationsSectionFromPath(path: string): AdminAiGenerationsSection | undefined {
    for (const section of ADMIN_AI_GENERATIONS_SECTIONS) {
        if (path === adminAiGenerationsSectionPath(section)) {
            return section;
        }
    }
    return undefined;
}
