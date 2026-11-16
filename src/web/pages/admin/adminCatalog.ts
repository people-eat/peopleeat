import type { ParseKeys } from 'i18next';
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
    PackagePlusIcon,
    PartyPopperIcon,
    SparklesIcon,
    SquareArrowOutUpRightIcon,
    StarIcon,
    TicketPercentIcon,
    ToggleRightIcon,
    UtensilsIcon,
    VideoIcon,
} from 'lucide-react';

import { t } from '../../../i18n/t';
import type { Locale } from '../../../shared/locale';

export type AdminStubSlug =
    | 'assistant-chats'
    | 'booking-requests'
    | 'calls'
    | 'file-store'
    | 'gift-cards'
    | 'jobs'
    | 'meals'
    | 'menus'
    | 'offer-addon-templates'
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
    icon: LucideIcon;
};

/** Sidebar / command-palette destinations that are not stub-catalog slugs. */
type AdminSpecialNavKey = 'overview' | 'users' | 'legal';

export type AdminNavItemKey = AdminSpecialNavKey | AdminStubSlug;

export type AdminNavGroup = {
    id: string;
    items: readonly AdminNavItemKey[];
};

type AdminNavCatalogKey = AdminStubSlug | AdminSpecialNavKey;

const ADMIN_NAV_TITLE_KEY = {
    overview: 'nav.overview.title',
    users: 'nav.users.title',
    legal: 'nav.legal.title',
    'assistant-chats': 'nav.assistantChats.title',
    'booking-requests': 'nav.bookingRequests.title',
    calls: 'nav.calls.title',
    'file-store': 'nav.fileStore.title',
    'gift-cards': 'nav.giftCards.title',
    jobs: 'nav.jobs.title',
    meals: 'nav.meals.title',
    menus: 'nav.menus.title',
    'offer-addon-templates': 'nav.offerAddonTemplates.title',
    'outbound-emails': 'nav.outboundEmails.title',
    'support-requests': 'nav.supportRequests.title',
    'promo-codes': 'nav.promoCodes.title',
    logs: 'nav.logs.title',
    'database-slow-statements': 'nav.databaseSlowStatements.title',
    'ai-generations': 'nav.aiGenerations.title',
    sessions: 'nav.sessions.title',
    analytics: 'nav.analytics.title',
    map: 'nav.map.title',
    'feature-toggles': 'nav.featureToggles.title',
    'blog-posts': 'nav.blogPosts.title',
    testimonials: 'nav.testimonials.title',
    cities: 'nav.cities.title',
    partners: 'nav.partners.title',
    occasions: 'nav.occasions.title',
    'whats-app-chats': 'nav.whatsAppChats.title',
    'offer-chat-reviews': 'nav.offerChatReviews.title',
    links: 'nav.links.title',
    'web-pages': 'nav.webPages.title',
} as const satisfies Record<AdminNavCatalogKey, ParseKeys<'admin'>>;

const ADMIN_NAV_DESCRIPTION_KEY = {
    'assistant-chats': 'nav.assistantChats.description',
    'booking-requests': 'nav.bookingRequests.description',
    calls: 'nav.calls.description',
    'file-store': 'nav.fileStore.description',
    'gift-cards': 'nav.giftCards.description',
    jobs: 'nav.jobs.description',
    meals: 'nav.meals.description',
    menus: 'nav.menus.description',
    'offer-addon-templates': 'nav.offerAddonTemplates.description',
    'outbound-emails': 'nav.outboundEmails.description',
    'support-requests': 'nav.supportRequests.description',
    'promo-codes': 'nav.promoCodes.description',
    logs: 'nav.logs.description',
    'database-slow-statements': 'nav.databaseSlowStatements.description',
    'ai-generations': 'nav.aiGenerations.description',
    sessions: 'nav.sessions.description',
    analytics: 'nav.analytics.description',
    map: 'nav.map.description',
    'feature-toggles': 'nav.featureToggles.description',
    'blog-posts': 'nav.blogPosts.description',
    testimonials: 'nav.testimonials.description',
    cities: 'nav.cities.description',
    partners: 'nav.partners.description',
    occasions: 'nav.occasions.description',
    'whats-app-chats': 'nav.whatsAppChats.description',
    'offer-chat-reviews': 'nav.offerChatReviews.description',
    links: 'nav.links.description',
    'web-pages': 'nav.webPages.description',
} as const satisfies Record<AdminStubSlug, ParseKeys<'admin'>>;

type AdminNavGroupId = 'operations' | 'messaging' | 'commerce' | 'catalog' | 'content' | 'insights' | 'platform';

const ADMIN_NAV_GROUP_KEY = {
    operations: 'nav.groups.operations',
    messaging: 'nav.groups.messaging',
    commerce: 'nav.groups.commerce',
    catalog: 'nav.groups.catalog',
    content: 'nav.groups.content',
    insights: 'nav.groups.insights',
    platform: 'nav.groups.platform',
} as const satisfies Record<AdminNavGroupId, ParseKeys<'admin'>>;

export function adminStubRouteTitle(slug: AdminStubSlug, locale: Locale): string {
    return t(locale, 'admin', ADMIN_NAV_TITLE_KEY[slug]);
}

export function adminStubRouteDescription(slug: AdminStubSlug, locale: Locale): string {
    return t(locale, 'admin', ADMIN_NAV_DESCRIPTION_KEY[slug]);
}

export function adminNavGroupLabel(id: string, locale: Locale): string | null {
    if (id === 'home') return null;
    if (!(id in ADMIN_NAV_GROUP_KEY)) return null;
    return t(locale, 'admin', ADMIN_NAV_GROUP_KEY[id as AdminNavGroupId]);
}

/**
 * Sidebar order and section labels. Stub routes below follow the same sequence
 * within each group so catalog iteration stays aligned with the nav.
 */
