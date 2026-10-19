import type { LucideIcon } from 'lucide-react';
import {
    AppWindowIcon,
    BotMessageSquareIcon,
    Building2Icon,
    CalendarClockIcon,
    ChartColumnIcon,
    DatabaseIcon,
    FileClockIcon,
    FileInputIcon,
    GiftIcon,
    HandPlatterIcon,
    HandshakeIcon,
    HardDriveIcon,
    HeadsetIcon,
    MailsIcon,
    MapIcon,
    MessageSquareIcon,
    MessagesSquareIcon,
    MonitorIcon,
    NewspaperIcon,
    PartyPopperIcon,
    SparklesIcon,
    SquareArrowOutUpRightIcon,
    StarIcon,
    TicketPercentIcon,
    ToggleRightIcon,
    UtensilsIcon,
    VideoIcon,
} from 'lucide-react';

import type { Locale } from '../../utils/locale';

export type AdminStubSlug =
    | 'assistant-chats'
    | 'booking-requests'
    | 'calls'
    | 'file-store'
    | 'gift-cards'
    | 'jobs'
    | 'meals'
    | 'menus'
    | 'outbound-emails'
    | 'support-requests'
    | 'promo-codes'
    | 'logs'
    | 'database-slow-statements'
    | 'ai-generations'
    | 'sessions'
    | 'analytics'
    | 'map'
    | 'feature-toggles'
    | 'blog-posts'
    | 'testimonials'
    | 'cities'
    | 'partners'
    | 'occasions'
    | 'whats-app-chats'
    | 'offer-chat-reviews'
    | 'links'
    | 'web-pages';

export type AdminStubRoute = {
    slug: AdminStubSlug;
    path: `/admin/${AdminStubSlug}`;
    to: `/{-$locale}/admin/${AdminStubSlug}`;
    title: Record<Locale, string>;
    description: Record<Locale, string>;
    icon: LucideIcon;
};

/** Sidebar / command-palette destinations that are not stub-catalog slugs. */
type AdminSpecialNavKey = 'overview' | 'users' | 'legal';

export type AdminNavItemKey = AdminSpecialNavKey | AdminStubSlug;

export type AdminNavGroup = {
    id: string;
    /** `null` = unlabeled group (e.g. Overview at the top). */
    label: Record<Locale, string> | null;
    items: readonly AdminNavItemKey[];
};

/**
 * Sidebar order and section labels. Stub routes below follow the same sequence
 * within each group so catalog iteration stays aligned with the nav.
 */
export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = [
    {
        id: 'home',
        label: null,
        items: ['overview'],
    },
    {
        id: 'operations',
        label: { de: 'Betrieb', en: 'Operations' },
        items: ['users', 'booking-requests', 'support-requests', 'calls'],
    },
    {
        id: 'messaging',
        label: { de: 'Nachrichten', en: 'Messaging' },
        items: ['offer-chat-reviews', 'whats-app-chats', 'outbound-emails', 'assistant-chats'],
    },
    {
        id: 'commerce',
        label: { de: 'Verkauf', en: 'Commerce' },
        items: ['gift-cards', 'promo-codes'],
    },
    {
        id: 'catalog',
        label: { de: 'Katalog', en: 'Catalog' },
        items: ['meals', 'menus', 'testimonials'],
    },
    {
        id: 'content',
        label: { de: 'Inhalte', en: 'Content' },
        items: ['web-pages', 'blog-posts', 'cities', 'partners', 'occasions', 'legal'],
    },
    {
        id: 'insights',
        label: { de: 'Einblicke', en: 'Insights' },
        items: ['analytics', 'sessions', 'map'],
    },
    {
        id: 'platform',
        label: { de: 'Plattform', en: 'Platform' },
        items: ['jobs', 'logs', 'database-slow-statements', 'ai-generations', 'feature-toggles', 'file-store', 'links'],
    },
];

