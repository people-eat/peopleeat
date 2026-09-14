import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../utils/cn';

export function HeaderButton({
    className,
    size = 'default',
    asChild = false,
    ...props
}: ComponentProps<'button'> & {
    size?: 'default' | 'icon';
    asChild?: boolean;
}) {
    const Comp = asChild ? Slot.Root : 'button';

    return (
        <Comp
            data-slot="header-button"
            className={cn(
                'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-secondary/30 text-sm font-medium text-foreground backdrop-blur-lg transition-colors outline-none',
                'hover:bg-secondary/50',
                'focus-visible:ring-[3px] focus-visible:ring-ring/50',
                'disabled:pointer-events-none disabled:opacity-50',
                "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
                size === 'default' && 'h-12 px-4',
                size === 'icon' && 'size-11',
                className,
            )}
            {...props}
        />
    );
}
