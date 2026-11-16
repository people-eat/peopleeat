import { useT } from '../hooks/useT';
import { cn } from '../utils/cn';

// Shimmering "still working" label. Optional `label` overrides the default
// for chef-flavored pending copy during turns.

export function AssistantPendingStatus({ className, label }: { className?: string; label?: string }) {
    const { t } = useT('common');
    return <span className={cn('shimmer text-sm/relaxed text-muted-foreground', className)}>{label ?? t('assistant.thinking')}</span>;
}
