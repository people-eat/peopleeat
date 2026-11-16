import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { formatCallSlotDate, formatCallSlotTime } from './bookingRequestOfferCallSlotEmailFormat';
import { EmailButton, EmailLayout, EmailText } from './index';

export interface BookingRequestOfferCallSlotConfirmBodyProps {
    locale: Locale;
    timeZone: string;
    webPageUrl: string;
    recipientFirstName?: string;
    accepterFirstName: string;
    startAt: Date;
    whenSecondary?: string | null;
    offerUrl: string;
}

export function BookingRequestOfferCallSlotConfirmBody({
    locale,
    timeZone,
    webPageUrl,
    recipientFirstName,
    accepterFirstName,
    startAt,
    whenSecondary,
    offerUrl,
}: BookingRequestOfferCallSlotConfirmBodyProps) {
    const callDate = formatCallSlotDate(startAt, locale, timeZone);
    const callTime = formatCallSlotTime(startAt, locale, timeZone);
    const preview = tEmail(locale, 'callSlot.confirm.preview', { accepterFirstName });
    const subject = bookingRequestOfferCallSlotConfirmEmailSubject(locale);

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{tEmail(locale, 'callSlot.confirm.intro', { accepterFirstName })}</EmailText>
            <EmailText style={{ marginBottom: '4px' }}>{callDate}</EmailText>
            <EmailText>{callTime}</EmailText>
            {whenSecondary ? <EmailText>{whenSecondary}</EmailText> : null}
            <EmailText>{tEmail(locale, 'callSlot.confirm.reminderNote')}</EmailText>
            <EmailText>{tEmail(locale, 'callSlot.confirm.calendarNote')}</EmailText>
            <EmailButton href={offerUrl}>{tEmail(locale, 'common.ctaOffer')}</EmailButton>
        </EmailLayout>
    );
}

export function bookingRequestOfferCallSlotConfirmEmailSubject(locale: Locale): string {
    return tEmail(locale, 'callSlot.confirm.subject');
}
