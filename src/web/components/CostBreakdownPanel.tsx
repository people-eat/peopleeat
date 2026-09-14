import { formatCurrency } from '../../shared';
import type { Locale } from '../../shared';
import { cn } from '../utils/cn';

type CostBreakdownLineItem = {
    title: string;
    amountCents: number;
};

export type CostBreakdownPanelProps = {
    locale: Locale;
    lineItems: readonly CostBreakdownLineItem[];
    total?: CostBreakdownLineItem | null;
    footer?: string | null;
    className?: string;
};

/** Customer-facing cost tree: line items, total, optional muted footer. */
export function CostBreakdownPanel({ locale, lineItems, total, footer, className }: CostBreakdownPanelProps) {
    return (
        <div className={cn('grid gap-2 text-sm', className)}>
            {lineItems.map((line) => (
                <div key={line.title} className="flex items-baseline justify-between gap-4">
                    <span className="text-muted-foreground">{line.title}</span>
                    <span className="font-medium tabular-nums">
                        {formatCurrency(line.amountCents, { locale, maximumFractionDigits: 0 })}
                    </span>
                </div>
            ))}
            {total ? (
                <div className="flex items-baseline justify-between gap-4 border-t border-border pt-2 font-medium">
                    <span>{total.title}</span>
                    <span className="tabular-nums">{formatCurrency(total.amountCents, { locale, maximumFractionDigits: 0 })}</span>
                </div>
            ) : null}
            {footer != null && footer.length > 0 ? <p className="pt-2 text-right text-xs text-muted-foreground">{footer}</p> : null}
        </div>
    );
}
