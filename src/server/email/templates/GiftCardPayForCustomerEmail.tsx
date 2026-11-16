import { tEmail } from '../../../i18n/tEmail';
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
    const subject = giftCardPayForCustomerEmailSubject(locale);

    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'giftCard.pay.preview', { amount, recipient })}
            subject={subject}
            recipientFirstName={buyerFirstName}
        >
            <EmailText>{tEmail(locale, 'giftCard.pay.body', { amount, recipient, expiry })}</EmailText>
            <EmailText>{tEmail(locale, 'giftCard.pay.attachments')}</EmailText>
            <EmailText style={{ marginBottom: '8px' }}>{tEmail(locale, 'giftCard.pay.redeemCode')}</EmailText>
            <EmailText style={emailStyles.code}>{redeemCode}</EmailText>
            {message.trim().length > 0 ? (
                <>
                    <EmailText style={{ marginBottom: '8px' }}>{tEmail(locale, 'giftCard.pay.message')}</EmailText>
                    <EmailText style={{ whiteSpace: 'pre-wrap' }}>{message}</EmailText>
                </>
            ) : null}
        </EmailLayout>
    );
}

export function giftCardPayForCustomerEmailSubject(locale: Locale): string {
    return tEmail(locale, 'giftCard.pay.subject');
}
