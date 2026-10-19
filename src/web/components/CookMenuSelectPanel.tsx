import { ChevronDownIcon, PencilIcon, PlusIcon, RefreshCwIcon, SparklesIcon } from 'lucide-react';
import { useState } from 'react';

import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import type { Locale } from '../utils/locale';
import { Button } from './base/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from './base/card';
import { Popover, PopoverContent, PopoverTrigger } from './base/popover';
import { Skeleton } from './base/skeleton';
import { StatusAlert } from './base/status-alert';
import { StatusBadge } from './base/status-badge';
import { CookMenuCardMedia } from './CookMenuCard';

export type CookMenuSelectPanelMenuCourse = {
    title: string;
    mealOptionCount: number;
};

export type CookMenuSelectPanelMenu = {
    menuId: string;
    title: string;
    description: string;
    courses: CookMenuSelectPanelMenuCourse[];
    courseMealOptionImages?: ReadonlyArray<string>;
};

export type CookMenuSelectPanelMenuEvaluation = {
    menuId: string;
    evaluationSummary: string;
    isSuitable: boolean;
};

export type CookMenuSelectPanelGeneratedMenu = {
    title: string;
    description: string;
    courseCount: number;
};

/** Offer pickers require every course to have a title and ≥ 1 meal option. */
export function cookMenuSelectPanelMenuIsComplete(courses: readonly CookMenuSelectPanelMenuCourse[]): boolean {
    return courses.length >= 1 && courses.every((course) => course.title.trim().length > 0 && course.mealOptionCount >= 1);
}

const menuGridClassName = 'grid grid-cols-1 gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3 @8xl:grid-cols-4';

function evaluationRank(evaluation: CookMenuSelectPanelMenuEvaluation | undefined): number {
    if (evaluation == null) return 1;
    return evaluation.isSuitable ? 0 : 2;
}

export function cookMenuSelectPanelMenusSortByEvaluation<T extends { menuId: string }>(
    menus: readonly T[],
    evaluations: readonly CookMenuSelectPanelMenuEvaluation[] | null | undefined,
): T[] {
    if (evaluations == null || evaluations.length === 0) return [...menus];
    const byId = new Map(evaluations.map((row) => [row.menuId, row]));
    return [...menus].sort((a, b) => evaluationRank(byId.get(a.menuId)) - evaluationRank(byId.get(b.menuId)));
}

function CookMenuSelectPanelEvaluationBadge({ evaluation, locale }: { evaluation: CookMenuSelectPanelMenuEvaluation; locale: Locale }) {
    const label = {
        de: evaluation.isSuitable ? 'Passend' : 'Weniger passend',
        en: evaluation.isSuitable ? 'Good fit' : 'Weak fit',
    }[locale];
    const reason = evaluation.evaluationSummary.trim();
    const tone = evaluation.isSuitable ? 'success' : 'warning';
    const interactiveBadgeClassName = cn(
        'font-normal transition-colors',
        tone === 'success'
            ? 'group-hover:bg-green-200 group-active:bg-green-300 group-data-[state=open]:bg-green-200'
            : 'group-hover:bg-yellow-200 group-active:bg-yellow-300 group-data-[state=open]:bg-yellow-200',
    );

    if (reason.length === 0) {
        return (
            <StatusBadge tone={tone} className="font-normal">
                {label}
            </StatusBadge>
        );
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="group cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={
                        {
                            de: `${label}: Bewertung anzeigen`,
                            en: `${label}: show evaluation`,
                        }[locale]
                    }
                >
                    <StatusBadge tone={tone} className={interactiveBadgeClassName}>
                        {label}
                    </StatusBadge>
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-3">
                <p className="text-sm text-foreground">{reason}</p>
            </PopoverContent>
        </Popover>
    );
}

