import { Link } from '@tanstack/react-router';
import { ChevronRightIcon } from 'lucide-react';

import { Button } from '../../components/base/button';
import { Card, CardContent } from '../../components/base/card';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';
import { adminOverviewLinkCardChevronClassName } from './adminOverviewLinkCard';

const labelClassName = 'min-w-0 hyphens-auto break-words text-xs font-medium tracking-wide text-muted-foreground uppercase';
const valueClassName = 'font-serif text-3xl/tight font-normal tabular-nums text-foreground';
const interactiveCardClassName =
    'group relative h-auto min-h-9 w-full flex-col items-start justify-start gap-1 rounded-xl p-4 text-left whitespace-normal shadow-sm';

/**
 * When `to` is set the card is a list deep-link. Typed `Link` wrappers lose
 * route↔search correlation, so `to` / `search` are accepted loosely.
 * `attention` soft-highlights cards that need action (warning tone).
 */
export function AdminOverviewStatCard({
    label,
    value,
    displayValue,
    to,
    search,
    attention = false,
    pressed,
    onClick,
}: {
    label: string;
    value: number;
    /** When set, shown instead of raw `value` (e.g. formatted currency). */
    displayValue?: string;
    to?: string;
    search?: Record<string, unknown>;
    attention?: boolean;
    pressed?: boolean;
    onClick?: () => void;
}) {
    const locale = useLocale();
    const shown = displayValue ?? String(value);
    const ariaLabel = `${label}, ${shown}`;
    const attentionClassName = attention ? 'border-yellow-400/70 bg-yellow-50/50' : undefined;

    if (onClick) {
        return (
            <Button
                type="button"
                variant={pressed ? 'secondary' : 'outline'}
                aria-label={ariaLabel}
                aria-pressed={pressed}
                onClick={onClick}
                className={cn(interactiveCardClassName, attentionClassName)}
            >
                <span lang={locale} className={labelClassName}>
                    {label}
                </span>
                <span className={valueClassName}>{shown}</span>
            </Button>
        );
    }

    if (to != null) {
        return (
            <Button asChild variant="outline" className={cn(interactiveCardClassName, attentionClassName)}>
                <Link to={to} search={search} aria-label={ariaLabel}>
                    <span lang={locale} className={cn(labelClassName, 'pr-5')}>
                        {label}
                    </span>
                    <span className={valueClassName}>{shown}</span>
                    <ChevronRightIcon className={`absolute top-4 right-3 ${adminOverviewLinkCardChevronClassName}`} aria-hidden />
                </Link>
            </Button>
        );
    }

    return (
        <Card className={cn('min-w-0 gap-1 py-4', attentionClassName)}>
            <CardContent className="grid min-w-0 gap-1 px-4">
                <dt lang={locale} className={labelClassName}>
                    {label}
                </dt>
                <dd className={valueClassName}>{shown}</dd>
            </CardContent>
        </Card>
    );
}
