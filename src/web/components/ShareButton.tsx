import { ShareIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { toast } from 'sonner';

import { useLocale } from '../hooks/useLocale';
import { webShareOrCopy } from '../utils/webShare';
import type { WebShareData } from '../utils/webShare';
import { Button } from './base/button';

export function ShareButton({
    title,
    text,
    url,
    size = 'sm',
    variant = 'outline',
    className,
    disabled,
    onShared,
    ...buttonProps
}: WebShareData &
    Pick<ComponentProps<typeof Button>, 'size' | 'variant' | 'className' | 'disabled'> & {
        onShared?: (method: 'share' | 'copy') => void;
    } & Omit<ComponentProps<'button'>, 'type' | 'onClick' | 'children'>) {
    const locale = useLocale();

    async function onClick() {
        try {
            const result = await webShareOrCopy({ title, text, url });
            if (result.method === 'cancelled') return;
            if (result.method === 'copy') {
                toast.success({ de: 'Link kopiert', en: 'Link copied' }[locale]);
            }
            onShared?.(result.method);
        } catch {
            toast.error({ de: 'Kopieren fehlgeschlagen', en: 'Could not copy' }[locale]);
        }
    }

    return (
        <Button
            type="button"
            variant={variant}
            size={size}
            className={className}
            disabled={disabled}
            onClick={() => void onClick()}
            {...buttonProps}
        >
            <ShareIcon className="size-4" aria-hidden />
            {{ de: 'Teilen', en: 'Share' }[locale]}
        </Button>
    );
}
