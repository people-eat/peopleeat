import { formatCurrency } from '../../shared/formatCurrency';
import { formatDate, formatDateTime } from '../../shared/formatDate';
import type { GqlSAdminCookPayoutBlockedReason } from '../graphql/generated';
import type { AdminActionItemsSnapshot } from './adminActionItemsSnapshot';
import {
    slackAdminBookingRequestOfferUrl,
    slackAdminBookingRequestUrl,
    slackAdminOfferChatReviewUrl,
    slackAdminSupportRequestUrl,
    slackAdminUserUrl,
} from './slackAdminUrls';
import { slackMessageBlocksBuild } from './slackBlocks';
import { slackShortId } from './slackFormat';

const SLACK_TIME_ZONE = 'Europe/Berlin';

function cookPayoutBlockedReasonLabel(reason: GqlSAdminCookPayoutBlockedReason | null): string | null {
    if (reason == null) return null;
    return {
        MISSING_STRIPE_ACCOUNT: 'Kein Stripe-Konto',
        STRIPE_ACCOUNT_INACTIVE: 'Stripe inaktiv',
        STRIPE_PAYOUTS_DISABLED: 'Auszahlungen deaktiviert',
    }[reason];
}

function queueSection(title: string, count: number, lines: string[]): string {
    if (count === 0) {
        return `*${title} (0)*\n_Keine Einträge_`;
    }
    const more = count > lines.length ? `\n_… und ${count - lines.length} weitere_` : '';
    return `*${title} (${count})*\n${lines.join('\n')}${more}`;
}

/**
 * German Block Kit message mirroring `/admin` action queues.
 */
export function adminActionItemsSlackMessageBuild(snapshot: AdminActionItemsSnapshot): {
    text: string;
    blocks: ReturnType<typeof slackMessageBlocksBuild>['blocks'];
} {
    const total =
        snapshot.pendingCooks.count +
        snapshot.blockedBookingRequests.count +
        snapshot.duePayoutOffers.count +
        snapshot.openSupportRequests.count +
        snapshot.pendingOfferChatReviews.count;

    if (total === 0) {
        return slackMessageBlocksBuild({
            header: 'Admin Aktionsübersicht',
            body: '*Alles erledigt*\nKeine offenen Admin-Aktionseinträge.',
            contextLines: [`Report ${slackShortId(new Date().toISOString())}`],
        });
    }

    const pendingLines = snapshot.pendingCooks.items.map((item) => {
        const created = formatDate(item.createdAt, { locale: 'de', timeZone: SLACK_TIME_ZONE, dateStyle: 'medium' });
        const email = item.emailAddress?.trim() || '—';
        return `• ${item.displayName} · ${email} · ${created} · <${slackAdminUserUrl(item.userId)}|öffnen>`;
    });

    const blockedLines = snapshot.blockedBookingRequests.items.map((item) => {
        const when = formatDateTime(item.dateTime, {
            locale: 'de',
            timeZone: SLACK_TIME_ZONE,
            dateStyle: 'medium',
            timeStyle: 'short',
        });
        return `• ${item.occasion} · ${item.customerName} · ${when} · ${item.city} · <${slackAdminBookingRequestUrl(item.bookingRequestId)}|öffnen>`;
    });

    const payoutLines = snapshot.duePayoutOffers.items.map((item) => {
        const amount = formatCurrency(item.payoutCentsCook, { locale: 'de', maximumFractionDigits: 0 });
        const planned = item.plannedPayoutDateTime
            ? formatDate(item.plannedPayoutDateTime, { locale: 'de', timeZone: SLACK_TIME_ZONE, dateStyle: 'medium' })
            : null;
        const readiness = item.cookPayoutReady ? 'Bereit' : (cookPayoutBlockedReasonLabel(item.cookPayoutBlockedReason) ?? 'Nicht bereit');
        const meta = [amount, planned, readiness].filter(Boolean).join(' · ');
        return `• ${item.cookName} · ${meta} · <${slackAdminBookingRequestOfferUrl(item.bookingRequestId, item.bookingRequestOfferId)}|öffnen>`;
    });

    const supportLines = snapshot.openSupportRequests.items.map((item) => {
        const created = formatDate(item.createdAt, { locale: 'de', timeZone: SLACK_TIME_ZONE, dateStyle: 'medium' });
        const unread = item.adminUnreadNotificationCount > 0 ? ` · ${item.adminUnreadNotificationCount} ungelesen` : '';
        return `• ${item.subject} · ${item.customerName} · ${created}${unread} · <${slackAdminSupportRequestUrl(item.supportRequestId)}|öffnen>`;
    });

    const offerChatLines = snapshot.pendingOfferChatReviews.items.map((item) => {
        const pending =
            item.adminChatReviewPendingCount === 1 ? '1 neue Nachricht' : `${item.adminChatReviewPendingCount} neue Nachrichten`;
        return `• ${item.occasion} · ${item.customerName} · ${item.cookName} · ${pending} · <${slackAdminOfferChatReviewUrl(item.bookingRequestOfferId)}|öffnen>`;
    });

    const body = [
        queueSection('Freischaltungen ausstehend', snapshot.pendingCooks.count, pendingLines),
        queueSection('Buchungsanfragen zur Prüfung', snapshot.blockedBookingRequests.count, blockedLines),
        queueSection('Auszahlungen fällig', snapshot.duePayoutOffers.count, payoutLines),
        queueSection('Offene Support-Anfragen', snapshot.openSupportRequests.count, supportLines),
        queueSection('Angebots-Chats zur Prüfung', snapshot.pendingOfferChatReviews.count, offerChatLines),
    ].join('\n\n');

    return slackMessageBlocksBuild({
        header: 'Admin Aktionsübersicht',
        body,
        contextLines: [`Report ${slackShortId(new Date().toISOString())} · ${total} offen`],
    });
}
