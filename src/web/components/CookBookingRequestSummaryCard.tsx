import type { ReactNode } from 'react';

import {
    bookingRequestSettingLabel,
    formatBookingEventWhen,
    formatCurrency,
    formatParticipants,
    languageTagFromLocale,
    timeZoneFromCountry,
} from '../../shared';
import type { BookingRequestSetting } from '../../shared';
import { useT } from '../hooks/useT';
import { cn } from '../utils/cn';
import type { Locale } from '../utils/locale';
import { Avatar, AvatarFallback, AvatarImage } from './base/avatar';
import { BookingRequestKitchenDetailsFactContent, bookingRequestKitchenDetailsHasFacts } from './BookingRequestVenueConditionsFacts';
import type { BookingRequestVenueKitchenDetailsFact } from './BookingRequestVenueConditionsFacts';
import { BookingWhenLabel } from './BookingWhenLabel';

export type CookBookingRequestSummaryCardParticipant = {
    bookingRequestParticipantId: string;
    type: 'ADULT' | 'DISCOUNTED' | 'CHILD';
    name: string;
    restrictions: readonly string[];
};

export type CookBookingRequestSummaryCardMessage = {
    text: string;
    userDisplay: string;
    profilePictureUrl?: string | null;
};

export type CookBookingRequestSummaryCardInvoiceAddress = {
    companyName?: string | null;
    firstName: string;
    lastName: string;
    country: string;
    city: string;
    postalCode: string;
    line1: string;
    line2?: string | null;
};

