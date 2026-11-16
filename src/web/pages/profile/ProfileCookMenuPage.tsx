import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { MoreHorizontalIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import { formatDateTime } from '../../../shared';
import type { Locale } from '../../../shared/locale';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/base/dropdown-menu';
import { StatusAlert } from '../../components/base/status-alert';
import { CookMealCard } from '../../components/CookMealCard';
import { ProfilePinnedFooterLayout } from '../../components/ProfilePinnedFooterLayout';
import type { GqlCProfileCookMenuPageQuery } from '../../graphql/generated';
import {
    ProfileCookMenuPageUpdatesDocument,
    ProfileMenuCopyDocument,
    ProfileMenuDeleteDocument,
    ProfileMenuSyncToTemplateDocument,
    ProfileMenuUpsertDocument,
} from '../../graphql/generated';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { cookStubRouteBySlug } from './cookCatalog';

const menusRoute = cookStubRouteBySlug('menus');

export function profileCookMenuPageTitle(locale: Locale): string {
    return t(locale, 'profileCook', 'menu.seoTitle');
}
export function profileCookMenuPageDescription(locale: Locale): string {
    return t(locale, 'profileCook', 'menu.seoDescription');
}

type MenuRow = NonNullable<NonNullable<NonNullable<GqlCProfileCookMenuPageQuery['currentSession']['user']>['cook']>['menu']>;
type TemplateMenu = NonNullable<MenuRow['templateMenu']>;

function coursesReadyToPublish(menu: MenuRow): boolean {
    return menu.courses.length >= 1 && menu.courses.every((course) => course.title.trim().length > 0 && course.mealOptions.length >= 1);
}

function offerMenuIsNegotiable(status: string | undefined): boolean {
    return status === 'USER_NEEDS_TO_ACCEPT' || status === 'COOK_NEEDS_TO_ACCEPT';
}

type SyncChange = { label: string; from: string; to: string };

function mealTitlesLine(meals: ReadonlyArray<{ title: string }>, emptyLabel: string): string {
    if (meals.length === 0) return emptyLabel;
    return meals.map((meal) => meal.title.trim() || emptyLabel).join(', ');
}

/** Human-readable offer-copy → template replacements for the sync confirm dialog. */
function menuSyncChanges(
    offerMenu: Pick<MenuRow, 'title' | 'description' | 'courses'>,
    template: Pick<TemplateMenu, 'title' | 'description' | 'courses'>,
    locale: Locale,
): SyncChange[] {
    const emptyMeal = t(locale, 'profileCook', 'menu.noMeal');
    const untitledCourse = t(locale, 'profileCook', 'menu.untitledCourse');
    const changes: SyncChange[] = [];

    if (offerMenu.title.trim() !== template.title.trim()) {
        changes.push({
            label: t(locale, 'profileCook', 'actions.title'),
            from: template.title.trim() || t(locale, 'profileCook', 'menu.empty'),
            to: offerMenu.title.trim() || t(locale, 'profileCook', 'menu.empty'),
        });
    }

    if (offerMenu.description.trim() !== template.description.trim()) {
        changes.push({
            label: t(locale, 'profileCook', 'actions.description'),
            from: template.description.trim() || t(locale, 'profileCook', 'menu.empty'),
            to: offerMenu.description.trim() || t(locale, 'profileCook', 'menu.empty'),
        });
    }

    const maxCourses = Math.max(offerMenu.courses.length, template.courses.length);
    for (let index = 0; index < maxCourses; index += 1) {
        const offerCourse = offerMenu.courses[index];
        const templateCourse = template.courses[index];
        const courseLabel = t(locale, 'profileCook', 'menu.courseN', { index: index + 1 });

        if (offerCourse == null && templateCourse != null) {
            changes.push({
                label: courseLabel,
                from: templateCourse.title.trim() || untitledCourse,
                to: t(locale, 'profileCook', 'menu.removed'),
            });
            continue;
        }
        if (offerCourse != null && templateCourse == null) {
            changes.push({
                label: courseLabel,
                from: t(locale, 'profileCook', 'menu.isNew'),
                to: [offerCourse.title.trim() || untitledCourse, mealTitlesLine(offerCourse.mealOptions, emptyMeal)].join(': '),
            });
            continue;
        }
        if (offerCourse == null || templateCourse == null) continue;

        const offerTitle = offerCourse.title.trim() || untitledCourse;
        const templateTitle = templateCourse.title.trim() || untitledCourse;
        const offerMeals = mealTitlesLine(offerCourse.mealOptions, emptyMeal);
        const templateMeals = mealTitlesLine(templateCourse.mealOptions, emptyMeal);
        const offerLimit = offerCourse.mealSelectionLimit ?? 1;
        const templateLimit = templateCourse.mealSelectionLimit ?? 1;

        if (offerTitle !== templateTitle || offerMeals !== templateMeals || offerLimit !== templateLimit) {
            const fromParts = [templateTitle, templateMeals];
            const toParts = [offerTitle, offerMeals];
            if (offerLimit !== templateLimit) {
                fromParts.push(t(locale, 'profileCook', 'menu.pickUpToTemplate', { limit: templateLimit }));
                toParts.push(t(locale, 'profileCook', 'menu.pickUpToOffer', { limit: offerLimit }));
            }
            changes.push({
                label: courseLabel,
                from: fromParts.join(' · '),
                to: toParts.join(' · '),
            });
        }
    }

    return changes;
}

export function ProfileCookMenuPage({ data, menuId }: { data: GqlCProfileCookMenuPageQuery; menuId: string }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate();
    const publicationEnabled = useFeatureToggleActive('PUBLICATION_MENUS');
    const seedUser = data.currentSession.user ?? null;
    const seedMenu = seedUser?.cook?.menu ?? null;
    if (!seedMenu) throw notFound();

    const user = useUserUpdatesSeed(seedUser, ProfileCookMenuPageUpdatesDocument, { menuId });
    const menu = user?.cook?.menu ?? null;

    const [, upsertMenu] = useMutation(ProfileMenuUpsertDocument);
    const [, deleteMenu] = useMutation(ProfileMenuDeleteDocument);
    const [, copyMenu] = useMutation(ProfileMenuCopyDocument);
    const [, syncToTemplate] = useMutation(ProfileMenuSyncToTemplateDocument);
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState<'delete' | 'publish' | 'sync' | null>(null);

    useEffect(() => {
        if (user == null) return;
        if (menu == null) {
            void navigate({ to: menusRoute.to });
        }
    }, [menu, navigate, user]);

    if (menu == null) {
        return null;
    }

    const isOfferMenu = menu.bookingRequestOfferId != null;
    const offerContext = menu.offerContext;
    const templateMenu = menu.templateMenu;
    const canEditOfferMenu = isOfferMenu && offerMenuIsNegotiable(offerContext?.status);
    const canSyncToTemplate = isOfferMenu && templateMenu != null;
    const syncChanges = templateMenu != null ? menuSyncChanges(menu, templateMenu, locale) : [];

    async function setPublished(next: string | null) {
        setBusy(true);
        try {
            const result = await upsertMenu({
                menu: { menuId, publishedAt: next },
            });
            if (result.error || !result.data?.user.cook.menuUpsert.success) {
                throw new Error('publish failed');
            }
            toast.success(next ? t(locale, 'profileCook', 'actions.publishedToast') : t(locale, 'profileCook', 'actions.unpublished'));
        } catch {
            toast.error(t(locale, 'profileCook', 'actions.actionFailed'));
        } finally {
            setBusy(false);
        }
    }

    async function onDelete() {
        setBusy(true);
        try {
            const result = await deleteMenu({ menuId });
            if (result.error || !result.data?.user.cook.menuDelete.success) {
                throw new Error('delete failed');
            }
            toast.success(t(locale, 'profileCook', 'actions.deleted'));
            await navigate({ to: menusRoute.to });
        } catch {
            toast.error(t(locale, 'profileCook', 'actions.deleteFailed'));
        } finally {
            setBusy(false);
        }
    }

    async function onCopy() {
        setBusy(true);
        try {
            const result = await copyMenu({ menuId });
            const newMenuId = result.data?.user.cook.menuCopy.referenceId;
            if (!newMenuId || result.error) throw new Error('copy failed');
            toast.success(t(locale, 'profileCook', 'menu.copied'));
            await navigate({ to: '/{-$locale}/profile/menus/$menuId', params: { menuId: newMenuId } });
        } catch {
            toast.error(t(locale, 'profileCook', 'menu.copyFailed'));
        } finally {
            setBusy(false);
        }
    }

    async function onSyncToTemplate() {
        setBusy(true);
        try {
            const result = await syncToTemplate({ menuId });
            const templateMenuId = result.data?.user.cook.menuSyncToTemplate.referenceId;
            if (!templateMenuId || result.error || !result.data?.user.cook.menuSyncToTemplate.success) {
                throw new Error('sync failed');
            }
            toast.success(t(locale, 'profileCook', 'menu.templateUpdated'));
            await navigate({ to: '/{-$locale}/profile/menus/$menuId', params: { menuId: templateMenuId } });
        } catch {
            toast.error(t(locale, 'profileCook', 'menu.syncFailed'));
        } finally {
            setBusy(false);
            setConfirm(null);
        }
    }

    const canPublish = menu.title.trim().length > 0 && coursesReadyToPublish(menu);
    const incompleteCourseCount = menu.courses.filter(
        (course) => course.title.trim().length === 0 || course.mealOptions.length === 0,
    ).length;

    const offerMeta =
        offerContext != null
            ? [
                  offerContext.customerFirstName,
                  formatDateTime(offerContext.bookingRequestDateTime, {
                      locale,
                      timeZone,
                      dateStyle: 'medium',
                      timeStyle: 'short',
                  }),
              ]
                  .filter((part) => part.trim().length > 0)
                  .join(' · ')
            : null;

    return (
        <>
            <ProfilePinnedFooterLayout
                contentClassName="grid w-full max-w-2xl content-start gap-6"
                footer={
                    <>
                        {isOfferMenu ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        disabled={busy}
                                        aria-label={t(locale, 'profileCook', 'actions.moreActions')}
                                    >
                                        <MoreHorizontalIcon className="size-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {offerContext != null ? (
                                        <DropdownMenuItem asChild>
                                            <Link
                                                to="/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId"
                                                params={{ bookingRequestOfferId: offerContext.bookingRequestOfferId }}
                                                search={{ tab: 'offer' }}
                                            >
                                                {t(locale, 'profileCook', 'menu.openOffer')}
                                            </Link>
                                        </DropdownMenuItem>
                                    ) : null}
                                    {canSyncToTemplate ? (
                                        <DropdownMenuItem disabled={busy} onSelect={() => setConfirm('sync')}>
                                            {t(locale, 'profileCook', 'menu.syncToTemplate')}
                                        </DropdownMenuItem>
                                    ) : null}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        disabled={busy}
                                        aria-label={t(locale, 'profileCook', 'actions.moreActions')}
                                    >
                                        <MoreHorizontalIcon className="size-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem disabled={busy} onSelect={() => void onCopy()}>
                                        {t(locale, 'profileCook', 'actions.copy')}
                                    </DropdownMenuItem>
                                    {publicationEnabled && menu.publishedAt != null ? (
                                        <DropdownMenuItem disabled={busy} onSelect={() => void setPublished(null)}>
                                            {t(locale, 'profileCook', 'actions.unpublish')}
                                        </DropdownMenuItem>
                                    ) : null}
                                    <DropdownMenuItem variant="destructive" disabled={busy} onSelect={() => setConfirm('delete')}>
                                        {t(locale, 'profileCook', 'actions.delete')}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {!isOfferMenu && publicationEnabled && menu.publishedAt == null ? (
                            <Button type="button" variant="outline" disabled={busy || !canPublish} onClick={() => setConfirm('publish')}>
                                {t(locale, 'profileCook', 'actions.publish')}
                            </Button>
                        ) : null}

                        {(!isOfferMenu || canEditOfferMenu) && (
                            <Button asChild>
                                <Link to="/{-$locale}/profile/menus/$menuId/edit" params={{ menuId }}>
                                    {t(locale, 'profileCook', 'actions.edit')}
                                </Link>
                            </Button>
                        )}
                    </>
                }
            >
                {isOfferMenu || publicationEnabled || menu.generatedAt != null ? (
                    <div className="flex flex-wrap items-center gap-2">
                        {isOfferMenu ? (
                            <Badge variant="outline">{t(locale, 'profileCook', 'menu.offerMenu')}</Badge>
                        ) : publicationEnabled ? (
                            <Badge variant="outline">
                                {menu.publishedAt ? t(locale, 'profileCook', 'meals.published') : t(locale, 'profileCook', 'meals.draft')}
                            </Badge>
                        ) : null}
                        {menu.generatedAt != null ? <Badge variant="outline">{t(locale, 'profileCook', 'actions.generated')}</Badge> : null}
                    </div>
                ) : null}

                {isOfferMenu ? (
                    <StatusAlert tone="info" title={t(locale, 'profileCook', 'menu.perOfferCopy')}>
                        <p>{t(locale, 'profileCook', 'menu.perOfferHint')}</p>
                        {offerMeta != null ? <p className="mt-1">{offerMeta}</p> : null}
                        {!canEditOfferMenu ? <p className="mt-1">{t(locale, 'profileCook', 'menu.noLongerNegotiable')}</p> : null}
                    </StatusAlert>
                ) : null}

                <div className="grid gap-1">
                    <h1 className="font-serif text-3xl/tight text-foreground">{menu.title}</h1>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                        {menu.description.trim() ? menu.description : t(locale, 'profileCook', 'actions.noDescription')}
                    </p>
                </div>

                <section className="grid gap-3">
                    <div>
                        <h2 className="text-base font-semibold">{t(locale, 'profileCook', 'menuEdit.courses')}</h2>
                        <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'menu.coursesHint')}</p>
                    </div>
                    {!isOfferMenu && incompleteCourseCount > 0 ? (
                        <StatusAlert
                            tone="warning"
                            title={t(locale, 'profileCook', 'menu.incompleteCourses', { count: incompleteCourseCount })}
                        >
                            {t(locale, 'profileCook', 'menu.publishNeedsMeals')}
                        </StatusAlert>
                    ) : null}
                    <div className="grid gap-6">
                        {menu.courses.map((course) => {
                            const selectionLimit = course.mealSelectionLimit ?? 1;
                            const isMultiSelect = selectionLimit > 1;
                            return (
                                <div key={course.courseId} className="grid gap-2">
                                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                                        <p className="text-base font-medium">
                                            {course.title.trim() ? course.title : t(locale, 'profileCook', 'menu.untitledCourse')}
                                        </p>
                                        {isMultiSelect ? (
                                            <Badge variant="outline">
                                                {t(locale, 'profileCook', 'menu.upToDishes', { limit: selectionLimit })}
                                            </Badge>
                                        ) : course.mealOptions.length > 1 ? (
                                            <span className="text-sm text-muted-foreground">
                                                {t(locale, 'profileCook', 'menu.oneDish')}
                                            </span>
                                        ) : null}
                                    </div>
                                    {course.mealOptions.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'menu.noMeals')}</p>
                                    ) : (
                                        <ul className="grid gap-2">
                                            {course.mealOptions.map((meal) => (
                                                <li key={meal.mealId}>
                                                    <CookMealCard meal={meal} dialogTitle={course.title} />
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            </ProfilePinnedFooterLayout>

            <AlertDialog open={confirm === 'delete'} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t(locale, 'profileCook', 'menu.deleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t(locale, 'profileCook', 'menu.deleteBody')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t(locale, 'common', 'cancel')}</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => void onDelete()}>
                            {t(locale, 'profileCook', 'actions.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirm === 'publish'} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t(locale, 'profileCook', 'menu.publishTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t(locale, 'profileCook', 'menu.publishBody')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t(locale, 'common', 'cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void setPublished(new Date().toISOString())}>
                            {t(locale, 'profileCook', 'actions.publish')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirm === 'sync'} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent className="max-w-lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t(locale, 'profileCook', 'menu.syncTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t(locale, 'profileCook', 'menu.syncBody')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    {syncChanges.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'menu.syncNoDiff')}</p>
                    ) : (
                        <ul className="grid max-h-72 gap-3 overflow-y-auto text-sm">
                            {syncChanges.map((change) => (
                                <li key={change.label} className="grid gap-1 rounded-lg border border-border p-3">
                                    <p className="font-medium text-foreground">{change.label}</p>
                                    <p className="text-muted-foreground">
                                        <span className="line-through decoration-muted-foreground/70">{change.from}</span>
                                    </p>
                                    <p className="text-foreground">{change.to}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t(locale, 'common', 'cancel')}</AlertDialogCancel>
                        <AlertDialogAction disabled={busy || syncChanges.length === 0} onClick={() => void onSyncToTemplate()}>
                            {t(locale, 'profileCook', 'menu.sync')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
