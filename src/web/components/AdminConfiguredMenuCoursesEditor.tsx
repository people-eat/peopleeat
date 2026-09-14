import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from 'lucide-react';

import { idCreate } from '../../shared/idCreate';
import { useLocale } from '../hooks/useLocale';
import { Button } from './base/button';
import { Input } from './base/input';
import { Textarea } from './base/textarea';

export type AdminConfiguredMenuMealDraft = {
    key: string;
    mealTitle: string;
    mealDescription: string;
    mealImageUrl: string;
};

export type AdminConfiguredMenuCourseDraft = {
    key: string;
    title: string;
    meals: AdminConfiguredMenuMealDraft[];
};

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
    if (toIndex < 0 || toIndex >= items.length) return items;
    const next = [...items];
    const [item] = next.splice(fromIndex, 1);
    if (item === undefined) return items;
    next.splice(toIndex, 0, item);
    return next;
}

function createEmptyConfiguredMenuMeal(): AdminConfiguredMenuMealDraft {
    return { key: idCreate(), mealTitle: '', mealDescription: '', mealImageUrl: '' };
}

export function createEmptyConfiguredMenuCourse(): AdminConfiguredMenuCourseDraft {
    return { key: idCreate(), title: '', meals: [createEmptyConfiguredMenuMeal()] };
}

function isValidOptionalUrl(value: string): boolean {
    if (value.trim() === '') return true;
    try {
        new URL(value.trim());
        return true;
    } catch {
        return false;
    }
}

export function adminConfiguredMenuDraftValidate(courses: AdminConfiguredMenuCourseDraft[]): { de: string; en: string } | null {
    if (courses.length < 1) {
        return { de: 'Mindestens ein Gang ist erforderlich.', en: 'At least one course is required.' };
    }
    for (const course of courses) {
        if (course.title.trim() === '') {
            return { de: 'Jeder Gang braucht einen Namen.', en: 'Every course needs a name.' };
        }
        if (course.meals.length < 1) {
            return { de: 'Jeder Gang braucht mindestens ein Gericht.', en: 'Every course needs at least one meal.' };
        }
        for (const meal of course.meals) {
            if (meal.mealTitle.trim() === '') {
                return { de: 'Jedes Gericht braucht einen Titel.', en: 'Every meal needs a title.' };
            }
            if (!isValidOptionalUrl(meal.mealImageUrl)) {
                return { de: 'Bitte eine gültige Bild-URL eingeben.', en: 'Please enter a valid image URL.' };
            }
        }
    }
    return null;
}