function CookMenuSelectPanelMenuCard({
    menu,
    checked,
    selectable,
    onToggle,
    onEditMenu,
    editMenuDisabled,
    evaluation,
    locale,
}: {
    menu: CookMenuSelectPanelMenu;
    checked: boolean;
    selectable: boolean;
    onToggle: (menuId: string) => void;
    onEditMenu?: (menuId: string) => void;
    editMenuDisabled?: boolean;
    evaluation?: CookMenuSelectPanelMenuEvaluation;
    locale: Locale;
}) {
    const courseCount = menu.courses.length;
    const courseLabel =
        courseCount === 1 ? { de: '1 Gang', en: '1 course' }[locale] : { de: `${courseCount} Gänge`, en: `${courseCount} courses` }[locale];
    const canEdit = onEditMenu != null;

    return (
        <li className="min-w-0">
            <Card
                className={cn(
                    'h-full justify-between gap-3 py-4',
                    selectable && checked && 'border-foreground/30 bg-muted/30',
                    !selectable && !canEdit && 'opacity-60',
                )}
            >
                <CardHeader className="px-4">
                    <div className="flex items-start gap-3">
                        <CookMenuCardMedia images={menu.courseMealOptionImages ?? []} />
                        <div className="grid min-w-0 flex-1 gap-1">
                            <CardTitle className="line-clamp-1 font-medium leading-snug">{menu.title}</CardTitle>
                            {menu.description.trim().length > 0 ? (
                                <CardDescription className="line-clamp-2">{menu.description}</CardDescription>
                            ) : null}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-muted-foreground">{courseLabel}</span>
                                {selectable ? null : (
                                    <StatusBadge tone="warning" className="font-normal">
                                        {{ de: 'Unvollständig', en: 'Incomplete' }[locale]}
                                    </StatusBadge>
                                )}
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardFooter className="flex flex-wrap items-center gap-2 px-4">
                    <div className="mr-auto min-w-0">
                        {evaluation != null ? <CookMenuSelectPanelEvaluationBadge evaluation={evaluation} locale={locale} /> : null}
                    </div>
                    {canEdit ? (
                        <Button type="button" size="sm" variant="ghost" disabled={editMenuDisabled} onClick={() => onEditMenu(menu.menuId)}>
                            <PencilIcon className="size-4" />
                            {selectable ? { de: 'Bearbeiten', en: 'Edit' }[locale] : { de: 'Fertigstellen', en: 'Finish' }[locale]}
                        </Button>
                    ) : null}
                    {selectable ? (
                        <Button
                            type="button"
                            size="sm"
                            variant={checked ? 'default' : 'outline'}
                            aria-pressed={checked}
                            onClick={() => onToggle(menu.menuId)}
                        >
                            {checked ? { de: 'Ausgewählt', en: 'Selected' }[locale] : { de: 'Auswählen', en: 'Select' }[locale]}
                        </Button>
                    ) : null}
                </CardFooter>
            </Card>
        </li>
    );
}

function CookMenuSelectPanelSkeletonCard() {
    return (
        <li className="min-w-0">
            <Card className="h-full gap-3 py-4">
                <CardHeader className="px-4">
                    <div className="flex items-start gap-3">
                        <Skeleton className="size-20 shrink-0 rounded-lg sm:size-24" />
                        <div className="grid min-w-0 flex-1 gap-2">
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-1/3" />
                        </div>
                    </div>
                </CardHeader>
                <CardFooter className="justify-end gap-2 px-4">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-24" />
                </CardFooter>
            </Card>
        </li>
    );
}

