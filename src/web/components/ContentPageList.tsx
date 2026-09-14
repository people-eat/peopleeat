import { Link } from '@tanstack/react-router';

import { contentLocaleText } from '../../shared/contentSection';
import type { Locale } from '../../shared/locale';
import { cn } from '../utils/cn';

const CONTENT_PAGE_DETAIL_ROUTES = {
    '/cities': '/{-$locale}/cities/$pathName',
    '/partners': '/{-$locale}/partners/$pathName',
    '/occasions': '/{-$locale}/occasions/$pathName',
    '/blog-posts': '/{-$locale}/blog-posts/$pathName',
} as const;

export type ContentPageListItem = {
    pathName: string;
    titleDe: string;
    titleEn: string;
    descriptionDe: string;
    descriptionEn: string;
    heroImageUrl?: string | null;
};

export function ContentPageList({
    items,
    locale,
    basePath,
    emptyLabel,
    showHeroImage = true,
}: {
    items: ContentPageListItem[];
    locale: Locale;
    basePath: '/cities' | '/partners' | '/occasions' | '/blog-posts';
    emptyLabel: string;
    showHeroImage?: boolean;
}) {
    if (items.length === 0) {
        return <p className="text-muted-foreground">{emptyLabel}</p>;
    }

    return (
        <ul className="grid gap-8 @sm:grid-cols-2">
            {items.map((item) => {
                const title = contentLocaleText(item.titleDe, item.titleEn, locale);
                const description = contentLocaleText(item.descriptionDe, item.descriptionEn, locale);
                const to = CONTENT_PAGE_DETAIL_ROUTES[basePath];
                return (
                    <li key={item.pathName}>
                        <Link
                            to={to}
                            params={{ pathName: item.pathName }}
                            className={cn('group flex flex-col gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring')}
                        >
                            {showHeroImage ? (
                                item.heroImageUrl ? (
                                    <img
                                        src={item.heroImageUrl}
                                        alt=""
                                        className="aspect-video w-full object-cover transition-opacity group-hover:opacity-90"
                                    />
                                ) : (
                                    <div className="aspect-video w-full bg-secondary" />
                                )
                            ) : null}
                            <div className="flex flex-col gap-1">
                                <h2 className="font-serif text-2xl font-light group-hover:underline">{title}</h2>
                                <p className="text-sm text-muted-foreground">{description}</p>
                            </div>
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}
