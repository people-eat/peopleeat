import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';

// Shimmering "still working" label. Optional `label` overrides the default
// for chef-flavored pending copy during turns.

export function AssistantPendingStatus({ className, label }: { className?: string; label?: string }) {
    const locale = useLocale();
    return (
        <span className={cn('shimmer text-sm/relaxed text-muted-foreground', className)}>
            {label ?? { de: 'Denke nach…', en: 'Thinking…' }[locale]}
        </span>
    );
}
