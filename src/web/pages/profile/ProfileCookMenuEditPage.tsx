import { useForm, useSelector } from '@tanstack/react-form';
import { Link, notFound, useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { Button } from '../../components/base/button';
import { Input } from '../../components/base/input';
import { StatusAlert } from '../../components/base/status-alert';
import { Textarea } from '../../components/base/textarea';
import { CookMenuCoursesEditor } from '../../components/CookMenuCoursesEditor';
import type { CookMenuCourseDraft } from '../../components/CookMenuCoursesEditor';
import { ProfilePinnedFooterLayout } from '../../components/ProfilePinnedFooterLayout';
import type { GqlCProfileCookMenuPageQuery } from '../../graphql/generated';
import { ProfileCookMenuPageUpdatesDocument, ProfileMenuUpdateDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { returnToSafe } from '../../utils/returnTo';
import { cookStubRouteBySlug } from './cookCatalog';

const menusRoute = cookStubRouteBySlug('menus');

export const profileCookMenuEditPageTitle = {
    de: 'Menü bearbeiten',
    en: 'Edit menu',
} as const;
export const profileCookMenuEditPageDescription = {
    de: 'Titel, Beschreibung und Gänge bearbeiten.',
    en: 'Edit title, description, and courses.',
} as const;

type MenuRow = NonNullable<NonNullable<NonNullable<GqlCProfileCookMenuPageQuery['currentSession']['user']>['cook']>['menu']>;

type MenuFormValues = {
    title: string;
    description: string;
    courses: CookMenuCourseDraft[];
};

function formFromMenu(menu: MenuRow): MenuFormValues {
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

export function ProfileCookMenuEditPage({
    data,
    menuId,
    returnTo,
}: {
    data: GqlCProfileCookMenuPageQuery;
    menuId: string;
    returnTo?: string;
}) {
    const locale = useLocale();
    const navigate = useNavigate();
    const router = useRouter();
    const seedUser = data.currentSession.user ?? null;
    const seedMenu = seedUser?.cook?.menu ?? null;
    if (!seedMenu) throw notFound();

    const user = useUserUpdatesSeed(seedUser, ProfileCookMenuPageUpdatesDocument, { menuId });
    const menu = user?.cook?.menu ?? null;
    const meals = user?.cook?.meals ?? [];
    const safeReturnTo = returnToSafe(returnTo);
    const isOfferMenu = seedMenu.bookingRequestOfferId != null;
    const offerNegotiable =
        seedMenu.offerContext?.status === 'USER_NEEDS_TO_ACCEPT' || seedMenu.offerContext?.status === 'COOK_NEEDS_TO_ACCEPT';

    const [, updateMenu] = useMutation(ProfileMenuUpdateDocument);

    // Offer create / edit-menus unmount while here, so they miss the menuUpdate
    // userUpdates push. Invalidate before returnTo so their loaders reseed.
    async function navigateAfterEdit() {
        if (safeReturnTo) {
            await router.invalidate();
            await navigate({ href: safeReturnTo });
            return;
        }
        await navigate({ to: '/{-$locale}/profile/menus/$menuId', params: { menuId } });
    }

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
                if (result.error || !result.data?.user.cook.menuUpdate.success) {
                    throw new Error('save failed');
                }
                toast.success({ de: 'Gespeichert.', en: 'Saved.' }[locale]);
                await navigateAfterEdit();
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
        if (user == null) return;
        if (menu == null) {
            void navigate({ to: menusRoute.to });
            return;
        }
        const liveOfferMenu = menu.bookingRequestOfferId != null;
        const liveNegotiable = menu.offerContext?.status === 'USER_NEEDS_TO_ACCEPT' || menu.offerContext?.status === 'COOK_NEEDS_TO_ACCEPT';
        if (liveOfferMenu && !liveNegotiable) {
            void navigate({ to: '/{-$locale}/profile/menus/$menuId', params: { menuId } });
            return;
        }
        if (!isDirty) {
            form.reset(formFromMenu(menu));
        }
    }, [form, isDirty, menu, menuId, navigate, user]);

    useEffect(() => {
        if (isOfferMenu && !offerNegotiable) {
            void navigate({ to: '/{-$locale}/profile/menus/$menuId', params: { menuId } });
        }
    }, [isOfferMenu, menuId, navigate, offerNegotiable]);

    return (
        <ProfilePinnedFooterLayout
            contentClassName="grid w-full max-w-2xl content-start gap-6"
            footer={
                isDirty ? (
                    <>
                        {safeReturnTo != null ? (
                            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => void navigateAfterEdit()}>
                                {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                            </Button>
                        ) : (
                            <Button type="button" variant="outline" disabled={isSubmitting} asChild>
                                <Link to="/{-$locale}/profile/menus/$menuId" params={{ menuId }}>
                                    {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                                </Link>
                            </Button>
                        )}
                        <Button type="submit" form="menu-form" disabled={isSubmitting}>
                            {isSubmitting ? { de: 'Speichern…', en: 'Saving…' }[locale] : { de: 'Speichern', en: 'Save' }[locale]}
                        </Button>
                    </>
                ) : safeReturnTo != null ? (
                    <Button type="button" disabled={isSubmitting} onClick={() => void navigateAfterEdit()}>
                        {{ de: 'Zurück', en: 'Back' }[locale]}
                    </Button>
                ) : (
                    <Button type="button" disabled={isSubmitting} asChild>
                        <Link to="/{-$locale}/profile/menus/$menuId" params={{ menuId }}>
                            {{ de: 'Zur Menüansicht', en: 'Back to menu' }[locale]}
                        </Link>
                    </Button>
                )
            }
        >
            <form
                id="menu-form"
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
                            <label htmlFor="menu-title" className="text-sm font-medium">
                                {{ de: 'Titel', en: 'Title' }[locale]}
                            </label>
                            <Input
                                id="menu-title"
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
                            <label htmlFor="menu-description" className="text-sm font-medium">
                                {{ de: 'Beschreibung', en: 'Description' }[locale]}
                            </label>
                            <Textarea
                                id="menu-description"
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
                                (isOfferMenu
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
                                {
                                    de: 'Unvollständige Gänge sind mit einem Warnhinweis markiert. Zum Veröffentlichen braucht jeder Gang mindestens ein Gericht.',
                                    en: 'Incomplete courses are marked with a warning. To publish, every course needs at least one meal.',
                                }[locale]
                            }
                        </StatusAlert>
                    ) : null}
                    <form.Field name="courses">
                        {(field) => (
                            <CookMenuCoursesEditor
                                courses={field.state.value}
                                onChange={(next) => field.handleChange(next)}
                                meals={meals}
                            />
                        )}
                    </form.Field>
                </div>
            </form>
        </ProfilePinnedFooterLayout>
    );
}
