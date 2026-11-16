import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import {
    AppWindowIcon,
    BotMessageSquareIcon,
    ChefHatIcon,
    FileInputIcon,
    FileTextIcon,
    HandPlatterIcon,
    LayersIcon,
    MailsIcon,
    MessageSquareIcon,
    NotebookPenIcon,
    PhoneIcon,
    RadarIcon,
    StarIcon,
    ToggleRightIcon,
    UserIcon,
    UtensilsIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import { formatDate, userDisplayName } from '../../../shared';
import { AdminBookingRequestListCard } from '../../components/AdminBookingRequestListCard';
import { AdminBookingRequestOfferCard } from '../../components/AdminBookingRequestOfferCard';
import { AdminListPaginationBar } from '../../components/AdminListPaginationBar';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { AdminSessionEventTimeline } from '../../components/AdminSessionEventTimeline';
import { AdminTestimonialListCard } from '../../components/AdminTestimonialListCard';
import type { AdminTestimonialListCardTestimonial } from '../../components/AdminTestimonialListCard';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '../../components/base/alert-dialog';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import { Textarea } from '../../components/base/textarea';
import { CookMealCard } from '../../components/CookMealCard';
import { CookMenuCard } from '../../components/CookMenuCard';
import type { GqlCAdminOutboundEmailPurpose, GqlCAdminSessionKind, GqlCAdminUserPageQuery } from '../../graphql/generated';
import {
    AdminUserAdminNoteUpdateDocument,
    AdminUserCookMealUpsertDocument,
    AdminUserCookMenuUpsertDocument,
    AdminUserTerminateSessionsDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { Locale } from '../../utils/locale';
import { adminAssistantChatTitle, adminChatSurfaceLabel } from './adminAssistantChats';
import { adminCallKindLabel } from './AdminCallsAttentionBoard';
import {
    adminListPageCount,
    adminListPageSize,
    adminListPaginationForUrl,
    adminListSkipTake,
    parseAdminListPage,
    parseAdminListPageSize,
} from './adminListPaginationSearch';
import type { AdminListPageSize } from './adminListPaginationSearch';
import { adminOutboundEmailMetaBadgeClassName, adminOutboundEmailPurposeLabel } from './adminOutboundEmailsColumns';
import { AdminUserCookProfileSection } from './AdminUserCookProfileSection';
import { AdminUserFeatureTogglesSection } from './AdminUserFeatureTogglesSection';
import { AdminUserGeneralSection } from './AdminUserGeneralSection';

export function adminUserPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'pages.user.title');
}
export function adminUserPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.user.description');
}

const CUSTOMER_TABS = [
    'general',
    'booking-requests',
    'feature-toggles',
    'session-events',
    'sessions',
    'notes',
    'whatsapp',
    'emails',
    'assistant-chats',
] as const;

const COOK_TABS = ['cook-profile', 'offers', 'meals', 'menus', 'pool', 'calls', 'testimonials'] as const;

type AdminUserCustomerTab = (typeof CUSTOMER_TABS)[number];
type AdminUserCookTab = (typeof COOK_TABS)[number];
export type AdminUserTab = AdminUserCustomerTab | AdminUserCookTab;

/** Customers: general, booking-requests, then shared ops tabs. */
const CUSTOMER_TAB_ORDER = CUSTOMER_TABS;

/** Cooks: general, cook inventory tabs, shared ops tabs, booking-requests last. */
const COOK_TAB_ORDER = [
    'general',
    'cook-profile',
    'offers',
    'meals',
    'menus',
    'pool',
    'calls',
    'testimonials',
    'feature-toggles',
    'session-events',
    'sessions',
    'notes',
    'whatsapp',
    'emails',
    'assistant-chats',
    'booking-requests',
] as const satisfies readonly AdminUserTab[];

export type AdminUserSearch = {
    tab?: AdminUserTab;
    page?: number;
    pageSize?: AdminListPageSize;
};

const ALL_TABS: readonly AdminUserTab[] = [...CUSTOMER_TABS, ...COOK_TABS];

function isAdminUserTab(value: unknown): value is AdminUserTab {
    return typeof value === 'string' && (ALL_TABS as readonly string[]).includes(value);
}

function adminUserSearchForUrl(search: AdminUserSearch) {
    const tab = search.tab && search.tab !== 'general' ? search.tab : undefined;
    return {
        tab,
        ...(tab === 'session-events' ? adminListPaginationForUrl(search) : {}),
    };
}

export function parseAdminUserSearch(search: Record<string, unknown>): AdminUserSearch {
    const tab = isAdminUserTab(search.tab) ? search.tab : undefined;
    const page = parseAdminListPage(search);
    const pageSize = parseAdminListPageSize(search);
    return {
        tab,
        ...(tab === 'session-events' ? { page, pageSize } : {}),
    };
}

const ADMIN_USER_EMAIL_PURPOSES: GqlCAdminOutboundEmailPurpose[] = [
    'GIFT_CARD_PURCHASED',
    'AUTH_EMAIL_OTP',
    'EMAIL_ADDRESS_UPDATE_CONFIRM',
    'ACCOUNT_DELETE_CONFIRM',
];
const ADMIN_USER_SESSION_KINDS: GqlCAdminSessionKind[] = ['human', 'bot'];

