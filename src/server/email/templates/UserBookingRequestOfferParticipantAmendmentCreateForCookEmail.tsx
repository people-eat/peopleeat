import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';

interface Props {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    customerFirstName: string;
    offerUrl: string;
}

export function UserBookingRequestOfferParticipantAmendmentCreateForCookEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    customerFirstName,
    offerUrl,
}: Props) {
    const subject = userBookingRequestOfferParticipantAmendmentCreateForCookEmailSubject(locale);

    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'offer.amendmentCreate.preview', { customerFirstName })}
            subject={subject}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>{tEmail(locale, 'offer.amendmentCreate.body', { customerFirstName })}</EmailText>
            <EmailButton href={offerUrl}>{tEmail(locale, 'offer.amendmentCreate.cta')}</EmailButton>
        </EmailLayout>
    );
}

export function userBookingRequestOfferParticipantAmendmentCreateForCookEmailSubject(locale: Locale): string {
    return tEmail(locale, 'offer.amendmentCreate.subject');
}
