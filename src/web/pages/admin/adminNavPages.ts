import type { LucideIcon } from 'lucide-react';
import { ScaleIcon, UsersIcon } from 'lucide-react';

import type { Locale } from '../../utils/locale';
import { ADMIN_AI_GENERATIONS_SECTIONS, adminAiGenerationsSectionLabel, adminAiGenerationsSectionTo } from './adminAiGenerations';
import type { AdminAiGenerationsSectionTo } from './adminAiGenerations';
import { ADMIN_ASSISTANT_CHATS_SECTIONS, adminAssistantChatsSectionLabel, adminAssistantChatsSectionTo } from './adminAssistantChats';
import type { AdminAssistantChatsSectionTo } from './adminAssistantChats';
import { ADMIN_BOOKING_REQUESTS_SECTIONS, adminBookingRequestsSectionLabel, adminBookingRequestsSectionTo } from './adminBookingRequests';
import type { AdminBookingRequestsSectionTo } from './adminBookingRequests';
import { ADMIN_STUB_ROUTES } from './adminCatalog';
import type { AdminStubSlug } from './adminCatalog';
import { ADMIN_GIFT_CARDS_SECTIONS, adminGiftCardsSectionLabel, adminGiftCardsSectionTo } from './adminGiftCards';
import type { AdminGiftCardsSectionTo } from './adminGiftCards';
import { ADMIN_LEGAL_KINDS, adminLegalKindLabel, adminLegalKindTo } from './adminLegal';
import type { AdminLegalDocumentTo, AdminLegalKind } from './adminLegal';
import { ADMIN_LOGS_SECTIONS, adminLogsSectionLabel, adminLogsSectionTo } from './adminLogs';
import type { AdminLogsSectionTo } from './adminLogs';
import { ADMIN_SESSIONS_SECTIONS, adminSessionsSectionLabel, adminSessionsSectionTo } from './adminSessions';
import type { AdminSessionsSectionTo } from './adminSessions';
import { ADMIN_USERS_SECTIONS, adminUsersSectionLabel, adminUsersSectionTo } from './adminUsers';
import type { AdminUsersSectionTo } from './adminUsers';

type AdminNavPageTo =
    | '/{-$locale}/admin/users'
    | '/{-$locale}/admin/legal'
    | AdminUsersSectionTo
    | AdminSessionsSectionTo
    | AdminGiftCardsSectionTo
    | AdminLogsSectionTo
    | AdminAiGenerationsSectionTo
    | AdminBookingRequestsSectionTo
    | AdminAssistantChatsSectionTo
    | AdminLegalDocumentTo
    | `/{-$locale}/admin/${AdminStubSlug}`;

export type AdminNavPage = {
    id: string;
    title: Record<Locale, string>;
    description: Record<Locale, string>;
    to: AdminNavPageTo;
    icon: LucideIcon;
    params?: { kind: AdminLegalKind };
    keywords: Record<Locale, string[]>;
};

