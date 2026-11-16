import { useForm, useSelector } from '@tanstack/react-form';
import { useEffect, useId, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { CookMealEditorMealUpsertDocument } from '../graphql/generated';
import { useT } from '../hooks/useT';
import { Button } from './base/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './base/dialog';
import { Input } from './base/input';
import { Textarea } from './base/textarea';
import { CookMealImageField } from './CookMealImageField';

export type CookMealEditorMeal = {
    mealId: string;
    title: string;
    description: string;
    imageUrl?: string | null;
    imageFileUploadId?: string | null;
    publishedAt?: string | null;
};

/** Injected create/update for admin (or tests). Omit to use cook `user.cook.mealUpsert`. */
export type CookMealEditorSaveHandlers = {
    createMeal: () => Promise<string>;
    updateMeal: (mealId: string, meal: { title: string; description: string; imageFileUploadId: string | null }) => Promise<void>;
};

type MealFormValues = {
    title: string;
    description: string;
    imageFileUploadId: string | null;
    imageUrl: string | null;
};

const emptyFormValues: MealFormValues = {
    title: '',
    description: '',
    imageFileUploadId: null,
    imageUrl: null,
};

function formFromMeal(meal: CookMealEditorMeal | null): MealFormValues {
    if (meal == null) return emptyFormValues;
    return {
        title: meal.title,
        description: meal.description,
        imageFileUploadId: meal.imageFileUploadId ?? null,
        imageUrl: meal.imageUrl ?? null,
    };
}

export function CookMealEditorDialog({
    open,
    onOpenChange,
    meal,
    onSaved,
    saveHandlers,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    meal: CookMealEditorMeal | null;
    onSaved: (meal: CookMealEditorMeal) => void;
    saveHandlers?: CookMealEditorSaveHandlers;
}) {
    const { t } = useT('profileCook');
    const formId = useId();
    const isCreate = meal == null;
    const [, upsertMeal] = useMutation(CookMealEditorMealUpsertDocument);
    const [imageBusy, setImageBusy] = useState(false);

    const form = useForm({
        defaultValues: formFromMeal(meal),
        onSubmit: async ({ value }) => {
            const title = value.title.trim();
            if (title.length === 0) {
                toast.error(t('mealEditor.titleRequired'));
                return;
            }
            const description = value.description.trim();
            try {
                let mealId: string;
                const patch = {
                    title,
                    description,
                    imageFileUploadId: value.imageFileUploadId,
                };
                if (meal?.mealId != null) {
                    mealId = meal.mealId;
                    if (saveHandlers != null) {
                        await saveHandlers.updateMeal(mealId, patch);
                    } else {
                        const updated = await upsertMeal({
                            meal: { mealId, ...patch },
                        });
                        if (updated.error || !updated.data?.user.cook.mealUpsert.success) {
                            throw new Error('meal update failed');
                        }
                    }
                } else if (saveHandlers != null) {
                    mealId = await saveHandlers.createMeal();
                    await saveHandlers.updateMeal(mealId, patch);
                } else {
                    const created = await upsertMeal({ meal: patch });
                    const createdMealId = created.data?.user.cook.mealUpsert.referenceId;
                    if (created.error || !created.data?.user.cook.mealUpsert.success || createdMealId == null) {
                        throw new Error('meal create failed');
                    }
                    mealId = createdMealId;
                }
                const saved: CookMealEditorMeal = {
                    mealId,
                    title,
                    description,
                    imageFileUploadId: value.imageFileUploadId,
                    imageUrl: value.imageUrl,
                    publishedAt: meal?.publishedAt ?? null,
                };
                toast.success(isCreate ? t('mealEditor.created') : t('mealEditor.saved'));
                onSaved(saved);
                onOpenChange(false);
            } catch {
                toast.error(isCreate ? t('mealEditor.createFailed') : t('mealEditor.saveFailed'));
            }
        },
    });

    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const imageFileUploadId = useSelector(form.store, (state) => state.values.imageFileUploadId);
    const imageUrl = useSelector(form.store, (state) => state.values.imageUrl);

    useEffect(() => {
        if (!open) return;
        form.reset(formFromMeal(meal));
        setImageBusy(false);
    }, [form, meal, open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isCreate ? t('actions.newMeal') : t('mealEdit.title')}</DialogTitle>
                    <DialogDescription>{t('mealEditor.hint')}</DialogDescription>
                </DialogHeader>
                <form
                    id={formId}
                    className="grid gap-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void form.handleSubmit();
                    }}
                >
                    <form.Field name="title">
                        {(field) => (
                            <label className="grid gap-2 text-sm">
                                <span className="font-medium">{t('actions.title')}</span>
                                <Input
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    disabled={isSubmitting || imageBusy}
                                    required
                                    maxLength={255}
                                />
                            </label>
                        )}
                    </form.Field>
                    <form.Field name="description">
                        {(field) => (
                            <label className="grid gap-2 text-sm">
                                <span className="font-medium">{t('actions.description')}</span>
                                <Textarea
                                    name={field.name}
                                    rows={3}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    disabled={isSubmitting || imageBusy}
                                />
                            </label>
                        )}
                    </form.Field>
                    <CookMealImageField
                        compact
                        value={{ imageFileUploadId, imageUrl }}
                        disabled={isSubmitting}
                        onBusyChange={setImageBusy}
                        onChange={(next) => {
                            form.setFieldValue('imageFileUploadId', next.imageFileUploadId);
                            form.setFieldValue('imageUrl', next.imageUrl);
                        }}
                    />
                </form>
                <DialogFooter>
                    <Button type="button" variant="outline" disabled={isSubmitting || imageBusy} onClick={() => onOpenChange(false)}>
                        {t('actions.cancel')}
                    </Button>
                    <Button type="submit" form={formId} disabled={isSubmitting || imageBusy}>
                        {isSubmitting ? t('mealEditor.saving') : isCreate ? t('mealEditor.saveMeal') : t('mealEditor.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