export const ADMIN_STUB_ROUTES: readonly AdminStubRoute[] = [
    {
        slug: 'booking-requests',
        path: '/admin/booking-requests',
        to: '/{-$locale}/admin/booking-requests',
        title: { de: 'Buchungsanfragen', en: 'Booking Requests' },
        description: { de: 'Buchungsanfragen verwalten.', en: 'Manage booking requests.' },
        icon: FileInputIcon,
    },
    {
        slug: 'support-requests',
        path: '/admin/support-requests',
        to: '/{-$locale}/admin/support-requests',
        title: { de: 'Support Anfragen', en: 'Support Requests' },
        description: { de: 'Support-Anfragen bearbeiten.', en: 'Handle support requests.' },
        icon: HeadsetIcon,
    },
    {
        slug: 'calls',
        path: '/admin/calls',
        to: '/{-$locale}/admin/calls',
        title: { de: 'Anrufe', en: 'Calls' },
        description: {
            de: 'Live-Aufmerksamkeit, Anruf-Verkehr und Koch-Statistik.',
            en: 'Live attention, call traffic, and cook stats.',
        },
        icon: VideoIcon,
    },
    {
        slug: 'offer-chat-reviews',
        path: '/admin/offer-chat-reviews',
        to: '/{-$locale}/admin/offer-chat-reviews',
        title: { de: 'Angebots-Chats', en: 'Offer chats' },
        description: {
            de: 'Kunden-Koch-Chats prüfen und bestätigen.',
            en: 'Review and acknowledge customer-cook chats.',
        },
        icon: MessagesSquareIcon,
    },
    {
        slug: 'whats-app-chats',
        path: '/admin/whats-app-chats',
        to: '/{-$locale}/admin/whats-app-chats',
        title: { de: 'WhatsApp', en: 'WhatsApp' },
        description: { de: 'WhatsApp-Chats einsehen.', en: 'Inspect WhatsApp chats.' },
        icon: MessageSquareIcon,
    },
    {
        slug: 'outbound-emails',
        path: '/admin/outbound-emails',
        to: '/{-$locale}/admin/outbound-emails',
        title: { de: 'E-Mails', en: 'Emails' },
        description: {
            de: 'Resend-Kontingent und ausgehende Transaktions-E-Mails.',
            en: 'Resend quota and outbound transactional emails.',
        },
        icon: MailsIcon,
    },
    {
        slug: 'assistant-chats',
        path: '/admin/assistant-chats',
        to: '/{-$locale}/admin/assistant-chats',
        title: { de: 'Assistent-Chats', en: 'Assistant chats' },
        description: { de: 'Assistent-Chats einsehen.', en: 'Inspect assistant chats.' },
        icon: BotMessageSquareIcon,
    },
    {
        slug: 'gift-cards',
        path: '/admin/gift-cards',
        to: '/{-$locale}/admin/gift-cards',
        title: { de: 'Gutscheinverkäufe', en: 'Voucher Purchases' },
        description: {
            de: 'Verteilung, Käufe über die Zeit und Anlässe.',
            en: 'Distribution, purchases over time, and occasions.',
        },
        icon: GiftIcon,
    },
    {
        slug: 'promo-codes',
        path: '/admin/promo-codes',
        to: '/{-$locale}/admin/promo-codes',
        title: { de: 'Promo Codes', en: 'Promo Codes' },
        description: { de: 'Promo-Codes verwalten.', en: 'Manage promo codes.' },
        icon: TicketPercentIcon,
    },
    {
        slug: 'meals',
        path: '/admin/meals',
        to: '/{-$locale}/admin/meals',
        title: { de: 'Gerichte', en: 'Meals' },
        description: {
            de: 'Gerichte aller Köche einsehen (inkl. gelöschter).',
            en: 'Inspect meals from all cooks (including deleted).',
        },
        icon: UtensilsIcon,
    },
    {
        slug: 'menus',
        path: '/admin/menus',
        to: '/{-$locale}/admin/menus',
        title: { de: 'Menüs', en: 'Menus' },
        description: {
            de: 'Menüs aller Köche einsehen (inkl. gelöschter).',
            en: 'Inspect menus from all cooks (including deleted).',
        },
        icon: HandPlatterIcon,
    },
    {
        slug: 'testimonials',
        path: '/admin/testimonials',
        to: '/{-$locale}/admin/testimonials',
        title: { de: 'Bewertungen', en: 'Reviews' },
        description: { de: 'Bewertungen verwalten.', en: 'Manage reviews.' },
        icon: StarIcon,
    },
    {
        slug: 'web-pages',
        path: '/admin/web-pages',
        to: '/{-$locale}/admin/web-pages',
        title: { de: 'Webseiten', en: 'Websites' },
        description: { de: 'SEO-Titel und -Beschreibungen verwalten.', en: 'Manage SEO titles and descriptions.' },
        icon: MonitorIcon,
    },
    {
        slug: 'blog-posts',
        path: '/admin/blog-posts',
        to: '/{-$locale}/admin/blog-posts',
        title: { de: 'Blog Beiträge', en: 'Blog Posts' },
        description: { de: 'Blog-Beiträge verwalten.', en: 'Manage blog posts.' },
        icon: NewspaperIcon,
    },
    {
        slug: 'cities',
        path: '/admin/cities',
        to: '/{-$locale}/admin/cities',
        title: { de: 'Städte', en: 'Cities' },
        description: { de: 'Städte verwalten.', en: 'Manage cities.' },
        icon: Building2Icon,
    },
    {
        slug: 'partners',
        path: '/admin/partners',
        to: '/{-$locale}/admin/partners',
        title: { de: 'Partner', en: 'Partners' },
        description: { de: 'Partner verwalten.', en: 'Manage partners.' },
        icon: HandshakeIcon,
    },
    {
        slug: 'occasions',
        path: '/admin/occasions',
        to: '/{-$locale}/admin/occasions',
        title: { de: 'Anlässe', en: 'Occasions' },
        description: { de: 'Anlassseiten verwalten.', en: 'Manage occasion landing pages.' },
        icon: PartyPopperIcon,
    },
    {
        slug: 'analytics',
        path: '/admin/analytics',
        to: '/{-$locale}/admin/analytics',
        title: { de: 'Analysen', en: 'Analytics' },
        description: {
            de: 'Buchungsformular-Funnel und Seitenbesuche.',
            en: 'Booking form funnel and page visits.',
        },
        icon: ChartColumnIcon,
    },
    {
        slug: 'sessions',
        path: '/admin/sessions',
        to: '/{-$locale}/admin/sessions',
        title: { de: 'Sitzungen', en: 'Sessions' },
        description: { de: 'Sitzungen einsehen.', en: 'Inspect sessions.' },
        icon: AppWindowIcon,
    },
    {
        slug: 'map',
        path: '/admin/map',
        to: '/{-$locale}/admin/map',
        title: { de: 'Karte', en: 'Map' },
        description: { de: 'Karte der Standorte und Anfragen.', en: 'Map of locations and requests.' },
        icon: MapIcon,
    },
    {
        slug: 'jobs',
        path: '/admin/jobs',
        to: '/{-$locale}/admin/jobs',
        title: { de: 'Geplante Jobs', en: 'Scheduled Jobs' },
        description: {
            de: 'Ausstehende Hintergrund-Jobs und Fälligkeiten einsehen.',
            en: 'Inspect pending background jobs and due times.',
        },
        icon: CalendarClockIcon,
    },
    {
        slug: 'logs',
        path: '/admin/logs',
        to: '/{-$locale}/admin/logs',
        title: { de: 'Log Nachrichten', en: 'Log Messages' },
        description: { de: 'Log-Nachrichten durchsuchen und einsehen.', en: 'Browse and inspect log messages.' },
        icon: FileClockIcon,
    },
    {
        slug: 'database-slow-statements',
        path: '/admin/database-slow-statements',
        to: '/{-$locale}/admin/database-slow-statements',
        title: { de: 'Langsame SQL', en: 'Slow SQL' },
        description: {
            de: 'Top Postgres-Statements nach Gesamtausführungszeit (pg_stat_statements).',
            en: 'Top Postgres statements by total execution time (pg_stat_statements).',
        },
        icon: DatabaseIcon,
    },
    {
        slug: 'ai-generations',
        path: '/admin/ai-generations',
        to: '/{-$locale}/admin/ai-generations',
        title: { de: 'AI-Generierungen', en: 'AI Generations' },
        description: {
            de: 'One-Shot-AI-Aufrufe durchsuchen und einsehen.',
            en: 'Browse and inspect one-shot AI calls.',
        },
        icon: SparklesIcon,
    },
    {
        slug: 'feature-toggles',
        path: '/admin/feature-toggles',
        to: '/{-$locale}/admin/feature-toggles',
        title: { de: 'Feature Toggles', en: 'Feature Toggles' },
        description: { de: 'Feature Toggles steuern.', en: 'Control feature toggles.' },
        icon: ToggleRightIcon,
    },
    {
        slug: 'file-store',
        path: '/admin/file-store',
        to: '/{-$locale}/admin/file-store',
        title: { de: 'Dateispeicher', en: 'File store' },
        description: {
            de: 'Objekte im Garage-S3-Bucket durchsuchen.',
            en: 'Browse objects in the Garage S3 bucket.',
        },
        icon: HardDriveIcon,
    },
    {
        slug: 'links',
        path: '/admin/links',
        to: '/{-$locale}/admin/links',
        title: { de: 'Wichtige Links', en: 'Important Links' },
        description: { de: 'Wichtige Tools und Dienste öffnen.', en: 'Open important tools and services.' },
        icon: SquareArrowOutUpRightIcon,
    },
] as const;

export function adminStubRouteBySlug(slug: AdminStubSlug): AdminStubRoute {
    const route = ADMIN_STUB_ROUTES.find((entry) => entry.slug === slug);
    if (!route) {
        throw new Error(`Unknown admin stub route: ${slug}`);
    }
    return route;
}

export function adminStubRouteByPath(path: string): AdminStubRoute | undefined {
    return ADMIN_STUB_ROUTES.find((entry) => entry.path === path);
}
