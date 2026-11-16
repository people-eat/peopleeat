import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from './index';

export interface BookingRequestOfferCallSlotDeclineBodyProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    declinerFirstName: string;
    reason?: string;
    offerUrl: string;
}

export function BookingRequestOfferCallSlotDeclineBody({
    locale,
    webPageUrl,
    recipientFirstName,
    declinerFirstName,
    reason,
    offerUrl,
}: BookingRequestOfferCallSlotDeclineBodyProps) {
    const trimmedReason = reason?.trim() || undefined;
    const preview = tEmail(locale, 'callSlot.decline.preview', { declinerFirstName });
    const subject = bookingRequestOfferCallSlotDeclineEmailSubject(locale);
    const reasonLine = trimmedReason ? tEmail(locale, 'common.reasonLine', { reason: trimmedReason }) : undefined;

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{tEmail(locale, 'callSlot.decline.intro', { declinerFirstName })}</EmailText>
            {reasonLine ? <EmailText>{reasonLine}</EmailText> : null}
            <EmailText>{tEmail(locale, 'callSlot.decline.nextStep')}</EmailText>
            <EmailButton href={offerUrl}>{tEmail(locale, 'common.ctaOffer')}</EmailButton>
        </EmailLayout>
    );
}

export function bookingRequestOfferCallSlotDeclineEmailSubject(locale: Locale): string {
    return tEmail(locale, 'callSlot.decline.subject');
}