function initialsFromDisplay(display: string): string {
    const parts = display.trim().split(/\s+/u).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

function formatRelativeDays(dateTime: string, locale: Locale): string {
    const days = Math.round((new Date(dateTime).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const rtf = new Intl.RelativeTimeFormat(languageTagFromLocale(locale), { numeric: 'auto' });
    return rtf.format(days, 'day');
}

function DetailField({ label, value, hint, className }: { label: string; value: ReactNode; hint?: ReactNode; className?: string }) {
    return (
        <div className={cn('grid gap-1 self-start', className)}>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className="text-sm wrap-break-word text-foreground">
                {value}
                {hint != null ? <div className="mt-1 text-sm text-muted-foreground">{hint}</div> : null}
            </dd>
        </div>
    );
}

export function CookBookingRequestSummaryCard({
    locale,
    timeZone,
    occasion,
    dateTime,
    participants,
    preferences,
    eventLocation,
    eventLocationHint,
    estimatedTravelDistanceKm,
    estimatedTravelExpensesCents,
    invoiceAddress,
    message,
    dateTimeAction,
    setting,
    kitchenDetails,
    venueCountry,
    venueCity,
}: {
    locale: Locale;
    timeZone: string;
    occasion: string;
    dateTime: string;
    participants: readonly CookBookingRequestSummaryCardParticipant[];
    preferences: readonly string[];
    eventLocation: string;
    eventLocationHint?: string;
    estimatedTravelDistanceKm: number | null | undefined;
    estimatedTravelExpensesCents: number | null | undefined;
    invoiceAddress?: CookBookingRequestSummaryCardInvoiceAddress | null;
    message?: CookBookingRequestSummaryCardMessage | null;
    dateTimeAction?: (whenLabel: string) => ReactNode;
    setting?: BookingRequestSetting | null;
    kitchenDetails?: BookingRequestVenueKitchenDetailsFact | null;
    venueCountry?: string | null;
    venueCity?: string | null;
}) {
    const { t } = useT('profileCook');
    const hasMessage = message != null && message.text.trim().length > 0;
    const participantsWithRestrictions = participants.filter((participant) => participant.restrictions.length > 0);
    const venueTimeZone = timeZoneFromCountry(venueCountry);
    const eventWhen = formatBookingEventWhen({
        instant: dateTime,
        locale,
        viewerTimeZone: timeZone,
        venueTimeZone,
        venueCity,
    });
    const whenLabel = `${eventWhen.primary} (${formatRelativeDays(dateTime, locale)})`;
    const whenValue =
        dateTimeAction != null ? (
            <>
                {dateTimeAction(whenLabel)}
                {eventWhen.secondary != null ? <div className="mt-1 text-sm text-muted-foreground">{eventWhen.secondary}</div> : null}
            </>
        ) : (
            <BookingWhenLabel primary={whenLabel} secondary={eventWhen.secondary} />
        );
    const kitchenHasFacts = bookingRequestKitchenDetailsHasFacts(kitchenDetails, locale);

    return (
        <div
            className={cn(
                'grid gap-4 rounded-xl border border-border bg-card p-4 shadow-sm',
                hasMessage && '@xl:grid-cols-3 @xl:items-start',
            )}
        >
            <dl className={cn('grid gap-4 @md:grid-cols-2', hasMessage && '@xl:col-span-2')}>
                <DetailField label={t('m.occasion')} value={occasion} />
                <DetailField label={t('m.participants')} value={formatParticipants(participants, { locale })} />
                {participantsWithRestrictions.length > 0 ? (
                    <DetailField
                        label={t('m.restrictions')}
                        value={
                            <ul className="grid gap-1">
                                {participantsWithRestrictions.map((participant) => (
                                    <li key={participant.bookingRequestParticipantId}>
                                        <span className="font-medium">{participant.name}:</span> {participant.restrictions.join(', ')}
                                    </li>
                                ))}
                            </ul>
                        }
                    />
                ) : null}
                <DetailField label={t('m.dateTime')} value={whenValue} />
                <DetailField label={t('m.preferences')} value={preferences.length > 0 ? preferences.join(', ') : t('m.noPreferences')} />
                <DetailField label={t('m.eventLocation')} value={eventLocation} hint={eventLocationHint} />
                {kitchenHasFacts ? (
                    <DetailField
                        className={(kitchenDetails?.photos?.length ?? 0) > 0 ? '@md:col-span-2' : undefined}
                        label={t('m.aboutTheKitchen')}
                        value={<BookingRequestKitchenDetailsFactContent details={kitchenDetails} locale={locale} />}
                    />
                ) : null}
                {setting != null ? <DetailField label={t('m.whereYouDine')} value={bookingRequestSettingLabel(setting, locale)} /> : null}
                <DetailField
                    label={t('m.estimatedTravelDistance')}
                    value={estimatedTravelDistanceKm != null ? `${estimatedTravelDistanceKm.toFixed(1)} km` : '—'}
                />
                <DetailField
                    label={t('m.estimatedTravelExpenses')}
                    value={formatCurrency(estimatedTravelExpensesCents, { locale, nullAs: 'emDash' })}
                />
                {invoiceAddress != null ? (
                    <DetailField
                        label={t('m.invoiceAddress')}
                        value={
                            <div className="grid gap-0.5">
                                {invoiceAddress.companyName?.trim() ? <span>{invoiceAddress.companyName.trim()}</span> : null}
                                <span>
                                    {invoiceAddress.firstName} {invoiceAddress.lastName}
                                </span>
                                <span>{invoiceAddress.line1}</span>
                                {invoiceAddress.line2?.trim() ? <span>{invoiceAddress.line2.trim()}</span> : null}
                                <span>
                                    {invoiceAddress.postalCode} {invoiceAddress.city}
                                </span>
                                <span>{invoiceAddress.country}</span>
                            </div>
                        }
                    />
                ) : null}
            </dl>

            {hasMessage ? (
                <div className="grid min-w-0 w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-2 self-start">
                    <Avatar size="sm" className="shrink-0">
                        {message.profilePictureUrl != null ? <AvatarImage src={message.profilePictureUrl} alt="" /> : null}
                        <AvatarFallback className="bg-foreground/10 text-[10px] font-semibold text-foreground/75">
                            {initialsFromDisplay(message.userDisplay)}
                        </AvatarFallback>
                    </Avatar>
                    <article className="w-max max-w-full justify-self-start rounded-2xl rounded-bl-sm bg-muted px-4 py-2 text-sm/relaxed whitespace-pre-wrap wrap-break-word text-foreground shadow-sm">
                        <p className="mb-0.5 truncate text-[11px] leading-tight font-semibold text-primary">{message.userDisplay}</p>
                        {message.text}
                    </article>
                </div>
            ) : null}
        </div>
    );
}
