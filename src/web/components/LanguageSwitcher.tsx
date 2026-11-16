import { useLocation, useNavigate } from '@tanstack/react-router';
import type { Locale } from '../../shared/locale';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';
import { cn } from '../utils/cn';
import { buildLocaleHref, CATALOG_LOCALES, setLocaleCookie } from '../utils/locale';

export function LanguageSwitcher({ locale: localeProp, onLocaleChange }: { locale?: Locale; onLocaleChange?: (locale: Locale) => void }) {
    const routeLocale = useLocale();
    const currentLocale = localeProp ?? routeLocale;
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useT('common');
    const groupLabel = t('languageSwitcher.groupLabel');

    return (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1" role="group" aria-label={groupLabel}>
            {CATALOG_LOCALES.map((locale) => (
                <button
                    key={locale}
                    type="button"
                    onClick={() => {
                        if (onLocaleChange) {
                            onLocaleChange(locale);
                            return;
                        }
                        setLocaleCookie(locale);
                        navigate({ href: buildLocaleHref(location, currentLocale, locale) });
                    }}
                    aria-current={locale === currentLocale ? 'true' : undefined}
                    className={cn(
                        'cursor-pointer whitespace-nowrap transition-colors hover:text-foreground',
                        locale === currentLocale ? 'text-foreground' : 'text-muted-foreground',
                    )}
                >
                    {t(`language.${locale}`)}
                </button>
            ))}
        </div>
    );
}
