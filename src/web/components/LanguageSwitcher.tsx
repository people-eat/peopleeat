import { useLocation, useNavigate } from '@tanstack/react-router';
import { Fragment } from 'react';
import type { Locale } from '../../shared/locale';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { buildLocalePath, LOCALES, setLocaleCookie } from '../utils/locale';

const LOCALE_LABEL = { de: 'Deutsch', en: 'English' } as const;

export function LanguageSwitcher({ locale: localeProp, onLocaleChange }: { locale?: Locale; onLocaleChange?: (locale: Locale) => void }) {
    const routeLocale = useLocale();
    const currentLocale = localeProp ?? routeLocale;
    const location = useLocation();
    const navigate = useNavigate();
    const groupLabel = { de: 'Sprache wählen', en: 'Choose language' }[currentLocale];

    return (
        <div className="flex items-center gap-2" role="group" aria-label={groupLabel}>
            {LOCALES.map((locale, index) => (
                <Fragment key={locale}>
                    {index > 0 ? (
                        <span className="text-muted-foreground/40" aria-hidden>
                            |
                        </span>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => {
                            if (onLocaleChange) {
                                onLocaleChange(locale);
                                return;
                            }
                            setLocaleCookie(locale);
                            navigate({ to: buildLocalePath(location.pathname, currentLocale, locale) });
                        }}
                        aria-current={locale === currentLocale ? 'true' : undefined}
                        className={cn(
                            'cursor-pointer transition-colors hover:text-foreground',
                            locale === currentLocale ? 'text-foreground' : 'text-muted-foreground',
                        )}
                    >
                        {LOCALE_LABEL[locale]}
                    </button>
                </Fragment>
            ))}
        </div>
    );
}
