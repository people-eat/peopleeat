import { Link } from '@tanstack/react-router';
import { ChevronRightIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { adminOverviewLinkCardChevronClassName, adminOverviewLinkCardClassName } from './adminOverviewLinkCard';

/**
 * Typed `Link` wrappers lose route↔search correlation. Call sites pass concrete
 * `to` / `search` / `params` the same way as inline `<Link>`; we accept them loosely here.
 */
export function AdminOverviewNavCard({
    icon: Icon,
    children,
    description,
    to,
    search,
    params,
}: {
    icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
    children: ReactNode;
    description?: ReactNode;
    to: string;
    search?: Record<string, unknown>;
    params?: Record<string, string>;
}) {
    return (
        <Link
            to={to}
            search={search}
            params={params}
            className={adminOverviewLinkCardClassName(
                description != null
                    ? 'flex h-full flex-col gap-2 px-4 py-4 text-foreground'
                    : 'flex items-center gap-3 px-4 py-3 font-medium text-foreground',
            )}
        >
            {description != null ? (
                <>
                    <span className="flex items-start justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-3 font-medium">
                            {Icon ? (
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                                    <Icon className="size-5 text-muted-foreground" aria-hidden />
                                </span>
                            ) : null}
                            <span className="min-w-0">{children}</span>
                        </span>
                        <ChevronRightIcon className={adminOverviewLinkCardChevronClassName} aria-hidden />
                    </span>
                    <span className="text-sm text-muted-foreground">{description}</span>
                </>
            ) : (
                <>
                    {Icon ? (
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Icon className="size-5 text-muted-foreground" aria-hidden />
                        </span>
                    ) : null}
                    <span className="min-w-0 flex-1">{children}</span>
                    <ChevronRightIcon className={adminOverviewLinkCardChevronClassName} aria-hidden />
                </>
            )}
        </Link>
    );
}