export function adminUserPageVariables(userId: string, search: AdminUserSearch) {
    const tab = search.tab ?? 'general';
    const sessionEventsPagination = tab === 'session-events' ? adminListSkipTake(search) : { skip: 0, take: 25 };
    return {
        userId,
        includeFeatureToggles: tab === 'feature-toggles',
        includeEmails: tab === 'emails',
        includeWhatsApp: tab === 'whatsapp',
        includeSessions: tab === 'sessions',
        includeSessionEvents: tab === 'session-events',
        includeMeals: tab === 'meals',
        includeMenus: tab === 'menus',
        includeBookingRequests: tab === 'booking-requests',
        includeOffers: tab === 'offers',
        includeAssistantChats: tab === 'assistant-chats',
        includeCalls: tab === 'calls',
        includeTestimonials: tab === 'testimonials',
        includePool: tab === 'pool',
        includeCookFinances: tab === 'cook-profile',
        sessionEventsCriterion: {
            userIds: [userId],
            ...sessionEventsPagination,
        },
        emailsCriterion: {
            skip: 0,
            take: 100,
            purposes: ADMIN_USER_EMAIL_PURPOSES,
            userIds: [userId],
        },
        whatsAppCriterion: {
            skip: 0,
            take: 100,
            userId,
        },
        sessionsCriterion: {
            skip: 0,
            take: 100,
            kinds: ADMIN_USER_SESSION_KINDS,
            userIds: [userId],
        },
        mealsCriterion: {
            skip: 0,
            take: 100,
            cookIds: [userId],
            includeDeleted: true,
        },
        menusCriterion: {
            skip: 0,
            take: 100,
            cookIds: [userId],
            includeDeleted: true,
        },
        bookingRequestsCriterion: {
            skip: 0,
            take: 100,
            userIds: [userId],
        },
        bookingRequestOffersCriterion: {
            skip: 0,
            take: 100,
            cookIds: [userId],
        },
        assistantChatsCriterion: {
            skip: 0,
            take: 100,
            userIds: [userId],
        },
        callTrafficCriterion: {
            skip: 0,
            take: 50,
            cookIds: [userId],
        },
        testimonialsCriterion: {
            skip: 0,
            take: 100,
            cookIds: [userId],
        },
        poolBookingRequestsCriterion: {
            skip: 0,
            take: 100,
            cookIds: [userId],
            notifiedOnly: true,
        },
    };
}

type AdminUserRow = NonNullable<NonNullable<NonNullable<GqlCAdminUserPageQuery['currentSession']['user']>['admin']>['user']>;

type AdminUserOutboundEmail = NonNullable<
    NonNullable<NonNullable<GqlCAdminUserPageQuery['currentSession']['user']>['admin']>['outboundEmails']
>[number];

type AdminUserWhatsAppConversation = NonNullable<
    NonNullable<NonNullable<GqlCAdminUserPageQuery['currentSession']['user']>['admin']>['whatsAppConversations']
>[number];

type AdminUserSession = NonNullable<
    NonNullable<NonNullable<GqlCAdminUserPageQuery['currentSession']['user']>['admin']>['sessions']
>[number];

type AdminUserMeal = NonNullable<NonNullable<NonNullable<GqlCAdminUserPageQuery['currentSession']['user']>['admin']>['cookMeals']>[number];

type AdminUserMenu = NonNullable<NonNullable<NonNullable<GqlCAdminUserPageQuery['currentSession']['user']>['admin']>['cookMenus']>[number];

type AdminUserBookingRequest = NonNullable<
    NonNullable<NonNullable<GqlCAdminUserPageQuery['currentSession']['user']>['admin']>['bookingRequests']
>[number];

type AdminUserBookingRequestOffer = NonNullable<
    NonNullable<NonNullable<GqlCAdminUserPageQuery['currentSession']['user']>['admin']>['bookingRequestOffers']
>[number];

type AdminUserAssistantChatListItem = NonNullable<
    NonNullable<NonNullable<GqlCAdminUserPageQuery['currentSession']['user']>['admin']>['assistantChats']
>[number];

type AdminUserTabDef = {
    id: AdminUserTab;
    labelKey: string;
    Icon: LucideIcon;
    cookOnly?: boolean;
};

const ADMIN_USER_TABS: readonly AdminUserTabDef[] = [
    { id: 'general', labelKey: 'user.tabs.general', Icon: UserIcon },
    { id: 'cook-profile', labelKey: 'user.tabs.cook_profile', Icon: ChefHatIcon, cookOnly: true },
    { id: 'offers', labelKey: 'user.tabs.offers', Icon: FileTextIcon, cookOnly: true },
    { id: 'meals', labelKey: 'user.tabs.meals', Icon: UtensilsIcon, cookOnly: true },
    { id: 'menus', labelKey: 'user.tabs.menus', Icon: HandPlatterIcon, cookOnly: true },
    { id: 'pool', labelKey: 'user.tabs.pool', Icon: RadarIcon, cookOnly: true },
    { id: 'calls', labelKey: 'user.tabs.calls', Icon: PhoneIcon, cookOnly: true },
    { id: 'testimonials', labelKey: 'user.tabs.testimonials', Icon: StarIcon, cookOnly: true },
    { id: 'booking-requests', labelKey: 'user.tabs.booking_requests', Icon: FileInputIcon },
    { id: 'feature-toggles', labelKey: 'user.tabs.feature_toggles', Icon: ToggleRightIcon },
    { id: 'session-events', labelKey: 'user.tabs.session_events', Icon: LayersIcon },
    { id: 'sessions', labelKey: 'user.tabs.sessions', Icon: AppWindowIcon },
    { id: 'notes', labelKey: 'user.tabs.notes', Icon: NotebookPenIcon },
    { id: 'whatsapp', labelKey: 'user.tabs.whatsapp', Icon: MessageSquareIcon },
    { id: 'emails', labelKey: 'user.tabs.emails', Icon: MailsIcon },
    { id: 'assistant-chats', labelKey: 'user.tabs.assistant_chats', Icon: BotMessageSquareIcon },
];

