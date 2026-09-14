import { useForm, useSelector } from '@tanstack/react-form';
import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Button } from '../../components/base/button';
import { Input } from '../../components/base/input';
import { Textarea } from '../../components/base/textarea';
import { CookMealImageField } from '../../components/CookMealImageField';
import type { GqlCAdminMealPageQuery } from '../../graphql/generated';
import { AdminMealPageUpdatesDocument, AdminMealUpdateDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';

export const adminMealEditPageTitle = {
    de: 'Gericht bearbeiten',
    en: 'Edit meal',
} as const;
export const adminMealEditPageDescription = {
    de: 'Titel, Beschreibung und Bild bearbeiten.',
    en: 'Edit title, description, and image.',
} as const;

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
    const [, updateMeal] = useMutation(AdminMealUpdateDocument);
    const [imageBusy, setImageBusy] = useState(false);

    const form = useForm({
        defaultValues: formFromMeal(seedMeal),
        onSubmit: async ({ value }) => {
            const result = await updateMeal({
                mealId,
                meal: {
                    title: value.title,
                    description: value.description,
                    imageFileUploadId: value.imageFileUploadId,
                },
            });
            if (result.error || !result.data?.admin.cookMealUpdate.success) {
                toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
                return;
            }
            toast.success({ de: 'Gespeichert.', en: 'Saved.' }[locale]);
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
                { label: { de: 'Gerichte', en: 'Meals' }[locale], to: '/{-$locale}/admin/meals' },
                { label: meal.title, to: '/{-$locale}/admin/meals/$mealId', params: { mealId } },
                { label: { de: 'Bearbeiten', en: 'Edit' }[locale] },
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
                                    {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                                </Link>
                            </Button>
                            <Button type="submit" form="admin-meal-form" disabled={isSubmitting || imageBusy}>
                                {isSubmitting ? { de: 'Speichern…', en: 'Saving…' }[locale] : { de: 'Speichern', en: 'Save' }[locale]}
                            </Button>
                        </>
                    ) : (
                        <Button type="button" disabled={isSubmitting || imageBusy} asChild>
                            <Link to="/{-$locale}/admin/meals/$mealId" params={{ mealId }}>
                                {{ de: 'Zur Gerichtansicht', en: 'Back to meal' }[locale]}
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
                                    {{ de: 'Titel', en: 'Title' }[locale]}
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
                                    {{ de: 'Beschreibung', en: 'Description' }[locale]}
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
