// Friendly display for tool-call rows in the transcript. The raw tool id
// (`promptUserForInput`, `toolItemsUpsert`) is an internal name; showing it in
// the conversation reads as technical noise. This maps curated ids to a human
// catalog label + icon. Everything else falls back to a mechanical label
// derived from the tool name.

import type { ParseKeys } from 'i18next';
import {
    BookOpenIcon,
    ClipboardListIcon,
    FileTextIcon,
    GiftIcon,
    HammerIcon,
    LifeBuoyIcon,
    MessageSquareIcon,
    SoupIcon,
    StarIcon,
    UsersIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { t } from '../../i18n/t';
import type { Locale } from '../utils/locale';

interface ToolDisplayEntry {
    Icon: LucideIcon;
    labelKey: ParseKeys<'common'>;
}

const TOOL_DISPLAY: Record<string, ToolDisplayEntry> = {
    promptUserForInput: {
        Icon: MessageSquareIcon,
        labelKey: 'toolDisplay.promptUserForInput',
    },
    cookMealUpsert: {
        Icon: SoupIcon,
        labelKey: 'toolDisplay.cookMealUpsert',
    },
    cookMenuUpsert: {
        Icon: BookOpenIcon,
        labelKey: 'toolDisplay.cookMenuUpsert',
    },
    cookUpdate: {
        Icon: HammerIcon,
        labelKey: 'toolDisplay.cookUpdate',
    },
    productDocsRead: {
        Icon: FileTextIcon,
        labelKey: 'toolDisplay.productDocsRead',
    },
    adminBookingRequestsFindMany: {
        Icon: ClipboardListIcon,
        labelKey: 'toolDisplay.adminBookingRequestsFindMany',
    },
    adminUsersFindMany: {
        Icon: UsersIcon,
        labelKey: 'toolDisplay.adminUsersFindMany',
    },
    adminCookMealsFindMany: {
        Icon: SoupIcon,
        labelKey: 'toolDisplay.adminCookMealsFindMany',
    },
    adminCookMenusFindMany: {
        Icon: BookOpenIcon,
        labelKey: 'toolDisplay.adminCookMenusFindMany',
    },
    adminSupportRequestsFindMany: {
        Icon: LifeBuoyIcon,
        labelKey: 'toolDisplay.adminSupportRequestsFindMany',
    },
    adminGiftCardsFindMany: {
        Icon: GiftIcon,
        labelKey: 'toolDisplay.adminGiftCardsFindMany',
    },
    adminTestimonialsFindMany: {
        Icon: StarIcon,
        labelKey: 'toolDisplay.adminTestimonialsFindMany',
    },
};

// Turn `toolItemsUpsert` / `itemsUpsert` into a short label: drop a leading
// `tool`, split camelCase / PascalCase into words, and sentence-case the result.
// German gets a light verb/noun pass so the fallback is not English-only.
function humanizeToolName(toolName: string, locale: Locale): string {
    const withoutPrefix = toolName.replace(/^tool/, '');
    const words = withoutPrefix
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
    if (words.length === 0) return toolName;
    const localized = locale === 'de' ? words.map((word) => TOOL_WORD_DE[word] ?? word) : words;
    const joined = localized.join(' ');
    return joined.charAt(0).toUpperCase() + joined.slice(1);
}

const TOOL_WORD_DE: Record<string, string> = {
    create: 'erstellen',
    update: 'aktualisieren',
    delete: 'löschen',
    remove: 'entfernen',
    find: 'suchen',
    many: 'mehrere',
    one: 'eines',
    list: 'auflisten',
    get: 'lesen',
    set: 'setzen',
    add: 'hinzufügen',
    search: 'suchen',
    send: 'senden',
    upload: 'hochladen',
    download: 'herunterladen',
    attach: 'anhängen',
    file: 'Datei',
    files: 'Dateien',
    item: 'Eintrag',
    items: 'Einträge',
    entry: 'Eintrag',
    entries: 'Einträge',
    activity: 'Aktivität',
    activities: 'Aktivitäten',
    request: 'Anfrage',
    requests: 'Anfragen',
    session: 'Sitzung',
    sessions: 'Sitzungen',
    user: 'Benutzer',
    users: 'Benutzer',
    log: 'Log',
    logs: 'Protokolle',
    count: 'zählen',
    counts: 'zählen',
    reorder: 'umordnen',
    archive: 'archivieren',
    restore: 'wiederherstellen',
    verify: 'prüfen',
    prompt: 'abfragen',
    input: 'Eingabe',
    output: 'Ausgabe',
    document: 'Dokument',
    documents: 'Dokumente',
    upsert: 'anlegen/aktualisieren',
    write: 'schreiben',
    delegate: 'delegieren',
};

export function toolDisplay(toolName: string, locale: Locale): { Icon: LucideIcon; label: string } {
    const known = TOOL_DISPLAY[toolName];
    if (known) return { Icon: known.Icon, label: t(locale, 'common', known.labelKey) };
    return {
        Icon: HammerIcon,
        label: humanizeToolName(toolName, locale),
    };
}
