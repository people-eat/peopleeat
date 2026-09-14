import { useForm, useSelector } from '@tanstack/react-form';
import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Button } from '../../components/base/button';
import { Input } from '../../components/base/input';
import { StatusAlert } from '../../components/base/status-alert';
import { Textarea } from '../../components/base/textarea';
import type { CookMealEditorSaveHandlers } from '../../components/CookMealEditorDialog';
import { CookMenuCoursesEditor } from '../../components/CookMenuCoursesEditor';
import type { CookMenuCourseDraft } from '../../components/CookMenuCoursesEditor';
import type { GqlCAdminMenuEditPageQuery } from '../../graphql/generated';
import {
    AdminMenuEditMealCreateDocument,
    AdminMenuEditMealUpdateDocument,
    AdminMenuEditPageUpdatesDocument,
    AdminMenuUpdateDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';

export const adminMenuEditPageTitle = {
    de: 'Menü bearbeiten',
    en: 'Edit menu',
} as const;
export const adminMenuEditPageDescription = {
    de: 'Titel, Beschreibung und Gänge bearbeiten.',
    en: 'Edit title, description, and courses.',
} as const;

type AdminMenu = NonNullable<NonNullable<NonNullable<GqlCAdminMenuEditPageQuery['currentSession']['user']>['admin']>['cookMenu']>;

type MenuFormValues = {
    title: string;
    description: string;
    courses: CookMenuCourseDraft[];
};

function formFromMenu(menu: AdminMenu): MenuFormValues {
    return {
        title: menu.title,
        description: menu.description,
        courses: menu.courses.map((course) => ({
            courseId: course.courseId,
            title: course.title,
            mealIds: course.mealOptions.map((meal) => meal.mealId),
            mealSelectionLimit: course.mealSelectionLimit ?? null,
        })),
    };
}

export function adminMenuEditPageVariables(menuId: string, cookId: string) {
    return { menuId, cookId };
}

export function AdminMenuEditPage({ data, menuId, cookId }: { data: GqlCAdminMenuEditPageQuery; menuId: string; cookId: string }) {
    const locale = useLocale();
    const navigate = useNavigate();
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const seedMenu = seedAdmin?.cookMenu ?? null;
    if (!seedMenu) throw notFound();
    if (seedMenu.deletedAt != null) throw notFound();

    const [menu, setMenu] = useState(seedMenu);
    const [meals, setMeals] = useState(seedAdmin?.cookMeals ?? []);
    const [, updateMenu] = useMutation(AdminMenuUpdateDocument);
    const [, createMeal] = useMutation(AdminMenuEditMealCreateDocument);
    const [, updateMeal] = useMutation(AdminMenuEditMealUpdateDocument);

    const mealSaveHandlers = useMemo<CookMealEditorSaveHandlers>(
        () => ({
            async createMeal() {
                const created = await createMeal({ cookId });
                const mealId = created.data?.admin.cookMealCreate.referenceId;
                if (created.error || !created.data?.admin.cookMealCreate.success || mealId == null) {
                    throw new Error('meal create failed');
                }
                return mealId;
            },
            async updateMeal(mealId, meal) {
                const updated = await updateMeal({ mealId, meal });
                if (updated.error || !updated.data?.admin.cookMealUpdate.success) {
                    throw new Error('meal update failed');
                }
            },
        }),
        [cookId, createMeal, updateMeal],
    );

    const form = useForm({
        defaultValues: formFromMenu(seedMenu),
        onSubmit: async ({ value }) => {
            try {
                const result = await updateMenu({
                    menuId,
                    menu: {
                        title: value.title,
                        description: value.description,
                        courses: value.courses.map((course) => ({
                            title: course.title,
                            mealIds: course.mealIds,
                            mealSelectionLimit: course.mealSelectionLimit,
                        })),
                    },
                });
                if (result.error || !result.data?.admin.cookMenuUpdate.success) {
                    throw new Error('save failed');
                }
                toast.success({ de: 'Gespeichert.', en: 'Saved.' }[locale]);
                await navigate({ to: '/{-$locale}/admin/menus/$menuId', params: { menuId } });
            } catch {
                toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
            }
        },
    });

    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const isDirty = useSelector(form.store, (state) => state.isDirty);
    const courses = useSelector(form.store, (state) => state.values.courses);
    const incompleteCourseCount = courses.filter((course) => course.title.trim().length === 0 || course.mealIds.length === 0).length;

    useEffect(() => {
        setMenu(seedMenu);
        setMeals(seedAdmin?.cookMeals ?? []);
    }, [seedAdmin?.cookMeals, seedMenu]);

    useEffect(() => {
        if (!seedAdmin) return;
        const request = createRequest(AdminMenuEditPageUpdatesDocument, { menuId, cookId });
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const nextAdmin = result.data?.adminUpdates;
                if (!nextAdmin) return;
                const nextMenu = nextAdmin.cookMenu;
                if (nextMenu?.deletedAt != null) {
                    void navigate({ to: '/{-$locale}/admin/menus/$menuId', params: { menuId } });
                    return;
                }
                if (nextMenu) setMenu(nextMenu);
                if (nextAdmin.cookMeals) setMeals(nextAdmin.cookMeals);
            }),
        );
        return unsubscribe;
    }, [client, cookId, menuId, navigate, seedAdmin]);

    useEffect(() => {
        if (!isDirty) {
            form.reset(formFromMenu(menu));
        }
    }, [form, isDirty, menu]);

    return (
        <AdminPageChrome
            crumbs={[
                { label: { de: 'Menüs', en: 'Menus' }[locale], to: '/{-$locale}/admin/menus' },
                { label: menu.title, to: '/{-$locale}/admin/menus/$menuId', params: { menuId } },
                { label: { de: 'Bearbeiten', en: 'Edit' }[locale] },
            ]}
            contentClassName="min-h-0 overflow-hidden gap-0"
        >
            <AdminPinnedFooterLayout
                contentClassName="grid w-full max-w-2xl content-start gap-6"
                footer={
                    isDirty ? (
                        <>
                            <Button type="button" variant="outline" disabled={isSubmitting} asChild>
                                <Link to="/{-$locale}/admin/menus/$menuId" params={{ menuId }}>
                                    {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                                </Link>
                            </Button>
                            <Button type="submit" form="admin-menu-form" disabled={isSubmitting}>
                                {isSubmitting ? { de: 'Speichern…', en: 'Saving…' }[locale] : { de: 'Speichern', en: 'Save' }[locale]}
                            </Button>
                        </>
                    ) : (
                        <Button type="button" disabled={isSubmitting} asChild>
                            <Link to="/{-$locale}/admin/menus/$menuId" params={{ menuId }}>
                                {{ de: 'Zur Menüansicht', en: 'Back to menu' }[locale]}
                            </Link>
                        </Button>
                    )
                }
            >
                <form
                    id="admin-menu-form"
                    className="grid gap-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void form.handleSubmit();
                    }}
                >
                    <form.Field name="title">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <label htmlFor="admin-menu-title" className="text-sm font-medium">
                                    {{ de: 'Titel', en: 'Title' }[locale]}
                                </label>
                                <Input
                                    id="admin-menu-title"
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    required
                                    maxLength={255}
                                />
                            </div>
                        )}
                    </form.Field>
                    <form.Field name="description">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <label htmlFor="admin-menu-description" className="text-sm font-medium">
                                    {{ de: 'Beschreibung', en: 'Description' }[locale]}
                                </label>
                                <Textarea
                                    id="admin-menu-description"
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    rows={4}
                                />
                            </div>
                        )}
                    </form.Field>
                    <div className="grid gap-3">
                        <div>
                            <h2 className="text-sm font-medium">{{ de: 'Gänge', en: 'Courses' }[locale]}</h2>
                            <p className="text-sm text-muted-foreground">
                                {
                                    (menu.bookingRequestOfferId != null
                                        ? {
                                              de: 'Jeder Gang braucht mindestens ein Gericht.',
                                              en: 'Each course needs at least one meal.',
                                          }
                                        : {
                                              de: 'Jeder Gang braucht mindestens ein Gericht zum Veröffentlichen.',
                                              en: 'Each course needs at least one meal to publish.',
                                          })[locale]
                                }
                            </p>
                        </div>
                        {incompleteCourseCount > 0 ? (
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
                                    (menu.bookingRequestOfferId != null
                                        ? {
                                              de: 'Unvollständige Gänge sind mit einem Warnhinweis markiert. Jeder Gang braucht mindestens ein Gericht.',
                                              en: 'Incomplete courses are marked with a warning. Every course needs at least one meal.',
                                          }
                                        : {
                                              de: 'Unvollständige Gänge sind mit einem Warnhinweis markiert. Zum Veröffentlichen braucht jeder Gang mindestens ein Gericht.',
                                              en: 'Incomplete courses are marked with a warning. To publish, every course needs at least one meal.',
                                          })[locale]
                                }
                            </StatusAlert>
                        ) : null}
                        <form.Field name="courses">
                            {(field) => (
                                <CookMenuCoursesEditor
                                    courses={field.state.value}
                                    onChange={(next) => field.handleChange(next)}
                                    meals={meals}
                                    mealSaveHandlers={mealSaveHandlers}
                                />
                            )}
                        </form.Field>
                    </div>
                </form>
            </AdminPinnedFooterLayout>
        </AdminPageChrome>
    );
}
