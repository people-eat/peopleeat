import { Link } from '@tanstack/react-router';
import { CheckIcon, CopyIcon, ExternalLinkIcon, EyeIcon, Settings2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import { cookMenuIsPublicCatalogEligible } from '../../../shared';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../../components/base/alert-dialog';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { StatusAlert } from '../../components/base/status-alert';
import { Switch } from '../../components/base/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/base/tabs';
import { ChefProfileView } from '../../components/ChefProfileView';
import type { ChefProfileViewModel } from '../../components/ChefProfileView';
import { CookLogoEditor } from '../../components/CookLogoEditor';
import { Footer } from '../../components/Footer';
import { Header } from '../../components/Header';
import { PublicCookCard } from '../../components/PublicCookCard';
import { ShareButton } from '../../components/ShareButton';
import type { GqlCProfileCookPublicPageQuery } from '../../graphql/generated';
import { ProfileCookPublicCookUpdateDocument, ProfileCookPublicPageUpdatesDocument } from '../../graphql/generated';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import type { Locale } from '../../utils/locale';
import { publicChefUrl } from '../../utils/webShare';
import { cookNavRouteBySlug } from './cookCatalog';

const route = cookNavRouteBySlug('public');
export const profileCookPublicPageTitle = route.title;
export const profileCookPublicPageDescription = route.description;

type ProfileCookPublicTab = 'preview' | 'manage';

export type ProfileCookPublicSearch = {
    tab?: 'manage';
};

export function parseProfileCookPublicSearch(search: Record<string, unknown>): ProfileCookPublicSearch {
    return { tab: search.tab === 'manage' ? 'manage' : undefined };
}

function resolvePublicTab(tab: ProfileCookPublicSearch['tab']): ProfileCookPublicTab {
    return tab === 'manage' ? 'manage' : 'preview';
}

function visibilityConfirmCopy({
    nextVisible,
    isApprovedByAdmin,
    locale,
}: {
    nextVisible: boolean;
    isApprovedByAdmin: boolean;
    locale: Locale;
}): { title: string; description: string; confirm: string } {
    if (nextVisible) {
        return {
            title: t(locale, 'profileCook', 'public.makePublicTitle'),
            description: isApprovedByAdmin
                ? t(locale, 'profileCook', 'public.makePublicBody')
                : t(locale, 'profileCook', 'public.makePublicPending'),
            confirm: t(locale, 'profileCook', 'public.makePublic'),
        };
    }

    return {
        title: t(locale, 'profileCook', 'public.hideTitle'),
        description: isApprovedByAdmin ? t(locale, 'profileCook', 'public.hideBody') : t(locale, 'profileCook', 'public.hidePending'),
        confirm: t(locale, 'profileCook', 'actions.hide'),
    };
}

export function ProfileCookPublicPage({ data, search }: { data: GqlCProfileCookPublicPageQuery; search: ProfileCookPublicSearch }) {
    const locale = useLocale();
    const shareEnabled = useFeatureToggleActive('COOK_PUBLIC_PROFILE_SHARE');
    const cookDirectEnabled = useFeatureToggleActive('BOOKING_REQUEST_COOK_DIRECT');
    const seedUser = data.currentSession.user ?? null;
    const user = useUserUpdatesSeed(seedUser, ProfileCookPublicPageUpdatesDocument);
    const [copied, setCopied] = useState(false);
    const [visibilitySaving, setVisibilitySaving] = useState(false);
    const [logoBusy, setLogoBusy] = useState(false);
    const [pendingVisible, setPendingVisible] = useState<boolean | null>(null);
    const [, updateCook] = useMutation(ProfileCookPublicCookUpdateDocument);

    const cook = user?.cook ?? null;
    if (!user || !cook) return null;

    const tab = resolvePublicTab(search.tab);
    const isLive = cook.isVisible && cook.isApprovedByAdmin;
    const cookId = cook.cookId;
    const pathName = cook.pathName;
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
    const manageWarningCount = publishedWithoutImageCount + publishedMenusNotCatalogCount;
    const view: ChefProfileViewModel = {
        displayName: user.firstName,
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
        menus: publicCatalogMenus.map((menu) => ({
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
        })),
    };
    const confirmCopy =
        pendingVisible == null
            ? null
            : visibilityConfirmCopy({
                  nextVisible: pendingVisible,
                  isApprovedByAdmin: cook.isApprovedByAdmin,
                  locale,
              });

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

    async function confirmVisibilityChange() {
        if (!cook || pendingVisible == null || visibilitySaving || pendingVisible === cook.isVisible) {
            setPendingVisible(null);
            return;
        }
        setVisibilitySaving(true);
        const result = await updateCook({ input: { isVisible: pendingVisible } });
        setVisibilitySaving(false);
        setPendingVisible(null);
        if (result.error || !result.data?.user.cook.update.success) {
            toast.error(t(locale, 'common', 'saveFailed'));
            return;
        }
        toast.success(t(locale, 'profileCook', 'actions.saved'));
    }

    async function onLogoLink(fileUploadId: string) {
        const result = await updateCook({ input: { logoFileUploadId: fileUploadId } });
        if (result.error || !result.data?.user.cook.update.success) {
            throw result.error ?? new Error('Could not save.');
        }
    }

    async function onLogoClear() {
        const result = await updateCook({ input: { logoFileUploadId: null } });
        if (result.error || !result.data?.user.cook.update.success) {
            throw result.error ?? new Error('Could not save.');
        }
    }

    return (
        <main id="main-content" data-workspace-fill="" className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-0 overflow-hidden">
            <Tabs value={tab} className="flex min-h-0 flex-1 flex-col gap-0">
                <TabsList variant="line" className="shrink-0" aria-label={t(locale, 'profileCook', 'nav.public.title')}>
                    <TabsTrigger value="preview" asChild>
                        <Link to="/{-$locale}/profile/public" search={{ tab: undefined }} replace>
                            <EyeIcon aria-hidden />
                            {t(locale, 'profileCook', 'public.preview')}
                        </Link>
                    </TabsTrigger>
                    <TabsTrigger value="manage" asChild>
                        <Link to="/{-$locale}/profile/public" search={{ tab: 'manage' }} replace>
                            <Settings2Icon aria-hidden />
                            {t(locale, 'profileCook', 'public.manage')}
                            {manageWarningCount > 0 ? (
                                <Badge variant="outline" className="ml-1 bg-muted px-1.5 py-0 text-[10px] font-medium">
                                    {manageWarningCount}
                                </Badge>
                            ) : null}
                        </Link>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="mt-4 flex min-h-0 flex-1 flex-col gap-3 data-[state=inactive]:hidden">
                    <div className="flex shrink-0 items-start gap-3 sm:items-center">
                        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                            {isLive ? t(locale, 'profileCook', 'public.publicHint') : t(locale, 'profileCook', 'public.previewNotPublic')}
                        </p>
                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                            {shareEnabled ? (
                                <ShareButton
                                    title={user.firstName}
                                    text={t(locale, 'profileCook', 'public.shareText', { name: user.firstName })}
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
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border border-border bg-background">
                        <div className="@container w-full min-w-0">
                            <section className="mx-auto w-full max-w-7xl border-b border-border px-4 py-8 @lg:px-6">
                                <div className="grid gap-2">
                                    <h2 className="font-serif text-2xl font-light">{t(locale, 'profileCook', 'public.inListing')}</h2>
                                    <p className="max-w-2xl text-sm text-muted-foreground">
                                        {t(locale, 'profileCook', 'public.inListingHint')}
                                    </p>
                                </div>
                                <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                    <li>
                                        <PublicCookCard
                                            interactive={false}
                                            cook={{
                                                cookId,
                                                pathName: cook.pathName,
                                                cuisineStyle: cook.cuisineStyle,
                                                cookingPhilosophy: cook.cookingPhilosophy,
                                                city: cook.exactTravelOriginAddress?.city ?? null,
                                                rating: cook.rating,
                                                user: {
                                                    display: user.firstName,
                                                    profilePicture: user.profilePicture ? { url: user.profilePicture.url } : null,
                                                },
                                            }}
                                        />
                                    </li>
                                </ul>
                            </section>
                            <Header
                                user={user}
                                locale={locale}
                                bookingRequestFormSearch={
                                    cookDirectEnabled && cook.canCreateOffers && cook.isVisible && cook.exactTravelOriginAddress != null
                                        ? { cookId: cook.cookId }
                                        : undefined
                                }
                            />
                            <ChefProfileView
                                cook={view}
                                bookCta={
                                    cookDirectEnabled && cook.canCreateOffers && cook.isVisible && cook.exactTravelOriginAddress != null
                                        ? {
                                              cookId: cook.cookId,
                                              label: t(locale, 'profileCook', 'public.sendRequest', { name: user.firstName }),
                                              underline: t(locale, 'profileCook', 'public.sendRequestHint'),
                                          }
                                        : undefined
                                }
                            />
                            <Footer locale={locale} />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="manage" className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain data-[state=inactive]:hidden">
                    <div className="grid min-w-0 content-start gap-3 pb-4">
                        <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'public.manageHint')}</p>

                        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                            <div className="flex min-w-0 items-center justify-between gap-4 rounded-lg border border-border p-3">
                                <div className="grid min-w-0 flex-1 gap-1">
                                    <span className="text-sm font-medium">{t(locale, 'profileCook', 'public.publiclyVisible')}</span>
                                    <span className="text-sm text-muted-foreground">
                                        {t(locale, 'profileCook', 'public.requiresApproval')}
                                    </span>
                                </div>
                                <Switch
                                    checked={cook.isVisible}
                                    disabled={visibilitySaving || logoBusy}
                                    onCheckedChange={(checked) => setPendingVisible(checked)}
                                />
                            </div>
                            <div className="grid min-w-0 gap-2 rounded-lg border border-border p-3">
                                <span className="text-sm font-medium">{t(locale, 'profileCook', 'public.extraPicture')}</span>
                                <CookLogoEditor
                                    logoUrl={cook.logo?.url ?? null}
                                    disabled={visibilitySaving}
                                    onLink={onLogoLink}
                                    onClear={onLogoClear}
                                    onBusyChange={setLogoBusy}
                                />
                            </div>
                        </div>

                        {publishedWithoutImageCount > 0 ? (
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
                        {publishedMenusNotCatalogCount > 0 ? (
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
                    </div>
                </TabsContent>
            </Tabs>

            <AlertDialog
                open={pendingVisible != null}
                onOpenChange={(open) => {
                    if (!open && !visibilitySaving) setPendingVisible(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmCopy?.title}</AlertDialogTitle>
                        <AlertDialogDescription>{confirmCopy?.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={visibilitySaving}>{t(locale, 'common', 'cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            variant={pendingVisible === false ? 'destructive' : 'default'}
                            disabled={visibilitySaving}
                            onClick={(event) => {
                                event.preventDefault();
                                void confirmVisibilityChange();
                            }}
                        >
                            {visibilitySaving
                                ? t(locale, 'profileCook', 'actions.saving')
                                : (confirmCopy?.confirm ?? t(locale, 'profileCook', 'actions.confirm'))}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}
