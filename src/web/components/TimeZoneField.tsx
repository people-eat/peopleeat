import { useMemo } from 'react';

import { DEFAULT_TIME_ZONE } from '../../shared';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from './base/combobox';

const PINNED_TIME_ZONES = [
    DEFAULT_TIME_ZONE,
    'Europe/Zurich',
    'Europe/Vienna',
    'Europe/Paris',
    'Europe/London',
    'Europe/Amsterdam',
    'Europe/Madrid',
    'Europe/Rome',
    'America/New_York',
    'America/Los_Angeles',
] as const;

function supportedTimeZones(): string[] {
    try {
        const values = Intl.supportedValuesOf('timeZone');
        if (values.length > 0) {
            return values;
        }
    } catch {
        // Older runtimes without supportedValuesOf.
    }
    return [...PINNED_TIME_ZONES];
}

function timeZoneOptions(): string[] {
    const all = supportedTimeZones();
    const pinned = PINNED_TIME_ZONES.filter((zone) => all.includes(zone));
    const rest = all.filter((zone) => !pinned.includes(zone as (typeof PINNED_TIME_ZONES)[number]));
    return [...pinned, ...rest];
}

export function TimeZoneField({
    value,
    onValueChange,
    disabled = false,
    showLabel = true,
    className,
}: {
    value: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
    showLabel?: boolean;
    className?: string;
}) {
    const locale = useLocale();
    const options = useMemo(() => timeZoneOptions(), []);

    return (
        <div className={cn('grid gap-2', className)}>
            {showLabel ? (
                <label htmlFor="user-time-zone" className="text-sm font-medium text-foreground">
                    {{ de: 'Zeitzone', en: 'Time zone' }[locale]}
                </label>
            ) : null}
            <Combobox
                items={options}
                value={value}
                onValueChange={(next) => {
                    if (typeof next === 'string' && next.length > 0) {
                        onValueChange(next);
                    }
                }}
                itemToStringLabel={(item: string) => item}
                filter={(item: string, query: string) => {
                    const normalized = query.trim().toLowerCase();
                    if (!normalized) {
                        return true;
                    }
                    return item.toLowerCase().includes(normalized);
                }}
                disabled={disabled}
            >
                <ComboboxInput
                    id="user-time-zone"
                    className="w-full"
                    placeholder={{ de: 'Zeitzone suchen…', en: 'Search time zone…' }[locale]}
                    showClear={false}
                    disabled={disabled}
                />
                <ComboboxContent>
                    <ComboboxEmpty>{{ de: 'Keine Treffer.', en: 'No matches.' }[locale]}</ComboboxEmpty>
                    <ComboboxList>
                        {(item: string) => (
                            <ComboboxItem key={item} value={item}>
                                {item}
                            </ComboboxItem>
                        )}
                    </ComboboxList>
                </ComboboxContent>
            </Combobox>
            <p className="text-sm text-muted-foreground">
                {
                    {
                        de: 'Termine und Uhrzeiten werden in dieser Zeitzone angezeigt.',
                        en: 'Dates and times are shown in this time zone.',
                    }[locale]
                }
            </p>
        </div>
    );
}
