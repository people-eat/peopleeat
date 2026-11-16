import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { MoreHorizontalIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../../i18n/t';
import { formatDateTime } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
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
import type { GqlCAdminMenuPageQuery } from '../../graphql/generated';
import {
    AdminMenuCopyDocument,
    AdminMenuDeleteDocument,
    AdminMenuPageUpdatesDocument,
    AdminMenuUpsertDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { Locale } from '../../utils/locale';

export function adminMenuPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'pages.menu.title');
}
export function adminMenuPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.menu.description');
}

type AdminMenu = NonNullable<NonNullable<NonNullable<GqlCAdminMenuPageQuery['currentSession']['user']>['admin']>['cookMenu']>;

function coursesReadyToPublish(menu: AdminMenu): boolean {
    return menu.courses.length >= 1 && menu.courses.every((course) => course.title.trim().length > 0 && course.mealOptions.length >= 1);
}

export function AdminMenuPage({ data, menuId }: { data: GqlCAdminMenuPageQuery; menuId: string }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate();
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const seedMenu = seedAdmin?.cookMenu ?? null;
    if (!seedMenu) throw notFound();

    const [menu, setMenu] = useState(seedMenu);
    const [, upsertMenu] = useMutation(AdminMenuUpsertDocument);
    const [, deleteMenu] = useMutation(AdminMenuDeleteDocument);
    const [, copyMenu] = useMutation(AdminMenuCopyDocument);
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState<'delete' | 'publish' | null>(null);

    useEffect(() => {
        setMenu(seedMenu);
    }, [seedMenu]);

    useEffect(() => {
        if (!seedAdmin) return;
        const request = createRequest(AdminMenuPageUpdatesDocument, { menuId });
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const next = result.data?.adminUpdates.cookMenu;
                if (next) setMenu(next);
            }),
        );
        return unsubscribe;
    }, [client, menuId, seedAdmin]);

    const isDeleted = menu.deletedAt != null;
    const isOfferMenu = menu.bookingRequestOfferId != null;
    const canPublish = menu.title.trim().length > 0 && coursesReadyToPublish(menu);
    const incompleteCourseCount = menu.courses.filter(
        (course) => course.title.trim().length === 0 || course.mealOptions.length === 0,
    ).length;
    const canEdit = !isDeleted;
    const inventoryLifecycleActions = canEdit && !isOfferMenu;

    async function setPublished(next: string | null) {
        setBusy(true);
        try {
            const result = await upsertMenu({ menu: { menuId, publishedAt: next } });
            if (result.error || !result.data?.admin.cookMenuUpsert.success) {
                throw new Error('publish failed');
            }
            toast.success(next ? t(locale, 'admin', 'copy.published') : t(locale, 'admin', 'copy.unpublished'));
        } catch {
            toast.error(t(locale, 'admin', 'copy.actionFailed'));
        } finally {
            setBusy(false);
        }
    }

    async function onDelete() {
        setBusy(true);
        try {
            const result = await deleteMenu({ menuId });
            if (result.error || !result.data?.admin.cookMenuDelete.success) {
                throw new Error('delete failed');
            }
            toast.success(t(locale, 'admin', 'copy.deleted2'));
            await navigate({ to: '/{-$locale}/admin/menus' });
        } catch {
            toast.error(t(locale, 'admin', 'copy.couldNotDelete'));
        } finally {
            setBusy(false);
        }
    }

    async function onCopy() {
        setBusy(true);
        try {
            const result = await copyMenu({ menuId });
            const newMenuId = result.data?.admin.cookMenuCopy.referenceId;
            if (!newMenuId || result.error) throw new Error('copy failed');
            toast.success(t(locale, 'admin', 'copy.menuCopied'));
            await navigate({ to: '/{-$locale}/admin/menus/$menuId', params: { menuId: newMenuId } });
        } catch {
            toast.error(t(locale, 'admin', 'copy.couldNotCopy'));
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <AdminPageChrome
                crumbs={[{ label: t(locale, 'admin', 'copy.menus'), to: '/{-$locale}/admin/menus' }, { label: menu.title }]}
                contentClassName="min-h-0 overflow-hidden gap-0"
            >
                <AdminPinnedFooterLayout
                    contentClassName="grid w-full max-w-2xl content-start gap-6"
                    footer={
                        isDeleted ? (
                            <Button type="button" variant="outline" asChild>
                                <Link to="/{-$locale}/admin/menus">{t(locale, 'admin', 'copy.backToList')}</Link>
                            </Button>
                        ) : (
                            <>
                                {inventoryLifecycleActions ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                disabled={busy}
                                                aria-label={t(locale, 'admin', 'copy.moreActions')}
                                            >
                                                <MoreHorizontalIcon className="size-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem disabled={busy} onSelect={() => void onCopy()}>
                                                {t(locale, 'admin', 'copy.copy')}
                                            </DropdownMenuItem>
                                            {menu.publishedAt != null ? (
                                                <DropdownMenuItem disabled={busy} onSelect={() => void setPublished(null)}>
                                                    {t(locale, 'admin', 'copy.unpublish')}
                                                </DropdownMenuItem>
                                            ) : null}
                                            <DropdownMenuItem variant="destructive" disabled={busy} onSelect={() => setConfirm('delete')}>
                                                {t(locale, 'admin', 'copy.delete')}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : menu.copyOfMenuId != null ? (
                                    <Button type="button" variant="outline" asChild>
                                        <Link to="/{-$locale}/admin/menus/$menuId" params={{ menuId: menu.copyOfMenuId }}>
                                            {t(locale, 'admin', 'copy.openTemplate')}
                                        </Link>
                                    </Button>
                                ) : null}

                                {inventoryLifecycleActions && menu.publishedAt == null ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={busy || !canPublish}
                                        onClick={() => setConfirm('publish')}
                                    >
                                        {t(locale, 'admin', 'copy.publish')}
                                    </Button>
                                ) : null}

                                <Button asChild>
                                    <Link to="/{-$locale}/admin/menus/$menuId/edit" params={{ menuId }}>
                                        {t(locale, 'admin', 'copy.edit')}
                                    </Link>
                                </Button>
                            </>
                        )
                    }
                >
                    <div className="flex flex-wrap items-center gap-2">
                        {isDeleted ? (
                            <Badge variant="destructive" className="w-fit">
                                {t(locale, 'admin', 'copy.deleted')}
                            </Badge>
                        ) : isOfferMenu ? (
                            <Badge variant="outline" className="w-fit">
                                {t(locale, 'admin', 'copy.offerMenu')}
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="w-fit">
                                {menu.publishedAt ? t(locale, 'admin', 'copy.published2') : t(locale, 'admin', 'copy.draft')}
                            </Badge>
                        )}
                        {menu.generatedAt != null ? (
                            <Badge variant="outline" className="w-fit">
                                {t(locale, 'admin', 'copy.generated')}
                            </Badge>
                        ) : null}
                        <Link
                            to="/{-$locale}/admin/users/$userId"
                            params={{ userId: menu.cookId }}
                            search={{ tab: 'menus' }}
                            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                        >
                            {menu.cookName}
                        </Link>
                    </div>

                    {isOfferMenu ? (
                        <StatusAlert tone="info" title={t(locale, 'admin', 'copy.perOfferCopy')}>
                            {t(locale, 'admin', 'copy.thisMenuBelongsToAnOfferYouCanEditTitleDescriptionAndCourses')}
                        </StatusAlert>
                    ) : null}

                    <div className="grid gap-1">
                        <h1 className="font-serif text-3xl/tight text-foreground">{menu.title}</h1>
                        {menu.generatedAt != null ? (
                            <p className="text-sm text-muted-foreground">
                                {t(locale, 'admin', 'copy.generatedOn', {
                                    when: formatDateTime(menu.generatedAt, {
                                        locale,
                                        timeZone,
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                    }),
                                })}
                            </p>
                        ) : null}
                        <p className="text-muted-foreground whitespace-pre-wrap">
                            {menu.description.trim() ? menu.description : t(locale, 'admin', 'copy.noDescription')}
                        </p>
                    </div>

                    <section className="grid gap-3">
                        <div>
                            <h2 className="text-base font-semibold">{t(locale, 'admin', 'copy.courses')}</h2>
                            <p className="text-sm text-muted-foreground">
                                {t(locale, 'admin', 'copy.guestsPickFromTheMealsInEachCourseCoursesThatAllowMultipleDi')}
                            </p>
                        </div>
                        {canEdit && incompleteCourseCount > 0 ? (
                            <StatusAlert
                                tone="warning"
                                title={t(locale, 'admin', 'copy.incompleteCourseCount', { count: incompleteCourseCount })}
                            >
                                {t(locale, 'admin', 'copy.toPublishEveryCourseNeedsAtLeastOneMeal')}
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
                                                {course.title.trim() ? course.title : t(locale, 'admin', 'copy.untitledCourse')}
                                            </p>
                                            {isMultiSelect ? (
                                                <Badge variant="outline">
                                                    {t(locale, 'admin', 'copy.upToDishesSelectable', { count: selectionLimit })}
                                                </Badge>
                                            ) : course.mealOptions.length > 1 ? (
                                                <span className="text-sm text-muted-foreground">
                                                    {t(locale, 'admin', 'copy.n1DishSelectable')}
                                                </span>
                                            ) : null}
                                        </div>
                                        {course.mealOptions.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noMeals')}</p>
                                        ) : (
                                            <ul className="grid gap-2">
                                                {course.mealOptions.map((meal) => (
                                                    <li key={meal.mealId}>
                                                        <CookMealCard
                                                            meal={meal}
                                                            to="/{-$locale}/admin/meals/$mealId"
                                                            params={{ mealId: meal.mealId }}
                                                        />
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </AdminPinnedFooterLayout>
            </AdminPageChrome>

            <AlertDialog open={confirm === 'delete'} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t(locale, 'admin', 'copy.deleteThisMenu')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t(locale, 'admin', 'copy.theMenuDisappearsFromTheCookListAdminsCanStillInspectIt')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t(locale, 'admin', 'copy.cancel')}</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => void onDelete()}>
                            {t(locale, 'admin', 'copy.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirm === 'publish'} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t(locale, 'admin', 'copy.publishThisMenu')}</AlertDialogTitle>
                        <AlertDialogDescription>{t(locale, 'admin', 'copy.theMenuWillBeMarkedPublished')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t(locale, 'admin', 'copy.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void setPublished(new Date().toISOString())}>
                            {t(locale, 'admin', 'copy.publish')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
