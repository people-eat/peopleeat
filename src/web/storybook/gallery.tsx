import type { ReactNode } from 'react';

import { cn } from '../utils/cn';

/** Warm page canvas so white cards / secondary fills lift off the product background. */
export function WarmPage({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('min-h-full bg-background p-6', className)}>{children}</div>;
}

export function GallerySection({
    title,
    caption,
    children,
    className,
}: {
    title: string;
    caption?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('flex flex-col gap-4', className)}>
            <div className="grid gap-1">
                <h2 className="font-serif text-lg font-semibold">{title}</h2>
                {caption ? <p className="text-sm text-muted-foreground">{caption}</p> : null}
            </div>
            {children}
        </section>
    );
}

/** Uppercase muted column label used by Perspectives role galleries. */
export function RoleColumn({
    label,
    children,
    contentClassName,
    className,
}: {
    label: string;
    children: ReactNode;
    contentClassName?: string;
    className?: string;
}) {
    return (
        <div className={cn('grid min-w-0 gap-3', className)}>
            <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{label}</h3>
            <div className={cn(contentClassName)}>{children}</div>
        </div>
    );
}

/** Same chrome as RoleColumn for non-role labels (Discovery, List, Chat, …). */
export function SurfaceColumn({
    label,
    children,
    contentClassName,
    className,
}: {
    label: string;
    children: ReactNode;
    contentClassName?: string;
    className?: string;
}) {
    return (
        <RoleColumn label={label} contentClassName={contentClassName} className={className}>
            {children}
        </RoleColumn>
    );
}
