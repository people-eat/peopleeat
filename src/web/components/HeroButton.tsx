import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../utils/cn';

export function HeroButton({
    className,
    asChild = false,
    ...props
}: ComponentProps<'button'> & {
    asChild?: boolean;
}) {
    const Comp = asChild ? Slot.Root : 'button';

    return (
        <Comp
            data-slot="hero-button"
            className={cn(
                'inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-3xl border border-foreground/40 bg-primary px-6 text-md font-semibold whitespace-nowrap text-primary-foreground transition-colors outline-none',
                'hover:bg-primary/90 active:bg-primary/80',
                'focus-visible:ring-[3px] focus-visible:ring-ring/50',
                'disabled:pointer-events-none disabled:opacity-50',
                className,
            )}
            {...props}
        />
    );
}
