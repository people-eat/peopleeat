import { useParams } from '@tanstack/react-router';
import { DEFAULT_LOCALE, isLocale } from '../utils/locale';
import type { Locale } from '../utils/locale';

export function useLocale(): Locale {
    const params: { locale?: string } = useParams({ strict: false });
    const locale = params.locale;
    if (isLocale(locale)) return locale;
    return DEFAULT_LOCALE;
}
