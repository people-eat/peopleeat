import { Link } from '@tanstack/react-router';
import { ChevronRightIcon, SquareArrowOutUpRightIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { adminOverviewLinkCardChevronClassName, adminOverviewLinkCardClassName } from './adminOverviewLinkCard';

type AdminOverviewListCardSharedProps = {
    title: ReactNode;
    description?: ReactNode;
    meta?: ReactNode;
};

/**
 * In-app list row card. Typed `Link` wrappers lose route↔params correlation;
 * callers pass concrete `to` / `params` / `search` loosely.
 */
export function AdminOverviewListCardLink({
    title,
    description,
    meta,
    to,
    search,
    params,
}: AdminOverviewListCardSharedProps & {
    to: string;
    search?: Record<string, unknown>;
    params?: Record<string, string>;
}) {
    return (
        <Link
            to={to}
            search={search}
            params={params}
            className={adminOverviewLinkCardClassName('flex items-center gap-3 px-4 py-3 text-foreground')}
        >
            <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="flex flex-wrap items-center gap-2 font-medium">{title}</span>
                {description != null ? <span className="truncate text-sm text-muted-foreground">{description}</span> : null}
                {meta != null ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
            </span>
            <ChevronRightIcon className={adminOverviewLinkCardChevronClassName} aria-hidden />
        </Link>
    );
}

/** External list row card (opens in a new tab). */
export function AdminOverviewListCardExternal({ title, description, href }: AdminOverviewListCardSharedProps & { href: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={adminOverviewLinkCardClassName('flex items-center gap-3 px-4 py-3 font-medium text-foreground')}
        >
            <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate">{title}</span>
                {description != null ? <span className="truncate text-sm font-normal text-muted-foreground">{description}</span> : null}
            </span>
            <SquareArrowOutUpRightIcon className={adminOverviewLinkCardChevronClassName} aria-hidden />
        </a>
    );
}
