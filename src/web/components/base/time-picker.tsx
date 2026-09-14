import type { ComponentProps } from 'react';
import { cn } from '../../utils/cn';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

const DEFAULT_HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);
const DEFAULT_MINUTE_OPTIONS = [0, 15, 30, 45];

function padTimePart(value: number): string {
    return String(value).padStart(2, '0');
}

function parseTimeValue(value: string | undefined): { hours: number; minutes: number } | undefined {
    if (!value) return undefined;
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) return undefined;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return undefined;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return undefined;
    return { hours, minutes };
}

function formatTimeValue(hours: number, minutes: number): string {
    return `${padTimePart(hours)}:${padTimePart(minutes)}`;
}

function optionsWithCurrent(options: number[], current: number | undefined): number[] {
    if (current === undefined || options.includes(current)) return options;
    return [...options, current].sort((a, b) => a - b);
}

function TimePicker({
    value,
    onValueChange,
    hourOptions = DEFAULT_HOUR_OPTIONS,
    minuteOptions = DEFAULT_MINUTE_OPTIONS,
    hourAriaLabel,
    minuteAriaLabel,
    className,
    disabled,
    id,
    'aria-labelledby': ariaLabelledBy,
    'aria-label': ariaLabel,
    'aria-required': ariaRequired,
    'aria-invalid': ariaInvalid,
}: {
    value?: string;
    onValueChange?: (time: string) => void;
    hourOptions?: number[];
    minuteOptions?: number[];
    hourAriaLabel: string;
    minuteAriaLabel: string;
    className?: string;
    disabled?: boolean;
    id?: string;
    'aria-labelledby'?: string;
    'aria-label'?: string;
    'aria-required'?: boolean | 'true' | 'false';
    'aria-invalid'?: boolean | 'true' | 'false';
}) {
    const parsed = parseTimeValue(value);
    const hours = parsed?.hours;
    const minutes = parsed?.minutes;
    const hourItems = optionsWithCurrent(hourOptions, hours);
    const minuteItems = optionsWithCurrent(minuteOptions, minutes);
    const selectValue = parsed ? formatTimeValue(parsed.hours, parsed.minutes) : undefined;

    const emit = (nextHours: number, nextMinutes: number) => {
        onValueChange?.(formatTimeValue(nextHours, nextMinutes));
    };

    const setFromNative = (raw: string) => {
        const next = parseTimeValue(raw.length === 5 ? raw : undefined);
        if (!next) return;
        emit(next.hours, next.minutes);
    };

    const setHours = (raw: string) => {
        const nextHours = Number(raw);
        if (!Number.isInteger(nextHours)) return;
        emit(nextHours, minutes ?? minuteOptions[0] ?? 0);
    };

    const setMinutes = (raw: string) => {
        const nextMinutes = Number(raw);
        if (!Number.isInteger(nextMinutes)) return;
        emit(hours ?? hourOptions[0] ?? 0, nextMinutes);
    };

    const sharedAria = {
        'aria-labelledby': ariaLabelledBy,
        'aria-label': ariaLabel,
        'aria-required': ariaRequired,
        'aria-invalid': ariaInvalid,
    } satisfies Pick<ComponentProps<'input'>, 'aria-labelledby' | 'aria-label' | 'aria-required' | 'aria-invalid'>;

    return (
        <div data-slot="time-picker" className={cn('w-full', className)}>
            <Input
                type="time"
                id={id}
                value={selectValue ?? ''}
                onChange={(event) => setFromNative(event.target.value)}
                className="w-full md:hidden"
                disabled={disabled}
                {...sharedAria}
            />
            <div className="hidden gap-2 md:flex">
                <Select value={hours === undefined ? undefined : String(hours)} onValueChange={setHours} disabled={disabled}>
                    <SelectTrigger
                        className="min-w-0 flex-1"
                        aria-label={hourAriaLabel}
                        aria-required={ariaRequired}
                        aria-invalid={ariaInvalid}
                        disabled={disabled}
                    >
                        <SelectValue placeholder="--" />
                    </SelectTrigger>
                    <SelectContent showScrollButtons={false}>
                        {hourItems.map((hour) => (
                            <SelectItem key={hour} value={String(hour)}>
                                {padTimePart(hour)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={minutes === undefined ? undefined : String(minutes)} onValueChange={setMinutes} disabled={disabled}>
                    <SelectTrigger
                        className="min-w-0 flex-1"
                        aria-label={minuteAriaLabel}
                        aria-required={ariaRequired}
                        aria-invalid={ariaInvalid}
                        disabled={disabled}
                    >
                        <SelectValue placeholder="--" />
                    </SelectTrigger>
                    <SelectContent showScrollButtons={false}>
                        {minuteItems.map((minute) => (
                            <SelectItem key={minute} value={String(minute)}>
                                {padTimePart(minute)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}

export { DEFAULT_HOUR_OPTIONS, DEFAULT_MINUTE_OPTIONS, TimePicker, formatTimeValue, parseTimeValue };
