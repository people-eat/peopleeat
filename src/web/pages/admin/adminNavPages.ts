import type { LucideIcon } from 'lucide-react';
import { ScaleIcon, UsersIcon } from 'lucide-react';

import { t } from '../../../i18n/t';
import type { Locale } from '../../../shared/locale';
import { ADMIN_AI_GENERATIONS_SECTIONS, adminAiGenerationsSectionLabel, adminAiGenerationsSectionTo } from './adminAiGenerations';
import type { AdminAiGenerationsSectionTo } from './adminAiGenerations';
import { ADMIN_ASSISTANT_CHATS_SECTIONS, adminAssistantChatsSectionLabel, adminAssistantChatsSectionTo } from './adminAssistantChats';
import type { AdminAssistantChatsSectionTo } from './adminAssistantChats';
import { ADMIN_BOOKING_REQUESTS_SECTIONS, adminBookingRequestsSectionLabel, adminBookingRequestsSectionTo } from './adminBookingRequests';
import type { AdminBookingRequestsSectionTo } from './adminBookingRequests';
import { ADMIN_STUB_ROUTES, adminStubRouteDescription, adminStubRouteTitle } from './adminCatalog';
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
    title: string;
    description: string;
    to: AdminNavPageTo;
    icon: LucideIcon;
    params?: { kind: AdminLegalKind };
    keywords: string[];
};

function titleWithSection(locale: Locale, parentKey: string, sectionLabel: string): string {
    return t(locale, 'admin', 'nav.titleWithSection', { parent: t(locale, 'admin', parentKey), section: sectionLabel });
}

