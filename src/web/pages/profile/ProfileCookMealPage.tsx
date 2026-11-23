import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { CircleAlertIcon, LockIcon, MoreHorizontalIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import type { Locale } from '../../../shared';
import { formatDateTime } from '../../../shared';
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
import { ProfilePinnedFooterLayout } from '../../components/ProfilePinnedFooterLayout';
import type { GqlCProfileCookMealPageQuery } from '../../graphql/generated';
import { ProfileCookMealPageUpdatesDocument, ProfileMealDeleteDocument, ProfileMealUpsertDocument } from '../../graphql/generated';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { cookStubRouteBySlug } from './cookCatalog';

const mealsRoute = cookStubRouteBySlug('meals');

export function profileCookMealPageTitle(locale: Locale): string {
    return t(locale, 'profileCook', 'meal.seoTitle');
}
export function profileCookMealPageDescription(locale: Locale): string {
    return t(locale, 'profileCook', 'meal.seoDescription');
}

type MealRow = NonNullable<NonNullable<NonNullable<GqlCProfileCookMealPageQuery['currentSession']['user']>['cook']>['meal']>;
type MealRelationships = MealRow['relationships'];
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
                            to="/{-$locale}/profile/menus/$menuId"
                            params={{ menuId: relationship.menuId }}
                            className="text-accent underline-offset-4 hover:underline"
                        >
                            {t(locale, 'profileCook', 'meal.viewMenu')}
                        </Link>
                    </p>
                </div>
                {relationship.blocksDeletion ? <LockIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
            </div>
            {relationship.blocksDeletion ? (
                <StatusAlert tone="warning">{t(locale, 'profileCook', 'meal.removeFromMenuHint')}</StatusAlert>
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
                        {t(locale, 'profileCook', 'meal.offerFor', { name: relationship.bookingRequestUserName })}
                        {' · '}
                        {formatBookingDateTime(relationship.bookingRequestDateTime, locale, timeZone)}
                    </p>
                </div>
                {relationship.blocksDeletion ? <LockIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
            </div>
            {relationship.blocksDeletion ? (
                <div className="flex gap-2 text-sm text-muted-foreground">
                    <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <p>{t(locale, 'profileCook', 'meal.onlyCourseOption')}</p>
                </div>
            ) : null}
        </div>
    );
}

export function ProfileCookMealPage({ data, mealId }: { data: GqlCProfileCookMealPageQuery; mealId: string }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate();
    const publicationEnabled = useFeatureToggleActive('PUBLICATION_MEALS');
    const seedUser = data.currentSession.user ?? null;
    const seedMeal = seedUser?.cook?.meal ?? null;
    if (!seedMeal) throw notFound();

    const user = useUserUpdatesSeed(seedUser, ProfileCookMealPageUpdatesDocument, { mealId });
    const meal = user?.cook?.meal ?? null;

    const [, upsertMeal] = useMutation(ProfileMealUpsertDocument);
    const [, deleteMeal] = useMutation(ProfileMealDeleteDocument);
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState<'delete' | 'delete-blocked' | 'publish' | null>(null);

    useEffect(() => {
        if (user == null) return;
        if (meal == null) {
            void navigate({ to: mealsRoute.to });
        }
    }, [meal, navigate, user]);

    if (meal == null) {
        return null;
    }

    const relationships = meal.relationships;
    const menuRelationshipsNonBlocking = relationships.menus.filter(({ blocksDeletion }) => !blocksDeletion);
    const menuRelationshipsBlocking = relationships.menus.filter(({ blocksDeletion }) => blocksDeletion);
    const offerRelationshipsNonBlocking = relationships.offers.filter(({ blocksDeletion }) => !blocksDeletion);
    const offerRelationshipsBlocking = relationships.offers.filter(({ blocksDeletion }) => blocksDeletion);

    async function setPublished(next: string | null) {
        setBusy(true);
        try {
            const result = await upsertMeal({ meal: { mealId, publishedAt: next } });
            if (result.error || !result.data?.user.cook.mealUpsert.success) {
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
            const result = await deleteMeal({ mealId });
            if (result.error || !result.data?.user.cook.mealDelete.success) {
                throw new Error('delete failed');
            }
            toast.success(t(locale, 'profileCook', 'actions.deleted'));
            await navigate({ to: mealsRoute.to });
        } catch {
            toast.error(t(locale, 'profileCook', 'actions.deleteFailed'));
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <ProfilePinnedFooterLayout
                contentClassName="grid w-full max-w-2xl content-start gap-6"
                footer={
                    <>
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
                                {publicationEnabled && meal.publishedAt != null ? (
                                    <DropdownMenuItem disabled={busy} onSelect={() => void setPublished(null)}>
                                        {t(locale, 'profileCook', 'actions.unpublish')}
                                    </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuItem
                                    variant="destructive"
                                    disabled={busy}
                                    onSelect={() => setConfirm(relationships.deletionBlockedByRelationships ? 'delete-blocked' : 'delete')}
                                >
                                    {t(locale, 'profileCook', 'actions.delete')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {publicationEnabled && meal.publishedAt == null ? (
                            <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirm('publish')}>
                                {t(locale, 'profileCook', 'actions.publish')}
                            </Button>
                        ) : null}

                        <Button asChild>
                            <Link to="/{-$locale}/profile/meals/$mealId/edit" params={{ mealId }}>
                                {t(locale, 'profileCook', 'actions.edit')}
                            </Link>
                        </Button>
                    </>
                }
            >
                {publicationEnabled || meal.generatedAt != null ? (
                    <div className="flex flex-wrap items-center gap-2">
                        {publicationEnabled ? (
                            <Badge variant="outline" className="w-fit">
                                {meal.publishedAt ? t(locale, 'profileCook', 'meals.published') : t(locale, 'profileCook', 'meals.draft')}
                            </Badge>
                        ) : null}
                        {meal.generatedAt != null ? (
                            <Badge variant="outline" className="w-fit">
                                {t(locale, 'profileCook', 'actions.generated')}
                            </Badge>
                        ) : null}
                    </div>
                ) : null}

                {meal.imageUrl == null || meal.imageUrl.length === 0 ? (
                    <StatusAlert
                        tone="warning"
                        title={
                            meal.publishedAt != null
                                ? t(locale, 'profileCook', 'meal.notOnPublicPage')
                                : t(locale, 'profileCook', 'meal.pictureMissing')
                        }
                        action={
                            <Button asChild size="sm" variant="outline">
                                <Link to="/{-$locale}/profile/meals/$mealId/edit" params={{ mealId }}>
                                    {t(locale, 'profileCook', 'meal.addPicture')}
                                </Link>
                            </Button>
                        }
                    >
                        {meal.publishedAt != null
                            ? t(locale, 'profileCook', 'meal.noPicturePublished')
                            : t(locale, 'profileCook', 'meal.noPictureWillHide')}
                    </StatusAlert>
                ) : null}

                <div className="grid gap-4">
                    <div className="grid gap-1">
                        <h1 className="font-serif text-3xl/tight text-foreground">{meal.title}</h1>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                            {meal.description.trim() ? meal.description : t(locale, 'profileCook', 'actions.noDescription')}
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <p className="text-sm font-medium">{t(locale, 'profileCook', 'actions.image')}</p>
                        {meal.imageUrl ? (
                            <img
                                src={meal.imageUrl}
                                alt={t(locale, 'common', 'imageAlt.photoOf', { name: meal.title })}
                                className="aspect-square h-auto w-full max-w-sm object-cover"
                            />
                        ) : (
                            <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'actions.noImage')}</p>
                        )}
                    </div>
                </div>

                {relationships.menus.length > 0 ? (
                    <section className="grid gap-3">
                        <h2 className="text-base font-semibold">{t(locale, 'profileCook', 'meal.usageInMenus')}</h2>
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
                        <h2 className="text-base font-semibold">{t(locale, 'profileCook', 'meal.usageInOffers')}</h2>
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
            </ProfilePinnedFooterLayout>

            <AlertDialog open={confirm === 'delete'} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t(locale, 'profileCook', 'meal.deleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t(locale, 'profileCook', 'meal.deleteBody')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t(locale, 'common', 'cancel')}</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => void onDelete()}>
                            {t(locale, 'profileCook', 'actions.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirm === 'delete-blocked'} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t(locale, 'profileCook', 'meal.cannotDeleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t(locale, 'profileCook', 'meal.cannotDeleteBody')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setConfirm(null)}>{t(locale, 'profileCook', 'actions.done')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirm === 'publish'} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t(locale, 'profileCook', 'meal.publishTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {meal.imageUrl == null || meal.imageUrl.length === 0
                                ? t(locale, 'profileCook', 'meal.publishNoPicture')
                                : t(locale, 'profileCook', 'meal.publishWithPicture')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t(locale, 'common', 'cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void setPublished(new Date().toISOString())}>
                            {t(locale, 'profileCook', 'actions.publish')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
