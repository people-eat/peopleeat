import { Link } from '@tanstack/react-router';

import { Button } from '../../components/base/button';
import { Skeleton } from '../../components/base/skeleton';
import { CookDefaultOfferMessageReadout } from '../../components/CookDefaultOfferMessageFields';
import { CookPathNameReadout } from '../../components/CookPathNameFields';
import { CookPresenceLinksReadout } from '../../components/CookPresenceLinksEditor';
import { cookProfileTagLabels, CookProfileTags } from '../../components/CookProfileTags';
import { ProfilePinnedFooterLayout } from '../../components/ProfilePinnedFooterLayout';
import type { GqlCProfileCookChefProfilePageQuery } from '../../graphql/generated';
import { ProfileCookChefProfilePageUpdatesDocument } from '../../graphql/generated';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
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
    const presenceLinksEnabled = useFeatureToggleActive('COOK_PRESENCE_LINKS');
    const pathNameEnabled = useFeatureToggleActive('COOK_PUBLIC_PROFILE_PATH_NAME');
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
                    {pathNameEnabled ? (
                        <CookPathNameReadout locale={locale} pathName={cook.pathName} previousPathNames={cook.previousPathNames} />
                    ) : null}
                </dl>
            </section>

            <section className="grid min-w-0 gap-3">
                <div className="grid gap-1">
                    <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                        {{ de: 'Begrüßungstext für Angebote', en: 'Default offer note' }[locale]}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Wird beim Erstellen eines Angebots vorausgefüllt. Gäste sehen ihn als erste Chat-Nachricht.',
                                en: 'Prefills when you create an offer. Guests see it as the first chat message.',
                            }[locale]
                        }
                    </p>
                </div>
                <CookDefaultOfferMessageReadout value={cook.defaultOfferMessage ?? null} />
            </section>

            {presenceLinksEnabled ? (
                <section className="grid min-w-0 gap-3">
                    <div className="grid gap-1">
                        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                            {{ de: 'Weitere Profile', en: 'Other profiles' }[locale]}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Nur das peopleeat-Team sieht diese Links, um dein Profil zu prüfen. Kunden sehen sie nicht.',
                                    en: 'Only the peopleeat team sees these links, to review your profile. Customers do not see them.',
                                }[locale]
                            }
                        </p>
                    </div>
                    <CookPresenceLinksReadout links={cook.presenceLinks} />
                </section>
            ) : null}
        </ProfilePinnedFooterLayout>
    );
}
