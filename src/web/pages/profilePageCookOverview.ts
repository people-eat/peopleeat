import { formatDate, formatTime } from '../../shared';
import type { Locale } from '../../shared/locale';
import type { GqlCProfilePageCookStatusFragment } from '../graphql/generated';

export type CookOverviewAttentionItem = {
    key: 'approval-pending' | 'unread-offers' | 'upcoming-call' | 'wallet-reset';
    tone: 'info' | 'warning';
    title: string;
    body: string;
    params?: { bookingRequestOfferId: string; search?: { tab: 'chat' } };
    href?: '/{-$locale}/profile/wallet';
    actionLabel?: string;
};

export type CookOverviewGettingStartedStep = {
    key: 'wallet' | 'travel' | 'profile-picture' | 'chef-profile' | 'first-meal' | 'first-menu' | 'first-offer';
    title: string;
    body: string;
    href:
        | '/{-$locale}/profile/wallet'
        | '/{-$locale}/profile/travel'
        | '/{-$locale}/profile/chef-profile/edit'
        | '/{-$locale}/profile/meals'
        | '/{-$locale}/profile/menus'
        | '/{-$locale}/profile/booking-request-pool';
    actionLabel: string;
};

export type CookOverviewModel = {
    attention: CookOverviewAttentionItem[];
    gettingStarted: CookOverviewGettingStartedStep[];
    allClear: boolean;
};

function formatCallWhen(startAt: string, locale: Locale, timeZone: string): string {
    const date = formatDate(startAt, { locale, timeZone, weekday: true, dateStyle: 'medium' });
    const time = formatTime(startAt, { locale, timeZone });
    return locale === 'de' ? `${date} · ${time} Uhr` : `${date} · ${time}`;
}

