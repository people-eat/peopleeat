import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { MoreHorizontalIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

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
    AdminMenuUpdateDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';

export const adminMenuPageTitle = {
    de: 'Menü ansehen, veröffentlichen oder löschen',
    en: 'View, publish, or delete a menu',
} as const;
export const adminMenuPageDescription = {
    de: 'Menü eines Kochs verwalten (inkl. gelöschter).',
    en: 'Manage a cook menu (including deleted).',
} as const;

type AdminMenu = NonNullable<NonNullable<NonNullable<GqlCAdminMenuPageQuery['currentSession']['user']>['admin']>['cookMenu']>;

function coursesReadyToPublish(menu: AdminMenu): boolean {
    return menu.courses.length >= 1 && menu.courses.every((course) => course.title.trim().length > 0 && course.mealOptions.length >= 1);
}

export function AdminMenuPage({ data, menuId }: { data: GqlCAdminMenuPageQuery; menuId: string }) {
    const locale = useLocale();
    const navigate = useNavigate();
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const seedMenu = seedAdmin?.cookMenu ?? null;
    if (!seedMenu) throw notFound();

    const [menu, setMenu] = useState(seedMenu);
    const [, updateMenu] = useMutation(AdminMenuUpdateDocument);
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
            const result = await updateMenu({ menuId, menu: { publishedAt: next } });
            if (result.error || !result.data?.admin.cookMenuUpdate.success) {
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
            const result = await deleteMenu({ menuId });
            if (result.error || !result.data?.admin.cookMenuDelete.success) {
                throw new Error('delete failed');
            }
            toast.success({ de: 'Gelöscht.', en: 'Deleted.' }[locale]);
            await navigate({ to: '/{-$locale}/admin/menus' });
        } catch {
            toast.error({ de: 'Löschen fehlgeschlagen.', en: 'Could not delete.' }[locale]);
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
            toast.success({ de: 'Menü kopiert.', en: 'Menu copied.' }[locale]);
            await navigate({ to: '/{-$locale}/admin/menus/$menuId', params: { menuId: newMenuId } });
        } catch {
            toast.error({ de: 'Kopieren fehlgeschlagen.', en: 'Could not copy.' }[locale]);
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <AdminPageChrome
                crumbs={[{ label: { de: 'Menüs', en: 'Menus' }[locale], to: '/{-$locale}/admin/menus' }, { label: menu.title }]}
                contentClassName="min-h-0 overflow-hidden gap-0"
            >
                <AdminPinnedFooterLayout
                    contentClassName="grid w-full max-w-2xl content-start gap-6"
                    footer={
                        isDeleted ? (
                            <Button type="button" variant="outline" asChild>
                                <Link to="/{-$locale}/admin/menus">{{ de: 'Zur Liste', en: 'Back to list' }[locale]}</Link>
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
                                                aria-label={{ de: 'Weitere Aktionen', en: 'More actions' }[locale]}
                                            >
                                                <MoreHorizontalIcon className="size-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem disabled={busy} onSelect={() => void onCopy()}>
                                                {{ de: 'Kopieren', en: 'Copy' }[locale]}
                                            </DropdownMenuItem>
                                            {menu.publishedAt != null ? (
                                                <DropdownMenuItem disabled={busy} onSelect={() => void setPublished(null)}>
                                                    {{ de: 'Zurückziehen', en: 'Unpublish' }[locale]}
                                                </DropdownMenuItem>
                                            ) : null}
                                            <DropdownMenuItem variant="destructive" disabled={busy} onSelect={() => setConfirm('delete')}>
                                                {{ de: 'Löschen', en: 'Delete' }[locale]}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : menu.copyOfMenuId != null ? (
                                    <Button type="button" variant="outline" asChild>
                                        <Link to="/{-$locale}/admin/menus/$menuId" params={{ menuId: menu.copyOfMenuId }}>
                                            {{ de: 'Vorlage öffnen', en: 'Open template' }[locale]}
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
                                        {{ de: 'Veröffentlichen', en: 'Publish' }[locale]}
                                    </Button>
                                ) : null}

                                <Button asChild>
                                    <Link to="/{-$locale}/admin/menus/$menuId/edit" params={{ menuId }}>
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
                        ) : isOfferMenu ? (
                            <Badge variant="outline" className="w-fit">
                                {{ de: 'Angebotsmenü', en: 'Offer menu' }[locale]}
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="w-fit">
                                {menu.publishedAt
                                    ? { de: 'Veröffentlicht', en: 'Published' }[locale]
                                    : { de: 'Entwurf', en: 'Draft' }[locale]}
                            </Badge>
                        )}
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
                        <StatusAlert tone="info" title={{ de: 'Kopie für ein Angebot', en: 'Per-offer copy' }[locale]}>
                            {
                                {
                                    de: 'Dieses Menü gehört zu einem Angebot. Du kannst Titel, Beschreibung und Gänge bearbeiten. Veröffentlichen, Kopieren und Löschen gelten nur für Vorlagen.',
                                    en: 'This menu belongs to an offer. You can edit title, description, and courses. Publish, copy, and delete apply only to library templates.',
                                }[locale]
                            }
                        </StatusAlert>
                    ) : null}

                    <div className="grid gap-1">
                        <h1 className="font-serif text-3xl/tight text-foreground">{menu.title}</h1>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                            {menu.description.trim() ? menu.description : { de: 'Keine Beschreibung.', en: 'No description.' }[locale]}
                        </p>
                    </div>

                    <section className="grid gap-3">
                        <div>
                            <h2 className="text-base font-semibold">{{ de: 'Gänge', en: 'Courses' }[locale]}</h2>
                            <p className="text-sm text-muted-foreground">
                                {
                                    {
                                        de: 'Pro Gang wählen Gäste aus den angebotenen Gerichten. Mehrfachauswahl ist am Gang gekennzeichnet.',
                                        en: 'Guests pick from the meals in each course. Courses that allow multiple dishes say so next to the title.',
                                    }[locale]
                                }
                            </p>
                        </div>
                        {canEdit && incompleteCourseCount > 0 ? (
                            <StatusAlert
                                tone="warning"
                                title={
                                    incompleteCourseCount === 1
                                        ? { de: '1 Gang ist unvollständig', en: '1 course is incomplete' }[locale]
                                        : {
                                              de: `${incompleteCourseCount} Gänge sind unvollständig`,
                                              en: `${incompleteCourseCount} courses are incomplete`,
                                          }[locale]
                                }
                            >
                                {
                                    {
                                        de: 'Zum Veröffentlichen braucht jeder Gang mindestens ein Gericht.',
                                        en: 'To publish, every course needs at least one meal.',
                                    }[locale]
                                }
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
                                                {course.title.trim()
                                                    ? course.title
                                                    : { de: 'Unbenannter Gang', en: 'Untitled course' }[locale]}
                                            </p>
                                            {isMultiSelect ? (
                                                <Badge variant="outline">
                                                    {
                                                        {
                                                            de: `Bis zu ${selectionLimit} Gerichte auswählbar`,
                                                            en: `Up to ${selectionLimit} dishes selectable`,
                                                        }[locale]
                                                    }
                                                </Badge>
                                            ) : course.mealOptions.length > 1 ? (
                                                <span className="text-sm text-muted-foreground">
                                                    {{ de: '1 Gericht auswählbar', en: '1 dish selectable' }[locale]}
                                                </span>
                                            ) : null}
                                        </div>
                                        {course.mealOptions.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">
                                                {{ de: 'Keine Gerichte.', en: 'No meals.' }[locale]}
                                            </p>
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
                        <AlertDialogTitle>{{ de: 'Menü löschen?', en: 'Delete this menu?' }[locale]}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {
                                {
                                    de: 'Das Menü verschwindet aus der Kochliste. Admins können es weiterhin einsehen.',
                                    en: 'The menu disappears from the cook list. Admins can still inspect it.',
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

            <AlertDialog open={confirm === 'publish'} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{{ de: 'Menü veröffentlichen?', en: 'Publish this menu?' }[locale]}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {
                                {
                                    de: 'Das Menü wird als veröffentlicht markiert.',
                                    en: 'The menu will be marked published.',
                                }[locale]
                            }
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
