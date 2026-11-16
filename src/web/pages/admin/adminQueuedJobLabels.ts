import { t } from '../../../i18n/t';
import type { Locale } from '../../utils/locale';

export function adminQueuedJobNameLabel(name: string, locale: Locale): string {
    const key = `queuedJobs.names.${name}`;
    const translated = t(locale, 'admin', key);
    return translated === key ? name : translated;
}

export function adminQueuedJobDescription(name: string, locale: Locale): string | null {
    const key = `queuedJobs.descriptions.${name}`;
    const translated = t(locale, 'admin', key);
    return translated === key ? null : translated;
}

export function adminQueuedJobStateLabel(state: 'CREATED' | 'RETRY' | 'ACTIVE', locale: Locale): string {
    return t(locale, 'admin', `queuedJobs.states.${state}`);
}

export function adminQueuedJobStateTone(state: 'CREATED' | 'RETRY' | 'ACTIVE'): 'info' | 'warning' {
    const tones = { CREATED: 'info', RETRY: 'warning', ACTIVE: 'warning' } as const;
    return tones[state];
}

export function adminQueuedJobDataDetail(data: unknown, locale: Locale): string | null {
    if (!data || typeof data !== 'object') return null;
    const record = data as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof record.kind === 'string') {
        const key = `queuedJobs.data.${record.kind}`;
        const translated = t(locale, 'admin', key);
        parts.push(translated === key ? record.kind : translated);
    }
    if (typeof record.audience === 'string') {
        const key = `queuedJobs.data.${record.audience}`;
        const translated = t(locale, 'admin', key);
        parts.push(translated === key ? record.audience : translated);
    }
    if (typeof record.hours === 'number') parts.push(`${record.hours}h`);
    if (typeof record.cookCallSlotBookingId === 'string') {
        parts.push(`slot ${record.cookCallSlotBookingId.slice(0, 8)}…`);
    }
    return parts.length > 0 ? parts.join(' · ') : null;
}
