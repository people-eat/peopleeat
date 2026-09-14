import type { Locale } from '../utils/locale';

export type AssistantSidebarSurface = 'admin' | 'customer' | 'cook';

type Localized = Record<Locale, string>;

export type AssistantEmptyCopy = {
    blurb: Localized;
    suggestions: Localized[];
};

/** Static empty-state copy and suggestion chip labels (sent verbatim on tap). */
export const ASSISTANT_EMPTY_COPY: Record<AssistantSidebarSurface, AssistantEmptyCopy> = {
    admin: {
        blurb: {
            de: 'Ich helfe dir bei Admin-Aufgaben: Nutzer, Freigaben und Support-Kontext.',
            en: 'I help with admin work: users, approvals, and support context.',
        },
        suggestions: [
            { de: 'Offene Koch-Freigaben zeigen', en: 'Show pending cook approvals' },
            { de: 'Nutzer per E-Mail finden', en: 'Find a user by email' },
            { de: 'Was kannst du?', en: 'What can you do?' },
        ],
    },
    customer: {
        blurb: {
            de: 'Ich helfe dir bei Buchungen, Köchen und deinem Profil.',
            en: 'I help with bookings, chefs, and your profile.',
        },
        suggestions: [
            { de: 'Koch in meiner Stadt finden', en: 'Find a chef in my city' },
            { de: 'Buchungsanfrage starten', en: 'Start a booking request' },
            { de: 'Was kannst du?', en: 'What can you do?' },
        ],
    },
    cook: {
        blurb: {
            de: 'Ich helfe dir bei Profil, Menüs, Angeboten und Anfragen.',
            en: 'I help with your profile, menus, offers, and requests.',
        },
        suggestions: [
            { de: 'Mein Profil verbessern', en: 'Improve my profile' },
            { de: 'Offene Anfragen zeigen', en: 'Show open requests' },
            { de: 'Was kannst du?', en: 'What can you do?' },
        ],
    },
};

export const assistantSidebarLabels = {
    defaultTitle: { de: 'Assistent', en: 'Assistant' },
    newChatTitle: { de: 'Neuer Chat', en: 'New chat' },
    allChatsTitle: { de: 'Alle Chats', en: 'All chats' },
    untitledChat: { de: 'Unbenannter Chat', en: 'Untitled chat' },
    close: { de: 'Assistent schließen', en: 'Close assistant' },
    allChats: { de: 'Alle Chats', en: 'All chats' },
    newChat: { de: 'Neuer Chat', en: 'New chat' },
    backToChat: { de: 'Zurück zum Chat', en: 'Back to chat' },
    emptyList: { de: 'Noch keine Chats.', en: 'No chats yet.' },
    loadMore: { de: 'Mehr laden', en: 'Load more' },
    loadError: { de: 'Chat konnte nicht geladen werden.', en: 'Could not load chat.' },
    listError: { de: 'Chats konnten nicht geladen werden.', en: 'Could not load chats.' },
    leaveRunningTitle: { de: 'Antwort läuft noch', en: 'Reply still running' },
    leaveRunningDescription: {
        de: 'Die laufende Antwort wird fortgesetzt. Trotzdem neuen Chat starten?',
        en: 'The current reply will keep running. Start a new chat anyway?',
    },
    leaveRunningConfirm: { de: 'Neuer Chat', en: 'New chat' },
    cancel: { de: 'Abbrechen', en: 'Cancel' },
    jumpToLatest: { de: 'Zum neuesten', en: 'Jump to latest' },
    openFullscreen: { de: 'Assistent im Vollbild öffnen', en: 'Open assistant full screen' },
    rename: { de: 'Umbenennen', en: 'Rename' },
    renameTitle: { de: 'Chat umbenennen', en: 'Rename chat' },
    renameSave: { de: 'Speichern', en: 'Save' },
    renamePlaceholder: { de: 'Titel', en: 'Title' },
    delete: { de: 'Löschen', en: 'Delete' },
    deleteTitle: { de: 'Chat löschen?', en: 'Delete this chat?' },
    deleteDescription: {
        de: 'Der Chat verschwindet aus deiner Liste. Du kannst ihn danach nicht mehr öffnen.',
        en: 'This chat will disappear from your list. You will not be able to open it again.',
    },
    deleteConfirm: { de: 'Löschen', en: 'Delete' },
    continueLast: { de: 'Letzten Chat fortsetzen', en: 'Continue last chat' },
    chatActions: { de: 'Chat-Aktionen', en: 'Chat actions' },
    searchPlaceholder: { de: 'Chats suchen…', en: 'Search chats…' },
    searchEmpty: { de: 'Keine Chats gefunden.', en: 'No chats found.' },
    resize: { de: 'Breite anpassen', en: 'Resize' },
} as const;
