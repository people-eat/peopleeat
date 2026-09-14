import { SITE_WHATSAPP_URL } from '../../../shared/siteBranding';
import { Button } from '../../components/base/button';
import { StatusAlert } from '../../components/base/status-alert';
import { useLocale } from '../../hooks/useLocale';

export function ProfileBanBanner() {
    const locale = useLocale();

    return (
        <StatusAlert
            tone="warning"
            title={{ de: 'Dein Profil ist eingeschränkt.', en: 'Your profile is restricted.' }[locale]}
            action={
                <Button asChild size="sm" variant="outline">
                    <a href={SITE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                        {{ de: 'WhatsApp Support', en: 'WhatsApp support' }[locale]}
                    </a>
                </Button>
            }
        >
            {
                {
                    de: 'Du kannst dich anmelden, aber Buchungen und Angebote sind gesperrt. Melde dich bei uns, wenn du Fragen hast.',
                    en: 'You can sign in, but bookings and offers are blocked. Contact us if you have questions.',
                }[locale]
            }
        </StatusAlert>
    );
}
