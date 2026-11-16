import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';

interface Props {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    cookFirstName: string;
    offerUrl: string;
}

export function CookBookingRequestOfferParticipantAmendmentDeclineForCustomerEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    cookFirstName,
    offerUrl,
}: Props) {
    const subject = cookBookingRequestOfferParticipantAmendmentDeclineForCustomerEmailSubject(locale);

    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'offer.amendmentDecline.preview', { cookFirstName })}
            subject={subject}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>{tEmail(locale, 'offer.amendmentDecline.body', { cookFirstName })}</EmailText>
            <EmailButton href={offerUrl}>{tEmail(locale, 'common.ctaViewOffer')}</EmailButton>
        </EmailLayout>
    );
}

export function cookBookingRequestOfferParticipantAmendmentDeclineForCustomerEmailSubject(locale: Locale): string {
    return tEmail(locale, 'offer.amendmentDecline.subject');
}
