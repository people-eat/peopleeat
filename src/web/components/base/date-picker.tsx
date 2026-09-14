import type { Locale } from 'date-fns';
import { format } from 'date-fns';
import { ChevronDownIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { cn } from '../../utils/cn';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

function DatePicker({
    value,
    onValueChange,
    placeholder,
    className,
    align = 'start',
    disabled,
    locale,
    captionLayout,
    defaultMonth,
    startMonth,
    endMonth,
    id,
    'aria-labelledby': ariaLabelledBy,
    'aria-label': ariaLabel,
    'aria-required': ariaRequired,
    'aria-invalid': ariaInvalid,
}: {
    value?: Date;
    onValueChange?: (date: Date | undefined) => void;
    placeholder: string;
    className?: string;
    align?: ComponentProps<typeof PopoverContent>['align'];
    disabled?: ComponentProps<typeof Calendar>['disabled'];
    locale?: Locale;
    captionLayout?: ComponentProps<typeof Calendar>['captionLayout'];
    defaultMonth?: Date;
    startMonth?: Date;
    endMonth?: Date;
    id?: string;
    'aria-labelledby'?: string;
    'aria-label'?: string;
    'aria-required'?: boolean | 'true' | 'false';
    'aria-invalid'?: boolean | 'true' | 'false';
}) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    data-slot="date-picker-trigger"
                    data-empty={!value}
                    id={id}
                    className={cn(
                        'w-[212px] justify-between border-input bg-secondary text-left font-normal data-[empty=true]:text-muted-foreground',
                        className,
                    )}
                    aria-labelledby={ariaLabelledBy}
                    aria-label={ariaLabel}
                    aria-required={ariaRequired}
                    aria-invalid={ariaInvalid}
                >
                    {value ? format(value, 'PPP', { locale }) : <span>{placeholder}</span>}
                    <ChevronDownIcon aria-hidden />
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
                    mode="single"
                    selected={value}
                    onSelect={(date) => {
                        onValueChange?.(date);
                        if (date) {
                            setOpen(false);
                        }
                    }}
                    defaultMonth={value ?? defaultMonth}
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

export { DatePicker };
