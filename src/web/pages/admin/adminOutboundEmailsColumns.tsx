import { createColumnHelper } from '@tanstack/react-table';

import { formatDateTime } from '../../../shared';
import type { Locale } from '../../../shared/locale';
import { Badge } from '../../components/base/badge';
import type { GqlCAdminOutboundEmailLifecycleStatus, GqlCAdminOutboundEmailPurpose } from '../../graphql/generated';
import { AdminDataTableSortHeader } from './AdminDataTableSortHeader';
import type { AdminOutboundEmailsDataTableFeatures } from './adminOutboundEmailsDataTableFeatures';

export type AdminOutboundEmailsTableRow = {
    outboundEmailId: string;
    purpose: GqlCAdminOutboundEmailPurpose;
    toEmail: string;
    subject: string;
    createdAt: string;
    sentAt: string | null;
    failedAt: string | null;
    openedAt: string | null;
};

export const ADMIN_OUTBOUND_EMAILS_SORT_FIELDS = ['createdAt', 'toEmail', 'subject'] as const;
export type AdminOutboundEmailsSortField = (typeof ADMIN_OUTBOUND_EMAILS_SORT_FIELDS)[number];

const columnHelper = createColumnHelper<AdminOutboundEmailsDataTableFeatures, AdminOutboundEmailsTableRow>();

export function adminOutboundEmailLifecycleStatusLabel(status: GqlCAdminOutboundEmailLifecycleStatus, locale: Locale) {
    return {
        FAILED: { de: 'Fehlgeschlagen', en: 'Failed' },
        OPENED: { de: 'Geöffnet', en: 'Opened' },
        BOUNCED: { de: 'Bounce', en: 'Bounced' },
        PENDING: { de: 'Ausstehend', en: 'Pending' },
        SENT: { de: 'Gesendet', en: 'Sent' },
    }[status][locale];
}

export function adminOutboundEmailPurposeLabel(purpose: GqlCAdminOutboundEmailPurpose, locale: Locale) {
    return {
        GIFT_CARD_PURCHASED: { de: 'Gutscheinkauf', en: 'Gift card purchase' },
        AUTH_EMAIL_OTP: { de: 'Login-Code', en: 'Login code' },
        EMAIL_ADDRESS_UPDATE_CONFIRM: { de: 'E-Mail-Änderung', en: 'Email address change' },
        CALL_SLOT_BOOKING_REQUEST: { de: 'Anruf-Anfrage', en: 'Call request' },
        CALL_SLOT_BOOKING_CONFIRM: { de: 'Anruf-Bestätigung', en: 'Call confirmation' },
        CALL_SLOT_BOOKING_DECLINE: { de: 'Anruf-Absage', en: 'Call decline' },
        CALL_SLOT_BOOKING_CANCEL: { de: 'Anruf-Stornierung', en: 'Call cancellation' },
        CALL_SLOT_BOOKING_REMINDER: { de: 'Anruf-Erinnerung', en: 'Call reminder' },
        BOOKING_REQUEST_COOK_NOTIFY: { de: 'Buchungsanfrage an Koch', en: 'Booking request to cook' },
        BOOKING_REQUEST_CREATED: { de: 'Buchungsanfrage erstellt', en: 'Booking request created' },
        BOOKING_REQUEST_UPDATED: { de: 'Buchungsanfrage geändert', en: 'Booking request updated' },
        BOOKING_REQUEST_CANCELED: { de: 'Buchungsanfrage storniert', en: 'Booking request canceled' },
        BOOKING_REQUEST_OFFER_CREATED: { de: 'Angebot erstellt', en: 'Offer created' },
        BOOKING_REQUEST_OFFER_MENU_UPDATED: { de: 'Angebotsmenü angepasst', en: 'Offer menu updated' },
        BOOKING_REQUEST_OFFER_ACCEPTED: { de: 'Angebot akzeptiert', en: 'Offer accepted' },
        BOOKING_REQUEST_OFFER_NOT_CHOSEN: { de: 'Anfrage anderweitig vergeben', en: 'Request went elsewhere' },
        BOOKING_REQUEST_OFFER_DECLINED: { de: 'Angebot abgelehnt', en: 'Offer declined' },
        BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_REQUESTED: {
            de: 'Teilnehmeränderung vorgeschlagen',
            en: 'Participant amendment requested',
        },
        BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_ACCEPTED: {
            de: 'Teilnehmeränderung angenommen',
            en: 'Participant amendment accepted',
        },
        BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_DECLINED: {
            de: 'Teilnehmeränderung abgelehnt',
            en: 'Participant amendment declined',
        },
        BOOKING_REQUEST_OFFER_PAYMENT_CONFIRMED: { de: 'Buchungsbestätigung', en: 'Booking confirmation' },
        BOOKING_REQUEST_OFFER_PULL_PAYMENT_ANNOUNCEMENT: { de: 'Zahlungseinzug angekündigt', en: 'Pull payment announced' },
        TESTIMONIAL_MEMORY_NUDGE_CUSTOMER: { de: 'Erinnerungs-Nudge (Kunde)', en: 'Memory nudge (customer)' },
        TESTIMONIAL_MEMORY_NUDGE_COOK: { de: 'Erinnerungs-Nudge (Koch)', en: 'Memory nudge (cook)' },
        TESTIMONIAL_REMINDER_MORNING_CUSTOMER: { de: 'Bewertungserinnerung morgens (Kunde)', en: 'Review reminder morning (customer)' },
        TESTIMONIAL_REMINDER_MORNING_COOK: { de: 'Bewertungserinnerung morgens (Koch)', en: 'Review reminder morning (cook)' },
        TESTIMONIAL_REMINDER_EVENING_CUSTOMER: { de: 'Bewertungserinnerung abends (Kunde)', en: 'Review reminder evening (customer)' },
        TESTIMONIAL_REMINDER_EVENING_COOK: { de: 'Bewertungserinnerung abends (Koch)', en: 'Review reminder evening (cook)' },
        SUPPORT_REQUEST_CREATED: { de: 'Support-Anfrage erstellt', en: 'Support request created' },
        SUPPORT_REQUEST_MESSAGE_FROM_ADMIN: { de: 'Support-Antwort', en: 'Support reply' },
        SUPPORT_REQUEST_RESOLVED: { de: 'Support-Anfrage gelöst', en: 'Support request resolved' },
        BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_CUSTOMER: {
            de: 'Angebots-Chat an Kunde',
            en: 'Offer chat to customer',
        },
        BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_COOK: { de: 'Angebots-Chat an Koch', en: 'Offer chat to cook' },
        COOK_APPROVED_BY_ADMIN: { de: 'Koch freigeschaltet', en: 'Cook approved' },
    }[purpose][locale];
}

