import { Link } from '@tanstack/react-router';

import { useLocale } from '../hooks/useLocale';
import { Button } from './base/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './base/dialog';
import { CookMenuCardMedia } from './CookMenuCard';

export type PublicCookMenuDialogCourse = {
    title: string;
    mealOptions: ReadonlyArray<{
        mealId: string;
        title: string;
        description: string;
        imageUrl: string | null;
    }>;
};

export function PublicCookMenuDialog({
    open,
    onOpenChange,
    title,
    description,
    images,
    courses,
    bookCta,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    images: ReadonlyArray<string>;
    courses: ReadonlyArray<PublicCookMenuDialogCourse>;
    bookCta?: { cookId: string; menuId: string; onClick?: () => void };
}) {
    const locale = useLocale();
    const courseCount = courses.length;
    const courseLabel =
        courseCount === 1 ? { de: '1 Gang', en: '1 course' }[locale] : { de: `${courseCount} Gänge`, en: `${courseCount} courses` }[locale];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription className="sr-only">{{ de: 'Details zum Menü', en: 'Menu details' }[locale]}</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col justify-start gap-8 lg:flex-row">
                    <CookMenuCardMedia images={images} className="size-56 rounded-2xl lg:size-80" />
                    <div className="flex min-w-0 flex-1 flex-col gap-4">
                        <h2 className="text-xl font-semibold">{title}</h2>
                        {description.trim().length > 0 ? <p className="whitespace-pre-wrap text-muted-foreground">{description}</p> : null}
                        <p className="text-sm text-muted-foreground">{courseLabel}</p>
                        <ul className="grid gap-4">
                            {courses.map((course) => (
                                <li key={course.title} className="grid gap-2">
                                    <p className="text-sm font-semibold">{course.title}</p>
                                    <ul className="grid gap-2">
                                        {course.mealOptions.map((meal) => (
                                            <li key={meal.mealId} className="text-sm text-muted-foreground">
                                                <span className="font-medium text-foreground">{meal.title}</span>
                                                {meal.description.trim().length > 0 ? ` · ${meal.description}` : null}
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                        {bookCta ? (
                            <Button asChild size="lg" className="mt-2 self-start">
                                <Link
                                    to="/{-$locale}/booking-request/form"
                                    search={{ cookId: bookCta.cookId, menuId: bookCta.menuId }}
                                    onClick={bookCta.onClick}
                                >
                                    {{ de: 'Dieses Menü anfragen', en: 'Request this menu' }[locale]}
                                </Link>
                            </Button>
                        ) : null}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
