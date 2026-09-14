import { DEFAULT_LOCALE } from '../../utils/locale';
import type { Locale } from '../../utils/locale';
import { adminAiGenerationsSectionLabel, parseAdminAiGenerationsSectionFromPath } from './adminAiGenerations';
import { adminAssistantChatsSectionLabel, parseAdminAssistantChatsSectionFromPath } from './adminAssistantChats';
import { adminBookingRequestsSectionLabel, parseAdminBookingRequestsSectionFromPath } from './adminBookingRequests';
import { adminStubRouteByPath } from './adminCatalog';
import { adminGiftCardsSectionLabel, parseAdminGiftCardsSectionFromPath } from './adminGiftCards';
import { adminLegalKindLabel, parseAdminLegalKindFromPath } from './adminLegal';
import { adminLogsSectionLabel, parseAdminLogsSectionFromPath } from './adminLogs';
import { adminOutboundEmailsSectionLabel, parseAdminOutboundEmailsSectionFromPath } from './adminOutboundEmails';
import { adminPromoCodesSectionLabel, parseAdminPromoCodesSectionFromPath } from './adminPromoCodes';
import { adminSessionsSectionLabel, parseAdminSessionsSectionFromPath } from './adminSessions';
import { adminUsersSectionLabel, parseAdminUsersSectionFromPath } from './adminUsers';

export type AdminBreadcrumbCrumb = {
    label: string;
    to?:
        | '/{-$locale}/admin'
        | '/{-$locale}/admin/users'
        | '/{-$locale}/admin/sessions'
        | '/{-$locale}/admin/logs'
        | '/{-$locale}/admin/ai-generations'
        | '/{-$locale}/admin/gift-cards'
        | '/{-$locale}/admin/support-requests'
        | '/{-$locale}/admin/whats-app-chats'
        | '/{-$locale}/admin/offer-chat-reviews'
        | '/{-$locale}/admin/booking-requests'
        | '/{-$locale}/admin/booking-requests/$bookingRequestId'
        | '/{-$locale}/admin/assistant-chats'
        | '/{-$locale}/admin/meals'
        | '/{-$locale}/admin/meals/$mealId'
        | '/{-$locale}/admin/menus'
        | '/{-$locale}/admin/menus/$menuId'
        | '/{-$locale}/admin/outbound-emails'
        | '/{-$locale}/admin/promo-codes'
        | '/{-$locale}/admin/blog-posts'
        | '/{-$locale}/admin/cities'
        | '/{-$locale}/admin/partners'
        | '/{-$locale}/admin/occasions'
        | '/{-$locale}/admin/testimonials'
        | '/{-$locale}/admin/web-pages'
        | '/{-$locale}/admin/legal'
        | '/{-$locale}/admin/legal/$kind';
    params?: { kind: string } | { bookingRequestId: string } | { mealId: string } | { menuId: string };
};

export function adminPathWithoutLocale(pathname: string, locale: Locale): string {
    if (locale !== DEFAULT_LOCALE && pathname.startsWith(`/${locale}/`)) {
        return pathname.slice(locale.length + 1) || '/';
    }
    if (locale !== DEFAULT_LOCALE && pathname === `/${locale}`) {
        return '/';
    }
    return pathname;
}