function formatOutboundEmailCreatedAt(value: string, locale: Locale, timeZone: string) {
    return formatDateTime(value, { locale, timeZone, dateStyle: 'medium', timeStyle: 'short' });
}

function AdminOutboundEmailStatusBadges({
    sentAt,
    failedAt,
    openedAt,
    locale,
}: {
    sentAt: string | null;
    failedAt: string | null;
    openedAt: string | null;
    locale: Locale;
}) {
    if (!sentAt && !failedAt && !openedAt) {
        return <Badge variant="outline">{{ de: 'Ausstehend', en: 'Pending' }[locale]}</Badge>;
    }

    return (
        <div className="flex flex-wrap gap-1">
            {failedAt ? <Badge variant="destructive">{{ de: 'Fehlgeschlagen', en: 'Failed' }[locale]}</Badge> : null}
            {sentAt && !failedAt ? <Badge variant="secondary">{{ de: 'Gesendet', en: 'Sent' }[locale]}</Badge> : null}
            {openedAt ? <Badge>{{ de: 'Geöffnet', en: 'Opened' }[locale]}</Badge> : null}
        </div>
    );
}

export function adminOutboundEmailsColumns(locale: Locale, timeZone: string) {
    return columnHelper.columns([
        columnHelper.accessor('createdAt', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{{ de: 'Erstellt', en: 'Created' }[locale]}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => (
                <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                    {formatOutboundEmailCreatedAt(row.original.createdAt, locale, timeZone)}
                </span>
            ),
        }),
        columnHelper.accessor('purpose', {
            header: () => ({ de: 'Zweck', en: 'Purpose' })[locale],
            cell: ({ row }) => <Badge variant="secondary">{adminOutboundEmailPurposeLabel(row.original.purpose, locale)}</Badge>,
            enableSorting: false,
        }),
        columnHelper.accessor('toEmail', {
            header: ({ column }) => <AdminDataTableSortHeader column={column}>{{ de: 'An', en: 'To' }[locale]}</AdminDataTableSortHeader>,
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.toEmail}</span>,
        }),
        columnHelper.accessor('subject', {
            header: ({ column }) => (
                <AdminDataTableSortHeader column={column}>{{ de: 'Betreff', en: 'Subject' }[locale]}</AdminDataTableSortHeader>
            ),
            cell: ({ row }) => (
                <span className="line-clamp-2 font-medium text-foreground">{row.original.subject || row.original.outboundEmailId}</span>
            ),
        }),
        columnHelper.display({
            id: 'status',
            header: () => ({ de: 'Status', en: 'Status' })[locale],
            cell: ({ row }) => (
                <AdminOutboundEmailStatusBadges
                    sentAt={row.original.sentAt}
                    failedAt={row.original.failedAt}
                    openedAt={row.original.openedAt}
                    locale={locale}
                />
            ),
        }),
    ]);
}
