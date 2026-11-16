import { Loader2Icon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useT } from '../../hooks/useT';
import { cn } from '../../utils/cn';

function Spinner({ className, ...props }: ComponentProps<'svg'>) {
    const { t } = useT('common');
    // Decorative usages pass `aria-hidden` which overrides this for AT; keep a
    // catalog default so standalone status spinners are never English-only.
    const loadingLabel = t('spinner.loading');
    return <Loader2Icon role="status" aria-label={loadingLabel} className={cn('size-4 animate-spin', className)} {...props} />;
}

export { Spinner };
