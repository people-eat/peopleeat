import { Link, useRouterState } from '@tanstack/react-router';
import { ChevronUpIcon, ScaleIcon, SummaryIcon, UserCogIcon, UserIcon, UsersIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ComponentProps, ReactNode, UIEvent } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';

import { AdminSidebarNavBadgesUpdatesDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { accountPageTitle } from '../pages/accountLabels';
import {
    ADMIN_AI_GENERATIONS_SECTIONS,
    adminAiGenerationsSectionLabel,
    adminAiGenerationsSectionTo,
    parseAdminAiGenerationsSectionFromPath,
} from '../pages/admin/adminAiGenerations';
import type { AdminAiGenerationsSectionTo } from '../pages/admin/adminAiGenerations';
import {
    ADMIN_ASSISTANT_CHATS_SECTIONS,
    adminAssistantChatsSectionLabel,
    adminAssistantChatsSectionTo,
    parseAdminAssistantChatsSectionFromPath,
} from '../pages/admin/adminAssistantChats';
import type { AdminAssistantChatsSectionTo } from '../pages/admin/adminAssistantChats';
import {
    ADMIN_BOOKING_REQUESTS_SECTIONS,
    adminBookingRequestsSectionLabel,
    adminBookingRequestsSectionTo,
    parseAdminBookingRequestsSectionFromPath,
} from '../pages/admin/adminBookingRequests';
import type { AdminBookingRequestsSectionTo } from '../pages/admin/adminBookingRequests';
import {
    ADMIN_CALLS_SECTIONS,
    adminCallsSectionLabel,
    adminCallsSectionTo,
    parseAdminCallsSectionFromPath,
} from '../pages/admin/adminCalls';
import type { AdminCallsSectionTo } from '../pages/admin/adminCalls';
import { ADMIN_NAV_GROUPS, adminStubRouteBySlug } from '../pages/admin/adminCatalog';
import type { AdminNavItemKey, AdminStubSlug } from '../pages/admin/adminCatalog';
import {
    ADMIN_GIFT_CARDS_SECTIONS,
    adminGiftCardsSectionLabel,
    adminGiftCardsSectionTo,
    parseAdminGiftCardsSectionFromPath,
} from '../pages/admin/adminGiftCards';
import type { AdminGiftCardsSectionTo } from '../pages/admin/adminGiftCards';
import { ADMIN_LEGAL_KINDS, adminLegalKindLabel, adminLegalKindTo, parseAdminLegalKindFromPath } from '../pages/admin/adminLegal';
import type { AdminLegalDocumentTo } from '../pages/admin/adminLegal';
import { ADMIN_LOGS_SECTIONS, adminLogsSectionLabel, adminLogsSectionTo, parseAdminLogsSectionFromPath } from '../pages/admin/adminLogs';
import type { AdminLogsSectionTo } from '../pages/admin/adminLogs';
import {
    ADMIN_OUTBOUND_EMAILS_SECTIONS,
    adminOutboundEmailsSectionLabel,
    adminOutboundEmailsSectionTo,
    parseAdminOutboundEmailsSectionFromPath,
} from '../pages/admin/adminOutboundEmails';
import type { AdminOutboundEmailsSectionTo } from '../pages/admin/adminOutboundEmails';
import {
    ADMIN_PROMO_CODES_SECTIONS,
    adminPromoCodesSectionLabel,
    adminPromoCodesSectionTo,
    parseAdminPromoCodesSectionFromPath,
} from '../pages/admin/adminPromoCodes';
import type { AdminPromoCodesSectionTo } from '../pages/admin/adminPromoCodes';
import {
    ADMIN_SESSIONS_SECTIONS,
    adminSessionsSectionLabel,
    adminSessionsSectionTo,
    parseAdminSessionsSectionFromPath,
} from '../pages/admin/adminSessions';
import type { AdminSessionsSectionTo } from '../pages/admin/adminSessions';
import {
    ADMIN_USERS_SECTIONS,
    adminUsersSectionLabel,
    adminUsersSectionTo,
    parseAdminUsersSectionFromPath,
} from '../pages/admin/adminUsers';
import type { AdminUsersSectionTo } from '../pages/admin/adminUsers';
import { profilePageTitle } from '../pages/profile/profileLabels';
import { SITE_LOGO, SITE_LOGO_DISPLAY, SITE_LOGO_SRC_SET, SITE_NAME } from '../seo/seoConstants';
import { DEFAULT_LOCALE } from '../utils/locale';
import type { Locale } from '../utils/locale';
import { AdminPagesCommandDialog } from './AdminPagesCommandDialog';
import { AdminSidebarNavFilter } from './AdminSidebarNavFilter';
import { AppImage } from './AppImage';
import { Button } from './base/button';
import { NotificationBadge } from './base/notification-badge';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarSeparator,
    useSidebar,
} from './base/sidebar';

