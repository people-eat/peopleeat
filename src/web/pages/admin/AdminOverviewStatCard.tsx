import { Link } from '@tanstack/react-router';
import { ChevronRightIcon } from 'lucide-react';

import { Card, CardContent } from '../../components/base/card';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';
import { adminOverviewLinkCardChevronClassName, adminOverviewLinkCardClassName } from './adminOverviewLinkCard';

const labelClassName = 'min-w-0 hyphens-auto break-words text-xs font-medium tracking-wide text-muted-foreground uppercase';

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
}: {
    label: string;
    value: number;
    /** When set, shown instead of raw `value` (e.g. formatted currency). */
    displayValue?: string;
    to?: string;
    search?: Record<string, unknown>;
    attention?: boolean;
}) {
    const locale = useLocale();
    const shown = displayValue ?? String(value);
    const ariaLabel = `${label}, ${shown}`;
    const attentionClassName = attention ? 'border-yellow-400/70 bg-yellow-50/50' : undefined;

    if (to != null) {
        return (
            <Link
                to={to}
                search={search}
                aria-label={ariaLabel}
                className={adminOverviewLinkCardClassName(cn('relative grid min-w-0 gap-1 p-4', attentionClassName))}
            >
                <dt lang={locale} className={cn(labelClassName, 'pr-5')}>
                    {label}
                </dt>
                <dd className="font-serif text-3xl/tight tabular-nums text-foreground">{shown}</dd>
                <ChevronRightIcon className={`absolute top-4 right-3 ${adminOverviewLinkCardChevronClassName}`} aria-hidden />
            </Link>
        );
    }

    return (
        <Card className={cn('min-w-0 gap-1 py-4', attentionClassName)}>
            <CardContent className="grid min-w-0 gap-1 px-4">
                <dt lang={locale} className={labelClassName}>
                    {label}
                </dt>
                <dd className="font-serif text-3xl/tight tabular-nums text-foreground">{shown}</dd>
            </CardContent>
        </Card>
    );
}
