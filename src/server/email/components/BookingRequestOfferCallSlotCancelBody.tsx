import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { formatCallSlotDate, formatCallSlotTime } from './bookingRequestOfferCallSlotEmailFormat';
import { EmailButton, EmailLayout, EmailText } from './index';

export interface BookingRequestOfferCallSlotCancelBodyProps {
    locale: Locale;
    timeZone: string;
    webPageUrl: string;
    recipientFirstName?: string;
    cancelerFirstName: string;
    startAt: Date;
    whenSecondary?: string | null;
    reason?: string;
    wasConfirmed: boolean;
    offerUrl: string;
}

export function BookingRequestOfferCallSlotCancelBody({
    locale,
    timeZone,
    webPageUrl,
    recipientFirstName,
    cancelerFirstName,
    startAt,
    whenSecondary,
    reason,
    wasConfirmed,
    offerUrl,
}: BookingRequestOfferCallSlotCancelBodyProps) {
    const callDate = formatCallSlotDate(startAt, locale, timeZone);
    const callTime = formatCallSlotTime(startAt, locale, timeZone);
    const trimmedReason = reason?.trim() || undefined;
    const preview = tEmail(locale, 'callSlot.cancel.preview', { cancelerFirstName });
    const subject = bookingRequestOfferCallSlotCancelEmailSubject(locale);
    const intro = tEmail(locale, wasConfirmed ? 'callSlot.cancel.introConfirmed' : 'callSlot.cancel.introPending', {
        cancelerFirstName,
    });
    const reasonLine = trimmedReason ? tEmail(locale, 'common.reasonLine', { reason: trimmedReason }) : undefined;
    const calendarRemoval = wasConfirmed ? tEmail(locale, 'common.calendarRemovalSlot') : undefined;

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{intro}</EmailText>
            <EmailText style={{ marginBottom: '4px' }}>{callDate}</EmailText>
            <EmailText>{callTime}</EmailText>
            {whenSecondary ? <EmailText>{whenSecondary}</EmailText> : null}
            {reasonLine ? <EmailText>{reasonLine}</EmailText> : null}
            <EmailText>{tEmail(locale, 'callSlot.cancel.nextStep')}</EmailText>
            {calendarRemoval ? <EmailText>{calendarRemoval}</EmailText> : null}
            <EmailButton href={offerUrl}>{tEmail(locale, 'common.ctaOffer')}</EmailButton>
        </EmailLayout>
    );
}

export function bookingRequestOfferCallSlotCancelEmailSubject(locale: Locale): string {
    return tEmail(locale, 'callSlot.cancel.subject');
}
