import { de as deLocale, enUS as enLocale, fr as frLocale, it as itLocale, ru as ruLocale } from 'date-fns/locale';
import type { CatalogLocale } from './locale';

// Maps our two-letter site locale onto the matching `date-fns` locale object
// used by `format()`, `formatDistanceToNow()`, and `react-day-picker`'s
// `Calendar` (via the base `DatePicker` / `DateRangePicker`).
export const DATE_FNS_LOCALE: Record<CatalogLocale, typeof deLocale> = {
    de: deLocale,
    en: enLocale,
    fr: frLocale,
    it: itLocale,
    ru: ruLocale,
};
