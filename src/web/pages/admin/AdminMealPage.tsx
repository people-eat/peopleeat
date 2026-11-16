import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { CircleAlertIcon, LockIcon, MoreHorizontalIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../../i18n/t';
import type { Locale } from '../../../shared';
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
import type { GqlCAdminMealPageQuery } from '../../graphql/generated';
import { AdminMealDeleteDocument, AdminMealPageUpdatesDocument, AdminMealUpsertDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';

export function adminMealPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'pages.meal.title');
}
export function adminMealPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.meal.description');
}

type AdminMeal = NonNullable<NonNullable<NonNullable<GqlCAdminMealPageQuery['currentSession']['user']>['admin']>['cookMeal']>;
type MealRelationships = AdminMeal['relationships'];
type MenuRelationship = MealRelationships['menus'][number];
type OfferRelationship = MealRelationships['offers'][number];

function formatBookingDateTime(value: string, locale: Locale, timeZone: string) {
    return formatDateTime(value, { locale, timeZone, dateStyle: 'medium', timeStyle: 'short' });
}

function MealRelationshipMenuCard({ relationship, locale }: { relationship: MenuRelationship; locale: Locale }) {
    return (
        <div className="grid gap-3 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="grid gap-1">
                    <p className="font-medium">{relationship.menuTitle}</p>
                    <p className="text-sm text-muted-foreground">
                        {relationship.courseTitle}
                        {' · '}
                        <Link
                            to="/{-$locale}/admin/menus/$menuId"
                            params={{ menuId: relationship.menuId }}
                            className="text-accent underline-offset-4 hover:underline"
                        >
                            {t(locale, 'admin', 'copy.viewMenu')}
                        </Link>
                    </p>
                </div>
                {relationship.blocksDeletion ? <LockIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
            </div>
            {relationship.blocksDeletion ? (
                <StatusAlert tone="warning">
                    {t(locale, 'admin', 'copy.toRemoveThisDishEditTheMenuAndReplaceItWithAnotherDish')}
                </StatusAlert>
            ) : null}
        </div>
    );
}

function MealRelationshipOfferCard({
    relationship,
    locale,
    timeZone,
}: {
    relationship: OfferRelationship;
    locale: Locale;
    timeZone: string;
}) {
    return (
        <div className="grid gap-3 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="grid gap-1">
                    <p className="font-medium">{relationship.menuTitle}</p>
                    <p className="text-sm text-muted-foreground">
                        {relationship.courseTitle}
                        {' · '}
                        {t(locale, 'admin', 'copy.offerForNamed', { name: relationship.bookingRequestUserName })}
                        {' · '}
                        {formatBookingDateTime(relationship.bookingRequestDateTime, locale, timeZone)}
                    </p>
                </div>
                {relationship.blocksDeletion ? <LockIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
            </div>
            {relationship.blocksDeletion ? (
                <div className="flex gap-2 text-sm text-muted-foreground">
                    <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <p>{t(locale, 'admin', 'copy.thisDishIsTheOnlyOptionOnThatCourseInTheOfferMenuAndBlocksDe')}</p>
                </div>
            ) : null}
        </div>
    );
}

export function AdminMealPage({ data, mealId }: { data: GqlCAdminMealPageQuery; mealId: string }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate();
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const seedMeal = seedAdmin?.cookMeal ?? null;
    if (!seedMeal) throw notFound();

    const [meal, setMeal] = useState(seedMeal);
    const [, upsertMeal] = useMutation(AdminMealUpsertDocument);
    const [, deleteMeal] = useMutation(AdminMealDeleteDocument);
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState<'delete' | 'delete-blocked' | 'publish' | null>(null);

    useEffect(() => {
        setMeal(seedMeal);
    }, [seedMeal]);

    useEffect(() => {
        if (!seedAdmin) return;
        const request = createRequest(AdminMealPageUpdatesDocument, { mealId });
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const next = result.data?.adminUpdates.cookMeal;
                if (next) setMeal(next);
            }),
        );
        return unsubscribe;
    }, [client, mealId, seedAdmin]);

    const isDeleted = meal.deletedAt != null;
    const relationships = meal.relationships;
    const menuRelationshipsNonBlocking = relationships.menus.filter(({ blocksDeletion }) => !blocksDeletion);
    const menuRelationshipsBlocking = relationships.menus.filter(({ blocksDeletion }) => blocksDeletion);
    const offerRelationshipsNonBlocking = relationships.offers.filter(({ blocksDeletion }) => !blocksDeletion);
    const offerRelationshipsBlocking = relationships.offers.filter(({ blocksDeletion }) => blocksDeletion);

    async function setPublished(next: string | null) {
        setBusy(true);
        try {
            const result = await upsertMeal({ meal: { mealId, publishedAt: next } });
            if (result.error || !result.data?.admin.cookMealUpsert.success) {
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
            const result = await deleteMeal({ mealId });
            if (result.error || !result.data?.admin.cookMealDelete.success) {
                throw new Error('delete failed');
            }
            toast.success(t(locale, 'admin', 'copy.deleted2'));
            await navigate({ to: '/{-$locale}/admin/meals' });
        } catch {
            toast.error(t(locale, 'admin', 'copy.couldNotDelete'));
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <AdminPageChrome
                crumbs={[{ label: t(locale, 'admin', 'copy.meals'), to: '/{-$locale}/admin/meals' }, { label: meal.title }]}
                contentClassName="min-h-0 overflow-hidden gap-0"
            >
                <AdminPinnedFooterLayout
                    contentClassName="grid w-full max-w-2xl content-start gap-6"
                    footer={
                        isDeleted ? (
                            <Button type="button" variant="outline" asChild>
                                <Link to="/{-$locale}/admin/meals">{t(locale, 'admin', 'copy.backToList')}</Link>
                            </Button>
                        ) : (
                            <>
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
                                        {meal.publishedAt != null ? (
                                            <DropdownMenuItem disabled={busy} onSelect={() => void setPublished(null)}>
                                                {t(locale, 'admin', 'copy.unpublish')}
                                            </DropdownMenuItem>
                                        ) : null}
                                        <DropdownMenuItem
                                            variant="destructive"
                                            disabled={busy}
                                            onSelect={() =>
                                                setConfirm(relationships.deletionBlockedByRelationships ? 'delete-blocked' : 'delete')
                                            }
                                        >
                                            {t(locale, 'admin', 'copy.delete')}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {meal.publishedAt == null ? (
                                    <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirm('publish')}>
                                        {t(locale, 'admin', 'copy.publish')}
                                    </Button>
                                ) : null}

                                <Button asChild>
                                    <Link to="/{-$locale}/admin/meals/$mealId/edit" params={{ mealId }}>
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
                        ) : (
                            <Badge variant="outline" className="w-fit">
                                {meal.publishedAt ? t(locale, 'admin', 'copy.published2') : t(locale, 'admin', 'copy.draft')}
                            </Badge>
                        )}
                        {meal.generatedAt != null ? (
                            <Badge variant="outline" className="w-fit">
                                {t(locale, 'admin', 'copy.generated')}
                            </Badge>
                        ) : null}
                        <Link
                            to="/{-$locale}/admin/users/$userId"
                            params={{ userId: meal.cookId }}
                            search={{ tab: 'meals' }}
                            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                        >
                            {meal.cookName}
                        </Link>
                    </div>

                    {!isDeleted && (meal.imageUrl == null || meal.imageUrl.length === 0) ? (
                        <StatusAlert
                            tone="warning"
                            title={
                                meal.publishedAt != null
                                    ? t(locale, 'admin', 'copy.notOnThePublicPage')
                                    : t(locale, 'admin', 'copy.pictureMissing')
                            }
                            action={
                                <Button asChild size="sm" variant="outline">
                                    <Link to="/{-$locale}/admin/meals/$mealId/edit" params={{ mealId }}>
                                        {t(locale, 'admin', 'copy.addPicture')}
                                    </Link>
                                </Button>
                            }
                        >
                            {meal.publishedAt != null
                                ? t(locale, 'admin', 'copy.withoutAPictureThisMealDoesNotAppearOnThePublicCookPageEvenW')
                                : t(locale, 'admin', 'copy.withoutAPictureThisMealWillNotAppearOnThePublicCookPageOnceP')}
                        </StatusAlert>
                    ) : null}

                    <div className="grid gap-4">
                        <div className="grid gap-1">
                            <h1 className="font-serif text-3xl/tight text-foreground">{meal.title}</h1>
                            {meal.generatedAt != null ? (
                                <p className="text-sm text-muted-foreground">
                                    {t(locale, 'admin', 'copy.generatedOn', {
                                        when: formatDateTime(meal.generatedAt, {
                                            locale,
                                            timeZone,
                                            dateStyle: 'medium',
                                            timeStyle: 'short',
                                        }),
                                    })}
                                </p>
                            ) : null}
                            <p className="text-muted-foreground whitespace-pre-wrap">
                                {meal.description.trim() ? meal.description : t(locale, 'admin', 'copy.noDescription')}
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <p className="text-sm font-medium">{t(locale, 'admin', 'copy.image')}</p>
                            {meal.imageUrl ? (
                                <img src={meal.imageUrl} alt="" className="aspect-square h-auto w-full max-w-sm object-cover" />
                            ) : (
                                <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noImageYet')}</p>
                            )}
                        </div>
                    </div>

                    {relationships.menus.length > 0 ? (
                        <section className="grid gap-3">
                            <h2 className="text-base font-semibold">{t(locale, 'admin', 'copy.usageInMenus')}</h2>
                            <div className="grid gap-3">
                                {menuRelationshipsNonBlocking.map((relationship) => (
                                    <MealRelationshipMenuCard
                                        key={`${relationship.menuId}-${relationship.courseTitle}`}
                                        relationship={relationship}
                                        locale={locale}
                                    />
                                ))}
                                {menuRelationshipsBlocking.map((relationship) => (
                                    <MealRelationshipMenuCard
                                        key={`${relationship.menuId}-${relationship.courseTitle}`}
                                        relationship={relationship}
                                        locale={locale}
                                    />
                                ))}
                            </div>
                        </section>
                    ) : null}

                    {relationships.offers.length > 0 ? (
                        <section className="grid gap-3">
                            <h2 className="text-base font-semibold">{t(locale, 'admin', 'copy.usageInOffers')}</h2>
                            <div className="grid gap-3">
                                {offerRelationshipsNonBlocking.map((relationship) => (
                                    <MealRelationshipOfferCard
                                        key={`${relationship.bookingRequestOfferId}-${relationship.courseTitle}`}
                                        relationship={relationship}
                                        locale={locale}
                                        timeZone={timeZone}
                                    />
                                ))}
                                {offerRelationshipsBlocking.map((relationship) => (
                                    <MealRelationshipOfferCard
                                        key={`${relationship.bookingRequestOfferId}-${relationship.courseTitle}`}
                                        relationship={relationship}
                                        locale={locale}
                                        timeZone={timeZone}
                                    />
                                ))}
                            </div>
                        </section>
                    ) : null}
                </AdminPinnedFooterLayout>
            </AdminPageChrome>

            <AlertDialog open={confirm === 'delete'} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t(locale, 'admin', 'copy.deleteThisMeal')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t(locale, 'admin', 'copy.theMealDisappearsFromTheCookListAdminsCanStillInspectIt')}
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

            <AlertDialog open={confirm === 'delete-blocked'} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t(locale, 'admin', 'copy.mealCanNotBeDeleted')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t(locale, 'admin', 'copy.thisDishIsTheOnlyDishInItsCourseInAtLeastOneMenuAndTherefore')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setConfirm(null)}>{t(locale, 'admin', 'copy.done')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirm === 'publish'} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t(locale, 'admin', 'copy.publishThisMeal')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {meal.imageUrl == null || meal.imageUrl.length === 0
                                ? t(locale, 'admin', 'copy.theMealWillBeMarkedPublishedWithoutAPictureItStillWillNotApp')
                                : t(locale, 'admin', 'copy.theMealWillBeMarkedPublishedAndAppearOnThePublicCookPage')}
                        </AlertDialogDescription>
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
