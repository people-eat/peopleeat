import { useForm, useSelector } from '@tanstack/react-form';
import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../../i18n/t';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Button } from '../../components/base/button';
import { Input } from '../../components/base/input';
import { Textarea } from '../../components/base/textarea';
import { CookMealImageField } from '../../components/CookMealImageField';
import type { GqlCAdminMealPageQuery } from '../../graphql/generated';
import { AdminMealPageUpdatesDocument, AdminMealUpsertDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import type { Locale } from '../../utils/locale';

export function adminMealEditPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'pages.mealEdit.title');
}
export function adminMealEditPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.mealEdit.description');
}

type AdminMeal = NonNullable<NonNullable<NonNullable<GqlCAdminMealPageQuery['currentSession']['user']>['admin']>['cookMeal']>;

type MealFormValues = {
    title: string;
    description: string;
    imageFileUploadId: string | null;
    imageUrl: string | null;
};

function formFromMeal(meal: AdminMeal): MealFormValues {
    return {
        title: meal.title,
        description: meal.description,
        imageFileUploadId: meal.imageFileUploadId ?? null,
        imageUrl: meal.imageUrl ?? null,
    };
}

export function AdminMealEditPage({ data, mealId }: { data: GqlCAdminMealPageQuery; mealId: string }) {
    const locale = useLocale();
    const navigate = useNavigate();
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const seedMeal = seedAdmin?.cookMeal ?? null;
    if (!seedMeal) throw notFound();
    if (seedMeal.deletedAt != null) {
        throw notFound();
    }

    const [meal, setMeal] = useState(seedMeal);
    const [, upsertMeal] = useMutation(AdminMealUpsertDocument);
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
            if (result.error || !result.data?.admin.cookMealUpsert.success) {
                toast.error(t(locale, 'admin', 'copy.couldNotSave'));
                return;
            }
            toast.success(t(locale, 'admin', 'copy.saved'));
            await navigate({ to: '/{-$locale}/admin/meals/$mealId', params: { mealId } });
        },
    });

    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const isDirty = useSelector(form.store, (state) => state.isDirty);
    const imageFileUploadId = useSelector(form.store, (state) => state.values.imageFileUploadId);
    const imageUrl = useSelector(form.store, (state) => state.values.imageUrl);

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
                if (!next) return;
                if (next.deletedAt != null) {
                    void navigate({ to: '/{-$locale}/admin/meals/$mealId', params: { mealId } });
                    return;
                }
                setMeal(next);
            }),
        );
        return unsubscribe;
    }, [client, mealId, navigate, seedAdmin]);

    useEffect(() => {
        if (!isDirty) {
            form.reset(formFromMeal(meal));
        }
    }, [form, isDirty, meal]);

    return (
        <AdminPageChrome
            crumbs={[
                { label: t(locale, 'admin', 'copy.meals'), to: '/{-$locale}/admin/meals' },
                { label: meal.title, to: '/{-$locale}/admin/meals/$mealId', params: { mealId } },
                { label: t(locale, 'admin', 'copy.edit') },
            ]}
            contentClassName="min-h-0 overflow-hidden gap-0"
        >
            <AdminPinnedFooterLayout
                contentClassName="grid w-full max-w-2xl content-start gap-6"
                footer={
                    isDirty ? (
                        <>
                            <Button type="button" variant="outline" disabled={isSubmitting || imageBusy} asChild>
                                <Link to="/{-$locale}/admin/meals/$mealId" params={{ mealId }}>
                                    {t(locale, 'admin', 'copy.cancel')}
                                </Link>
                            </Button>
                            <Button type="submit" form="admin-meal-form" disabled={isSubmitting || imageBusy}>
                                {isSubmitting ? t(locale, 'admin', 'copy.saving2') : t(locale, 'admin', 'copy.save')}
                            </Button>
                        </>
                    ) : (
                        <Button type="button" disabled={isSubmitting || imageBusy} asChild>
                            <Link to="/{-$locale}/admin/meals/$mealId" params={{ mealId }}>
                                {t(locale, 'admin', 'copy.backToMeal')}
                            </Link>
                        </Button>
                    )
                }
            >
                <form
                    id="admin-meal-form"
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
                                <label htmlFor="admin-meal-title" className="text-sm font-medium">
                                    {t(locale, 'admin', 'copy.title')}
                                </label>
                                <Input
                                    id="admin-meal-title"
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
                                <label htmlFor="admin-meal-description" className="text-sm font-medium">
                                    {t(locale, 'admin', 'copy.description')}
                                </label>
                                <Textarea
                                    id="admin-meal-description"
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
            </AdminPinnedFooterLayout>
        </AdminPageChrome>
    );
}
