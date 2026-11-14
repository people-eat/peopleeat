import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';

interface UserBookingRequestDirectNeedsExpansionForCustomerEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    requestedCookFirstName: string;
    requestUrl: string;
}

export function UserBookingRequestDirectNeedsExpansionForCustomerEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    requestedCookFirstName,
    requestUrl,
}: UserBookingRequestDirectNeedsExpansionForCustomerEmailProps) {
    const subject = userBookingRequestDirectNeedsExpansionForCustomerEmailSubject(locale, requestedCookFirstName);
    const preview = {
        de: `${requestedCookFirstName} kann diesmal nicht. Deine Anfrage ist noch da.`,
        en: `${requestedCookFirstName} can't make it this time. Your request is still here.`,
    }[locale];
    const intro = {
        de: `${requestedCookFirstName} kann diesmal nicht. Deine Anfrage ist noch da. Hol dir Angebote von anderen Köchen in deiner Nähe.`,
        en: `${requestedCookFirstName} can't make it this time. Your request is still here. Get offers from other chefs nearby.`,
    }[locale];
    const cta = {
        de: 'Auch Angebote von anderen Köchen erhalten',
        en: 'Also get offers from other chefs',
    }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{intro}</EmailText>
            <EmailButton href={requestUrl}>{cta}</EmailButton>
        </EmailLayout>
    );
}

export function userBookingRequestDirectNeedsExpansionForCustomerEmailSubject(locale: Locale, requestedCookFirstName: string): string {
    return {
        de: `${requestedCookFirstName} kann diesmal nicht`,
        en: `${requestedCookFirstName} can't make it this time`,
    }[locale];
}
