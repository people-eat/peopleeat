import { Link } from '@tanstack/react-router';

import { useLocale } from '../hooks/useLocale';
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
                        <Badge variant="outline" title={fullLabel} className="min-w-0 max-w-[11rem] font-normal">
                            <span className="truncate">{fullLabel}</span>
                        </Badge>
                    </li>
                );
            })}
        </ul>
    );
}

function PlacementAdminLink({ placement, label }: { placement: AdminTestimonialPublicPagePlacement; label: string }) {
    switch (placement.kind) {
        case 'CITY':
            return (
                <Link
                    to="/{-$locale}/admin/cities/$cityId"
                    params={{ cityId: placement.entityId }}
                    className="text-foreground hover:underline"
                >
                    {label}
                </Link>
            );
        case 'PARTNER':
            return (
                <Link
                    to="/{-$locale}/admin/partners/$partnerId"
                    params={{ partnerId: placement.entityId }}
                    className="text-foreground hover:underline"
                >
                    {label}
                </Link>
            );
        case 'OCCASION':
            return (
                <Link
                    to="/{-$locale}/admin/occasions/$occasionId"
                    params={{ occasionId: placement.entityId }}
                    className="text-foreground hover:underline"
                >
                    {label}
                </Link>
            );
        case 'CHEF':
            return (
                <Link
                    to="/{-$locale}/admin/users/$userId"
                    params={{ userId: placement.entityId }}
                    className="text-foreground hover:underline"
                >
                    {label}
                </Link>
            );
        default:
            return <span>{label}</span>;
    }
}

/** Detail-page list with links to the admin editors (and cook user for CHEF). */
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
                <ul className="grid gap-1.5 text-sm">
                    {placements.map((placement) => {
                        const label = `${kindLabel(placement.kind, locale)}: ${placementLabel(placement, locale)}`;
                        return (
                            <li key={`${placement.kind}-${placement.entityId}`}>
                                <PlacementAdminLink placement={placement} label={label} />
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
