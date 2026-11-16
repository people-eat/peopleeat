import { useForm, useSelector } from '@tanstack/react-form';
import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import type { Locale } from '../../../shared/locale';
import { Button } from '../../components/base/button';
import { Input } from '../../components/base/input';
import { Textarea } from '../../components/base/textarea';
import { CookMealImageField } from '../../components/CookMealImageField';
import { ProfilePinnedFooterLayout } from '../../components/ProfilePinnedFooterLayout';
import type { GqlCProfileCookMealPageQuery } from '../../graphql/generated';
import { ProfileCookMealPageUpdatesDocument, ProfileMealUpsertDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { cookStubRouteBySlug } from './cookCatalog';

const mealsRoute = cookStubRouteBySlug('meals');

export function profileCookMealEditPageTitle(locale: Locale): string {
    return t(locale, 'profileCook', 'mealEdit.title');
}
export function profileCookMealEditPageDescription(locale: Locale): string {
    return t(locale, 'profileCook', 'mealEdit.description');
}

type MealRow = NonNullable<NonNullable<NonNullable<GqlCProfileCookMealPageQuery['currentSession']['user']>['cook']>['meal']>;

type MealFormValues = {
    title: string;
    description: string;
    imageFileUploadId: string | null;
    imageUrl: string | null;
};

function formFromMeal(meal: MealRow): MealFormValues {
    return {
        title: meal.title,
        description: meal.description,
        imageFileUploadId: meal.imageFileUploadId ?? null,
        imageUrl: meal.imageUrl ?? null,
    };
}

export function ProfileCookMealEditPage({ data, mealId }: { data: GqlCProfileCookMealPageQuery; mealId: string }) {
    const locale = useLocale();
    const navigate = useNavigate();
    const seedUser = data.currentSession.user ?? null;
    const seedMeal = seedUser?.cook?.meal ?? null;
    if (!seedMeal) throw notFound();

    const user = useUserUpdatesSeed(seedUser, ProfileCookMealPageUpdatesDocument, { mealId });
    const meal = user?.cook?.meal ?? null;

    const [, upsertMeal] = useMutation(ProfileMealUpsertDocument);
    const [imageBusy, setImageBusy] = useState(false);

    const form = useForm({
        defaultValues: formFromMeal(seedMeal),
        onSubmit: async ({ value }) => {
            const result = await upsertMeal({
                meal: {
                    mealId,
                    title: value.title,
                    description: value.description,
                    imageFileUploadId: value.imageFileUploadId,
                },
            });
            if (result.error || !result.data?.user.cook.mealUpsert.success) {
                toast.error(t(locale, 'common', 'saveFailed'));
                return;
            }
            toast.success(t(locale, 'profileCook', 'actions.saved'));
            await navigate({ to: '/{-$locale}/profile/meals/$mealId', params: { mealId } });
        },
    });

    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const isDirty = useSelector(form.store, (state) => state.isDirty);
    const imageFileUploadId = useSelector(form.store, (state) => state.values.imageFileUploadId);
    const imageUrl = useSelector(form.store, (state) => state.values.imageUrl);

    useEffect(() => {
        if (user == null) return;
        if (meal == null) {
            void navigate({ to: mealsRoute.to });
            return;
        }
        if (!isDirty) {
            form.reset(formFromMeal(meal));
        }
    }, [form, isDirty, meal, navigate, user]);

    return (
        <ProfilePinnedFooterLayout
            contentClassName="grid w-full max-w-2xl content-start gap-6"
            footer={
                isDirty ? (
                    <>
                        <Button type="button" variant="outline" disabled={isSubmitting || imageBusy} asChild>
                            <Link to="/{-$locale}/profile/meals/$mealId" params={{ mealId }}>
                                {t(locale, 'common', 'cancel')}
                            </Link>
                        </Button>
                        <Button type="submit" form="meal-form" disabled={isSubmitting || imageBusy}>
                            {isSubmitting ? t(locale, 'profileCook', 'actions.saving') : t(locale, 'common', 'save')}
                        </Button>
                    </>
                ) : (
                    <Button type="button" disabled={isSubmitting || imageBusy} asChild>
                        <Link to="/{-$locale}/profile/meals/$mealId" params={{ mealId }}>
                            {t(locale, 'profileCook', 'mealEdit.backToMeal')}
                        </Link>
                    </Button>
                )
            }
        >
            <form
                id="meal-form"
                className="grid gap-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void form.handleSubmit();
                }}
            >
                <form.Field name="title">
                    {(field) => (
                        <div className="grid gap-1.5">
                            <label htmlFor="meal-title" className="text-sm font-medium">
                                {t(locale, 'profileCook', 'actions.title')}
                            </label>
                            <Input
                                id="meal-title"
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
                            <label htmlFor="meal-description" className="text-sm font-medium">
                                {t(locale, 'profileCook', 'actions.description')}
                            </label>
                            <Textarea
                                id="meal-description"
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) => field.handleChange(event.target.value)}
                                rows={5}
                            />
                        </div>
                    )}
                </form.Field>
                <CookMealImageField
                    value={{ imageFileUploadId, imageUrl }}
                    disabled={isSubmitting}
                    onBusyChange={setImageBusy}
                    onChange={(next) => {
                        form.setFieldValue('imageFileUploadId', next.imageFileUploadId);
                        form.setFieldValue('imageUrl', next.imageUrl);
                    }}
                />
            </form>
        </ProfilePinnedFooterLayout>
    );
}
