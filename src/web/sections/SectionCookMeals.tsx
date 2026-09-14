import { useState } from 'react';

import { Button } from '../components/base/button';
import { CustomerMealCard } from '../components/CustomerMealCard';
import { useLocale } from '../hooks/useLocale';

export type SectionCookMeal = {
    mealId: string;
    title: string;
    description: string;
    imageUrl: string | null;
};

const COLLAPSED_MEAL_COUNT = 5;

export function SectionCookMeals({ meals }: { meals: ReadonlyArray<SectionCookMeal> }) {
    const locale = useLocale();
    const [expanded, setExpanded] = useState(false);
    const canExpand = meals.length > COLLAPSED_MEAL_COUNT;
    const visibleMeals = canExpand && !expanded ? meals.slice(0, COLLAPSED_MEAL_COUNT) : meals;

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-serif text-3xl font-light @3xl:text-4xl">{{ de: 'Gerichte', en: 'Meals' }[locale]}</h2>
                {canExpand ? (
                    <Button
                        type="button"
                        variant="link"
                        className="h-auto -mx-2 px-2"
                        aria-expanded={expanded}
                        onClick={() => setExpanded((current) => !current)}
                    >
                        {
                            {
                                de: expanded ? 'Weniger anzeigen' : 'Mehr anzeigen',
                                en: expanded ? 'Show less' : 'Show more',
                            }[locale]
                        }
                    </Button>
                ) : null}
            </div>
            {meals.length === 0 ? (
                <p className="mt-4 text-muted-foreground">
                    {{ de: 'Noch keine Gerichte veröffentlicht.', en: 'No meals published yet.' }[locale]}
                </p>
            ) : (
                // Marketing meal tiles (square image on top) reflow with the chef profile
                // `@container`, not the viewport — dense 5-up on desktop.
                <ul className="mt-8 grid grid-cols-2 gap-3 @md:grid-cols-3 @2xl:grid-cols-4 @5xl:grid-cols-5">
                    {visibleMeals.map((meal) => (
                        <li key={meal.mealId} className="min-w-0">
                            <CustomerMealCard
                                variant="marketing"
                                title={meal.title}
                                description={meal.description}
                                imageUrl={meal.imageUrl}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
