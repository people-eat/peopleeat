import { Loader2Icon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';

function Spinner({ className, ...props }: ComponentProps<'svg'>) {
    const locale = useLocale();
    // Decorative usages pass `aria-hidden` which overrides this for AT; keep a
    // bilingual default so standalone status spinners are never English-only.
    const loadingLabel = { de: 'Lädt', en: 'Loading' }[locale];
    return <Loader2Icon role="status" aria-label={loadingLabel} className={cn('size-4 animate-spin', className)} {...props} />;
}

export { Spinner };
