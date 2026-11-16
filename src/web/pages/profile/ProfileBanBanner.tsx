import { t } from '../../../i18n/t';
import { SITE_WHATSAPP_URL } from '../../../shared/siteBranding';
import { Button } from '../../components/base/button';
import { StatusAlert } from '../../components/base/status-alert';
import { useLocale } from '../../hooks/useLocale';

export function ProfileBanBanner() {
    const locale = useLocale();

    return (
        <StatusAlert
            tone="warning"
            title={t(locale, 'profile', 'ban.title')}
            action={
                <Button asChild size="sm" variant="outline">
                    <a href={SITE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                        {t(locale, 'profile', 'ban.whatsapp')}
                    </a>
                </Button>
            }
        >
            {t(locale, 'profile', 'ban.body')}
        </StatusAlert>
    );
}