export function adminNavPages(): readonly AdminNavPage[] {
    const sessionsIcon = ADMIN_STUB_ROUTES.find((route) => route.slug === 'sessions')!.icon;
    const giftCardsIcon = ADMIN_STUB_ROUTES.find((route) => route.slug === 'gift-cards')!.icon;
    const logsIcon = ADMIN_STUB_ROUTES.find((route) => route.slug === 'logs')!.icon;
    const aiGenerationsIcon = ADMIN_STUB_ROUTES.find((route) => route.slug === 'ai-generations')!.icon;
    const bookingRequestsIcon = ADMIN_STUB_ROUTES.find((route) => route.slug === 'booking-requests')!.icon;
    const assistantChatsIcon = ADMIN_STUB_ROUTES.find((route) => route.slug === 'assistant-chats')!.icon;

    return [
        {
            id: 'users',
            title: { de: 'Benutzer', en: 'Users' },
            description: { de: 'Benutzer verwalten.', en: 'Manage users.' },
            to: '/{-$locale}/admin/users',
            icon: UsersIcon,
            keywords: { de: ['accounts', 'nutzer'], en: ['accounts', 'people'] },
        },
        ...ADMIN_USERS_SECTIONS.map((section): AdminNavPage => ({
            id: `users-${section}`,
            title: {
                de: `Benutzer · ${adminUsersSectionLabel(section, 'de')}`,
                en: `Users · ${adminUsersSectionLabel(section, 'en')}`,
            },
            description: { de: 'Benutzer-Unterseite.', en: 'Users sub-page.' },
            to: adminUsersSectionTo(section),
            icon: UsersIcon,
            keywords: {
                de: ['benutzer', section, adminUsersSectionLabel(section, 'de')],
                en: ['users', section, adminUsersSectionLabel(section, 'en')],
            },
        })),
        ...ADMIN_STUB_ROUTES.map((route): AdminNavPage => ({
            id: route.slug,
            title: route.title,
            description: route.description,
            to: route.to,
            icon: route.icon,
            keywords: {
                de: [route.slug, route.title.de, route.description.de],
                en: [route.slug, route.title.en, route.description.en],
            },
        })),
        ...ADMIN_BOOKING_REQUESTS_SECTIONS.map((section): AdminNavPage => ({
            id: `booking-requests-${section}`,
            title: {
                de: `Buchungsanfragen · ${adminBookingRequestsSectionLabel(section, 'de')}`,
                en: `Booking Requests · ${adminBookingRequestsSectionLabel(section, 'en')}`,
            },
            description: { de: 'Buchungsanfragen-Unterseite.', en: 'Booking requests sub-page.' },
            to: adminBookingRequestsSectionTo(section),
            icon: bookingRequestsIcon,
            keywords: {
                de: ['buchungsanfragen', section, adminBookingRequestsSectionLabel(section, 'de')],
                en: ['booking', 'requests', section, adminBookingRequestsSectionLabel(section, 'en')],
            },
        })),
        ...ADMIN_ASSISTANT_CHATS_SECTIONS.map((section): AdminNavPage => ({
            id: `assistant-chats-${section}`,
            title: {
                de: `Assistent-Chats · ${adminAssistantChatsSectionLabel(section, 'de')}`,
                en: `Assistant chats · ${adminAssistantChatsSectionLabel(section, 'en')}`,
            },
            description: { de: 'Assistent-Chats-Unterseite.', en: 'Assistant chats sub-page.' },
            to: adminAssistantChatsSectionTo(section),
            icon: assistantChatsIcon,
            keywords: {
                de: ['assistent', 'chats', section, adminAssistantChatsSectionLabel(section, 'de')],
                en: ['assistant', 'chats', section, adminAssistantChatsSectionLabel(section, 'en')],
            },
        })),
        ...ADMIN_SESSIONS_SECTIONS.map((section): AdminNavPage => ({
            id: `sessions-${section}`,
            title: {
                de: `Sitzungen · ${adminSessionsSectionLabel(section, 'de')}`,
                en: `Sessions · ${adminSessionsSectionLabel(section, 'en')}`,
            },
            description: { de: 'Sitzungen-Unterseite.', en: 'Sessions sub-page.' },
            to: adminSessionsSectionTo(section),
            icon: sessionsIcon,
            keywords: {
                de: ['sitzungen', section, adminSessionsSectionLabel(section, 'de')],
                en: ['sessions', section, adminSessionsSectionLabel(section, 'en')],
            },
        })),
        ...ADMIN_GIFT_CARDS_SECTIONS.map((section): AdminNavPage => ({
            id: `gift-cards-${section}`,
            title: {
                de: `Gutscheinverkäufe · ${adminGiftCardsSectionLabel(section, 'de')}`,
                en: `Voucher Purchases · ${adminGiftCardsSectionLabel(section, 'en')}`,
            },
            description: { de: 'Gutscheinverkäufe-Unterseite.', en: 'Voucher purchases sub-page.' },
            to: adminGiftCardsSectionTo(section),
            icon: giftCardsIcon,
            keywords: {
                de: ['gutschein', 'gutscheine', section, adminGiftCardsSectionLabel(section, 'de')],
                en: ['gift', 'card', 'voucher', section, adminGiftCardsSectionLabel(section, 'en')],
            },
        })),
        ...ADMIN_LOGS_SECTIONS.map((section): AdminNavPage => ({
            id: `logs-${section}`,
            title: {
                de: `Log-Nachrichten · ${adminLogsSectionLabel(section, 'de')}`,
                en: `Log Messages · ${adminLogsSectionLabel(section, 'en')}`,
            },
            description: { de: 'Logs-Unterseite.', en: 'Logs sub-page.' },
            to: adminLogsSectionTo(section),
            icon: logsIcon,
            keywords: {
                de: ['logs', section, adminLogsSectionLabel(section, 'de')],
                en: ['logs', section, adminLogsSectionLabel(section, 'en')],
            },
        })),
        ...ADMIN_AI_GENERATIONS_SECTIONS.map((section): AdminNavPage => ({
            id: `ai-generations-${section}`,
            title: {
                de: `AI-Generierungen · ${adminAiGenerationsSectionLabel(section, 'de')}`,
                en: `AI Generations · ${adminAiGenerationsSectionLabel(section, 'en')}`,
            },
            description: { de: 'AI-Generierungen-Unterseite.', en: 'AI generations sub-page.' },
            to: adminAiGenerationsSectionTo(section),
            icon: aiGenerationsIcon,
            keywords: {
                de: ['ai', 'generierungen', section, adminAiGenerationsSectionLabel(section, 'de')],
                en: ['ai', 'generations', section, adminAiGenerationsSectionLabel(section, 'en')],
            },
        })),
        {
            id: 'legal',
            title: { de: 'Rechtstexte', en: 'Legal texts' },
            description: { de: 'Rechtstexte verwalten.', en: 'Manage legal texts.' },
            to: '/{-$locale}/admin/legal',
            icon: ScaleIcon,
            keywords: { de: ['legal', 'recht'], en: ['legal', 'policy'] },
        },
        ...ADMIN_LEGAL_KINDS.map((kind): AdminNavPage => ({
            id: `legal-${kind}`,
            title: {
                de: `Rechtstexte · ${adminLegalKindLabel(kind, 'de')}`,
                en: `Legal texts · ${adminLegalKindLabel(kind, 'en')}`,
            },
            description: { de: 'Rechtstext-Unterseite.', en: 'Legal text sub-page.' },
            to: adminLegalKindTo(kind),
            icon: ScaleIcon,
            params: { kind },
            keywords: {
                de: ['recht', kind, adminLegalKindLabel(kind, 'de')],
                en: ['legal', kind, adminLegalKindLabel(kind, 'en')],
            },
        })),
    ];
}