export function profilePageCookOverview(
    cook: GqlCProfilePageCookStatusFragment,
    locale: Locale,
    timeZone: string,
    { hasProfilePicture = false }: { hasProfilePicture?: boolean } = {},
): CookOverviewModel {
    const attention: CookOverviewAttentionItem[] = [];
    const gettingStarted: CookOverviewGettingStartedStep[] = [];

    if (!cook.isApprovedByAdmin) {
        attention.push({
            key: 'approval-pending',
            tone: 'info',
            title: { de: 'Freischaltung ausstehend', en: 'Approval pending' }[locale],
            body: {
                de: 'Unser Team meldet sich für ein kurzes Kennenlerngespräch. Danach kannst du dein Wallet einrichten und Angebote erstellen.',
                en: 'Our team will reach out for a short intro call. Afterwards you can set up your wallet and create offers.',
            }[locale],
        });
    }

    if (cook.isApprovedByAdmin && cook.stripeStatus === 'ACTIVE_WAS_RESET') {
        attention.push({
            key: 'wallet-reset',
            tone: 'warning',
            title: { de: 'Stripe benötigt aktualisierte Angaben', en: 'Stripe needs updated details' }[locale],
            body: {
                de: 'Bitte aktualisiere dein Wallet, bevor Auszahlungen weiterlaufen.',
                en: 'Please refresh your wallet before payouts can continue.',
            }[locale],
            href: '/{-$locale}/profile/wallet',
            actionLabel: { de: 'Zum Wallet', en: 'Go to wallet' }[locale],
        });
    }

    let unreadTotal = 0;
    let unreadBestCount = 0;
    let unreadOfferId: string | null = null;
    for (const offer of cook.bookingRequestOffers) {
        if (offer.cookUnreadNotificationCount <= 0) continue;
        unreadTotal += offer.cookUnreadNotificationCount;
        if (offer.cookUnreadNotificationCount > unreadBestCount) {
            unreadBestCount = offer.cookUnreadNotificationCount;
            unreadOfferId = offer.bookingRequestOfferId;
        }
    }
    if (unreadTotal > 0 && unreadOfferId != null) {
        attention.push({
            key: 'unread-offers',
            tone: 'warning',
            title:
                unreadTotal === 1
                    ? { de: 'Neue Nachricht im Angebotschat', en: 'New message in offer chat' }[locale]
                    : {
                          de: `${unreadTotal} neue Nachrichten in Angebotschats`,
                          en: `${unreadTotal} new messages in offer chats`,
                      }[locale],
            body: {
                de: 'Öffne den Chat, um zu antworten.',
                en: 'Open the chat to reply.',
            }[locale],
            params: { bookingRequestOfferId: unreadOfferId, search: { tab: 'chat' } },
            actionLabel: { de: 'Zum Chat', en: 'Open chat' }[locale],
        });
    }

    const nextCall = cook.upcomingCallSlotBookings[0];
    if (nextCall) {
        const when = formatCallWhen(nextCall.startAt, locale, timeZone);
        attention.push({
            key: 'upcoming-call',
            tone: 'info',
            title: { de: 'Bevorstehender Call', en: 'Upcoming call' }[locale],
            body: {
                de: `${nextCall.customer.display} · ${when}`,
                en: `${nextCall.customer.display} · ${when}`,
            }[locale],
            params: { bookingRequestOfferId: nextCall.bookingRequestOfferId },
            actionLabel: { de: 'Zum Angebot', en: 'Open offer' }[locale],
        });
    }

    const approved = cook.isApprovedByAdmin;
    const walletReady = cook.stripeStatus === 'COMPLETED';
    const walletNeedsSetup = cook.stripeStatus === 'EMPTY' || cook.stripeStatus === 'PREPARED';
    const mealsCount = cook.mealsCounts[0] ?? 0;
    const menusCount = cook.menusCounts[0] ?? 0;
    const hasOffers = cook.bookingRequestOffers.length > 0;
    const profileComplete =
        cook.biography.trim().length > 0 &&
        cook.cuisineStyle != null &&
        cook.cuisineStyle !== '' &&
        cook.cookingPhilosophy != null &&
        cook.cookingPhilosophy !== '';

    if (approved && walletNeedsSetup) {
        gettingStarted.push({
            key: 'wallet',
            title: { de: 'Wallet einrichten', en: 'Set up your wallet' }[locale],
            body: {
                de: 'Richte Stripe Connect ein, um Auszahlungen zu erhalten.',
                en: 'Set up Stripe Connect to receive payouts.',
            }[locale],
            href: '/{-$locale}/profile/wallet',
            actionLabel: { de: 'Zum Wallet', en: 'Go to wallet' }[locale],
        });
    }

    if (cook.exactTravelOriginAddress == null) {
        gettingStarted.push({
            key: 'travel',
            title: { de: 'Reiseadresse fehlt', en: 'Add travel origin' }[locale],
            body: {
                de: 'Trage deine Startadresse ein, damit Reisekosten und Entfernungen stimmen.',
                en: 'Add your travel origin so distances and expenses are accurate.',
            }[locale],
            href: '/{-$locale}/profile/travel',
            actionLabel: { de: 'Zur Reise', en: 'Go to travel' }[locale],
        });
    }

    if (!hasProfilePicture) {
        gettingStarted.push({
            key: 'profile-picture',
            title: { de: 'Profilbild hinzufügen', en: 'Add a profile picture' }[locale],
            body: {
                de: 'Ein Foto hilft Kunden, dich auf deinem öffentlichen Profil zu erkennen.',
                en: 'A photo helps customers recognize you on your public profile.',
            }[locale],
            href: '/{-$locale}/profile/chef-profile/edit',
            actionLabel: { de: 'Bild hinzufügen', en: 'Add picture' }[locale],
        });
    }

    if (!profileComplete) {
        gettingStarted.push({
            key: 'chef-profile',
            title: { de: 'Kochprofil vervollständigen', en: 'Complete your chef profile' }[locale],
            body: {
                de: 'Schreibe eine Bio und wähle Küchenstil sowie Kochphilosophie.',
                en: 'Add a bio and choose your cuisine style and cooking philosophy.',
            }[locale],
            href: '/{-$locale}/profile/chef-profile/edit',
            actionLabel: { de: 'Zum Profil', en: 'Edit profile' }[locale],
        });
    }

    if (mealsCount === 0) {
        gettingStarted.push({
            key: 'first-meal',
            title: { de: 'Erstes Gericht anlegen', en: 'Create your first meal' }[locale],
            body: {
                de: 'Gerichte sind die Bausteine deiner Menüs und Angebote.',
                en: 'Meals are the building blocks for your menus and offers.',
            }[locale],
            href: '/{-$locale}/profile/meals',
            actionLabel: { de: 'Zu den Gerichten', en: 'Go to meals' }[locale],
        });
    }

    if (menusCount === 0) {
        gettingStarted.push({
            key: 'first-menu',
            title: { de: 'Erstes Menü anlegen', en: 'Create your first menu' }[locale],
            body: {
                de: 'Stelle Gerichte zu Menüs zusammen, die du Kunden vorschlagen kannst.',
                en: 'Combine meals into menus you can suggest to customers.',
            }[locale],
            href: '/{-$locale}/profile/menus',
            actionLabel: { de: 'Zu den Menüs', en: 'Go to menus' }[locale],
        });
    }

    if (approved && walletReady && !hasOffers) {
        gettingStarted.push({
            key: 'first-offer',
            title: { de: 'Erstes Angebot erstellen', en: 'Create your first offer' }[locale],
            body: {
                de: 'Schau in den Anfragen-Pool und sende dein erstes Angebot.',
                en: 'Browse the request pool and send your first offer.',
            }[locale],
            href: '/{-$locale}/profile/booking-request-pool',
            actionLabel: { de: 'Zum Pool', en: 'Go to pool' }[locale],
        });
    }

    return {
        attention,
        gettingStarted,
        allClear: attention.length === 0 && gettingStarted.length === 0,
    };
}