const SIDEBAR_SCROLL_TOP_THRESHOLD_PX = 16;

function textIncludesQuery(text: string, query: string): boolean {
    return text.toLowerCase().includes(query);
}

function pathWithoutLocale(pathname: string, locale: Locale): string {
    if (locale !== DEFAULT_LOCALE && pathname.startsWith(`/${locale}/`)) {
        return pathname.slice(locale.length + 1) || '/';
    }
    if (locale !== DEFAULT_LOCALE && pathname === `/${locale}`) {
        return '/';
    }
    return pathname;
}

type AdminNavTo =
    | '/{-$locale}/admin'
    | '/{-$locale}/admin/users'
    | '/{-$locale}/admin/legal'
    | AdminLegalDocumentTo
    | AdminUsersSectionTo
    | AdminSessionsSectionTo
    | AdminGiftCardsSectionTo
    | AdminLogsSectionTo
    | AdminAiGenerationsSectionTo
    | AdminOutboundEmailsSectionTo
    | AdminPromoCodesSectionTo
    | AdminBookingRequestsSectionTo
    | AdminCallsSectionTo
    | AdminAssistantChatsSectionTo
    | `/{-$locale}/admin/${AdminStubSlug}`;

export function AdminSidebar({
    supportUnreadCount: supportUnreadCountSeed = 0,
    offerChatReviewCount: offerChatReviewCountSeed = 0,
    whatsAppUnreadCount: whatsAppUnreadCountSeed = 0,
    ...props
}: ComponentProps<typeof Sidebar> & {
    supportUnreadCount?: number;
    offerChatReviewCount?: number;
    whatsAppUnreadCount?: number;
}) {
    const locale = useLocale();
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const path = pathWithoutLocale(pathname, locale);
    const { setOpenMobile } = useSidebar();
    const client = useClient();
    const sidebarContentRef = useRef<HTMLDivElement>(null);
    const [supportUnreadCount, setSupportUnreadCount] = useState(supportUnreadCountSeed);
    const [offerChatReviewCount, setOfferChatReviewCount] = useState(offerChatReviewCountSeed);
    const [whatsAppUnreadCount, setWhatsAppUnreadCount] = useState(whatsAppUnreadCountSeed);
    const [showScrollToTop, setShowScrollToTop] = useState(false);
    const [navQuery, setNavQuery] = useState('');
    const [commandOpen, setCommandOpen] = useState(false);
    const legalKind = parseAdminLegalKindFromPath(path);
    const usersSection = parseAdminUsersSectionFromPath(path);
    const sessionsSection = parseAdminSessionsSectionFromPath(path);
    const giftCardsSection = parseAdminGiftCardsSectionFromPath(path);
    const logsSection = parseAdminLogsSectionFromPath(path);
    const aiGenerationsSection = parseAdminAiGenerationsSectionFromPath(path);
    const outboundEmailsSection = parseAdminOutboundEmailsSectionFromPath(path);
    const promoCodesSection = parseAdminPromoCodesSectionFromPath(path);
    const bookingRequestsSection = parseAdminBookingRequestsSectionFromPath(path);
    const callsSection = parseAdminCallsSectionFromPath(path);
    const assistantChatsSection = parseAdminAssistantChatsSectionFromPath(path);

    useEffect(() => {
        setOpenMobile(false);
    }, [pathname, setOpenMobile]);

    useEffect(() => {
        setSupportUnreadCount(supportUnreadCountSeed);
    }, [supportUnreadCountSeed]);

    useEffect(() => {
        setOfferChatReviewCount(offerChatReviewCountSeed);
    }, [offerChatReviewCountSeed]);

    useEffect(() => {
        setWhatsAppUnreadCount(whatsAppUnreadCountSeed);
    }, [whatsAppUnreadCountSeed]);

    useEffect(() => {
        const request = createRequest(AdminSidebarNavBadgesUpdatesDocument, {});
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const admin = result.data?.adminUpdates;
                if (!admin) return;
                setSupportUnreadCount(admin.unreadSupportRequestsCounts[0] ?? 0);
                setOfferChatReviewCount(admin.pendingOfferChatReviewsCounts[0] ?? 0);
                setWhatsAppUnreadCount(admin.whatsAppConversationsAdminUnreadCount);
            }),
        );
        return unsubscribe;
    }, [client]);

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') {
                return;
            }
            event.preventDefault();
            setCommandOpen((open) => !open);
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    type NavItem = {
        key: AdminNavItemKey;
        title: string;
        to: AdminNavTo;
        icon: ReactNode;
        isActive: boolean;
        count?: number;
        countLabel?: string;
        legalSubs?: boolean;
        usersSubs?: boolean;
        sessionsSubs?: boolean;
        giftCardsSubs?: boolean;
        logsSubs?: boolean;
        aiGenerationsSubs?: boolean;
        outboundEmailsSubs?: boolean;
        promoCodesSubs?: boolean;
        bookingRequestsSubs?: boolean;
        callsSubs?: boolean;
        assistantChatsSubs?: boolean;
    };

    function navItemForKey(key: AdminNavItemKey): NavItem {
        if (key === 'overview') {
            return {
                key,
                title: { de: 'Übersicht', en: 'Overview' }[locale],
                to: '/{-$locale}/admin',
                icon: <SummaryIcon />,
                isActive: path === '/admin',
            };
        }
        if (key === 'users') {
            return {
                key,
                title: { de: 'Benutzer', en: 'Users' }[locale],
                to: '/{-$locale}/admin/users',
                icon: <UsersIcon />,
                isActive: path === '/admin/users' || path.startsWith('/admin/users/'),
                usersSubs: true,
            };
        }
        if (key === 'legal') {
            return {
                key,
                title: { de: 'Rechtstexte', en: 'Legal texts' }[locale],
                to: '/{-$locale}/admin/legal',
                icon: <ScaleIcon />,
                isActive: path === '/admin/legal' || path.startsWith('/admin/legal/'),
                legalSubs: true,
            };
        }

        const route = adminStubRouteBySlug(key);
        const Icon = route.icon;
        const count =
            route.slug === 'support-requests' && supportUnreadCount > 0
                ? supportUnreadCount
                : route.slug === 'offer-chat-reviews' && offerChatReviewCount > 0
                  ? offerChatReviewCount
                  : route.slug === 'whats-app-chats' && whatsAppUnreadCount > 0
                    ? whatsAppUnreadCount
                    : undefined;
        return {
            key,
            title: route.title[locale],
            to: route.to,
            icon: <Icon />,
            isActive: path === route.path || path.startsWith(`${route.path}/`),
            count,
            countLabel:
                count != null
                    ? route.slug === 'whats-app-chats'
                        ? {
                              de: `${count} ungelesene WhatsApp-Chats`,
                              en: `${count} unread WhatsApp chats`,
                          }[locale]
                        : route.slug === 'offer-chat-reviews'
                          ? {
                                de: `${count} Angebots-Chats zur Prüfung`,
                                en: `${count} offer chats for review`,
                            }[locale]
                          : {
                                de: `${count} ungelesene Support-Anfragen`,
                                en: `${count} unread support requests`,
                            }[locale]
                    : undefined,
            sessionsSubs: route.slug === 'sessions',
            giftCardsSubs: route.slug === 'gift-cards',
            logsSubs: route.slug === 'logs',
            aiGenerationsSubs: route.slug === 'ai-generations',
            outboundEmailsSubs: route.slug === 'outbound-emails',
            promoCodesSubs: route.slug === 'promo-codes',
            bookingRequestsSubs: route.slug === 'booking-requests',
            callsSubs: route.slug === 'calls',
            assistantChatsSubs: route.slug === 'assistant-chats',
        };
    }

    const navGroups = ADMIN_NAV_GROUPS.map((group) => ({
        id: group.id,
        label: group.label?.[locale] ?? null,
        items: group.items.map(navItemForKey),
    }));

    const normalizedNavQuery = navQuery.trim().toLowerCase();
    const filteredNavGroups =
        normalizedNavQuery.length === 0
            ? navGroups
            : navGroups
                  .map((group) => {
                      const groupMatches = group.label != null && textIncludesQuery(group.label, normalizedNavQuery);
                      return {
                          ...group,
                          items: groupMatches
                              ? group.items
                              : group.items.filter((item) => textIncludesQuery(item.title, normalizedNavQuery)),
                      };
                  })
                  .filter((group) => group.items.length > 0);

    function onSidebarContentScroll(event: UIEvent<HTMLDivElement>) {
        setShowScrollToTop(event.currentTarget.scrollTop > SIDEBAR_SCROLL_TOP_THRESHOLD_PX);
    }

    return (
        <Sidebar variant="floating" {...props}>
            <SidebarHeader>
                <Link to="/{-$locale}" className="flex items-center rounded-md p-2 outline-hidden ring-sidebar-ring focus-visible:ring-2">
                    <AppImage
                        src={SITE_LOGO}
                        srcSet={SITE_LOGO_SRC_SET}
                        alt={SITE_NAME}
                        width={SITE_LOGO_DISPLAY.width}
                        height={SITE_LOGO_DISPLAY.height}
                        className="h-7 w-auto"
                    />
                </Link>
                <div className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
                    <AdminSidebarNavFilter value={navQuery} onChange={setNavQuery} onOpenCommand={() => setCommandOpen(true)} />
                </div>
            </SidebarHeader>
            <AdminPagesCommandDialog open={commandOpen} onOpenChange={setCommandOpen} />
            <div className="relative flex min-h-0 flex-1 flex-col">
                {showScrollToTop ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="absolute top-2 left-1/2 z-10 -translate-x-1/2 bg-sidebar shadow-sm group-data-[collapsible=icon]:hidden"
                        aria-label={{ de: 'Nach oben scrollen', en: 'Scroll to top' }[locale]}
                        onClick={() => {
                            sidebarContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                    >
                        <ChevronUpIcon />
                    </Button>
                ) : null}
                <SidebarContent ref={sidebarContentRef} onScroll={onSidebarContentScroll}>
                    {filteredNavGroups.length === 0 ? (
                        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                            <p className="px-4 py-2 text-sm text-muted-foreground">
                                {{ de: 'Kein Eintrag gefunden.', en: 'No entries found.' }[locale]}
                            </p>
                        </SidebarGroup>
                    ) : null}
                    {filteredNavGroups.map((group) => (
                        <SidebarGroup key={group.id}>
                            {group.label != null ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
                            <SidebarMenu>
                                {group.items.map((item) => (
                                    <SidebarMenuItem key={item.key}>
                                        <SidebarMenuButton asChild isActive={item.isActive}>
                                            <Link to={item.to}>
                                                {item.icon}
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                        {item.count != null && item.countLabel != null ? (
                                            <SidebarMenuBadge className="bg-transparent p-0 text-transparent peer-hover/menu-button:text-transparent peer-data-[active=true]/menu-button:text-transparent">
                                                <NotificationBadge count={item.count} label={item.countLabel} placement="inline" />
                                            </SidebarMenuBadge>
                                        ) : null}
                                        {item.usersSubs ? (
                                            <SidebarMenuSub>
                                                {ADMIN_USERS_SECTIONS.map((section) => (
                                                    <SidebarMenuSubItem key={section}>
                                                        <SidebarMenuSubButton asChild isActive={usersSection === section}>
                                                            <Link
                                                                to={adminUsersSectionTo(section)}
                                                                {...(section === 'list'
                                                                    ? { search: { q: undefined, type: undefined, page: undefined } }
                                                                    : {})}
                                                            >
                                                                {adminUsersSectionLabel(section, locale)}
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        ) : null}
                                        {item.sessionsSubs ? (
                                            <SidebarMenuSub>
                                                {ADMIN_SESSIONS_SECTIONS.map((section) => (
                                                    <SidebarMenuSubItem key={section}>
                                                        <SidebarMenuSubButton asChild isActive={sessionsSection === section}>
                                                            <Link
                                                                to={adminSessionsSectionTo(section)}
                                                                search={{ q: undefined, kind: undefined, page: undefined }}
                                                            >
                                                                {adminSessionsSectionLabel(section, locale)}
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        ) : null}
                                        {item.giftCardsSubs ? (
                                            <SidebarMenuSub>
                                                {ADMIN_GIFT_CARDS_SECTIONS.map((section) => (
                                                    <SidebarMenuSubItem key={section}>
                                                        <SidebarMenuSubButton asChild isActive={giftCardsSection === section}>
                                                            <Link
                                                                to={adminGiftCardsSectionTo(section)}
                                                                search={{
                                                                    q: undefined,
                                                                    status: undefined,
                                                                    page: undefined,
                                                                    sort: undefined,
                                                                    dir: undefined,
                                                                }}
                                                            >
                                                                {adminGiftCardsSectionLabel(section, locale)}
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        ) : null}
                                        {item.logsSubs ? (
                                            <SidebarMenuSub>
                                                {ADMIN_LOGS_SECTIONS.map((section) => (
                                                    <SidebarMenuSubItem key={section}>
                                                        <SidebarMenuSubButton asChild isActive={logsSection === section}>
                                                            <Link
                                                                to={adminLogsSectionTo(section)}
                                                                search={{ q: undefined, level: undefined, page: undefined }}
                                                            >
                                                                {adminLogsSectionLabel(section, locale)}
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        ) : null}
                                        {item.aiGenerationsSubs ? (
                                            <SidebarMenuSub>
                                                {ADMIN_AI_GENERATIONS_SECTIONS.map((section) => (
                                                    <SidebarMenuSubItem key={section}>
                                                        <SidebarMenuSubButton asChild isActive={aiGenerationsSection === section}>
                                                            <Link
                                                                to={adminAiGenerationsSectionTo(section)}
                                                                search={{ q: undefined, kind: undefined, page: undefined }}
                                                            >
                                                                {adminAiGenerationsSectionLabel(section, locale)}
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        ) : null}
                                        {item.outboundEmailsSubs ? (
                                            <SidebarMenuSub>
                                                {ADMIN_OUTBOUND_EMAILS_SECTIONS.map((section) => (
                                                    <SidebarMenuSubItem key={section}>
                                                        <SidebarMenuSubButton asChild isActive={outboundEmailsSection === section}>
                                                            <Link
                                                                to={adminOutboundEmailsSectionTo(section)}
                                                                search={{
                                                                    q: undefined,
                                                                    purpose: undefined,
                                                                    page: undefined,
                                                                    sort: undefined,
                                                                    dir: undefined,
                                                                }}
                                                            >
                                                                {adminOutboundEmailsSectionLabel(section, locale)}
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        ) : null}
                                        {item.promoCodesSubs ? (
                                            <SidebarMenuSub>
                                                {ADMIN_PROMO_CODES_SECTIONS.map((section) => (
                                                    <SidebarMenuSubItem key={section}>
                                                        <SidebarMenuSubButton asChild isActive={promoCodesSection === section}>
                                                            <Link
                                                                to={adminPromoCodesSectionTo(section)}
                                                                {...(section === 'list'
                                                                    ? {
                                                                          search: {
                                                                              q: undefined,
                                                                              page: undefined,
                                                                              sort: undefined,
                                                                              dir: undefined,
                                                                          },
                                                                      }
                                                                    : {})}
                                                            >
                                                                {adminPromoCodesSectionLabel(section, locale)}
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        ) : null}
                                        {item.bookingRequestsSubs ? (
                                            <SidebarMenuSub>
                                                {ADMIN_BOOKING_REQUESTS_SECTIONS.map((section) => (
                                                    <SidebarMenuSubItem key={section}>
                                                        <SidebarMenuSubButton asChild isActive={bookingRequestsSection === section}>
                                                            <Link
                                                                to={adminBookingRequestsSectionTo(section)}
                                                                {...(section === 'list'
                                                                    ? {
                                                                          search: {
                                                                              q: undefined,
                                                                              page: undefined,
                                                                              sort: undefined,
                                                                              dir: undefined,
                                                                          },
                                                                      }
                                                                    : {})}
                                                            >
                                                                {adminBookingRequestsSectionLabel(section, locale)}
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        ) : null}
                                        {item.callsSubs ? (
                                            <SidebarMenuSub>
                                                {ADMIN_CALLS_SECTIONS.map((section) => (
                                                    <SidebarMenuSubItem key={section}>
                                                        <SidebarMenuSubButton asChild isActive={callsSection === section}>
                                                            <Link
                                                                to={adminCallsSectionTo(section)}
                                                                search={{
                                                                    q: undefined,
                                                                    kind: undefined,
                                                                    initiator: undefined,
                                                                    cookId: undefined,
                                                                    from: undefined,
                                                                    to: undefined,
                                                                    page: undefined,
                                                                    sort: undefined,
                                                                    dir: undefined,
                                                                }}
                                                            >
                                                                {adminCallsSectionLabel(section, locale)}
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        ) : null}
                                        {item.assistantChatsSubs ? (
                                            <SidebarMenuSub>
                                                {ADMIN_ASSISTANT_CHATS_SECTIONS.map((section) => (
                                                    <SidebarMenuSubItem key={section}>
                                                        <SidebarMenuSubButton asChild isActive={assistantChatsSection === section}>
                                                            <Link
                                                                to={adminAssistantChatsSectionTo(section)}
                                                                search={{ q: undefined, surface: undefined, page: undefined }}
                                                            >
                                                                {adminAssistantChatsSectionLabel(section, locale)}
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        ) : null}
                                        {item.legalSubs ? (
                                            <SidebarMenuSub>
                                                {ADMIN_LEGAL_KINDS.map((kind) => (
                                                    <SidebarMenuSubItem key={kind}>
                                                        <SidebarMenuSubButton asChild isActive={legalKind === kind}>
                                                            <Link to={adminLegalKindTo(kind)} params={{ kind }}>
                                                                {adminLegalKindLabel(kind, locale)}
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        ) : null}
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroup>
                    ))}
                </SidebarContent>
            </div>
            <SidebarSeparator />
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild size="sm">
                            <Link to="/{-$locale}/profile">
                                <UserIcon />
                                <span>{profilePageTitle[locale]}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild size="sm" isActive={path === '/admin/account'}>
                            <Link to="/{-$locale}/admin/account">
                                <UserCogIcon />
                                <span>{accountPageTitle[locale]}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
