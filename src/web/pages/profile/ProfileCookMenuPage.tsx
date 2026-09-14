import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { MoreHorizontalIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

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
import { CookMealCard } from '../../components/CookMealCard';
import { ProfilePinnedFooterLayout } from '../../components/ProfilePinnedFooterLayout';
import type { GqlCProfileCookMenuPageQuery } from '../../graphql/generated';
import {
    ProfileCookMenuPageUpdatesDocument,
    ProfileMenuCopyDocument,
    ProfileMenuDeleteDocument,
    ProfileMenuSyncToTemplateDocument,
    ProfileMenuUpdateDocument,
} from '../../graphql/generated';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { cookStubRouteBySlug } from './cookCatalog';

const menusRoute = cookStubRouteBySlug('menus');

export const profileCookMenuPageTitle = {
    de: 'Menü ansehen, veröffentlichen oder löschen',
    en: 'View, publish, or delete a menu',
} as const;
export const profileCookMenuPageDescription = {
    de: 'Titel, Beschreibung, Gänge und Veröffentlichung verwalten.',
    en: 'Manage title, description, courses, and publication.',
} as const;

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
    locale: 'de' | 'en',
): SyncChange[] {
    const emptyMeal = { de: '(kein Gericht)', en: '(no meal)' }[locale];
    const untitledCourse = { de: 'Unbenannter Gang', en: 'Untitled course' }[locale];
    const changes: SyncChange[] = [];

    if (offerMenu.title.trim() !== template.title.trim()) {
        changes.push({
            label: { de: 'Titel', en: 'Title' }[locale],
            from: template.title.trim() || { de: '(leer)', en: '(empty)' }[locale],
            to: offerMenu.title.trim() || { de: '(leer)', en: '(empty)' }[locale],
        });
    }

    if (offerMenu.description.trim() !== template.description.trim()) {
        changes.push({
            label: { de: 'Beschreibung', en: 'Description' }[locale],
            from: template.description.trim() || { de: '(leer)', en: '(empty)' }[locale],
            to: offerMenu.description.trim() || { de: '(leer)', en: '(empty)' }[locale],
        });
    }

    const maxCourses = Math.max(offerMenu.courses.length, template.courses.length);
    for (let index = 0; index < maxCourses; index += 1) {
        const offerCourse = offerMenu.courses[index];
        const templateCourse = template.courses[index];
        const courseLabel = { de: `Gang ${index + 1}`, en: `Course ${index + 1}` }[locale];

        if (offerCourse == null && templateCourse != null) {
            changes.push({
                label: courseLabel,
                from: templateCourse.title.trim() || untitledCourse,
                to: { de: '(entfernt)', en: '(removed)' }[locale],
            });
            continue;
        }
        if (offerCourse != null && templateCourse == null) {
            changes.push({
                label: courseLabel,
                from: { de: '(neu)', en: '(new)' }[locale],
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
                fromParts.push({ de: `Auswahl bis ${templateLimit}`, en: `Pick up to ${templateLimit}` }[locale]);
                toParts.push({ de: `Auswahl bis ${offerLimit}`, en: `Pick up to ${offerLimit}` }[locale]);
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

    const [, updateMenu] = useMutation(ProfileMenuUpdateDocument);
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
            const result = await updateMenu({
                menuId,
                menu: { publishedAt: next },
            });
            if (result.error || !result.data?.user.cook.menuUpdate.success) {
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
            if (result.error || !result.data?.user.cook.menuDelete.success) {
                throw new Error('delete failed');
            }
            toast.success({ de: 'Gelöscht.', en: 'Deleted.' }[locale]);
            await navigate({ to: menusRoute.to });
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
            const newMenuId = result.data?.user.cook.menuCopy.referenceId;
            if (!newMenuId || result.error) throw new Error('copy failed');
            toast.success({ de: 'Menü kopiert.', en: 'Menu copied.' }[locale]);
            await navigate({ to: '/{-$locale}/profile/menus/$menuId', params: { menuId: newMenuId } });
        } catch {
            toast.error({ de: 'Kopieren fehlgeschlagen.', en: 'Could not copy.' }[locale]);
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
            toast.success({ de: 'Vorlage aktualisiert.', en: 'Template updated.' }[locale]);
            await navigate({ to: '/{-$locale}/profile/menus/$menuId', params: { menuId: templateMenuId } });
        } catch {
            toast.error({ de: 'Sync fehlgeschlagen.', en: 'Could not sync.' }[locale]);
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
                                        aria-label={{ de: 'Weitere Aktionen', en: 'More actions' }[locale]}
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
                                                {{ de: 'Angebot öffnen', en: 'Open offer' }[locale]}
                                            </Link>
                                        </DropdownMenuItem>
                                    ) : null}
                                    {canSyncToTemplate ? (
                                        <DropdownMenuItem disabled={busy} onSelect={() => setConfirm('sync')}>
                                            {{ de: 'In Vorlage übernehmen', en: 'Sync to template' }[locale]}
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
                                        aria-label={{ de: 'Weitere Aktionen', en: 'More actions' }[locale]}
                                    >
                                        <MoreHorizontalIcon className="size-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem disabled={busy} onSelect={() => void onCopy()}>
                                        {{ de: 'Kopieren', en: 'Copy' }[locale]}
                                    </DropdownMenuItem>
                                    {publicationEnabled && menu.publishedAt != null ? (
                                        <DropdownMenuItem disabled={busy} onSelect={() => void setPublished(null)}>
                                            {{ de: 'Zurückziehen', en: 'Unpublish' }[locale]}
                                        </DropdownMenuItem>
                                    ) : null}
                                    <DropdownMenuItem variant="destructive" disabled={busy} onSelect={() => setConfirm('delete')}>
                                        {{ de: 'Löschen', en: 'Delete' }[locale]}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {!isOfferMenu && publicationEnabled && menu.publishedAt == null ? (
                            <Button type="button" variant="outline" disabled={busy || !canPublish} onClick={() => setConfirm('publish')}>
                                {{ de: 'Veröffentlichen', en: 'Publish' }[locale]}
                            </Button>
                        ) : null}

                        {(!isOfferMenu || canEditOfferMenu) && (
                            <Button asChild>
                                <Link to="/{-$locale}/profile/menus/$menuId/edit" params={{ menuId }}>
                                    {{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                                </Link>
                            </Button>
                        )}
                    </>
                }
            >
                {isOfferMenu ? (
                    <div className="flex">
                        <Badge variant="outline">{{ de: 'Angebotsmenü', en: 'Offer menu' }[locale]}</Badge>
                    </div>
                ) : publicationEnabled ? (
                    <div className="flex">
                        <Badge variant="outline">
                            {menu.publishedAt ? { de: 'Veröffentlicht', en: 'Published' }[locale] : { de: 'Entwurf', en: 'Draft' }[locale]}
                        </Badge>
                    </div>
                ) : null}

                {isOfferMenu ? (
                    <StatusAlert tone="info" title={{ de: 'Kopie für ein Angebot', en: 'Per-offer copy' }[locale]}>
                        <p>
                            {
                                {
                                    de: 'Dieses Menü gehört zu einem Angebot. Änderungen an der Vorlage gelten hier nicht automatisch.',
                                    en: 'This menu belongs to an offer. Edits to the library template do not apply here automatically.',
                                }[locale]
                            }
                        </p>
                        {offerMeta != null ? <p className="mt-1">{offerMeta}</p> : null}
                        {!canEditOfferMenu ? (
                            <p className="mt-1">
                                {
                                    {
                                        de: 'Das Angebot ist nicht mehr in Verhandlung. Du kannst die Kopie ansehen und in die Vorlage übernehmen.',
                                        en: 'This offer is no longer negotiable. You can view the copy and sync it to the template.',
                                    }[locale]
                                }
                            </p>
                        ) : null}
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
                    {!isOfferMenu && incompleteCourseCount > 0 ? (
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
                                            {course.title.trim() ? course.title : { de: 'Unbenannter Gang', en: 'Untitled course' }[locale]}
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
                        <AlertDialogTitle>{{ de: 'Menü löschen?', en: 'Delete this menu?' }[locale]}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {
                                {
                                    de: 'Das Menü verschwindet aus deiner Liste. Admins können es weiterhin einsehen.',
                                    en: 'The menu disappears from your list. Admins can still inspect it.',
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

            <AlertDialog open={confirm === 'sync'} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent className="max-w-lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{{ de: 'In Vorlage übernehmen?', en: 'Sync to template?' }[locale]}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {
                                {
                                    de: 'Diese Werte der Bibliotheks-Vorlage werden durch das Angebotsmenü ersetzt.',
                                    en: 'These library template values will be replaced by the offer menu.',
                                }[locale]
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {syncChanges.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Keine Unterschiede zur Vorlage. Übernehmen ändert nichts.',
                                    en: 'No differences from the template. Syncing will not change anything.',
                                }[locale]
                            }
                        </p>
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
                        <AlertDialogCancel>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction disabled={busy || syncChanges.length === 0} onClick={() => void onSyncToTemplate()}>
                            {{ de: 'Übernehmen', en: 'Sync' }[locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
