import { Link } from '@tanstack/react-router';

import { t } from '../../../i18n/t';
import { userDisplayName } from '../../../shared';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/base/avatar';
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
import { cn } from '../../utils/cn';
import { cookNavRouteBySlug } from './cookCatalog';

const route = cookNavRouteBySlug('chef-profile');
export const profileCookChefProfilePageTitle = route.title;
export const profileCookChefProfilePageDescription = route.description;

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
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

    const displayName = userDisplayName(user);
    const profilePictureUrl = user.profilePicture?.url?.trim() || null;
    const hasPhoto = Boolean(profilePictureUrl);
    const hasBiography = cook.biography.trim().length > 0;
    const hasProfileTags = cookProfileTagLabels({ cuisineStyle: cook.cuisineStyle, cookingPhilosophy: cook.cookingPhilosophy }).length > 0;
    const readinessKey =
        !hasPhoto && !hasBiography
            ? 'chefProfile.readinessNeedsPhotoAndBio'
            : !hasPhoto
              ? 'chefProfile.readinessNeedsPhoto'
              : !hasBiography
                ? 'chefProfile.readinessNeedsBio'
                : null;

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
                <Link
                    to="/{-$locale}/profile/public"
                    search={{ tab: undefined }}
                    className="justify-self-start text-sm font-medium text-foreground underline-offset-4 hover:underline"
                >
                    {t(locale, 'profileCook', 'chefProfile.seePublicProfile')}
                </Link>
            </div>

            {readinessKey ? (
                <p className="text-sm text-muted-foreground">
                    {t(locale, 'profileCook', readinessKey)}{' '}
                    <Link to="/{-$locale}/profile" className="font-medium text-foreground underline-offset-4 hover:underline">
                        {t(locale, 'profileCook', 'chefProfile.seeSetupOnOverview')}
                    </Link>
                </p>
            ) : null}

            <section
                className="flex min-w-0 flex-wrap items-start gap-4"
                aria-label={t(locale, 'profileCook', 'chefProfile.identityLabel')}
            >
                <Avatar className={cn('size-20 shrink-0', !hasPhoto && 'border border-dashed border-border bg-transparent')}>
                    {profilePictureUrl ? <AvatarImage src={profilePictureUrl} alt="" className="object-cover" /> : null}
                    <AvatarFallback className={cn('text-lg', !hasPhoto && 'bg-transparent')}>
                        {initialsFromName(displayName)}
                    </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 gap-2 self-center">
                    <h2 className="font-serif text-2xl/tight text-foreground">{displayName}</h2>
                    {hasProfileTags ? (
                        <CookProfileTags cuisineStyle={cook.cuisineStyle} cookingPhilosophy={cook.cookingPhilosophy} size="md" />
                    ) : (
                        <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'actions.notSet')}</p>
                    )}
                    {!hasPhoto ? (
                        <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'chefProfile.photoMissingHint')}</p>
                    ) : null}
                </div>
            </section>

            {pathNameEnabled ? (
                <CookPathNameReadout locale={locale} pathName={cook.pathName} previousPathNames={cook.previousPathNames} />
            ) : null}

            <section className="grid max-w-prose min-w-0 gap-3" aria-labelledby="chef-profile-story-heading">
                <h2 id="chef-profile-story-heading" className="font-serif text-2xl/tight text-foreground">
                    {t(locale, 'profileCook', 'chefProfile.yourStory')}
                </h2>
                {hasBiography ? (
                    <p className="text-base/relaxed whitespace-pre-wrap text-foreground">{cook.biography}</p>
                ) : (
                    <p className="text-base/relaxed text-muted-foreground">{t(locale, 'profileCook', 'chefProfile.noBiography')}</p>
                )}
            </section>

            <section className="grid max-w-prose min-w-0 gap-2" aria-labelledby="chef-profile-summary-heading">
                <div className="grid gap-1">
                    <h2 id="chef-profile-summary-heading" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {t(locale, 'profileCook', 'chefProfile.summary')}
                    </h2>
                    <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'chefProfile.summaryGuestHint')}</p>
                </div>
                {cook.biographySummaryGenerating ? (
                    <div className="grid gap-2" aria-busy="true">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'chefProfile.summaryUpdating')}</p>
                    </div>
                ) : (
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                        {cook.biographySummary.trim() ? cook.biographySummary : t(locale, 'profileCook', 'chefProfile.noSummary')}
                    </p>
                )}
            </section>

            <div className="grid min-w-0 gap-8 border-t border-border pt-8">
                <div className="grid gap-1">
                    <h2 className="font-serif text-xl/tight text-foreground">{t(locale, 'profileCook', 'chefProfile.privateZoneTitle')}</h2>
                    <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'chefProfile.privateZoneHint')}</p>
                </div>

                <section className="grid min-w-0 gap-3" aria-labelledby="chef-profile-offer-note-heading">
                    <div className="grid gap-1">
                        <h3
                            id="chef-profile-offer-note-heading"
                            className="text-sm font-medium tracking-wide text-muted-foreground uppercase"
                        >
                            {t(locale, 'profileCook', 'chefProfile.defaultOfferNote')}
                        </h3>
                        <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'chefProfile.defaultOfferNoteHint')}</p>
                    </div>
                    <CookDefaultOfferMessageReadout value={cook.defaultOfferMessage ?? null} />
                </section>

                {presenceLinksEnabled ? (
                    <section className="grid min-w-0 gap-3" aria-labelledby="chef-profile-other-profiles-heading">
                        <div className="grid gap-1">
                            <h3
                                id="chef-profile-other-profiles-heading"
                                className="text-sm font-medium tracking-wide text-muted-foreground uppercase"
                            >
                                {t(locale, 'profileCook', 'chefProfile.otherProfiles')}
                            </h3>
                            <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'chefProfile.otherProfilesHint')}</p>
                        </div>
                        <CookPresenceLinksReadout links={cook.presenceLinks} />
                    </section>
                ) : null}
            </div>
        </ProfilePinnedFooterLayout>
    );
}