export function CookMenuSelectPanel({
    menus,
    selectedMenuIds,
    onToggle,
    onCreateMenu,
    onEditMenu,
    createMenuDisabled = false,
    editMenuDisabled = false,
    menuEvaluations,
    menuEvaluationLoading = false,
    evaluationSummary,
    generatedMenu,
    onApplyGeneratedMenu,
    applyGeneratedMenuDisabled = false,
    onRefreshEvaluation,
    refreshEvaluationDisabled = false,
    className,
}: {
    menus: CookMenuSelectPanelMenu[];
    selectedMenuIds: string[];
    onToggle: (menuId: string) => void;
    onCreateMenu?: () => void;
    onEditMenu?: (menuId: string) => void;
    createMenuDisabled?: boolean;
    editMenuDisabled?: boolean;
    menuEvaluations?: readonly CookMenuSelectPanelMenuEvaluation[] | null;
    menuEvaluationLoading?: boolean;
    evaluationSummary?: string | null;
    generatedMenu?: CookMenuSelectPanelGeneratedMenu | null;
    onApplyGeneratedMenu?: () => void;
    applyGeneratedMenuDisabled?: boolean;
    onRefreshEvaluation?: () => void;
    refreshEvaluationDisabled?: boolean;
    className?: string;
}) {
    const locale = useLocale();
    const evaluationById = new Map((menuEvaluations ?? []).map((row) => [row.menuId, row]));
    const sortedMenus = cookMenuSelectPanelMenusSortByEvaluation(menus, menuEvaluations);
    const selectableMenus = sortedMenus.filter((menu) => cookMenuSelectPanelMenuIsComplete(menu.courses));
    const incompleteMenus = sortedMenus.filter((menu) => !cookMenuSelectPanelMenuIsComplete(menu.courses));
    // Expand when returnTo draft includes an incomplete menu (new menu / Fertigstellen).
    const [incompleteExpanded, setIncompleteExpanded] = useState(() =>
        incompleteMenus.some((menu) => selectedMenuIds.includes(menu.menuId)),
    );
    const showEvaluationUi = menuEvaluationLoading || menuEvaluations != null || generatedMenu != null || onRefreshEvaluation != null;

    return (
        <div className={cn('grid gap-3', className)}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-base font-medium text-foreground">
                    {
                        {
                            de: 'Schlage deine Menüs vor oder erstelle gleich hier Neue',
                            en: 'Suggest your menus or create new ones right here',
                        }[locale]
                    }
                </span>
                <div className="flex flex-wrap items-center gap-2">
                    {onRefreshEvaluation != null ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={refreshEvaluationDisabled || menuEvaluationLoading}
                            onClick={onRefreshEvaluation}
                        >
                            <RefreshCwIcon className={cn('size-4', menuEvaluationLoading && 'animate-spin')} />
                            {
                                {
                                    de: menuEvaluationLoading ? 'Bewertung läuft…' : 'Empfehlungen aktualisieren',
                                    en: menuEvaluationLoading ? 'Evaluating…' : 'Refresh recommendations',
                                }[locale]
                            }
                        </Button>
                    ) : null}
                    {onCreateMenu != null ? (
                        <Button type="button" variant="outline" size="sm" disabled={createMenuDisabled} onClick={onCreateMenu}>
                            <PlusIcon className="size-4" />
                            {
                                {
                                    de: createMenuDisabled ? 'Wird angelegt…' : 'Neues Menü',
                                    en: createMenuDisabled ? 'Creating…' : 'New menu',
                                }[locale]
                            }
                        </Button>
                    ) : null}
                </div>
            </div>

            {showEvaluationUi && menuEvaluationLoading ? (
                <StatusAlert tone="info">
                    {
                        {
                            de: 'Wir bewerten deine Menüs für diese Anfrage und bereiten eine Empfehlung vor.',
                            en: 'We are evaluating your menus for this request and preparing a recommendation.',
                        }[locale]
                    }
                </StatusAlert>
            ) : null}

            {showEvaluationUi && !menuEvaluationLoading && evaluationSummary != null && evaluationSummary.trim().length > 0 ? (
                <StatusAlert tone="info">{evaluationSummary}</StatusAlert>
            ) : null}

            {menuEvaluationLoading ? (
                <ul
                    className={menuGridClassName}
                    aria-busy="true"
                    aria-label={{ de: 'Empfehlung lädt', en: 'Recommendation loading' }[locale]}
                >
                    <CookMenuSelectPanelSkeletonCard />
                </ul>
            ) : null}

            {!menuEvaluationLoading && generatedMenu != null && onApplyGeneratedMenu != null ? (
                <Card className="gap-3 border-foreground/20 bg-muted/20 py-4">
                    <CardHeader className="px-4">
                        <div className="flex items-start gap-3">
                            <span
                                className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground"
                                aria-hidden
                            >
                                <SparklesIcon className="size-6 opacity-50" />
                            </span>
                            <div className="grid min-w-0 flex-1 gap-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <CardTitle className="line-clamp-1 font-medium leading-snug">{generatedMenu.title}</CardTitle>
                                    <StatusBadge tone="success" className="font-normal">
                                        {{ de: 'Plattform-Empfehlung', en: 'Platform recommendation' }[locale]}
                                    </StatusBadge>
                                </div>
                                {generatedMenu.description.trim().length > 0 ? (
                                    <CardDescription className="line-clamp-3">{generatedMenu.description}</CardDescription>
                                ) : null}
                                <span className="text-xs text-muted-foreground">
                                    {
                                        {
                                            de:
                                                generatedMenu.courseCount === 1
                                                    ? '1 Gang (Vorschlag)'
                                                    : `${generatedMenu.courseCount} Gänge (Vorschlag)`,
                                            en:
                                                generatedMenu.courseCount === 1
                                                    ? '1 course (suggestion)'
                                                    : `${generatedMenu.courseCount} courses (suggestion)`,
                                        }[locale]
                                    }
                                </span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardFooter className="justify-end px-4">
                        <Button type="button" size="sm" disabled={applyGeneratedMenuDisabled} onClick={onApplyGeneratedMenu}>
                            <SparklesIcon className="size-4" />
                            {
                                {
                                    de: applyGeneratedMenuDisabled ? 'Wird angelegt…' : 'Empfehlung übernehmen',
                                    en: applyGeneratedMenuDisabled ? 'Creating…' : 'Use recommendation',
                                }[locale]
                            }
                        </Button>
                    </CardFooter>
                </Card>
            ) : null}

            {menus.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {
                        {
                            de: 'Noch keine Menüs. Erstelle eines, um fortzufahren.',
                            en: 'No menus yet. Create one to continue.',
                        }[locale]
                    }
                </p>
            ) : (
                <>
                    {selectableMenus.length > 0 ? (
                        <ul className={cn(menuGridClassName, menuEvaluationLoading && 'opacity-70')}>
                            {selectableMenus.map((menu) => (
                                <CookMenuSelectPanelMenuCard
                                    key={menu.menuId}
                                    menu={menu}
                                    checked={selectedMenuIds.includes(menu.menuId)}
                                    selectable
                                    onToggle={onToggle}
                                    onEditMenu={onEditMenu}
                                    editMenuDisabled={editMenuDisabled}
                                    evaluation={menuEvaluationLoading ? undefined : evaluationById.get(menu.menuId)}
                                    locale={locale}
                                />
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Keine vollständigen Menüs zur Auswahl. Vervollständige eines unten.',
                                    en: 'No complete menus to select. Finish one below.',
                                }[locale]
                            }
                        </p>
                    )}

                    {incompleteMenus.length > 0 ? (
                        <div className="grid gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full justify-between text-muted-foreground"
                                aria-expanded={incompleteExpanded}
                                onClick={() => setIncompleteExpanded((current) => !current)}
                            >
                                <span>
                                    {
                                        {
                                            de: `Unvollständige Menüs (${incompleteMenus.length})`,
                                            en: `Incomplete menus (${incompleteMenus.length})`,
                                        }[locale]
                                    }
                                </span>
                                <ChevronDownIcon
                                    className={cn('size-4 shrink-0 transition-transform', !incompleteExpanded && '-rotate-90')}
                                    aria-hidden
                                />
                            </Button>
                            {incompleteExpanded ? (
                                <ul className={menuGridClassName}>
                                    {incompleteMenus.map((menu) => (
                                        <CookMenuSelectPanelMenuCard
                                            key={menu.menuId}
                                            menu={menu}
                                            checked={false}
                                            selectable={false}
                                            onToggle={onToggle}
                                            onEditMenu={onEditMenu}
                                            editMenuDisabled={editMenuDisabled}
                                            evaluation={menuEvaluationLoading ? undefined : evaluationById.get(menu.menuId)}
                                            locale={locale}
                                        />
                                    ))}
                                </ul>
                            ) : null}
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
}
