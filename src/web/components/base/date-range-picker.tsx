import type { Locale } from 'date-fns';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { cn } from '../../utils/cn';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

function rangeIsComplete(range: DateRange | undefined): range is { from: Date; to: Date } {
    return Boolean(range?.from && range.to);
}

function rangeEquals(a: DateRange | undefined, b: DateRange | undefined): boolean {
    if (!a?.from && !b?.from) return a?.to?.getTime() === b?.to?.getTime();
    if (!a?.from || !b?.from) return false;
    return a.from.getTime() === b.from.getTime() && a.to?.getTime() === b.to?.getTime();
}

function DateRangePicker({
    value,
    onValueChange,
    placeholder,
    className,
    align = 'start',
    numberOfMonths = 2,
    disabled,
    locale,
    captionLayout,
    startMonth,
    endMonth,
    id,
    'aria-labelledby': ariaLabelledBy,
    'aria-label': ariaLabel,
    'aria-required': ariaRequired,
    'aria-invalid': ariaInvalid,
}: {
    value?: DateRange;
    onValueChange?: (range: DateRange | undefined) => void;
    placeholder: string;
    className?: string;
    align?: ComponentProps<typeof PopoverContent>['align'];
    numberOfMonths?: number;
    disabled?: ComponentProps<typeof Calendar>['disabled'];
    locale?: Locale;
    captionLayout?: ComponentProps<typeof Calendar>['captionLayout'];
    startMonth?: Date;
    endMonth?: Date;
    id?: string;
    'aria-labelledby'?: string;
    'aria-label'?: string;
    'aria-required'?: boolean | 'true' | 'false';
    'aria-invalid'?: boolean | 'true' | 'false';
}) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<DateRange | undefined>(value);
    // Latest draft for close handlers without stale closures.
    const draftRef = useRef(draft);
    draftRef.current = draft;

    function handleOpenChange(nextOpen: boolean) {
        if (nextOpen) {
            setDraft(value);
            draftRef.current = value;
            setOpen(true);
            return;
        }

        // Commit only when the popover closes with a complete, changed range.
        const next = draftRef.current;
        if (rangeIsComplete(next) && !rangeEquals(next, value)) {
            onValueChange?.(next);
        } else {
            setDraft(value);
            draftRef.current = value;
        }
        setOpen(false);
    }

    const display = open ? (draft ?? value) : value;

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    data-slot="date-range-picker-trigger"
                    data-empty={!value?.from}
                    id={id}
                    className={cn(
                        'justify-start border-input bg-secondary px-2.5 font-normal data-[empty=true]:text-muted-foreground',
                        className,
                    )}
                    aria-labelledby={ariaLabelledBy}
                    aria-label={ariaLabel}
                    aria-required={ariaRequired}
                    aria-invalid={ariaInvalid}
                >
                    <CalendarIcon aria-hidden />
                    {value?.from ? (
                        value.to ? (
                            <>
                                {format(value.from, 'LLL dd, y', { locale })} - {format(value.to, 'LLL dd, y', { locale })}
                            </>
                        ) : (
                            format(value.from, 'LLL dd, y', { locale })
                        )
                    ) : (
                        <span>{placeholder}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-0"
                align={align}
                onInteractOutside={(event) => {
                    const target = event.target as HTMLElement | null;
                    if (target?.closest('[data-slot="select-content"]')) {
                        event.preventDefault();
                    }
                }}
            >
                <Calendar
                    mode="range"
                    resetOnSelect
                    defaultMonth={display?.from ?? value?.from}
                    selected={display}
                    onSelect={(range) => {
                        setDraft(range);
                        draftRef.current = range;
                        if (rangeIsComplete(range)) {
                            handleOpenChange(false);
                        }
                    }}
                    numberOfMonths={numberOfMonths}
                    disabled={disabled}
                    locale={locale}
                    captionLayout={captionLayout}
                    startMonth={startMonth}
                    endMonth={endMonth}
                />
            </PopoverContent>
        </Popover>
    );
}

export { DateRangePicker };