const ADMIN_USER_TAB_BY_ID = Object.fromEntries(ADMIN_USER_TABS.map((entry) => [entry.id, entry])) as Record<AdminUserTab, AdminUserTabDef>;

function resolveAdminUserTab(tab: AdminUserTab | undefined, isCook: boolean): AdminUserTab {
    if (!tab || tab === 'general') return 'general';
    const def = ADMIN_USER_TAB_BY_ID[tab];
    if (!def) return 'general';
    if (def.cookOnly && !isCook) return 'general';
    return tab;
}

function visibleAdminUserTabs(isCook: boolean): readonly AdminUserTabDef[] {
    const order = isCook ? COOK_TAB_ORDER : CUSTOMER_TAB_ORDER;
    return order.map((id) => ADMIN_USER_TAB_BY_ID[id]);
}

export function AdminUserPage({ data, search, userId }: { data: GqlCAdminUserPageQuery; search: AdminUserSearch; userId: string }) {
    const locale = useLocale();
    const router = useRouter();
    const navigate = useNavigate({ from: '/{-$locale}/admin/users/$userId' });
    const [, terminateSessions] = useMutation(AdminUserTerminateSessionsDocument);
    const [terminateBusy, setTerminateBusy] = useState(false);
    const [panelFooter, setPanelFooter] = useState<ReactNode>();
    const onPanelFooterChange = useCallback((footer: ReactNode | undefined) => {
        setPanelFooter(footer);
    }, []);
    const admin = data.currentSession.user?.admin;
    const user = admin?.user ?? null;
    const featureToggles = admin?.featureToggles ?? [];
    const outboundEmails = admin?.outboundEmails ?? [];
    const whatsAppConversations = admin?.whatsAppConversations ?? [];
    const sessions = admin?.sessions ?? [];
    const sessionEvents = admin?.sessionEvents ?? [];
    const sessionEventsTotal = admin?.sessionEventsCounts?.[0] ?? 0;
    const meals = admin?.cookMeals ?? [];
    const menus = admin?.cookMenus ?? [];
    const bookingRequests = admin?.bookingRequests ?? [];
    const bookingRequestOffers = admin?.bookingRequestOffers ?? [];
    const assistantChats = admin?.assistantChats ?? [];
    const callTraffic = admin?.callTraffic ?? [];
    const poolBookingRequests = admin?.poolBookingRequests ?? [];
    const testimonials = admin?.testimonials ?? [];
    const isCook = user?.types.includes('cook') ?? false;
    const tab = resolveAdminUserTab(search.tab, isCook);
    const visibleTabs = visibleAdminUserTabs(isCook);
    const activeSessionIds = sessions.filter((session) => session.wasTerminatedAt == null).map((session) => session.sessionId);
    const sessionEventsPage = search.page ?? 1;
    const sessionEventsPageSize = adminListPageSize(search);
    const sessionEventsPageCount = adminListPageCount(sessionEventsTotal, sessionEventsPageSize);

    function updateSearch(next: AdminUserSearch) {
        void navigate({
            search: adminUserSearchForUrl(next),
        });
    }

    async function onTerminateAllActiveSessions() {
        if (activeSessionIds.length === 0) return;
        setTerminateBusy(true);
        try {
            const result = await terminateSessions({ sessionIds: activeSessionIds });
            if (result.error || !result.data?.admin.terminateSessions.success) {
                toast.error(t(locale, 'admin', 'copy.couldNotEndTheSessions'));
                return;
            }
            toast.success(t(locale, 'admin', 'copy.sessionsEnded'));
            await router.invalidate();
        } finally {
            setTerminateBusy(false);
        }
    }

    useEffect(() => {
        if (tab !== 'general' && tab !== 'notes') setPanelFooter(undefined);
    }, [tab]);

    const footer =
        tab === 'general' || tab === 'notes' ? (
            panelFooter
        ) : tab === 'session-events' ? (
            <AdminListPaginationBar
                page={sessionEventsPage}
                pageCount={sessionEventsPageCount}
                pageSize={sessionEventsPageSize}
                total={sessionEventsTotal}
                onPageChange={(nextPage) => updateSearch({ ...search, tab, page: nextPage })}
                onPageSizeChange={(nextPageSize) =>
                    updateSearch({
                        ...search,
                        tab,
                        page: undefined,
                        pageSize: nextPageSize,
                    })
                }
            />
        ) : (
            adminUserTabFooter({
                tab,
                userId,
                cookId: user?.cook?.cookId,
                locale,
                activeSessionIds,
                terminateBusy,
                onTerminateAllActiveSessions,
            })
        );

    return (
        <AdminPageChrome
            crumbs={[
                { label: t(locale, 'admin', 'copy.users'), to: '/{-$locale}/admin/users' },
                { label: user ? userDisplayName(user) : adminUserPageTitle(locale) },
            ]}
            contentClassName="min-h-0 overflow-hidden gap-0"
        >
            {user ? (
                <AdminPinnedFooterLayout footer={footer} contentClassName="@container grid w-full min-w-0 content-start gap-6">
                    <Tabs value={tab}>
                        <TabsList variant="line" aria-label={t(locale, 'admin', 'copy.userSections')}>
                            {visibleTabs.map(({ id, labelKey, Icon }) => (
                                <TabsTrigger key={id} value={id} asChild>
                                    <Link
                                        to="/{-$locale}/admin/users/$userId"
                                        params={{ userId }}
                                        search={adminUserSearchForUrl({ tab: id })}
                                        replace
                                    >
                                        <Icon aria-hidden />
                                        {t(locale, 'admin', labelKey)}
                                    </Link>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    <AdminUserTabPanel
                        tab={tab}
                        user={user}
                        featureToggles={featureToggles}
                        emails={outboundEmails}
                        whatsAppConversations={whatsAppConversations}
                        sessions={sessions}
                        sessionEvents={sessionEvents}
                        meals={meals}
                        menus={menus}
                        bookingRequests={bookingRequests}
                        bookingRequestOffers={bookingRequestOffers}
                        assistantChats={assistantChats}
                        callTraffic={callTraffic}
                        poolBookingRequests={poolBookingRequests}
                        testimonials={testimonials}
                        onPanelFooterChange={onPanelFooterChange}
                    />
                </AdminPinnedFooterLayout>
            ) : (
                <main id="main-content" className="grid w-full content-start gap-6 px-4 pb-6">
                    <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.userNotFound')}</p>
                </main>
            )}
        </AdminPageChrome>
    );
}

function AdminUserCreateMealFooter({ cookId, locale }: { cookId: string; locale: Locale }) {
    const navigate = useNavigate();
    const [, upsertMeal] = useMutation(AdminUserCookMealUpsertDocument);
    const [busy, setBusy] = useState(false);

    async function onCreate() {
        setBusy(true);
        try {
            const result = await upsertMeal({ meal: { cookId } });
            const mealId = result.data?.admin.cookMealUpsert.referenceId;
            if (result.error || !result.data?.admin.cookMealUpsert.success || mealId == null) {
                toast.error(t(locale, 'admin', 'copy.couldNotCreateMeal'));
                return;
            }
            toast.success(t(locale, 'admin', 'copy.draftMealCreated'));
            await navigate({ to: '/{-$locale}/admin/meals/$mealId/edit', params: { mealId } });
        } finally {
            setBusy(false);
        }
    }

    return (
        <Button type="button" disabled={busy} onClick={() => void onCreate()}>
            {t(locale, 'admin', 'copy.createMeal')}
        </Button>
    );
}

function AdminUserCreateMenuFooter({ cookId, locale }: { cookId: string; locale: Locale }) {
    const navigate = useNavigate();
    const [, upsertMenu] = useMutation(AdminUserCookMenuUpsertDocument);
    const [busy, setBusy] = useState(false);

    async function onCreate() {
        setBusy(true);
        try {
            const result = await upsertMenu({ menu: { cookId } });
            const menuId = result.data?.admin.cookMenuUpsert.referenceId;
            if (result.error || !result.data?.admin.cookMenuUpsert.success || menuId == null) {
                toast.error(t(locale, 'admin', 'copy.couldNotCreateMenu'));
                return;
            }
            toast.success(t(locale, 'admin', 'copy.draftMenuCreated'));
            await navigate({ to: '/{-$locale}/admin/menus/$menuId/edit', params: { menuId } });
        } finally {
            setBusy(false);
        }
    }

    return (
        <Button type="button" disabled={busy} onClick={() => void onCreate()}>
            {t(locale, 'admin', 'copy.createMenu')}
        </Button>
    );
}

function adminUserTabFooter({
    tab,
    userId,
    cookId,
    locale,
    activeSessionIds,
    terminateBusy,
    onTerminateAllActiveSessions,
}: {
    tab: AdminUserTab;
    userId: string;
    cookId: string | undefined;
    locale: Locale;
    activeSessionIds: string[];
    terminateBusy: boolean;
    onTerminateAllActiveSessions: () => void;
}): ReactNode | undefined {
    switch (tab) {
        case 'sessions':
            if (activeSessionIds.length === 0) return undefined;
            return (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" disabled={terminateBusy}>
                            {t(locale, 'admin', 'copy.terminateAllActiveSessions')}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t(locale, 'admin', 'copy.terminateAllActiveSessions2')}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {t(locale, 'admin', 'copy.theUserWillBeSignedOutOnAllDevicesAndBrowsersAndWillNeedToSi')}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={terminateBusy}>{t(locale, 'admin', 'copy.cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                                variant="destructive"
                                disabled={terminateBusy}
                                onClick={() => void onTerminateAllActiveSessions()}
                            >
                                {t(locale, 'admin', 'copy.terminateAll')}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            );
        case 'booking-requests':
            return (
                <Button type="button" asChild>
                    <Link to="/{-$locale}/admin/booking-requests/create" search={{ userId }}>
                        {t(locale, 'admin', 'copy.createBookingRequest2')}
                    </Link>
                </Button>
            );
        case 'cook-profile':
            return cookId ? (
                <Button type="button" asChild>
                    <Link to="/{-$locale}/admin/users/$userId/cook-profile/edit" params={{ userId }}>
                        {t(locale, 'admin', 'copy.edit')}
                    </Link>
                </Button>
            ) : undefined;
        case 'meals':
            return cookId ? <AdminUserCreateMealFooter cookId={cookId} locale={locale} /> : undefined;
        case 'menus':
            return cookId ? <AdminUserCreateMenuFooter cookId={cookId} locale={locale} /> : undefined;
        case 'calls':
            return (
                <Button type="button" variant="outline" asChild>
                    <Link to="/{-$locale}/admin/calls/list" search={{ cookId: userId }}>
                        {t(locale, 'admin', 'copy.openFullCallsList')}
                    </Link>
                </Button>
            );
        default:
            return undefined;
    }
}

type AdminUserSessionEvent = NonNullable<
    NonNullable<NonNullable<GqlCAdminUserPageQuery['currentSession']['user']>['admin']>['sessionEvents']
>[number];

type AdminUserCallTrafficItem = NonNullable<
    NonNullable<NonNullable<GqlCAdminUserPageQuery['currentSession']['user']>['admin']>['callTraffic']
>[number];

type AdminUserTestimonial = NonNullable<
    NonNullable<NonNullable<GqlCAdminUserPageQuery['currentSession']['user']>['admin']>['testimonials']
>[number];

function AdminUserTabPanel({
    tab,
    user,
    featureToggles,
    emails,
    whatsAppConversations,
    sessions,
    sessionEvents,
    meals,
    menus,
    bookingRequests,
    bookingRequestOffers,
    assistantChats,
    callTraffic,
    poolBookingRequests,
    testimonials,
    onPanelFooterChange,
}: {
    tab: AdminUserTab;
    user: AdminUserRow;
    featureToggles: NonNullable<NonNullable<NonNullable<GqlCAdminUserPageQuery['currentSession']['user']>['admin']>['featureToggles']>;
    emails: AdminUserOutboundEmail[];
    whatsAppConversations: AdminUserWhatsAppConversation[];
    sessions: AdminUserSession[];
    sessionEvents: AdminUserSessionEvent[];
    meals: AdminUserMeal[];
    menus: AdminUserMenu[];
    bookingRequests: AdminUserBookingRequest[];
    bookingRequestOffers: AdminUserBookingRequestOffer[];
    assistantChats: AdminUserAssistantChatListItem[];
    callTraffic: AdminUserCallTrafficItem[];
    poolBookingRequests: AdminUserBookingRequest[];
    testimonials: AdminUserTestimonial[];
    onPanelFooterChange: (footer: ReactNode | undefined) => void;
}) {
    switch (tab) {
        case 'general':
            return <AdminUserGeneralSection user={user} onFooterChange={onPanelFooterChange} />;
        case 'feature-toggles':
            return <AdminUserFeatureTogglesSection user={user} globalFeatureToggles={featureToggles} />;
        case 'notes':
            return <AdminUserNotesSection user={user} onFooterChange={onPanelFooterChange} />;
        case 'cook-profile':
            return <AdminUserCookProfileSection user={user} />;
        case 'emails':
            return <AdminUserEmailsSection emails={emails} />;
        case 'whatsapp':
            return <AdminUserWhatsAppSection conversations={whatsAppConversations} />;
        case 'sessions':
            return <AdminUserSessionsSection sessions={sessions} />;
        case 'session-events':
            return <AdminUserSessionEventsSection events={sessionEvents} />;
        case 'meals':
            return <AdminUserMealsSection meals={meals} />;
        case 'menus':
            return <AdminUserMenusSection menus={menus} />;
        case 'booking-requests':
            return <AdminUserBookingRequestsSection bookingRequests={bookingRequests} />;
        case 'offers':
            return <AdminUserBookingRequestOffersSection offers={bookingRequestOffers} />;
        case 'assistant-chats':
            return <AdminUserAssistantChatsSection chats={assistantChats} />;
        case 'calls':
            return <AdminUserCallsSection items={callTraffic} />;
        case 'pool':
            return <AdminUserPoolSection bookingRequests={poolBookingRequests} />;
        case 'testimonials':
            return <AdminUserTestimonialsSection testimonials={testimonials} />;
    }
}

function AdminUserSessionEventsSection({ events }: { events: AdminUserSessionEvent[] }) {
    const locale = useLocale();
    return <AdminSessionEventTimeline events={events} showSessionLink emptyLabel={t(locale, 'admin', 'copy.noSessionEventsForThisUser')} />;
}

function AdminUserMealsSection({ meals }: { meals: AdminUserMeal[] }) {
    const locale = useLocale();
    const timeZone = useTimeZone();

    if (meals.length === 0) {
        return <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noMealsForThisCook')}</p>;
    }

    return (
        <ul className="grid auto-rows-fr grid-cols-1 gap-2 @3xl:grid-cols-2">
            {meals.map((meal) => (
                <li key={meal.mealId} className="min-w-0">
                    <CookMealCard
                        meal={meal}
                        density="compact"
                        to="/{-$locale}/admin/meals/$mealId"
                        params={{ mealId: meal.mealId }}
                        meta={<span className="tabular-nums">{formatDate(meal.createdAt, { locale, timeZone, dateStyle: 'medium' })}</span>}
                    />
                </li>
            ))}
        </ul>
    );
}

function AdminUserMenusSection({ menus }: { menus: AdminUserMenu[] }) {
    const locale = useLocale();
    const timeZone = useTimeZone();

    if (menus.length === 0) {
        return <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noMenusForThisCook')}</p>;
    }

    return (
        <ul className="grid auto-rows-fr grid-cols-1 gap-2 @3xl:grid-cols-2">
            {menus.map((menu) => (
                <li key={menu.menuId} className="min-w-0">
                    <CookMenuCard
                        menu={menu}
                        density="compact"
                        to="/{-$locale}/admin/menus/$menuId"
                        params={{ menuId: menu.menuId }}
                        meta={<span className="tabular-nums">{formatDate(menu.createdAt, { locale, timeZone, dateStyle: 'medium' })}</span>}
                    />
                </li>
            ))}
        </ul>
    );
}

function AdminUserBookingRequestsSection({ bookingRequests }: { bookingRequests: AdminUserBookingRequest[] }) {
    const locale = useLocale();

    if (bookingRequests.length === 0) {
        return <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noBookingRequestsForThisUser')}</p>;
    }

    return (
        <ul className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {bookingRequests.map((request) => (
                <li key={request.bookingRequestId} className="min-h-0">
                    <AdminBookingRequestListCard request={request} />
                </li>
            ))}
        </ul>
    );
}

function AdminUserPoolSection({ bookingRequests }: { bookingRequests: AdminUserBookingRequest[] }) {
    const locale = useLocale();

    if (bookingRequests.length === 0) {
        return (
            <div className="grid gap-2">
                <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noNotifiedPoolRequestsForThisCook')}</p>
                <p className="text-sm text-muted-foreground">
                    {t(locale, 'admin', 'copy.requestsWhereThisCookWasNotifiedInTheTravelPoolAppearHereCus')}
                </p>
            </div>
        );
    }

    return (
        <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.notifiedPoolRequestsNotCustomerSent')}</p>
            <ul className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {bookingRequests.map((request) => (
                    <li key={request.bookingRequestId} className="min-h-0">
                        <AdminBookingRequestListCard request={request} />
                    </li>
                ))}
            </ul>
        </div>
    );
}

function AdminUserCallsSection({ items }: { items: AdminUserCallTrafficItem[] }) {
    const locale = useLocale();
    const timeZone = useTimeZone();

    if (items.length === 0) {
        return <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noCallsForThisCook')}</p>;
    }

    return (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border">
            {items.map((item) => {
                const occurredAt = item.callRoom?.startedAt ?? item.callSlotBooking?.startAt ?? item.callSlotBooking?.createdAt ?? null;
                return (
                    <li
                        key={`${item.kind}-${item.bookingRequestOfferId}-${item.callRoom?.bookingRequestOfferCallRoomId ?? item.callSlotBooking?.cookCallSlotBookingId ?? 'row'}`}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                        <div className="grid min-w-0 gap-0.5">
                            <p className="truncate text-sm font-medium text-foreground">
                                {item.occasion || item.customerDisplayName || item.bookingRequestOfferId}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant={item.kind === 'LIVE' || item.kind === 'PENDING' ? 'default' : 'outline'}>
                                    {adminCallKindLabel(item.kind, locale)}
                                </Badge>
                                <span className="truncate">{item.customerDisplayName}</span>
                                {occurredAt ? (
                                    <span className="tabular-nums">
                                        {formatDate(occurredAt, { locale, timeZone, dateStyle: 'medium' })}
                                    </span>
                                ) : null}
                            </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" asChild>
                            <Link
                                to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
                                params={{
                                    bookingRequestId: item.bookingRequestId,
                                    bookingRequestOfferId: item.bookingRequestOfferId,
                                }}
                                search={{ tab: 'call' }}
                            >
                                {t(locale, 'admin', 'copy.offer')}
                            </Link>
                        </Button>
                    </li>
                );
            })}
        </ul>
    );
}

function AdminUserTestimonialsSection({ testimonials }: { testimonials: AdminUserTestimonial[] }) {
    const locale = useLocale();
    const rows: AdminTestimonialListCardTestimonial[] = testimonials
        .flatMap((testimonial): AdminTestimonialListCardTestimonial[] => {
            if (testimonial.__typename === 'AdminCustomerTestimonial') {
                return [
                    {
                        kind: 'customer',
                        testimonialId: testimonial.customerTestimonialId,
                        displayAuthorName: testimonial.displayAuthorName,
                        displayLocation: testimonial.displayLocation ?? null,
                        displayOccasion: testimonial.displayOccasion ?? null,
                        body: testimonial.body,
                        rating: testimonial.rating ?? null,
                        publicationStatus: testimonial.publicationStatus,
                        publishedAt: testimonial.publishedAt ?? null,
                        createdAt: testimonial.createdAt,
                        imageUrls: testimonial.imageUrls,
                        publicPagePlacements: testimonial.publicPagePlacements,
                    },
                ];
            }
            if (testimonial.__typename === 'AdminCookTestimonial') {
                return [
                    {
                        kind: 'cook',
                        testimonialId: testimonial.cookTestimonialId,
                        displayAuthorName: testimonial.displayAuthorName,
                        displayLocation: testimonial.displayLocation ?? null,
                        displayOccasion: testimonial.displayOccasion ?? null,
                        body: testimonial.cookBody ?? null,
                        rating: testimonial.rating ?? null,
                        publicationStatus: testimonial.publicationStatus,
                        publishedAt: testimonial.publishedAt ?? null,
                        createdAt: testimonial.createdAt,
                        imageUrls: testimonial.imageUrls,
                        publicPagePlacements: testimonial.publicPagePlacements,
                    },
                ];
            }
            return [];
        })
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    if (rows.length === 0) {
        return <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noTestimonialsForThisCook')}</p>;
    }

    return (
        <ul className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {rows.map((testimonial) => (
                <li key={`${testimonial.kind}-${testimonial.testimonialId}`} className="min-h-0">
                    <AdminTestimonialListCard testimonial={testimonial} />
                </li>
            ))}
        </ul>
    );
}

function AdminUserBookingRequestOffersSection({ offers }: { offers: AdminUserBookingRequestOffer[] }) {
    const locale = useLocale();

    if (offers.length === 0) {
        return <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noOffersForThisCook')}</p>;
    }

    return (
        <ul className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {offers.map((offer) => (
                <li key={offer.bookingRequestOfferId} className="min-h-0">
                    <AdminBookingRequestOfferCard bookingRequestId={offer.bookingRequestId} offer={offer} />
                </li>
            ))}
        </ul>
    );
}

function AdminUserNotesSection({ user, onFooterChange }: { user: AdminUserRow; onFooterChange: (footer: ReactNode | undefined) => void }) {
    const locale = useLocale();
    const [, noteUpdate] = useMutation(AdminUserAdminNoteUpdateDocument);
    const [adminNote, setAdminNote] = useState(user.adminNote);
    const [savedNote, setSavedNote] = useState(user.adminNote);
    const [busy, setBusy] = useState(false);
    const dirty = adminNote !== savedNote;

    useEffect(() => {
        async function onSave() {
            setBusy(true);
            try {
                const result = await noteUpdate({ userId: user.userId, adminNote });
                if (result.error || !result.data?.admin.userAdminNoteUpdate.success) {
                    toast.error(t(locale, 'admin', 'copy.couldNotSave'));
                    return;
                }
                setSavedNote(adminNote.trim());
                setAdminNote(adminNote.trim());
                toast.success(t(locale, 'admin', 'copy.noteSaved'));
            } finally {
                setBusy(false);
            }
        }

        onFooterChange(
            <Button type="button" disabled={busy || !dirty} onClick={() => void onSave()}>
                {t(locale, 'admin', 'copy.save')}
            </Button>,
        );
        return () => onFooterChange(undefined);
    }, [adminNote, busy, dirty, locale, noteUpdate, onFooterChange, user.userId]);

    return (
        <div className="grid w-full gap-1.5">
            <label htmlFor="admin-user-note" className="text-sm font-medium">
                {t(locale, 'admin', 'copy.internalNote')}
            </label>
            <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.visibleToAdminsOnlyNeverSentToTheUser')}</p>
            <Textarea
                id="admin-user-note"
                rows={8}
                className="w-full"
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                placeholder={t(locale, 'admin', 'copy.addANote')}
            />
        </div>
    );
}

function AdminUserEmailsSection({ emails }: { emails: AdminUserOutboundEmail[] }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const detailsLabel = t(locale, 'admin', 'copy.details');

    if (emails.length === 0) {
        return <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noEmailsForThisUser')}</p>;
    }

    return (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border">
            {emails.map((email) => (
                <li key={email.outboundEmailId} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="grid min-w-0 gap-0.5">
                        <p className="truncate text-sm font-medium text-foreground">{email.subject || email.outboundEmailId}</p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className={adminOutboundEmailMetaBadgeClassName}>
                                {adminOutboundEmailPurposeLabel(email.purpose, locale)}
                            </Badge>
                            <span className="truncate">{email.toEmail}</span>
                            <span className="tabular-nums">{formatDate(email.createdAt, { locale, timeZone, dateStyle: 'medium' })}</span>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Button type="button" variant="ghost" size="sm" asChild>
                            <Link
                                to="/{-$locale}/admin/outbound-emails/$outboundEmailId"
                                params={{ outboundEmailId: email.outboundEmailId }}
                            >
                                {detailsLabel}
                            </Link>
                        </Button>
                    </div>
                </li>
            ))}
        </ul>
    );
}

function AdminUserWhatsAppSection({ conversations }: { conversations: AdminUserWhatsAppConversation[] }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const detailsLabel = t(locale, 'admin', 'copy.details');

    if (conversations.length === 0) {
        return <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noWhatsappChatsForThisUser')}</p>;
    }

    return (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border">
            {conversations.map((conversation) => (
                <li key={conversation.whatsAppConversationId} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="grid min-w-0 gap-0.5">
                        <p className="truncate text-sm font-medium text-foreground">{conversation.phoneNumber}</p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            {conversation.adminUnreadCount > 0 ? (
                                <Badge variant="outline">
                                    {conversation.adminUnreadCount} {t(locale, 'admin', 'copy.unread2')}
                                </Badge>
                            ) : null}
                            <span className="tabular-nums">
                                {formatDate(conversation.lastMessageAt, { locale, timeZone, dateStyle: 'medium' })}
                            </span>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Button type="button" variant="ghost" size="sm" asChild>
                            <Link
                                to="/{-$locale}/admin/whats-app-chats/$whatsAppConversationId"
                                params={{ whatsAppConversationId: conversation.whatsAppConversationId }}
                            >
                                {detailsLabel}
                            </Link>
                        </Button>
                    </div>
                </li>
            ))}
        </ul>
    );
}

function AdminUserAssistantChatsSection({ chats }: { chats: AdminUserAssistantChatListItem[] }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const detailsLabel = t(locale, 'admin', 'copy.details');

    if (chats.length === 0) {
        return <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noAssistantChatsForThisUser')}</p>;
    }

    return (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border">
            {chats.map((row) => (
                <li key={row.chatId} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="grid min-w-0 gap-0.5">
                        <p className="truncate text-sm font-medium text-foreground">{adminAssistantChatTitle(row.title, locale)}</p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">{adminChatSurfaceLabel(row.surface, locale)}</Badge>
                            {row.deletedAt ? <Badge variant="outline">{t(locale, 'admin', 'copy.deleted')}</Badge> : null}
                            <span className="tabular-nums">
                                {formatDate(row.lastModifiedAt, { locale, timeZone, dateStyle: 'medium' })}
                            </span>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Button type="button" variant="ghost" size="sm" asChild>
                            <Link to="/{-$locale}/admin/assistant-chats/$chatId" params={{ chatId: row.chatId }}>
                                {detailsLabel}
                            </Link>
                        </Button>
                    </div>
                </li>
            ))}
        </ul>
    );
}

function AdminUserSessionsSection({ sessions }: { sessions: AdminUserSession[] }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const router = useRouter();
    const [, terminateSessions] = useMutation(AdminUserTerminateSessionsDocument);
    const [busy, setBusy] = useState(false);
    const noUserAgent = t(locale, 'admin', 'copy.noUserAgent');
    const botLabel = t(locale, 'admin', 'copy.bot');
    const activeLabel = t(locale, 'admin', 'copy.active');
    const terminatedLabel = t(locale, 'admin', 'copy.terminated');
    const impersonationLabel = t(locale, 'admin', 'copy.impersonation');
    const detailsLabel = t(locale, 'admin', 'copy.details');

    async function onTerminateSession(sessionId: string) {
        setBusy(true);
        try {
            const result = await terminateSessions({ sessionIds: [sessionId] });
            if (result.error || !result.data?.admin.terminateSessions.success) {
                toast.error(t(locale, 'admin', 'copy.couldNotEndTheSession'));
                return;
            }
            toast.success(t(locale, 'admin', 'copy.sessionEnded'));
            await router.invalidate();
        } finally {
            setBusy(false);
        }
    }

    if (sessions.length === 0) {
        return <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noSessionsForThisUser')}</p>;
    }

    return (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border">
            {sessions.map((session) => {
                const badges: { label: string; variant: 'secondary' | 'outline' }[] = [];
                if (session.isBot) badges.push({ label: botLabel, variant: 'secondary' });
                if (session.isImpersonation) badges.push({ label: impersonationLabel, variant: 'secondary' });
                if (session.connectionActive) badges.push({ label: activeLabel, variant: 'secondary' });
                if (session.wasTerminatedAt) badges.push({ label: terminatedLabel, variant: 'outline' });
                const canTerminate = session.wasTerminatedAt == null;

                return (
                    <li key={session.sessionId} className="flex items-center justify-between gap-4 px-4 py-3">
                        <div className="grid min-w-0 gap-0.5">
                            <p className="truncate text-sm font-medium text-foreground">{session.userAgent ?? noUserAgent}</p>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                {badges.map(({ label, variant }) => (
                                    <Badge key={label} variant={variant}>
                                        {label}
                                    </Badge>
                                ))}
                                <span className="tabular-nums">
                                    {formatDate(session.lastInteractionAt, { locale, timeZone, dateStyle: 'medium' })}
                                </span>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            {canTerminate ? (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button type="button" variant="outline" size="sm" disabled={busy}>
                                            {t(locale, 'admin', 'copy.revoke')}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t(locale, 'admin', 'copy.terminateThisSession')}</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                {t(locale, 'admin', 'copy.theUserWillBeSignedOutOnThisDeviceAndWillNeedToSignInAgainTo')}
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel disabled={busy}>{t(locale, 'admin', 'copy.cancel')}</AlertDialogCancel>
                                            <AlertDialogAction
                                                variant="destructive"
                                                disabled={busy}
                                                onClick={() => void onTerminateSession(session.sessionId)}
                                            >
                                                {t(locale, 'admin', 'copy.revoke')}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            ) : (
                                <Badge variant="outline">{terminatedLabel}</Badge>
                            )}
                            <Button type="button" variant="ghost" size="sm" asChild>
                                <Link to="/{-$locale}/admin/sessions/$sessionId" params={{ sessionId: session.sessionId }}>
                                    {detailsLabel}
                                </Link>
                            </Button>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
