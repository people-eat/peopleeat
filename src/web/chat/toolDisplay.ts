// Friendly display for tool-call rows in the transcript. The raw tool id
// (`promptUserForInput`, `toolItemsUpsert`) is an internal name; showing it in
// the conversation reads as technical noise. This maps curated ids to a human,
// bilingual label + icon. Everything else falls back to a mechanical label
// derived from the tool name.

import { BookOpenIcon, ClipboardListIcon, HammerIcon, MessageSquareIcon, SoupIcon, UsersIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Locale } from '../utils/locale';

interface ToolDisplayEntry {
    Icon: LucideIcon;
    label: { de: string; en: string };
}

const TOOL_DISPLAY: Record<string, ToolDisplayEntry> = {
    promptUserForInput: {
        Icon: MessageSquareIcon,
        label: { de: 'Fragt nach den Zutaten…', en: 'Asking for a few details…' },
    },
    cookMealCreate: {
        Icon: HammerIcon,
        label: { de: 'Neues Gericht anlegen…', en: 'Creating a new dish…' },
    },
    cookUpdate: {
        Icon: HammerIcon,
        label: { de: 'Profil aktualisieren…', en: 'Updating your chef profile…' },
    },
    adminBookingRequestsFindMany: {
        Icon: ClipboardListIcon,
        label: { de: 'Lade Buchungsanfragen…', en: 'Loading booking requests…' },
    },
    adminUsersFindMany: {
        Icon: UsersIcon,
        label: { de: 'Lade Benutzer…', en: 'Loading users…' },
    },
    adminCookMealsFindMany: {
        Icon: SoupIcon,
        label: { de: 'Lade Gerichte…', en: 'Loading meals…' },
    },
    adminCookMenusFindMany: {
        Icon: BookOpenIcon,
        label: { de: 'Lade Menüs…', en: 'Loading menus…' },
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
    if (known) return { Icon: known.Icon, label: known.label[locale] };
    return {
        Icon: HammerIcon,
        label: humanizeToolName(toolName, locale),
    };
}
