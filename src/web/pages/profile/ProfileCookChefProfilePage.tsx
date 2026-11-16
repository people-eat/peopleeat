import { Link } from '@tanstack/react-router';

import { t } from '../../../i18n/t';
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
                    <Link to="/{-$locale}/profile/chef-profile/edit">{t(locale, 'profileCook', 'actions.edit')}</Link>
                </Button>
            }
        >
            <div className="grid gap-2">
                <h1 className="font-serif text-3xl/tight text-foreground">{route.title(locale)}</h1>
                <p className="text-muted-foreground">{route.description(locale)}</p>
            </div>

            <section className="grid min-w-0 gap-4">
                <dl className="grid min-w-0 gap-4">
                    <div className="grid gap-1">
                        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {t(locale, 'profileCook', 'chefProfile.cuisineAndPhilosophy')}
                        </dt>
                        <dd>
                            {hasProfileTags ? (
                                <CookProfileTags cuisineStyle={cook.cuisineStyle} cookingPhilosophy={cook.cookingPhilosophy} size="md" />
                            ) : (
                                <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'actions.notSet')}</p>
                            )}
                        </dd>
                    </div>
                    <DetailField
                        label={t(locale, 'profileCook', 'chefProfileEdit.biography')}
                        value={cook.biography.trim() ? cook.biography : t(locale, 'profileCook', 'chefProfile.noBiography')}
                    />
                    <div className="grid gap-1">
                        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {t(locale, 'profileCook', 'chefProfileEdit.summary')}
                        </dt>
                        <dd>
                            {cook.biographySummaryGenerating ? (
                                <div className="grid gap-2" aria-busy="true">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <p className="text-sm text-muted-foreground">
                                        {t(locale, 'profileCook', 'chefProfile.summaryUpdating')}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm whitespace-pre-wrap text-foreground">
                                    {cook.biographySummary.trim()
                                        ? cook.biographySummary
                                        : t(locale, 'profileCook', 'chefProfile.noSummary')}
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
                        {t(locale, 'profileCook', 'chefProfile.defaultOfferNote')}
                    </h2>
                    <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'chefProfile.defaultOfferNoteHint')}</p>
                </div>
                <CookDefaultOfferMessageReadout value={cook.defaultOfferMessage ?? null} />
            </section>

            {presenceLinksEnabled ? (
                <section className="grid min-w-0 gap-3">
                    <div className="grid gap-1">
                        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                            {t(locale, 'profileCook', 'chefProfile.otherProfiles')}
                        </h2>
                        <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'chefProfile.otherProfilesHint')}</p>
                    </div>
                    <CookPresenceLinksReadout links={cook.presenceLinks} />
                </section>
            ) : null}
        </ProfilePinnedFooterLayout>
    );
}
