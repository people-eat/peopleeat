import { StarIcon } from 'lucide-react';
import { useState } from 'react';

import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';

/**
 * Interactive 1–5 star rating. Click the current value again to clear when
 * `allowClear` is true (admin forms). Profile capture typically passes
 * `allowClear={false}`.
 */
export function TestimonialRatingInput({
    value,
    onChange,
    allowClear = false,
    disabled = false,
    size = 'md',
    className,
}: {
    value: number | null;
    onChange: (next: number | null) => void;
    allowClear?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}) {
    const locale = useLocale();
    const [hover, setHover] = useState<number | null>(null);
    const active = hover ?? value ?? 0;
    const iconClass = size === 'lg' ? 'size-10' : size === 'sm' ? 'size-5' : 'size-7';

    function handleClick(position: number) {
        if (disabled) return;
        if (allowClear && value === position) {
            onChange(null);
            return;
        }
        onChange(position);
    }

    return (
        <div
            role="radiogroup"
            aria-label={{ de: 'Sternebewertung', en: 'Star rating' }[locale]}
            className={cn('inline-flex items-center gap-0.5', className)}
            onMouseLeave={() => setHover(null)}
        >
            {[1, 2, 3, 4, 5].map((position) => {
                const filled = position <= active;
                return (
                    <button
                        key={position}
                        type="button"
                        role="radio"
                        aria-checked={value === position}
                        aria-label={
                            {
                                de: `${position} ${position === 1 ? 'Stern' : 'Sterne'}`,
                                en: `${position} ${position === 1 ? 'star' : 'stars'}`,
                            }[locale]
                        }
                        disabled={disabled}
                        className={cn(
                            'rounded-sm p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-muted/60',
                        )}
                        onClick={() => handleClick(position)}
                        onMouseEnter={() => {
                            if (!disabled) setHover(position);
                        }}
                    >
                        <StarIcon
                            aria-hidden
                            className={cn(
                                iconClass,
                                'transition-colors',
                                filled ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent text-muted-foreground/35',
                            )}
                            strokeWidth={1.5}
                        />
                    </button>
                );
            })}
        </div>
    );
}
