import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';

interface AdminCookApprovalUpdateForCookEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    profileUrl: string;
}

export function AdminCookApprovalUpdateForCookEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    profileUrl,
}: AdminCookApprovalUpdateForCookEmailProps) {
    const subject = adminCookApprovalUpdateForCookEmailSubject(locale);
    const preview = {
        de: 'Dein Koch-Profil ist freigeschaltet. Als Nächstes: Wallet und Sichtbarkeit',
        en: 'Your chef profile is approved. Next up: wallet and visibility',
    }[locale];
    const intro = {
        de: 'Gute Neuigkeiten: Dein Koch-Profil wurde von unserem Team freigeschaltet. Du kannst jetzt dein Wallet einrichten und dich für Kunden sichtbar machen.',
        en: 'Good news: our team approved your chef profile. You can now set up your wallet and make yourself visible to customers.',
    }[locale];
    const nudge = {
        de: 'Öffne dein Profil, um den nächsten Schritt zu sehen.',
        en: 'Open your profile to see the next step.',
    }[locale];
    const cta = { de: 'Zum Profil', en: 'Go to profile' }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{intro}</EmailText>
            <EmailText>{nudge}</EmailText>
            <EmailButton href={profileUrl}>{cta}</EmailButton>
        </EmailLayout>
    );
}

export function adminCookApprovalUpdateForCookEmailSubject(locale: Locale): string {
    return {
        de: 'Dein Koch-Profil wurde freigeschaltet',
        en: 'Your chef profile was approved',
    }[locale];
}
