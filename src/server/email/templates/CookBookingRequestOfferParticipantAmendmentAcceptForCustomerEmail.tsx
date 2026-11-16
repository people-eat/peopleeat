import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';

interface Props {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    cookFirstName: string;
    offerUrl: string;
    checkoutUrl?: string;
    customerDeltaCents: number;
    giftCardDeltaCents: number;
    paymentStatus: string;
    pendingDeltaPaymentDue: boolean;
    venueDisplayText?: string | null;
}

export function CookBookingRequestOfferParticipantAmendmentAcceptForCustomerEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    cookFirstName,
    offerUrl,
    checkoutUrl,
    customerDeltaCents,
    giftCardDeltaCents,
    paymentStatus,
    pendingDeltaPaymentDue,
    venueDisplayText,
}: Props) {
    const subject = cookBookingRequestOfferParticipantAmendmentAcceptForCustomerEmailSubject(locale);

    let moneyNote = '';
    if (giftCardDeltaCents < 0) {
        moneyNote += tEmail(locale, 'offer.amendmentAccept.giftCardCredit');
    }
    if (pendingDeltaPaymentDue) {
        moneyNote += tEmail(locale, 'offer.amendmentAccept.payDifference');
    } else if (paymentStatus === 'EMPTY' && customerDeltaCents !== 0) {
        moneyNote += tEmail(locale, 'offer.amendmentAccept.checkoutUpdated');
    } else if (paymentStatus === 'SETUP' && customerDeltaCents !== 0) {
        moneyNote += tEmail(locale, 'offer.amendmentAccept.laterChargeUpdated');
    } else if (customerDeltaCents < 0) {
        moneyNote += tEmail(locale, 'offer.amendmentAccept.refund');
    } else if (customerDeltaCents > 0) {
        moneyNote += tEmail(locale, 'offer.amendmentAccept.chargeSavedMethod');
    }

    const venue = venueDisplayText?.trim();

    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'offer.amendmentAccept.preview', { cookFirstName })}
            subject={subject}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>{tEmail(locale, 'offer.amendmentAccept.body', { cookFirstName, moneyNote })}</EmailText>
            {venue ? <EmailText>{tEmail(locale, 'offer.amendmentAccept.venueNote', { venue })}</EmailText> : null}
            {checkoutUrl && (pendingDeltaPaymentDue || paymentStatus === 'EMPTY') ? (
                <EmailButton href={checkoutUrl}>{tEmail(locale, 'offer.amendmentAccept.ctaPay')}</EmailButton>
            ) : (
                <EmailButton href={offerUrl}>{tEmail(locale, 'common.ctaViewOffer')}</EmailButton>
            )}
        </EmailLayout>
    );
}

export function cookBookingRequestOfferParticipantAmendmentAcceptForCustomerEmailSubject(locale: Locale): string {
    return tEmail(locale, 'offer.amendmentAccept.subject');
}
