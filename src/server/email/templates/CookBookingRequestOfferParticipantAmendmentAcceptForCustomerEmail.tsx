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
}: Props) {
    const subject = cookBookingRequestOfferParticipantAmendmentAcceptForCustomerEmailSubject(locale);
    const preview = {
        de: `${cookFirstName} hat die Änderung angenommen`,
        en: `${cookFirstName} accepted the change`,
    }[locale];

    let moneyNote = '';
    if (giftCardDeltaCents < 0) {
        moneyNote += {
            de: ' Ungenutztes Guthaben wurde auf deine Geschenkkarte zurückgebucht.',
            en: ' Unused credit was restored to your gift card.',
        }[locale];
    }
    if (pendingDeltaPaymentDue) {
        moneyNote += {
            de: ' Bitte schließe die Differenzzahlung im Checkout ab.',
            en: ' Please complete the difference payment in checkout.',
        }[locale];
    } else if (paymentStatus === 'EMPTY' && customerDeltaCents !== 0) {
        moneyNote += {
            de: ' Dein Checkout wurde aktualisiert. Bitte schließe die Zahlung ab.',
            en: ' Your checkout was updated. Please complete payment.',
        }[locale];
    } else if (paymentStatus === 'SETUP' && customerDeltaCents !== 0) {
        moneyNote += {
            de: ' Der Betrag für die spätere Kartenzahlung wurde angepasst.',
            en: ' The amount for the later card charge was updated.',
        }[locale];
    } else if (customerDeltaCents < 0) {
        moneyNote += {
            de: ' Die Differenz wird dir erstattet.',
            en: ' The difference will be refunded to you.',
        }[locale];
    } else if (customerDeltaCents > 0) {
        moneyNote += {
            de: ' Die Differenz wird über deine hinterlegte Zahlungsmethode nachträglich belastet.',
            en: ' The difference will be charged to your saved payment method.',
        }[locale];
    }

    const body = {
        de: `${cookFirstName} hat deine Buchungsänderung angenommen.${moneyNote} Du findest die aktualisierten Details in deinem Angebot.`,
        en: `${cookFirstName} accepted your booking change.${moneyNote} You can see the updated details on your offer.`,
    }[locale];
    const ctaOffer = { de: 'Angebot ansehen', en: 'View offer' }[locale];
    const ctaPay = { de: 'Jetzt zahlen', en: 'Pay now' }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{body}</EmailText>
            {checkoutUrl && (pendingDeltaPaymentDue || paymentStatus === 'EMPTY') ? (
                <EmailButton href={checkoutUrl}>{ctaPay}</EmailButton>
            ) : (
                <EmailButton href={offerUrl}>{ctaOffer}</EmailButton>
            )}
        </EmailLayout>
    );
}

export function cookBookingRequestOfferParticipantAmendmentAcceptForCustomerEmailSubject(locale: Locale): string {
    return { de: 'Buchungsänderung angenommen', en: 'Booking change accepted' }[locale];
}
