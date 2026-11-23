import { useState } from 'react';

import { Button } from '../components/base/button';
import { bookingRequestCardInteractionClassName } from '../components/bookingRequestCardInteraction';
import { CookMenuCardMedia } from '../components/CookMenuCard';
import { PublicCookMenuDialog } from '../components/PublicCookMenuDialog';
import type { PublicCookMenuDialogCourse } from '../components/PublicCookMenuDialog';
import { useT } from '../hooks/useT';
import { cn } from '../utils/cn';

export type SectionCookMenu = {
    menuId: string;
    title: string;
    description: string;
    courseMealOptionImages: ReadonlyArray<string>;
    courses: ReadonlyArray<PublicCookMenuDialogCourse>;
};

const COLLAPSED_MENU_COUNT = 5;

export function SectionCookMenus({
    menus,
    bookCookId,
    onBookMenuCtaClick,
    onMenuOpen,
}: {
    menus: ReadonlyArray<SectionCookMenu>;
    bookCookId?: string;
    onBookMenuCtaClick?: (menuId: string) => void;
    onMenuOpen?: (menuId: string) => void;
}) {
    const { t } = useT('public');
    const [expanded, setExpanded] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const canExpand = menus.length > COLLAPSED_MENU_COUNT;
    const visibleMenus = canExpand && !expanded ? menus.slice(0, COLLAPSED_MENU_COUNT) : menus;
    const openMenu = menus.find((menu) => menu.menuId === openMenuId) ?? null;

    if (menus.length === 0) {
        return null;
    }

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-serif text-3xl font-light @3xl:text-4xl">{t('chef.menus')}</h2>
                {canExpand ? (
                    <Button
                        type="button"
                        variant="link"
                        className="h-auto -mx-2 px-2"
                        aria-expanded={expanded}
                        onClick={() => setExpanded((current) => !current)}
                    >
                        {expanded ? t('chef.showLess') : t('chef.showMore')}
                    </Button>
                ) : null}
            </div>
            <ul className="mt-8 grid grid-cols-2 gap-3 @md:grid-cols-3 @2xl:grid-cols-4 @5xl:grid-cols-5">
                {visibleMenus.map((menu) => (
                    <li key={menu.menuId} className="min-w-0">
                        <button
                            type="button"
                            className={cn(
                                'flex size-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left text-card-foreground shadow-sm',
                                bookingRequestCardInteractionClassName,
                            )}
                            onClick={() => {
                                if (openMenuId !== menu.menuId) onMenuOpen?.(menu.menuId);
                                setOpenMenuId(menu.menuId);
                            }}
                        >
                            <div className="aspect-square w-full overflow-hidden bg-muted">
                                <CookMenuCardMedia images={menu.courseMealOptionImages} className="size-full rounded-none" />
                            </div>
                            <div className="flex flex-1 flex-col gap-1 p-3">
                                <p className="text-sm/snug font-semibold">{menu.title}</p>
                                {menu.description.trim().length > 0 ? (
                                    <p className="text-sm text-muted-foreground line-clamp-2">{menu.description}</p>
                                ) : null}
                                <p className="text-xs text-muted-foreground">{t('chef.courseCount', { count: menu.courses.length })}</p>
                            </div>
                        </button>
                    </li>
                ))}
            </ul>
            {openMenu ? (
                <PublicCookMenuDialog
                    open
                    onOpenChange={(open) => {
                        if (!open) setOpenMenuId(null);
                    }}
                    title={openMenu.title}
                    description={openMenu.description}
                    images={openMenu.courseMealOptionImages}
                    courses={openMenu.courses}
                    bookCta={
                        bookCookId
                            ? {
                                  cookId: bookCookId,
                                  menuId: openMenu.menuId,
                                  onClick: () => onBookMenuCtaClick?.(openMenu.menuId),
                              }
                            : undefined
                    }
                />
            ) : null}
        </section>
    );
}
