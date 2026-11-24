import { Link } from '@tanstack/react-router';
import { CheckIcon, CopyIcon, ExternalLinkIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

import { t } from '../../../i18n/t';
import { cookMenuIsPublicCatalogEligible } from '../../../shared';
import { cookDefaultOfferMessageModeFrom } from '../../../shared/cookDefaultOfferMessage';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/base/avatar';
import { Button } from '../../components/base/button';
import { StatusAlert } from '../../components/base/status-alert';
import { StatusBadge } from '../../components/base/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/base/tabs';
import { ChefPagePreviewFrame } from '../../components/ChefPagePreviewFrame';
import type { ChefProfileViewModel } from '../../components/ChefProfileView';
import { ChefProfileView } from '../../components/ChefProfileView';
import { CookProfileTags } from '../../components/CookProfileTags';
import { Footer } from '../../components/Footer';
import { Header } from '../../components/Header';
import { ProfilePinnedFooterLayout } from '../../components/ProfilePinnedFooterLayout';
import { PublicCookCard } from '../../components/PublicCookCard';
import { ShareButton } from '../../components/ShareButton';
import type { GqlCProfileCookChefProfilePageQuery } from '../../graphql/generated';
import { ProfileCookChefProfilePageUpdatesDocument } from '../../graphql/generated';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import type { Locale } from '../../utils/locale';
import { DEFAULT_LOCALE } from '../../utils/locale';
import { publicChefUrl } from '../../utils/webShare';
import { cookNavRouteBySlug } from './cookCatalog';

const route = cookNavRouteBySlug('chef-profile');
export const profileCookChefProfilePageTitle = route.title;
export const profileCookChefProfilePageDescription = route.description;

const CHEF_PROFILE_TABS = ['overview', 'card', 'page'] as const;

export type ProfileCookChefProfileTab = (typeof CHEF_PROFILE_TABS)[number];

export type ProfileCookChefProfileSearch = {
    tab?: Exclude<ProfileCookChefProfileTab, 'overview'>;
};

function isChefProfileTab(value: unknown): value is ProfileCookChefProfileTab {
    return typeof value === 'string' && (CHEF_PROFILE_TABS as readonly string[]).includes(value);
}

export function parseProfileCookChefProfileSearch(search: Record<string, unknown>): ProfileCookChefProfileSearch {
    const raw = search.tab === 'preview' ? 'page' : search.tab === 'manage' ? 'overview' : search.tab;
    if (!isChefProfileTab(raw) || raw === 'overview') {
        return {};
    }
    return { tab: raw };
}

function resolveChefProfileTab(search: ProfileCookChefProfileSearch): ProfileCookChefProfileTab {
    return search.tab ?? 'overview';
}

function chefProfileTabSearch(id: ProfileCookChefProfileTab): ProfileCookChefProfileSearch {
    return id === 'overview' ? {} : { tab: id };
}

function chefGuestDisplayName(stageName: string | null | undefined, firstName: string): string {
    const staged = stageName?.trim() ?? '';
    return staged.length > 0 ? staged : firstName;
}

function chefPagePath(pathName: string, locale: Locale): string {
    const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
    return `${prefix}/chefs/${pathName}`;
}

function initialsFromDisplay(display: string): string {
    const parts = display.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

const fieldLinkClassName = 'font-medium text-foreground underline-offset-4 hover:underline';

function DetailField({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="grid content-start gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className="text-sm whitespace-pre-wrap text-foreground">{value}</dd>
        </div>
    );
}

export function ProfileCookChefProfilePage({
    data,
    search,
}: {
    data: GqlCProfileCookChefProfilePageQuery;
    search: ProfileCookChefProfileSearch;
}) {
    const locale = useLocale();
    const shareEnabled = useFeatureToggleActive('COOK_PUBLIC_PROFILE_SHARE');
    const menusEnabled = useFeatureToggleActive('COOK_PUBLIC_PROFILE_MENUS');
    const mealPublicationEnabled = useFeatureToggleActive('PUBLICATION_MEALS');
    const menuPublicationEnabled = useFeatureToggleActive('PUBLICATION_MENUS');
    const cookDirectEnabled = useFeatureToggleActive('BOOKING_REQUEST_COOK_DIRECT');
    const seedUser = data.currentSession.user ?? null;
    const user = useUserUpdatesSeed(seedUser, ProfileCookChefProfilePageUpdatesDocument);
    const [copied, setCopied] = useState(false);
    const tab = resolveChefProfileTab(search);

    const cook = user?.cook ?? null;
    if (!user || !cook) {
        return null;
    }

    const isLive = cook.isVisible && cook.isApprovedByAdmin;
    const pathName = cook.pathName;
    const displayName = chefGuestDisplayName(cook.stageName, user.firstName);
    const hasPhoto = Boolean(user.profilePicture?.url?.trim());
    const hasBiography = cook.biography.trim().length > 0;
    const publishedMeals = cook.meals.filter((meal) => meal.publishedAt != null);
    const publicCatalogMeals = publishedMeals.filter((meal) => meal.imageUrl != null && meal.imageUrl.length > 0);
    const publishedWithoutImageCount = publishedMeals.length - publicCatalogMeals.length;
    const publishedMenus = cook.menus.filter((menu) => menu.publishedAt != null);
    const publicCatalogMenus = publishedMenus.filter((menu) =>
        cookMenuIsPublicCatalogEligible({
            courses: menu.courses.map((course) => ({ title: course.title, mealOptionCount: course.mealOptions.length })),
            courseMealOptionImages: menu.courseMealOptionImages,
        }),
    );
    const publishedMenusNotCatalogCount = publishedMenus.length - publicCatalogMenus.length;
    const readinessKey =
        !hasPhoto && !hasBiography
            ? 'chefProfile.readinessNeedsPhotoAndBio'
            : !hasPhoto
              ? 'chefProfile.readinessNeedsPhoto'
              : !hasBiography
                ? 'chefProfile.readinessNeedsBio'
                : null;
    const view: ChefProfileViewModel = {
        displayName,
        profilePictureUrl: user.profilePicture?.url ?? null,
        city: cook.exactTravelOriginAddress?.city ?? null,
        cuisineStyle: cook.cuisineStyle,
        cookingPhilosophy: cook.cookingPhilosophy,
        biography: cook.biography,
        biographySummary: cook.biographySummary,
        logoUrl: cook.logo?.url ?? null,
        rating: cook.rating,
        meals: publicCatalogMeals.map((meal) => ({
            mealId: meal.mealId,
            title: meal.title,
            description: meal.description,
            imageUrl: meal.imageUrl,
        })),
        menus: menusEnabled
            ? publicCatalogMenus.map((menu) => ({
                  menuId: menu.menuId,
                  title: menu.title,
                  description: menu.description,
                  courseMealOptionImages: menu.courseMealOptionImages,
                  courses: menu.courses.map((course) => ({
                      title: course.title,
                      mealOptions: course.mealOptions.map((meal) => ({
                          mealId: meal.mealId,
                          title: meal.title,
                          description: meal.description,
                          imageUrl: meal.imageUrl,
                      })),
                  })),
              }))
            : [],
    };
    const exclusiveRequest =
        cookDirectEnabled && cook.canCreateOffers && cook.exactTravelOriginAddress != null ? { cookId: cook.cookId } : undefined;
    const status = isLive
        ? { tone: 'success' as const, label: t(locale, 'profileCook', 'chefProfile.live') }
        : cook.isVisible && !cook.isApprovedByAdmin
          ? { tone: 'info' as const, label: t(locale, 'profileCook', 'chefProfile.pendingApproval') }
          : { tone: 'warning' as const, label: t(locale, 'profileCook', 'chefProfile.hidden') };
    const notSet = t(locale, 'profileCook', 'actions.notSet');
    const offerNoteMode = cookDefaultOfferMessageModeFrom(cook.defaultOfferMessage);
    const offerNoteValue =
        offerNoteMode === 'custom'
            ? (cook.defaultOfferMessage ?? '')
            : offerNoteMode === 'empty'
              ? t(locale, 'profileCook', 'defaultOfferMessage.emptyReadout')
              : t(locale, 'profileCook', 'defaultOfferMessage.notSet');
    const biographySummary = cook.biographySummary.trim();

    async function copyPublicLink() {
        try {
            await navigator.clipboard.writeText(publicChefUrl(pathName, locale));
            setCopied(true);
            toast.success(t(locale, 'profileCook', 'public.linkCopied'));
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error(t(locale, 'profileCook', 'public.copyFailed'));
        }
    }

    return (
        <ProfilePinnedFooterLayout
            contentScroll={false}
            scrollerClassName="pt-0"
            contentClassName="flex h-full min-h-0 flex-col"
            footer={
                <Button asChild>
                    <Link to="/{-$locale}/profile/chef-profile/edit">{t(locale, 'profileCook', 'actions.edit')}</Link>
                </Button>
            }
        >
            <h1 className="sr-only">{route.title(locale)}</h1>

            <Tabs value={tab} className="flex min-h-0 flex-1 flex-col gap-0">
                <div className="px-4">
                    <TabsList variant="line" className="shrink-0" aria-label={t(locale, 'profileCook', 'chefProfile.tabsAria')}>
                        {CHEF_PROFILE_TABS.map((id) => (
                            <TabsTrigger key={id} value={id} asChild>
                                <Link to="/{-$locale}/profile/chef-profile" search={chefProfileTabSearch(id)} replace>
                                    {t(locale, 'profileCook', `chefProfile.tabs.${id}`)}
                                </Link>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent
                    value="overview"
                    className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10 scrollbar-gutter-stable"
                >
                    <div className="grid min-w-0 content-start gap-8">
                        <div className="grid min-w-0 content-start gap-4">
                            <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'chefProfile.pageHint')}</p>
                            {isLive ? null : (
                                <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'public.previewNotPublic')}</p>
                            )}
                        </div>

                        {readinessKey ? (
                            <StatusAlert tone="warning" title={t(locale, 'profileCook', readinessKey)}>
                                <Link to="/{-$locale}/profile" className="font-medium text-foreground underline-offset-4 hover:underline">
                                    {t(locale, 'profileCook', 'chefProfile.seeSetupOnOverview')}
                                </Link>
                            </StatusAlert>
                        ) : null}
                        {mealPublicationEnabled && publishedWithoutImageCount > 0 ? (
                            <StatusAlert
                                tone="warning"
                                title={t(locale, 'profileCook', 'meals.withoutPictureTitle', { count: publishedWithoutImageCount })}
                                action={
                                    <Button asChild size="sm" variant="outline">
                                        <Link to="/{-$locale}/profile/meals">{t(locale, 'profileCook', 'public.goToMeals')}</Link>
                                    </Button>
                                }
                            >
                                {t(locale, 'profileCook', 'public.mealsWithoutPicture')}
                            </StatusAlert>
                        ) : null}
                        {menuPublicationEnabled && menusEnabled && publishedMenusNotCatalogCount > 0 ? (
                            <StatusAlert
                                tone="warning"
                                title={t(locale, 'profileCook', 'public.menusWithoutPictureTitle', {
                                    count: publishedMenusNotCatalogCount,
                                })}
                                action={
                                    <Button asChild size="sm" variant="outline">
                                        <Link to="/{-$locale}/profile/menus">{t(locale, 'profileCook', 'public.goToMenus')}</Link>
                                    </Button>
                                }
                            >
                                {t(locale, 'profileCook', 'public.menusIncomplete')}
                            </StatusAlert>
                        ) : null}

                        <section className="grid min-w-0 gap-4">
                            <div className="grid min-w-0 gap-1">
                                <h2 className="font-serif text-xl/tight text-foreground">
                                    {t(locale, 'profileCook', 'chefProfileEdit.guestZoneTitle')}
                                </h2>
                                <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'chefProfileEdit.guestZoneHint')}</p>
                            </div>
                            <div className="flex min-w-0 items-center gap-3">
                                <Link
                                    to="/{-$locale}/profile/chef-profile/edit"
                                    className="shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                                >
                                    <Avatar size="lg" className="size-16">
                                        {user.profilePicture?.url ? (
                                            <AvatarImage src={user.profilePicture.url} alt="" className="object-cover" />
                                        ) : null}
                                        <AvatarFallback className="text-lg">{initialsFromDisplay(displayName)}</AvatarFallback>
                                    </Avatar>
                                </Link>
                                <div className="grid min-w-0 gap-2">
                                    <div className="grid min-w-0 gap-1">
                                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            {t(locale, 'profileCook', 'chefProfile.guestName')}
                                        </p>
                                        <p className="text-lg font-medium text-foreground">{displayName}</p>
                                    </div>
                                    {cook.cuisineStyle?.trim() || cook.cookingPhilosophy?.trim() ? (
                                        <Link to="/{-$locale}/profile/chef-profile/edit" className="min-w-0">
                                            <CookProfileTags
                                                cuisineStyle={cook.cuisineStyle}
                                                cookingPhilosophy={cook.cookingPhilosophy}
                                                size="md"
                                            />
                                        </Link>
                                    ) : (
                                        <Link to="/{-$locale}/profile/chef-profile/edit" className={fieldLinkClassName}>
                                            {notSet}
                                        </Link>
                                    )}
                                </div>
                            </div>
                            <dl className="grid min-w-0 items-start gap-4 sm:grid-cols-2">
                                <DetailField
                                    label={t(locale, 'profileCook', 'travel.cityForCustomers')}
                                    value={
                                        <Link to="/{-$locale}/profile/travel" className={fieldLinkClassName}>
                                            {cook.exactTravelOriginAddress?.city.trim() || notSet}
                                        </Link>
                                    }
                                />
                                <DetailField
                                    label={t(locale, 'profileCook', 'chefProfileEdit.extraPicture')}
                                    value={
                                        <Link to="/{-$locale}/profile/chef-profile/edit" className={fieldLinkClassName}>
                                            {cook.logo?.url != null
                                                ? t(locale, 'profileCook', 'chefProfile.added')
                                                : t(locale, 'profileCook', 'actions.notSet')}
                                        </Link>
                                    }
                                />
                                <DetailField
                                    label={t(locale, 'profileCook', 'chefProfile.mealsOnPageLabel')}
                                    value={
                                        <Link to="/{-$locale}/profile/meals" className={fieldLinkClassName}>
                                            {t(locale, 'profileCook', 'chefProfile.mealsOnPage', { count: publicCatalogMeals.length })}
                                        </Link>
                                    }
                                />
                                {menusEnabled ? (
                                    <DetailField
                                        label={t(locale, 'profileCook', 'chefProfile.menusOnPageLabel')}
                                        value={
                                            <Link to="/{-$locale}/profile/menus" className={fieldLinkClassName}>
                                                {t(locale, 'profileCook', 'chefProfile.menusOnPage', {
                                                    count: publicCatalogMenus.length,
                                                })}
                                            </Link>
                                        }
                                    />
                                ) : null}
                            </dl>
                            {cook.logo?.url != null ? (
                                <Link to="/{-$locale}/profile/chef-profile/edit" className="block w-full max-w-72">
                                    <img
                                        src={cook.logo.url}
                                        alt={t(locale, 'profileCook', 'chefProfileEdit.extraPicture')}
                                        className="aspect-video w-full rounded-md border border-border object-cover"
                                    />
                                </Link>
                            ) : null}
                            <div className="grid min-w-0 gap-2">
                                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    {t(locale, 'profileCook', 'chefProfile.summary')}
                                </p>
                                <Link
                                    to="/{-$locale}/profile/chef-profile/edit"
                                    className="rounded-lg border border-border bg-muted/40 p-3 text-sm whitespace-pre-wrap text-foreground underline-offset-4 hover:underline"
                                >
                                    {biographySummary || t(locale, 'profileCook', 'chefProfile.noSummary')}
                                </Link>
                            </div>
                        </section>

                        <section className="grid min-w-0 gap-4">
                            <div className="grid min-w-0 gap-1">
                                <h2 className="font-serif text-xl/tight text-foreground">
                                    {t(locale, 'profileCook', 'chefProfile.privateZoneTitle')}
                                </h2>
                                <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'chefProfile.privateZoneHint')}</p>
                            </div>
                            <div className="grid min-w-0 gap-2">
                                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    {t(locale, 'profileCook', 'chefProfile.defaultOfferNote')}
                                </p>
                                <Link
                                    to="/{-$locale}/profile/chef-profile/edit"
                                    className="rounded-lg border border-border bg-muted/40 p-3 text-sm whitespace-pre-wrap text-foreground underline-offset-4 hover:underline"
                                >
                                    {offerNoteValue}
                                </Link>
                            </div>
                        </section>
                    </div>
                </TabsContent>

                <TabsContent
                    value="card"
                    className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10 scrollbar-gutter-stable"
                >
                    <div className="grid min-w-0 content-start gap-4">
                        <div className="grid gap-1">
                            <h2 className="font-serif text-xl/tight text-foreground">{t(locale, 'profileCook', 'public.inListing')}</h2>
                            <p className="max-w-2xl text-sm text-muted-foreground">{t(locale, 'profileCook', 'public.inListingHint')}</p>
                        </div>
                        <div className="w-full max-w-72">
                            <PublicCookCard
                                interactive={false}
                                cook={{
                                    cookId: cook.cookId,
                                    pathName: cook.pathName,
                                    cuisineStyle: cook.cuisineStyle,
                                    cookingPhilosophy: cook.cookingPhilosophy,
                                    city: cook.exactTravelOriginAddress?.city ?? null,
                                    rating: cook.rating,
                                    user: {
                                        display: displayName,
                                        profilePicture: user.profilePicture ? { url: user.profilePicture.url } : null,
                                    },
                                }}
                            />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="page" className="mt-4 flex min-h-0 flex-1 flex-col px-4 pb-4 data-[state=inactive]:hidden">
                    <ChefPagePreviewFrame
                        urlLabel={chefPagePath(cook.pathName, locale)}
                        leading={<StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
                        actions={
                            <>
                                {shareEnabled ? (
                                    <ShareButton
                                        title={displayName}
                                        text={t(locale, 'profileCook', 'public.shareText', { name: displayName })}
                                        url={publicChefUrl(cook.pathName, locale)}
                                        disabled={!isLive}
                                    />
                                ) : null}
                                <Button type="button" variant="outline" size="sm" disabled={!isLive} onClick={() => void copyPublicLink()}>
                                    {copied ? <CheckIcon className="size-4" aria-hidden /> : <CopyIcon className="size-4" aria-hidden />}
                                    {t(locale, 'profileCook', 'invite.copyLink')}
                                </Button>
                                {isLive ? (
                                    <Button type="button" variant="outline" size="sm" asChild>
                                        <Link to="/{-$locale}/chefs/$pathName" params={{ pathName: cook.pathName }} target="_blank">
                                            <ExternalLinkIcon className="size-4" aria-hidden />
                                            {t(locale, 'profileCook', 'actions.open')}
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button type="button" variant="outline" size="sm" disabled>
                                        <ExternalLinkIcon className="size-4" aria-hidden />
                                        {t(locale, 'profileCook', 'actions.open')}
                                    </Button>
                                )}
                            </>
                        }
                    >
                        <div className="@container w-full min-w-0">
                            <Header user={null} locale={locale} bookingRequestFormSearch={exclusiveRequest} />
                            <ChefProfileView
                                cook={view}
                                bookCta={
                                    exclusiveRequest
                                        ? {
                                              cookId: exclusiveRequest.cookId,
                                              label: t(locale, 'profileCook', 'public.sendRequest', { name: displayName }),
                                              underline: t(locale, 'profileCook', 'public.sendRequestHint'),
                                          }
                                        : undefined
                                }
                            />
                            <Footer locale={locale} />
                        </div>
                    </ChefPagePreviewFrame>
                </TabsContent>
            </Tabs>
        </ProfilePinnedFooterLayout>
    );
}
