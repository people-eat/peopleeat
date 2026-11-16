import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { formatCallSlotDate, formatCallSlotTime } from './bookingRequestOfferCallSlotEmailFormat';
import { EmailButton, EmailLayout, EmailText } from './index';

export interface BookingRequestOfferCallSlotReminderBodyProps {
    locale: Locale;
    timeZone: string;
    webPageUrl: string;
    recipientFirstName?: string;
    startAt: Date;
    whenSecondary?: string | null;
    counterpartyFirstName: string;
    offerUrl: string;
}

export function BookingRequestOfferCallSlotReminderBody({
    locale,
    timeZone,
    webPageUrl,
    recipientFirstName,
    startAt,
    whenSecondary,
    counterpartyFirstName,
    offerUrl,
}: BookingRequestOfferCallSlotReminderBodyProps) {
    const callDate = formatCallSlotDate(startAt, locale, timeZone);
    const callTime = formatCallSlotTime(startAt, locale, timeZone);
    const preview = tEmail(locale, 'callSlot.reminder.preview', { counterpartyFirstName });
    const subject = bookingRequestOfferCallSlotReminderEmailSubject(locale);

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{tEmail(locale, 'callSlot.reminder.intro', { counterpartyFirstName })}</EmailText>
            <EmailText style={{ marginBottom: '4px' }}>{callDate}</EmailText>
            <EmailText>{callTime}</EmailText>
            {whenSecondary ? <EmailText>{whenSecondary}</EmailText> : null}
            <EmailText>{tEmail(locale, 'callSlot.reminder.joinNote')}</EmailText>
            <EmailButton href={offerUrl}>{tEmail(locale, 'common.ctaOffer')}</EmailButton>
        </EmailLayout>
    );
}

export function bookingRequestOfferCallSlotReminderEmailSubject(locale: Locale): string {
    return tEmail(locale, 'callSlot.reminder.subject');
}