// Static / section trails for list and overview pages. Detail pages pass crumbs
// explicitly via AdminPageChrome instead of using this helper.
export function adminBreadcrumbsForPath(path: string, locale: Locale): AdminBreadcrumbCrumb[] {
    const legalKind = parseAdminLegalKindFromPath(path);
    const usersSection = parseAdminUsersSectionFromPath(path);
    const sessionsSection = parseAdminSessionsSectionFromPath(path);
    const giftCardsSection = parseAdminGiftCardsSectionFromPath(path);
    const logsSection = parseAdminLogsSectionFromPath(path);
    const aiGenerationsSection = parseAdminAiGenerationsSectionFromPath(path);
    const outboundEmailsSection = parseAdminOutboundEmailsSectionFromPath(path);
    const promoCodesSection = parseAdminPromoCodesSectionFromPath(path);
    const bookingRequestsSection = parseAdminBookingRequestsSectionFromPath(path);
    const assistantChatsSection = parseAdminAssistantChatsSectionFromPath(path);
    const stubRoute = adminStubRouteByPath(path);
    const crumbs: AdminBreadcrumbCrumb[] = [];

    if (path === '/admin') {
        crumbs.push({ label: { de: 'Übersicht', en: 'Overview' }[locale] });
    } else if (path === '/admin/account') {
        crumbs.push({ label: { de: 'Konto', en: 'Account' }[locale] });
    } else if (path === '/admin/users') {
        crumbs.push({ label: { de: 'Benutzer', en: 'Users' }[locale] });
    } else if (usersSection) {
        crumbs.push({
            label: { de: 'Benutzer', en: 'Users' }[locale],
            to: '/{-$locale}/admin/users',
        });
        crumbs.push({ label: adminUsersSectionLabel(usersSection, locale) });
    } else if (path === '/admin/sessions') {
        crumbs.push({ label: { de: 'Sitzungen', en: 'Sessions' }[locale] });
    } else if (sessionsSection) {
        crumbs.push({
            label: { de: 'Sitzungen', en: 'Sessions' }[locale],
            to: '/{-$locale}/admin/sessions',
        });
        crumbs.push({ label: adminSessionsSectionLabel(sessionsSection, locale) });
    } else if (path === '/admin/gift-cards') {
        crumbs.push({ label: { de: 'Gutscheinverkäufe', en: 'Voucher Purchases' }[locale] });
    } else if (giftCardsSection) {
        crumbs.push({
            label: { de: 'Gutscheinverkäufe', en: 'Voucher Purchases' }[locale],
            to: '/{-$locale}/admin/gift-cards',
        });
        crumbs.push({ label: adminGiftCardsSectionLabel(giftCardsSection, locale) });
    } else if (path === '/admin/logs') {
        crumbs.push({ label: { de: 'Log Nachrichten', en: 'Log Messages' }[locale] });
    } else if (logsSection) {
        crumbs.push({
            label: { de: 'Log Nachrichten', en: 'Log Messages' }[locale],
            to: '/{-$locale}/admin/logs',
        });
        crumbs.push({ label: adminLogsSectionLabel(logsSection, locale) });
    } else if (path === '/admin/ai-generations') {
        crumbs.push({ label: { de: 'AI-Generierungen', en: 'AI Generations' }[locale] });
    } else if (aiGenerationsSection) {
        crumbs.push({
            label: { de: 'AI-Generierungen', en: 'AI Generations' }[locale],
            to: '/{-$locale}/admin/ai-generations',
        });
        crumbs.push({ label: adminAiGenerationsSectionLabel(aiGenerationsSection, locale) });
    } else if (path === '/admin/outbound-emails') {
        crumbs.push({ label: { de: 'E-Mails', en: 'Emails' }[locale] });
    } else if (outboundEmailsSection) {
        crumbs.push({
            label: { de: 'E-Mails', en: 'Emails' }[locale],
            to: '/{-$locale}/admin/outbound-emails',
        });
        crumbs.push({ label: adminOutboundEmailsSectionLabel(outboundEmailsSection, locale) });
    } else if (promoCodesSection === 'create') {
        crumbs.push({
            label: { de: 'Promo Codes', en: 'Promo Codes' }[locale],
            to: '/{-$locale}/admin/promo-codes',
        });
        crumbs.push({ label: adminPromoCodesSectionLabel('create', locale) });
    } else if (promoCodesSection === 'list') {
        crumbs.push({ label: { de: 'Promo Codes', en: 'Promo Codes' }[locale] });
    } else if (path === '/admin/booking-requests') {
        crumbs.push({ label: { de: 'Buchungsanfragen', en: 'Booking Requests' }[locale] });
    } else if (bookingRequestsSection) {
        crumbs.push({
            label: { de: 'Buchungsanfragen', en: 'Booking Requests' }[locale],
            to: '/{-$locale}/admin/booking-requests',
        });
        crumbs.push({ label: adminBookingRequestsSectionLabel(bookingRequestsSection, locale) });
    } else if (path === '/admin/assistant-chats') {
        crumbs.push({ label: { de: 'Assistent-Chats', en: 'Assistant chats' }[locale] });
    } else if (assistantChatsSection) {
        crumbs.push({
            label: { de: 'Assistent-Chats', en: 'Assistant chats' }[locale],
            to: '/{-$locale}/admin/assistant-chats',
        });
        crumbs.push({ label: adminAssistantChatsSectionLabel(assistantChatsSection, locale) });
    } else if (path === '/admin/legal') {
        crumbs.push({ label: { de: 'Rechtstexte', en: 'Legal texts' }[locale] });
    } else if (legalKind) {
        crumbs.push({
            label: { de: 'Rechtstexte', en: 'Legal texts' }[locale],
            to: '/{-$locale}/admin/legal',
        });
        const kindBase = `/admin/legal/${legalKind}`;
        if (path === kindBase) {
            crumbs.push({ label: adminLegalKindLabel(legalKind, locale) });
        } else {
            crumbs.push({
                label: adminLegalKindLabel(legalKind, locale),
                to: '/{-$locale}/admin/legal/$kind',
                params: { kind: legalKind },
            });
            crumbs.push({
                label: path === `${kindBase}/draft` ? { de: 'Entwurf', en: 'Draft' }[locale] : { de: 'Version', en: 'Version' }[locale],
            });
        }
    } else if (stubRoute) {
        crumbs.push({ label: stubRoute.title[locale] });
    }

    return crumbs;
}
