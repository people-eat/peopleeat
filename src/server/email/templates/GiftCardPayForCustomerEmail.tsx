import { formatCurrency, formatDate } from '../../../shared';
import type { Locale } from '../../../shared/locale';
import { EmailLayout, EmailText } from '../components';
import { emailStyles } from '../components/emailStyles';

interface GiftCardPayForCustomerEmailProps {
    redeemCode: string;
    balanceCents: number;
    expiresAt: Date;
    recipientName: string;
    message: string;
    locale: Locale;
    webPageUrl: string;
    buyerFirstName?: string;
}

export function GiftCardPayForCustomerEmail({
    redeemCode,
    balanceCents,
    expiresAt,
    recipientName,
    message,
    locale,
    webPageUrl,
    buyerFirstName,
}: GiftCardPayForCustomerEmailProps) {
    const amount = formatCurrency(balanceCents, { locale });
    const expiry = formatDate(expiresAt, { locale, dateStyle: 'long' });
    const recipient = recipientName.trim();

    const preview = {
        de: `Dein Gutschein über ${amount} für ${recipient} ist bereit`,
        en: `Your ${amount} gift card for ${recipient} is ready`,
    }[locale];
    const subject = giftCardPayForCustomerEmailSubject(locale);
    const intro = {
        de: `Vielen Dank für deinen Kauf. Der Gutschein über ${amount} für ${recipient} ist bis ${expiry} gültig.`,
        en: `Thank you for your purchase. The ${amount} gift card for ${recipient} is valid until ${expiry}.`,
    }[locale];
    const codeLabel = { de: 'Einlöscode', en: 'Redeem code' }[locale];
    const messageLabel = { de: 'Deine Nachricht', en: 'Your message' }[locale];
    const attachmentsNote = {
        de: 'Im Anhang findest du den druckbaren Gutschein (zum Weitergeben) und den Kaufbeleg.',
        en: 'Attached you will find the printable gift card (to share) and the purchase receipt.',
    }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={buyerFirstName}>
            <EmailText>{intro}</EmailText>
            <EmailText>{attachmentsNote}</EmailText>
            <EmailText style={{ marginBottom: '8px' }}>{codeLabel}</EmailText>
            <EmailText style={emailStyles.code}>{redeemCode}</EmailText>
            {message.trim().length > 0 ? (
                <>
                    <EmailText style={{ marginBottom: '8px' }}>{messageLabel}</EmailText>
                    <EmailText style={{ whiteSpace: 'pre-wrap' }}>{message}</EmailText>
                </>
            ) : null}
        </EmailLayout>
    );
}

export function giftCardPayForCustomerEmailSubject(locale: Locale): string {
    return { de: 'Dein peopleeat Gutschein', en: 'Your peopleeat gift card' }[locale];
}
