import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { CircleAlertIcon, LockIcon, MoreHorizontalIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

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
import { AdminMealDeleteDocument, AdminMealPageUpdatesDocument, AdminMealUpdateDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';

export const adminMealPageTitle = {
    de: 'Gericht ansehen, veröffentlichen oder löschen',
    en: 'View, publish, or delete a meal',
} as const;
export const adminMealPageDescription = {
    de: 'Gericht eines Kochs verwalten (inkl. gelöschter).',
    en: 'Manage a cook meal (including deleted).',
} as const;

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
                            {{ de: 'Menü ansehen', en: 'View menu' }[locale]}
                        </Link>
                    </p>
                </div>
                {relationship.blocksDeletion ? <LockIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
            </div>
            {relationship.blocksDeletion ? (
                <StatusAlert tone="warning">
                    {
                        {
                            de: 'Um dieses Gericht zu entfernen, bearbeite das Menü und ersetze es durch ein anderes Gericht.',
                            en: 'To remove this dish, edit the menu and replace it with another dish.',
                        }[locale]
                    }
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
                        {
                            {
                                de: `Angebot für ${relationship.bookingRequestUserName}`,
                                en: `Offer for ${relationship.bookingRequestUserName}`,
                            }[locale]
                        }
                        {' · '}
                        {formatBookingDateTime(relationship.bookingRequestDateTime, locale, timeZone)}
                    </p>
                </div>
                {relationship.blocksDeletion ? <LockIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
            </div>
            {relationship.blocksDeletion ? (
                <div className="flex gap-2 text-sm text-muted-foreground">
                    <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <p>
                        {
                            {
                                de: 'Dieses Gericht ist in diesem Angebotsmenü die einzige Option im Gang und blockiert das Löschen.',
                                en: 'This dish is the only option on that course in the offer menu and blocks deletion.',
                            }[locale]
                        }
                    </p>
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
    const [, updateMeal] = useMutation(AdminMealUpdateDocument);
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
            const result = await updateMeal({ mealId, meal: { publishedAt: next } });
            if (result.error || !result.data?.admin.cookMealUpdate.success) {
                throw new Error('publish failed');
            }
            toast.success(
                next ? { de: 'Veröffentlicht.', en: 'Published.' }[locale] : { de: 'Zurückgezogen.', en: 'Unpublished.' }[locale],
            );
        } catch {
            toast.error({ de: 'Aktion fehlgeschlagen.', en: 'Action failed.' }[locale]);
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
            toast.success({ de: 'Gelöscht.', en: 'Deleted.' }[locale]);
            await navigate({ to: '/{-$locale}/admin/meals' });
        } catch {
            toast.error({ de: 'Löschen fehlgeschlagen.', en: 'Could not delete.' }[locale]);
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <AdminPageChrome
                crumbs={[{ label: { de: 'Gerichte', en: 'Meals' }[locale], to: '/{-$locale}/admin/meals' }, { label: meal.title }]}
                contentClassName="min-h-0 overflow-hidden gap-0"
            >
                <AdminPinnedFooterLayout
                    contentClassName="grid w-full max-w-2xl content-start gap-6"
                    footer={
                        isDeleted ? (
                            <Button type="button" variant="outline" asChild>
                                <Link to="/{-$locale}/admin/meals">{{ de: 'Zur Liste', en: 'Back to list' }[locale]}</Link>
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
                                            aria-label={{ de: 'Weitere Aktionen', en: 'More actions' }[locale]}
                                        >
                                            <MoreHorizontalIcon className="size-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {meal.publishedAt != null ? (
                                            <DropdownMenuItem disabled={busy} onSelect={() => void setPublished(null)}>
                                                {{ de: 'Zurückziehen', en: 'Unpublish' }[locale]}
                                            </DropdownMenuItem>
                                        ) : null}
                                        <DropdownMenuItem
                                            variant="destructive"
                                            disabled={busy}
                                            onSelect={() =>
                                                setConfirm(relationships.deletionBlockedByRelationships ? 'delete-blocked' : 'delete')
                                            }
                                        >
                                            {{ de: 'Löschen', en: 'Delete' }[locale]}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {meal.publishedAt == null ? (
                                    <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirm('publish')}>
                                        {{ de: 'Veröffentlichen', en: 'Publish' }[locale]}
                                    </Button>
                                ) : null}

                                <Button asChild>
                                    <Link to="/{-$locale}/admin/meals/$mealId/edit" params={{ mealId }}>
                                        {{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                                    </Link>
                                </Button>
                            </>
                        )
                    }
                >
                    <div className="flex flex-wrap items-center gap-2">
                        {isDeleted ? (
                            <Badge variant="destructive" className="w-fit">
                                {{ de: 'Gelöscht', en: 'Deleted' }[locale]}
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="w-fit">
                                {meal.publishedAt
                                    ? { de: 'Veröffentlicht', en: 'Published' }[locale]
                                    : { de: 'Entwurf', en: 'Draft' }[locale]}
                            </Badge>
                        )}
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
                                    ? { de: 'Nicht auf der öffentlichen Seite', en: 'Not on the public page' }[locale]
                                    : { de: 'Bild fehlt', en: 'Picture missing' }[locale]
                            }
                            action={
                                <Button asChild size="sm" variant="outline">
                                    <Link to="/{-$locale}/admin/meals/$mealId/edit" params={{ mealId }}>
                                        {{ de: 'Bild hinzufügen', en: 'Add picture' }[locale]}
                                    </Link>
                                </Button>
                            }
                        >
                            {meal.publishedAt != null
                                ? {
                                      de: 'Ohne Bild erscheint dieses Gericht nicht auf der öffentlichen Kochseite, auch wenn es veröffentlicht ist.',
                                      en: 'Without a picture, this meal does not appear on the public cook page, even when published.',
                                  }[locale]
                                : {
                                      de: 'Ohne Bild erscheint dieses Gericht nicht auf der öffentlichen Kochseite, sobald es veröffentlicht ist.',
                                      en: 'Without a picture, this meal will not appear on the public cook page once published.',
                                  }[locale]}
                        </StatusAlert>
                    ) : null}

                    <div className="grid gap-4">
                        <div className="grid gap-1">
                            <h1 className="font-serif text-3xl/tight text-foreground">{meal.title}</h1>
                            <p className="text-muted-foreground whitespace-pre-wrap">
                                {meal.description.trim() ? meal.description : { de: 'Keine Beschreibung.', en: 'No description.' }[locale]}
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <p className="text-sm font-medium">{{ de: 'Bild', en: 'Image' }[locale]}</p>
                            {meal.imageUrl ? (
                                <img src={meal.imageUrl} alt="" className="aspect-square h-auto w-full max-w-sm object-cover" />
                            ) : (
                                <p className="text-sm text-muted-foreground">{{ de: 'Noch kein Bild.', en: 'No image yet.' }[locale]}</p>
                            )}
                        </div>
                    </div>

                    {relationships.menus.length > 0 ? (
                        <section className="grid gap-3">
                            <h2 className="text-base font-semibold">{{ de: 'Verwendung in Menüs', en: 'Usage in menus' }[locale]}</h2>
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
                            <h2 className="text-base font-semibold">{{ de: 'Verwendung in Angeboten', en: 'Usage in offers' }[locale]}</h2>
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
                        <AlertDialogTitle>{{ de: 'Gericht löschen?', en: 'Delete this meal?' }[locale]}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {
                                {
                                    de: 'Das Gericht verschwindet aus der Kochliste. Admins können es weiterhin einsehen.',
                                    en: 'The meal disappears from the cook list. Admins can still inspect it.',
                                }[locale]
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => void onDelete()}>
                            {{ de: 'Löschen', en: 'Delete' }[locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirm === 'delete-blocked'} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {{ de: 'Gericht kann nicht gelöscht werden', en: 'Meal can not be deleted' }[locale]}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {
                                {
                                    de: 'Dieses Gericht ist in mindestens einem Menü das einzige Gericht in einem Gang und kann darum nicht gelöscht werden. Aktualisiere die betroffenen Menüs, indem du den Gang löschst, ihm andere Gerichte hinzufügst oder das Gericht dort ersetzt.',
                                    en: 'This dish is the only dish in its course in at least one menu and therefore cannot be deleted. Update the affected menus by deleting the course, adding other dish options to it, or replacing the dish there.',
                                }[locale]
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setConfirm(null)}>{{ de: 'Fertig', en: 'Done' }[locale]}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirm === 'publish'} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{{ de: 'Gericht veröffentlichen?', en: 'Publish this meal?' }[locale]}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {meal.imageUrl == null || meal.imageUrl.length === 0
                                ? {
                                      de: 'Das Gericht wird als veröffentlicht markiert. Ohne Bild erscheint es trotzdem nicht auf der öffentlichen Kochseite.',
                                      en: 'The meal will be marked published. Without a picture, it still will not appear on the public cook page.',
                                  }[locale]
                                : {
                                      de: 'Das Gericht wird als veröffentlicht markiert und erscheint auf der öffentlichen Kochseite.',
                                      en: 'The meal will be marked published and appear on the public cook page.',
                                  }[locale]}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void setPublished(new Date().toISOString())}>
                            {{ de: 'Veröffentlichen', en: 'Publish' }[locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
