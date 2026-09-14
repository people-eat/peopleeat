import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { Card, CardDescription, CardHeader, CardTitle } from './base/card';
import { CookMenuCardMedia } from './CookMenuCard';

export type OfferSuggestedMenuCardMenu = {
    menuId: string;
    title: string;
    description: string;
    courseCount: number;
    courseMealOptionImages?: ReadonlyArray<string>;
};

export function OfferSuggestedMenuCard({
    menu,
    selected,
    disabled,
    onSelect,
}: {
    menu: OfferSuggestedMenuCardMenu;
    selected: boolean;
    disabled?: boolean;
    onSelect: (menuId: string) => void;
}) {
    const locale = useLocale();
    const courseLabel =
        menu.courseCount === 1
            ? { de: '1 Gang', en: '1 course' }[locale]
            : { de: `${menu.courseCount} Gänge`, en: `${menu.courseCount} courses` }[locale];

    return (
        <li className="min-w-0">
            <Card className={cn('h-full gap-0 py-0 transition', selected && 'border-foreground/30 bg-muted/30', disabled && 'opacity-60')}>
                <button
                    type="button"
                    className={cn(
                        'flex w-full min-w-0 cursor-pointer items-stretch gap-3 rounded-[inherit] p-4 text-left outline-none',
                        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                        disabled && 'cursor-not-allowed',
                    )}
                    aria-pressed={selected}
                    disabled={disabled}
                    onClick={() => onSelect(menu.menuId)}
                >
                    <CookMenuCardMedia images={menu.courseMealOptionImages ?? []} />
                    <CardHeader className="min-w-0 flex-1 gap-1 p-0">
                        <CardTitle className="line-clamp-2 font-medium leading-snug">{menu.title}</CardTitle>
                        {menu.description.trim().length > 0 ? (
                            <CardDescription className="line-clamp-2">{menu.description}</CardDescription>
                        ) : null}
                        <span className="text-xs text-muted-foreground">{courseLabel}</span>
                    </CardHeader>
                </button>
            </Card>
        </li>
    );
}
