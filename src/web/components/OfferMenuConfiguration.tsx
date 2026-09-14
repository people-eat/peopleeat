import { CheckIcon, PlusIcon } from 'lucide-react';

import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { Button } from './base/button';
import { CustomerMealCard } from './CustomerMealCard';
import { ExpandableText } from './ExpandableText';

type OfferMenuConfigurationMeal = {
    mealId: string;
    title: string;
    description: string;
    imageUrl?: string | null;
};

type OfferMenuConfigurationCourse = {
    courseId: string;
    title: string;
    mealSelectionLimit?: number | null;
    mealOptions: OfferMenuConfigurationMeal[];
};

export type OfferMenuConfigurationMenu = {
    menuId: string;
    title: string;
    description: string;
    courses: OfferMenuConfigurationCourse[];
};

export type OfferMenuCourseSelection = {
    courseId: string;
    mealIds: string[];
};

export function OfferMenuConfiguration({
    menu,
    selections,
    onSelectionsChange,
    className,
}: {
    menu: OfferMenuConfigurationMenu;
    selections: OfferMenuCourseSelection[];
    onSelectionsChange: (selections: OfferMenuCourseSelection[]) => void;
    className?: string;
}) {
    const locale = useLocale();

    function setCourseMealIds(courseId: string, mealIds: string[]) {
        onSelectionsChange(selections.map((selection) => (selection.courseId === courseId ? { courseId, mealIds } : selection)));
    }

    return (
        <div className={cn('grid gap-6', className)}>
            {menu.description.trim().length > 0 ? (
                <ExpandableText className="text-sm text-muted-foreground">{menu.description}</ExpandableText>
            ) : null}
            {menu.courses.map((course) => {
                const limit = course.mealSelectionLimit ?? 1;
                const isMultiSelect = limit > 1;
                const selectedMealIds = selections.find((selection) => selection.courseId === course.courseId)?.mealIds ?? [];
                const atCapacity = selectedMealIds.length >= limit;
                const remaining = Math.max(limit - selectedMealIds.length, 0);
                const isComplete = selectedMealIds.length >= limit || (!isMultiSelect && selectedMealIds.length > 0);

                return (
                    <section key={course.courseId} className="grid gap-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h4 className="font-medium text-foreground">{course.title}</h4>
                            {isMultiSelect ? (
                                <span className="text-sm text-muted-foreground">
                                    {isComplete
                                        ? {
                                              de: `${selectedMealIds.length} / ${limit} gewählt`,
                                              en: `${selectedMealIds.length} / ${limit} selected`,
                                          }[locale]
                                        : {
                                              de: `Noch ${remaining} von ${limit} wählen`,
                                              en: `Select ${remaining} of ${limit}`,
                                          }[locale]}
                                </span>
                            ) : course.mealOptions.length > 1 ? (
                                <span className="text-sm text-muted-foreground">
                                    {{ de: '1 Gericht wählen', en: 'Choose 1 dish' }[locale]}
                                </span>
                            ) : null}
                        </div>
                        <ul className="grid gap-2">
                            {course.mealOptions.map((meal) => {
                                const isSelected = selectedMealIds.includes(meal.mealId);
                                const limitReached = isMultiSelect && !isSelected && atCapacity;
                                return (
                                    <li key={meal.mealId}>
                                        <CustomerMealCard
                                            title={meal.title}
                                            description={meal.description}
                                            imageUrl={meal.imageUrl}
                                            selected={isSelected}
                                            disabled={limitReached}
                                            dialogTitle={course.title}
                                            action={
                                                <Button
                                                    type="button"
                                                    size="icon-sm"
                                                    variant={isSelected ? 'default' : 'outline'}
                                                    disabled={limitReached}
                                                    aria-pressed={isSelected}
                                                    aria-label={
                                                        isSelected
                                                            ? { de: 'Auswahl entfernen', en: 'Remove selection' }[locale]
                                                            : { de: 'Gericht wählen', en: 'Select meal' }[locale]
                                                    }
                                                    onClick={() => {
                                                        if (!isMultiSelect) {
                                                            setCourseMealIds(course.courseId, [meal.mealId]);
                                                            return;
                                                        }
                                                        if (isSelected) {
                                                            setCourseMealIds(
                                                                course.courseId,
                                                                selectedMealIds.filter((id) => id !== meal.mealId),
                                                            );
                                                            return;
                                                        }
                                                        if (atCapacity) return;
                                                        setCourseMealIds(course.courseId, [...selectedMealIds, meal.mealId]);
                                                    }}
                                                >
                                                    {isSelected ? <CheckIcon className="size-4" /> : <PlusIcon className="size-4" />}
                                                </Button>
                                            }
                                        />
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
}

export function offerMenuDefaultSelections(menu: OfferMenuConfigurationMenu): OfferMenuCourseSelection[] {
    return menu.courses.map((course) => ({
        courseId: course.courseId,
        mealIds: course.mealOptions[0] != null ? [course.mealOptions[0].mealId] : [],
    }));
}
