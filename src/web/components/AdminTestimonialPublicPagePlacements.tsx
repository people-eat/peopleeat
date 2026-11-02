import { Link } from '@tanstack/react-router';
import { ChevronRightIcon } from 'lucide-react';

import { useLocale } from '../hooks/useLocale';
import { adminOverviewLinkCardChevronClassName, adminOverviewLinkCardClassName } from '../pages/admin/adminOverviewLinkCard';
import { cn } from '../utils/cn';
import { Badge } from './base/badge';

export type AdminTestimonialPublicPagePlacement = {
    kind: 'CITY' | 'PARTNER' | 'OCCASION' | 'CHEF' | string;
    entityId: string;
    labelDe: string;
    labelEn: string;
    pathName?: string | null;
    index?: number | null;
};

function kindLabel(kind: string, locale: 'de' | 'en'): string {
    return ({
        CITY: { de: 'Stadt', en: 'City' },
        PARTNER: { de: 'Partner', en: 'Partner' },
        OCCASION: { de: 'Anlass', en: 'Occasion' },
        CHEF: { de: 'Kochprofil', en: 'Chef profile' },
    }[kind] ?? { de: kind, en: kind })[locale];
}

function placementLabel(placement: AdminTestimonialPublicPagePlacement, locale: 'de' | 'en'): string {
    return locale === 'de' ? placement.labelDe : placement.labelEn || placement.labelDe;
}

function placementAdminRoute(placement: AdminTestimonialPublicPagePlacement): { to: string; params: Record<string, string> } | null {
    switch (placement.kind) {
        case 'CITY':
            return { to: '/{-$locale}/admin/cities/$cityId', params: { cityId: placement.entityId } };
        case 'PARTNER':
            return { to: '/{-$locale}/admin/partners/$partnerId', params: { partnerId: placement.entityId } };
        case 'OCCASION':
            return { to: '/{-$locale}/admin/occasions/$occasionId', params: { occasionId: placement.entityId } };
        case 'CHEF':
            return { to: '/{-$locale}/admin/users/$userId', params: { userId: placement.entityId } };
        default:
            return null;
    }
}

/** Compact chips for list cards (non-interactive inside a surrounding Link). */
export function AdminTestimonialPublicPagePlacementBadges({
    placements,
    className,
}: {
    placements: ReadonlyArray<AdminTestimonialPublicPagePlacement>;
    className?: string;
}) {
    const locale = useLocale();
    if (placements.length === 0) return null;

    // `contents` lets chips sit on the same single-line row as sibling badges.
    return (
        <ul className={cn('contents', className)} aria-label={{ de: 'Öffentliche Seiten', en: 'Public pages' }[locale]}>
            {placements.map((placement) => {
                const fullLabel = `${kindLabel(placement.kind, locale)}: ${placementLabel(placement, locale)}`;
                return (
                    <li key={`${placement.kind}-${placement.entityId}`} className="contents">
                        <Badge variant="outline" title={fullLabel} className="min-w-0 max-w-44 font-normal">
                            <span className="truncate">{fullLabel}</span>
                        </Badge>
                    </li>
                );
            })}
        </ul>
    );
}

function PlacementAdminCard({ placement }: { placement: AdminTestimonialPublicPagePlacement }) {
    const locale = useLocale();
    const route = placementAdminRoute(placement);
    const title = placementLabel(placement, locale);
    const description = kindLabel(placement.kind, locale);
    const meta = placement.pathName
        ? `/${placement.pathName}`
        : placement.index != null
          ? { de: `Position ${placement.index + 1}`, en: `Position ${placement.index + 1}` }[locale]
          : null;

    const body = (
        <>
            <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="flex flex-wrap items-center gap-2 font-medium">{title}</span>
                <span className="truncate text-sm text-muted-foreground">{description}</span>
                {meta != null ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
            </span>
            {route ? <ChevronRightIcon className={adminOverviewLinkCardChevronClassName} aria-hidden /> : null}
        </>
    );

    if (!route) {
        return <div className={adminOverviewLinkCardClassName('flex items-center gap-3 px-4 py-3 text-foreground')}>{body}</div>;
    }

    return (
        <Link
            to={route.to}
            params={route.params}
            className={adminOverviewLinkCardClassName('flex items-center gap-3 px-4 py-3 text-foreground')}
        >
            {body}
        </Link>
    );
}

/** Detail-page cards linking to the admin editors (and cook user for CHEF). */
export function AdminTestimonialPublicPagePlacementsSection({
    placements,
}: {
    placements: ReadonlyArray<AdminTestimonialPublicPagePlacement>;
}) {
    const locale = useLocale();

    return (
        <div className="grid gap-2">
            <h2 className="text-sm font-medium text-foreground">{{ de: 'Öffentliche Seiten', en: 'Public pages' }[locale]}</h2>
            {placements.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {{ de: 'Noch auf keiner öffentlichen Seite verwendet.', en: 'Not used on any public page yet.' }[locale]}
                </p>
            ) : (
                <ul className="grid gap-2">
                    {placements.map((placement) => (
                        <li key={`${placement.kind}-${placement.entityId}`}>
                            <PlacementAdminCard placement={placement} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