export function adminNavPages(locale: Locale): readonly AdminNavPage[] {
    const sessionsIcon = ADMIN_STUB_ROUTES.find((route) => route.slug === 'sessions')!.icon;
    const giftCardsIcon = ADMIN_STUB_ROUTES.find((route) => route.slug === 'gift-cards')!.icon;
    const logsIcon = ADMIN_STUB_ROUTES.find((route) => route.slug === 'logs')!.icon;
    const aiGenerationsIcon = ADMIN_STUB_ROUTES.find((route) => route.slug === 'ai-generations')!.icon;
    const bookingRequestsIcon = ADMIN_STUB_ROUTES.find((route) => route.slug === 'booking-requests')!.icon;
    const assistantChatsIcon = ADMIN_STUB_ROUTES.find((route) => route.slug === 'assistant-chats')!.icon;

    return [
        {
            id: 'users',
            title: t(locale, 'admin', 'nav.users.title'),
            description: t(locale, 'admin', 'nav.users.description'),
            to: '/{-$locale}/admin/users',
            icon: UsersIcon,
            keywords: t(locale, 'admin', 'nav.users.keywords').split(' '),
        },
        ...ADMIN_USERS_SECTIONS.map((section): AdminNavPage => {
            const sectionLabel = adminUsersSectionLabel(section, locale);
            const title = titleWithSection(locale, 'nav.users.title', sectionLabel);
            return {
                id: `users-${section}`,
                title,
                description: t(locale, 'admin', 'nav.users.subpageDescription'),
                to: adminUsersSectionTo(section),
                icon: UsersIcon,
                keywords: [t(locale, 'admin', 'nav.users.title').toLowerCase(), section, sectionLabel],
            };
        }),
        ...ADMIN_STUB_ROUTES.map((route): AdminNavPage => {
            const title = adminStubRouteTitle(route.slug, locale);
            const description = adminStubRouteDescription(route.slug, locale);
            return {
                id: route.slug,
                title,
                description,
                to: route.to,
                icon: route.icon,
                keywords: [route.slug, title, description],
            };
        }),
        ...ADMIN_BOOKING_REQUESTS_SECTIONS.map((section): AdminNavPage => {
            const sectionLabel = adminBookingRequestsSectionLabel(section, locale);
            return {
                id: `booking-requests-${section}`,
                title: titleWithSection(locale, 'nav.bookingRequests.title', sectionLabel),
                description: t(locale, 'admin', 'nav.bookingRequests.subpageDescription'),
                to: adminBookingRequestsSectionTo(section),
                icon: bookingRequestsIcon,
                keywords: [t(locale, 'admin', 'nav.bookingRequests.title').toLowerCase(), section, sectionLabel],
            };
        }),
        ...ADMIN_ASSISTANT_CHATS_SECTIONS.map((section): AdminNavPage => {
            const sectionLabel = adminAssistantChatsSectionLabel(section, locale);
            return {
                id: `assistant-chats-${section}`,
                title: titleWithSection(locale, 'nav.assistantChats.title', sectionLabel),
                description: t(locale, 'admin', 'nav.assistantChats.subpageDescription'),
                to: adminAssistantChatsSectionTo(section),
                icon: assistantChatsIcon,
                keywords: [t(locale, 'admin', 'nav.assistantChats.title').toLowerCase(), section, sectionLabel],
            };
        }),
        ...ADMIN_SESSIONS_SECTIONS.map((section): AdminNavPage => {
            const sectionLabel = adminSessionsSectionLabel(section, locale);
            return {
                id: `sessions-${section}`,
                title: titleWithSection(locale, 'nav.sessions.title', sectionLabel),
                description: t(locale, 'admin', 'nav.sessions.subpageDescription'),
                to: adminSessionsSectionTo(section),
                icon: sessionsIcon,
                keywords: [t(locale, 'admin', 'nav.sessions.title').toLowerCase(), section, sectionLabel],
            };
        }),
        ...ADMIN_GIFT_CARDS_SECTIONS.map((section): AdminNavPage => {
            const sectionLabel = adminGiftCardsSectionLabel(section, locale);
            return {
                id: `gift-cards-${section}`,
                title: titleWithSection(locale, 'nav.giftCards.title', sectionLabel),
                description: t(locale, 'admin', 'nav.giftCards.subpageDescription'),
                to: adminGiftCardsSectionTo(section),
                icon: giftCardsIcon,
                keywords: [t(locale, 'admin', 'nav.giftCards.title').toLowerCase(), section, sectionLabel],
            };
        }),
        ...ADMIN_LOGS_SECTIONS.map((section): AdminNavPage => {
            const sectionLabel = adminLogsSectionLabel(section, locale);
            return {
                id: `logs-${section}`,
                title: titleWithSection(locale, 'nav.logs.title', sectionLabel),
                description: t(locale, 'admin', 'nav.logs.subpageDescription'),
                to: adminLogsSectionTo(section),
                icon: logsIcon,
                keywords: [t(locale, 'admin', 'nav.logs.title').toLowerCase(), section, sectionLabel],
            };
        }),
        ...ADMIN_AI_GENERATIONS_SECTIONS.map((section): AdminNavPage => {
            const sectionLabel = adminAiGenerationsSectionLabel(section, locale);
            return {
                id: `ai-generations-${section}`,
                title: titleWithSection(locale, 'nav.aiGenerations.title', sectionLabel),
                description: t(locale, 'admin', 'nav.aiGenerations.subpageDescription'),
                to: adminAiGenerationsSectionTo(section),
                icon: aiGenerationsIcon,
                keywords: [t(locale, 'admin', 'nav.aiGenerations.title').toLowerCase(), section, sectionLabel],
            };
        }),
        {
            id: 'legal',
            title: t(locale, 'admin', 'nav.legal.title'),
            description: t(locale, 'admin', 'nav.legal.description'),
            to: '/{-$locale}/admin/legal',
            icon: ScaleIcon,
            keywords: t(locale, 'admin', 'nav.legal.keywords').split(' '),
        },
        ...ADMIN_LEGAL_KINDS.map((kind): AdminNavPage => {
            const kindLabel = adminLegalKindLabel(kind, locale);
            return {
                id: `legal-${kind}`,
                title: titleWithSection(locale, 'nav.legal.title', kindLabel),
                description: t(locale, 'admin', 'nav.legal.subpageDescription'),
                to: adminLegalKindTo(kind),
                icon: ScaleIcon,
                params: { kind },
                keywords: [t(locale, 'admin', 'nav.legal.title').toLowerCase(), kind, kindLabel],
            };
        }),
    ];
}