export function AdminConfiguredMenuCoursesEditor({
    courses,
    onChange,
    disabled,
    showValidation,
}: {
    courses: AdminConfiguredMenuCourseDraft[];
    onChange: (next: AdminConfiguredMenuCourseDraft[]) => void;
    disabled?: boolean;
    showValidation?: boolean;
}) {
    const locale = useLocale();

    function updateCourse(courseKey: string, updater: (course: AdminConfiguredMenuCourseDraft) => AdminConfiguredMenuCourseDraft): void {
        onChange(courses.map((course) => (course.key === courseKey ? updater(course) : course)));
    }

    return (
        <div className="grid gap-4">
            {showValidation && courses.length < 1 ? (
                <p className="text-sm text-destructive">
                    {{ de: 'Mindestens ein Gang ist erforderlich.', en: 'At least one course is required.' }[locale]}
                </p>
            ) : null}

            {courses.map((course, courseIndex) => {
                const courseTitleError = showValidation && course.title.trim() === '';
                const mealsError = showValidation && course.meals.length < 1;

                return (
                    <section key={course.key} className="grid gap-4 rounded-lg border border-border p-4">
                        <div className="flex items-start gap-2">
                            <div className="grid min-w-0 flex-1 gap-1.5">
                                <label htmlFor={`configured-course-title-${course.key}`} className="text-sm font-medium">
                                    {{ de: 'Gang', en: 'Course' }[locale]}
                                </label>
                                <Input
                                    id={`configured-course-title-${course.key}`}
                                    value={course.title}
                                    disabled={disabled}
                                    aria-invalid={courseTitleError || undefined}
                                    onChange={(event) => updateCourse(course.key, (current) => ({ ...current, title: event.target.value }))}
                                />
                                {courseTitleError ? (
                                    <p className="text-sm text-destructive">
                                        {{ de: 'Bitte einen Gangnamen angeben.', en: 'Please enter a course name.' }[locale]}
                                    </p>
                                ) : null}
                            </div>
                            <div className="flex shrink-0 items-center gap-1 pt-7">
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    disabled={disabled || courseIndex === 0}
                                    aria-label={{ de: 'Nach oben', en: 'Move up' }[locale]}
                                    onClick={() => onChange(moveItem(courses, courseIndex, courseIndex - 1))}
                                >
                                    <ArrowUpIcon className="size-4" />
                                </Button>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    disabled={disabled || courseIndex === courses.length - 1}
                                    aria-label={{ de: 'Nach unten', en: 'Move down' }[locale]}
                                    onClick={() => onChange(moveItem(courses, courseIndex, courseIndex + 1))}
                                >
                                    <ArrowDownIcon className="size-4" />
                                </Button>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    disabled={disabled || courses.length <= 1}
                                    aria-label={{ de: 'Gang entfernen', en: 'Remove course' }[locale]}
                                    onClick={() => onChange(courses.filter((item) => item.key !== course.key))}
                                >
                                    <Trash2Icon className="size-4 text-destructive" />
                                </Button>
                            </div>
                        </div>

                        {mealsError ? (
                            <p className="text-sm text-destructive">
                                {{ de: 'Mindestens ein Gericht ist erforderlich.', en: 'At least one meal is required.' }[locale]}
                            </p>
                        ) : null}

                        <div className="grid gap-3">
                            {course.meals.map((meal, mealIndex) => {
                                const mealTitleError = showValidation && meal.mealTitle.trim() === '';
                                const mealImageUrlError = showValidation && !isValidOptionalUrl(meal.mealImageUrl);

                                return (
                                    <div key={meal.key} className="grid gap-3 rounded-md border border-dashed border-border p-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm text-muted-foreground">
                                                {{ de: 'Gericht', en: 'Meal' }[locale]} {mealIndex + 1}
                                            </p>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    disabled={disabled || mealIndex === 0}
                                                    aria-label={{ de: 'Nach oben', en: 'Move up' }[locale]}
                                                    onClick={() =>
                                                        updateCourse(course.key, (current) => ({
                                                            ...current,
                                                            meals: moveItem(current.meals, mealIndex, mealIndex - 1),
                                                        }))
                                                    }
                                                >
                                                    <ArrowUpIcon className="size-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    disabled={disabled || mealIndex === course.meals.length - 1}
                                                    aria-label={{ de: 'Nach unten', en: 'Move down' }[locale]}
                                                    onClick={() =>
                                                        updateCourse(course.key, (current) => ({
                                                            ...current,
                                                            meals: moveItem(current.meals, mealIndex, mealIndex + 1),
                                                        }))
                                                    }
                                                >
                                                    <ArrowDownIcon className="size-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    disabled={disabled || course.meals.length <= 1}
                                                    aria-label={{ de: 'Gericht entfernen', en: 'Remove meal' }[locale]}
                                                    onClick={() =>
                                                        updateCourse(course.key, (current) => ({
                                                            ...current,
                                                            meals: current.meals.filter((item) => item.key !== meal.key),
                                                        }))
                                                    }
                                                >
                                                    <Trash2Icon className="size-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <label htmlFor={`configured-meal-title-${meal.key}`} className="text-sm font-medium">
                                                {{ de: 'Gerichtstitel', en: 'Meal title' }[locale]}
                                            </label>
                                            <Input
                                                id={`configured-meal-title-${meal.key}`}
                                                value={meal.mealTitle}
                                                disabled={disabled}
                                                aria-invalid={mealTitleError || undefined}
                                                onChange={(event) =>
                                                    updateCourse(course.key, (current) => ({
                                                        ...current,
                                                        meals: current.meals.map((item) =>
                                                            item.key === meal.key ? { ...item, mealTitle: event.target.value } : item,
                                                        ),
                                                    }))
                                                }
                                            />
                                            {mealTitleError ? (
                                                <p className="text-sm text-destructive">
                                                    {{ de: 'Bitte einen Gerichtstitel angeben.', en: 'Please enter a meal title.' }[locale]}
                                                </p>
                                            ) : null}
                                        </div>
                                        <div className="grid gap-1.5">
                                            <label htmlFor={`configured-meal-description-${meal.key}`} className="text-sm font-medium">
                                                {{ de: 'Gerichtsbeschreibung', en: 'Meal description' }[locale]}
                                            </label>
                                            <Textarea
                                                id={`configured-meal-description-${meal.key}`}
                                                value={meal.mealDescription}
                                                disabled={disabled}
                                                onChange={(event) =>
                                                    updateCourse(course.key, (current) => ({
                                                        ...current,
                                                        meals: current.meals.map((item) =>
                                                            item.key === meal.key ? { ...item, mealDescription: event.target.value } : item,
                                                        ),
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-1.5">
                                            <label htmlFor={`configured-meal-image-${meal.key}`} className="text-sm font-medium">
                                                {{ de: 'Bild-URL', en: 'Image URL' }[locale]}
                                            </label>
                                            <Input
                                                id={`configured-meal-image-${meal.key}`}
                                                value={meal.mealImageUrl}
                                                disabled={disabled}
                                                aria-invalid={mealImageUrlError || undefined}
                                                placeholder={
                                                    { de: 'Optional, leer lassen zum Entfernen', en: 'Optional, leave empty to clear' }[
                                                        locale
                                                    ]
                                                }
                                                onChange={(event) =>
                                                    updateCourse(course.key, (current) => ({
                                                        ...current,
                                                        meals: current.meals.map((item) =>
                                                            item.key === meal.key ? { ...item, mealImageUrl: event.target.value } : item,
                                                        ),
                                                    }))
                                                }
                                            />
                                            {mealImageUrlError ? (
                                                <p className="text-sm text-destructive">
                                                    {
                                                        {
                                                            de: 'Bitte eine gültige Bild-URL eingeben.',
                                                            en: 'Please enter a valid image URL.',
                                                        }[locale]
                                                    }
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={disabled}
                                onClick={() =>
                                    updateCourse(course.key, (current) => ({
                                        ...current,
                                        meals: [...current.meals, createEmptyConfiguredMenuMeal()],
                                    }))
                                }
                            >
                                <PlusIcon className="size-4" />
                                {{ de: 'Gericht hinzufügen', en: 'Add meal' }[locale]}
                            </Button>
                        </div>
                    </section>
                );
            })}

            <div className="flex justify-end">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => onChange([...courses, createEmptyConfiguredMenuCourse()])}
                >
                    <PlusIcon className="size-4" />
                    {{ de: 'Gang hinzufügen', en: 'Add course' }[locale]}
                </Button>
            </div>
        </div>
    );
}
