import { ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';

function Breadcrumb({ ...props }: ComponentProps<'nav'>) {
    const locale = useLocale();
    return <nav aria-label={{ de: 'Navigationspfad', en: 'Breadcrumb' }[locale]} data-slot="breadcrumb" {...props} />;
}

function BreadcrumbList({ className, ...props }: ComponentProps<'ol'>) {
    return (
        <ol
            data-slot="breadcrumb-list"
            className={cn(
                'flex min-w-0 max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain no-scrollbar scroll-fade-x text-sm whitespace-nowrap text-muted-foreground sm:gap-2.5',
                className,
            )}
            {...props}
        />
    );
}

function BreadcrumbItem({ className, ...props }: ComponentProps<'li'>) {
    return <li data-slot="breadcrumb-item" className={cn('inline-flex items-center gap-1.5', className)} {...props} />;
}

function BreadcrumbLink({
    asChild,
    className,
    ...props
}: ComponentProps<'a'> & {
    asChild?: boolean;
}) {
    const Comp = asChild ? Slot.Root : 'a';

    return (
        <Comp
            data-slot="breadcrumb-link"
            className={cn(
                'rounded-sm outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
                className,
            )}
            {...props}
        />
    );
}

function BreadcrumbPage({ className, ...props }: ComponentProps<'span'>) {
    return (
        <span
            data-slot="breadcrumb-page"
            role="link"
            aria-disabled="true"
            aria-current="page"
            className={cn('font-normal text-foreground', className)}
            {...props}
        />
    );
}

function BreadcrumbSeparator({ children, className, ...props }: ComponentProps<'li'>) {
    return (
        <li
            data-slot="breadcrumb-separator"
            role="presentation"
            aria-hidden="true"
            className={cn('[&>svg]:size-3.5', className)}
            {...props}
        >
            {children ?? <ChevronRightIcon />}
        </li>
    );
}

function BreadcrumbEllipsis({ className, ...props }: ComponentProps<'span'>) {
    const locale = useLocale();
    return (
        <span
            data-slot="breadcrumb-ellipsis"
            role="presentation"
            aria-hidden="true"
            className={cn('flex size-9 items-center justify-center', className)}
            {...props}
        >
            <MoreHorizontalIcon className="size-4" />
            <span className="sr-only">{{ de: 'Weitere', en: 'More' }[locale]}</span>
        </span>
    );
}

export { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator };
