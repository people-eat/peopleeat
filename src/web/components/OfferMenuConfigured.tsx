import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { CustomerMealCard } from './CustomerMealCard';
import { ExpandableText } from './ExpandableText';

type OfferMenuConfiguredMeal = {
    mealTitle: string;
    mealDescription: string;
    mealImageUrl?: string | null;
};

type OfferMenuConfiguredCourse = {
    title: string;
    meals: OfferMenuConfiguredMeal[];
};

export type OfferMenuConfiguredMenu = {
    title: string;
    description?: string | null;
    courses: OfferMenuConfiguredCourse[];
};

export function OfferMenuConfigured({ menu, className }: { menu: OfferMenuConfiguredMenu; className?: string }) {
    const locale = useLocale();

    return (
        <div className={cn('grid gap-6', className)}>
            <div className="grid gap-1">
                <h3 className="font-serif text-xl wrap-break-word text-foreground">{menu.title}</h3>
                {menu.description != null && menu.description.trim().length > 0 ? (
                    <ExpandableText className="text-sm text-muted-foreground">{menu.description}</ExpandableText>
                ) : null}
            </div>
            {menu.courses.map((course) => (
                <section key={course.title} className="grid gap-3">
                    <h4 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">{course.title}</h4>
                    <ul className="grid gap-2">
                        {course.meals.map((meal) => (
                            <li key={`${course.title}-${meal.mealTitle}`}>
                                <CustomerMealCard
                                    title={meal.mealTitle}
                                    description={meal.mealDescription}
                                    imageUrl={meal.mealImageUrl}
                                    dialogTitle={course.title}
                                />
                            </li>
                        ))}
                    </ul>
                    {course.meals.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {{ de: 'Keine Gerichte gewählt.', en: 'No meals selected.' }[locale]}
                        </p>
                    ) : null}
                </section>
            ))}
        </div>
    );
}
