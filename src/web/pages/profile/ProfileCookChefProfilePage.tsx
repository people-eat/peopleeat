import { Link } from '@tanstack/react-router';

import { Button } from '../../components/base/button';
import { Skeleton } from '../../components/base/skeleton';
import { cookProfileTagLabels, CookProfileTags } from '../../components/CookProfileTags';
import { ProfilePinnedFooterLayout } from '../../components/ProfilePinnedFooterLayout';
import type { GqlCProfileCookChefProfilePageQuery } from '../../graphql/generated';
import { ProfileCookChefProfilePageUpdatesDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { cookNavRouteBySlug } from './cookCatalog';

const route = cookNavRouteBySlug('chef-profile');
export const profileCookChefProfilePageTitle = route.title;
export const profileCookChefProfilePageDescription = route.description;

function DetailField({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className="text-sm whitespace-pre-wrap text-foreground">{value}</dd>
        </div>
    );
}

export function ProfileCookChefProfilePage({ data }: { data: GqlCProfileCookChefProfilePageQuery }) {
    const locale = useLocale();
    const seedUser = data.currentSession.user ?? null;
    const user = useUserUpdatesSeed(seedUser, ProfileCookChefProfilePageUpdatesDocument);
    const cook = user?.cook ?? null;

    if (!user || !cook) {
        return null;
    }

    const hasProfileTags = cookProfileTagLabels({ cuisineStyle: cook.cuisineStyle, cookingPhilosophy: cook.cookingPhilosophy }).length > 0;

    return (
        <ProfilePinnedFooterLayout
            contentClassName="grid min-w-0 content-start gap-8"
            footer={
                <Button asChild>
                    <Link to="/{-$locale}/profile/chef-profile/edit">{{ de: 'Bearbeiten', en: 'Edit' }[locale]}</Link>
                </Button>
            }
        >
            <div className="grid gap-2">
                <h1 className="font-serif text-3xl/tight text-foreground">{route.title[locale]}</h1>
                <p className="text-muted-foreground">{route.description[locale]}</p>
            </div>

            <section className="grid min-w-0 gap-4">
                <dl className="grid min-w-0 gap-4">
                    <div className="grid gap-1">
                        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {{ de: 'Küchenstil und Philosophie', en: 'Cuisine style and philosophy' }[locale]}
                        </dt>
                        <dd>
                            {hasProfileTags ? (
                                <CookProfileTags cuisineStyle={cook.cuisineStyle} cookingPhilosophy={cook.cookingPhilosophy} size="md" />
                            ) : (
                                <p className="text-sm text-muted-foreground">{{ de: 'Nicht angegeben', en: 'Not set' }[locale]}</p>
                            )}
                        </dd>
                    </div>
                    <DetailField
                        label={{ de: 'Biografie', en: 'Biography' }[locale]}
                        value={cook.biography.trim() ? cook.biography : { de: 'Noch keine Biografie.', en: 'No biography yet.' }[locale]}
                    />
                    <div className="grid gap-1">
                        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {{ de: 'Biografie-Kurzfassung', en: 'Biography summary' }[locale]}
                        </dt>
                        <dd>
                            {cook.biographySummaryGenerating ? (
                                <div className="grid gap-2" aria-busy="true">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <p className="text-sm text-muted-foreground">
                                        {{ de: 'Kurzfassung wird aktualisiert…', en: 'Updating summary…' }[locale]}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm whitespace-pre-wrap text-foreground">
                                    {cook.biographySummary.trim()
                                        ? cook.biographySummary
                                        : { de: 'Noch keine Kurzfassung vorhanden.', en: 'No summary yet.' }[locale]}
                                </p>
                            )}
                        </dd>
                    </div>
                </dl>
            </section>
        </ProfilePinnedFooterLayout>
    );
}