export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = [
    {
        id: 'home',
        items: ['overview'],
    },
    {
        id: 'operations',
        items: ['users', 'booking-requests', 'support-requests', 'calls'],
    },
    {
        id: 'messaging',
        items: ['offer-chat-reviews', 'whats-app-chats', 'outbound-emails', 'assistant-chats'],
    },
    {
        id: 'commerce',
        items: ['gift-cards', 'promo-codes'],
    },
    {
        id: 'catalog',
        items: ['meals', 'menus', 'offer-addon-templates', 'testimonials'],
    },
    {
        id: 'content',
        items: ['web-pages', 'blog-posts', 'cities', 'partners', 'occasions', 'legal'],
    },
    {
        id: 'insights',
        items: ['analytics', 'sessions', 'map'],
    },
    {
        id: 'platform',
        items: ['jobs', 'logs', 'database-slow-statements', 'ai-generations', 'feature-toggles', 'file-store', 'links'],
    },
];

export const ADMIN_STUB_ROUTES: readonly AdminStubRoute[] = [
    {
        slug: 'booking-requests',
        path: '/admin/booking-requests',
        to: '/{-$locale}/admin/booking-requests',
        icon: FileInputIcon,
    },
    {
        slug: 'support-requests',
        path: '/admin/support-requests',
        to: '/{-$locale}/admin/support-requests',
        icon: HeadsetIcon,
    },
    {
        slug: 'calls',
        path: '/admin/calls',
        to: '/{-$locale}/admin/calls',
        icon: VideoIcon,
    },
    {
        slug: 'offer-chat-reviews',
        path: '/admin/offer-chat-reviews',
        to: '/{-$locale}/admin/offer-chat-reviews',
        icon: MessagesSquareIcon,
    },
    {
        slug: 'whats-app-chats',
        path: '/admin/whats-app-chats',
        to: '/{-$locale}/admin/whats-app-chats',
        icon: MessageSquareIcon,
    },
    {
        slug: 'outbound-emails',
        path: '/admin/outbound-emails',
        to: '/{-$locale}/admin/outbound-emails',
        icon: MailsIcon,
    },
    {
        slug: 'assistant-chats',
        path: '/admin/assistant-chats',
        to: '/{-$locale}/admin/assistant-chats',
        icon: BotMessageSquareIcon,
    },
    {
        slug: 'gift-cards',
        path: '/admin/gift-cards',
        to: '/{-$locale}/admin/gift-cards',
        icon: GiftIcon,
    },
    {
        slug: 'promo-codes',
        path: '/admin/promo-codes',
        to: '/{-$locale}/admin/promo-codes',
        icon: TicketPercentIcon,
    },
    {
        slug: 'meals',
        path: '/admin/meals',
        to: '/{-$locale}/admin/meals',
        icon: UtensilsIcon,
    },
    {
        slug: 'menus',
        path: '/admin/menus',
        to: '/{-$locale}/admin/menus',
        icon: HandPlatterIcon,
    },
    {
        slug: 'offer-addon-templates',
        path: '/admin/offer-addon-templates',
        to: '/{-$locale}/admin/offer-addon-templates',
        icon: PackagePlusIcon,
    },
    {
        slug: 'testimonials',
        path: '/admin/testimonials',
        to: '/{-$locale}/admin/testimonials',
        icon: StarIcon,
    },
    {
        slug: 'web-pages',
        path: '/admin/web-pages',
        to: '/{-$locale}/admin/web-pages',
        icon: MonitorIcon,
    },
    {
        slug: 'blog-posts',
        path: '/admin/blog-posts',
        to: '/{-$locale}/admin/blog-posts',
        icon: NewspaperIcon,
    },
    {
        slug: 'cities',
        path: '/admin/cities',
        to: '/{-$locale}/admin/cities',
        icon: Building2Icon,
    },
    {
        slug: 'partners',
        path: '/admin/partners',
        to: '/{-$locale}/admin/partners',
        icon: HandshakeIcon,
    },
    {
        slug: 'occasions',
        path: '/admin/occasions',
        to: '/{-$locale}/admin/occasions',
        icon: PartyPopperIcon,
    },
    {
        slug: 'analytics',
        path: '/admin/analytics',
        to: '/{-$locale}/admin/analytics',
        icon: ChartColumnIcon,
    },
    {
        slug: 'sessions',
        path: '/admin/sessions',
        to: '/{-$locale}/admin/sessions',
        icon: AppWindowIcon,
    },
    {
        slug: 'map',
        path: '/admin/map',
        to: '/{-$locale}/admin/map',
        icon: MapIcon,
    },
    {
        slug: 'jobs',
        path: '/admin/jobs',
        to: '/{-$locale}/admin/jobs',
        icon: CalendarClockIcon,
    },
    {
        slug: 'logs',
        path: '/admin/logs',
        to: '/{-$locale}/admin/logs',
        icon: FileClockIcon,
    },
    {
        slug: 'database-slow-statements',
        path: '/admin/database-slow-statements',
        to: '/{-$locale}/admin/database-slow-statements',
        icon: DatabaseIcon,
    },
    {
        slug: 'ai-generations',
        path: '/admin/ai-generations',
        to: '/{-$locale}/admin/ai-generations',
        icon: SparklesIcon,
    },
    {
        slug: 'feature-toggles',
        path: '/admin/feature-toggles',
        to: '/{-$locale}/admin/feature-toggles',
        icon: ToggleRightIcon,
    },
    {
        slug: 'file-store',
        path: '/admin/file-store',
        to: '/{-$locale}/admin/file-store',
        icon: HardDriveIcon,
    },
    {
        slug: 'links',
        path: '/admin/links',
        to: '/{-$locale}/admin/links',
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
