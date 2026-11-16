import { tEmail } from '../../../i18n/tEmail';
import { formatBookingEventDateFromCountry } from '../../../shared/formatBookingWhen';
import type { Locale } from '../../../shared/locale';
import { formatCallSlotDate, formatCallSlotTime } from './bookingRequestOfferCallSlotEmailFormat';
import { EmailButton, EmailLayout, EmailText } from './index';

export interface BookingRequestOfferCallSlotRequestBodyProps {
    locale: Locale;
    timeZone: string;
    webPageUrl: string;
    recipientFirstName?: string;
    senderFirstName: string;
    startAt: Date;
    whenSecondary?: string | null;
    eventDateTime: Date;
    venueCountry?: string | null;
    occasion: string;
    offerUrl: string;
}

export function BookingRequestOfferCallSlotRequestBody({
    locale,
    timeZone,
    webPageUrl,
    recipientFirstName,
    senderFirstName,
    startAt,
    whenSecondary,
    eventDateTime,
    venueCountry,
    occasion,
    offerUrl,
}: BookingRequestOfferCallSlotRequestBodyProps) {
    const callDate = formatCallSlotDate(startAt, locale, timeZone);
    const callTime = formatCallSlotTime(startAt, locale, timeZone);
    const eventDate = formatBookingEventDateFromCountry({
        instant: eventDateTime,
        locale,
        venueCountry,
        dateStyle: 'long',
        weekday: true,
    });
    const preview = tEmail(locale, 'callSlot.request.preview', { senderFirstName });
    const subject = bookingRequestOfferCallSlotRequestEmailSubject(locale);
    const intro = tEmail(locale, 'callSlot.request.intro', { senderFirstName });

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{intro}</EmailText>
            <EmailText style={{ marginBottom: '8px' }}>{tEmail(locale, 'callSlot.request.proposalHeading')}</EmailText>
            <EmailText style={{ marginBottom: '4px' }}>{callDate}</EmailText>
            <EmailText>{callTime}</EmailText>
            {whenSecondary ? <EmailText>{whenSecondary}</EmailText> : null}
            <EmailText style={{ marginBottom: '8px' }}>{tEmail(locale, 'callSlot.request.eventHeading')}</EmailText>
            <EmailText style={{ marginBottom: '4px' }}>
                {tEmail(locale, 'callSlot.request.eventDate')}: {eventDate}
            </EmailText>
            <EmailText>
                {tEmail(locale, 'callSlot.request.occasion')}: {occasion}
            </EmailText>
            <EmailButton href={offerUrl}>{tEmail(locale, 'common.ctaOffer')}</EmailButton>
        </EmailLayout>
    );
}

export function bookingRequestOfferCallSlotRequestEmailSubject(locale: Locale): string {
    return tEmail(locale, 'callSlot.request.subject');
}
