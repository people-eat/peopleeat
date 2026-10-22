import { closestCenter, DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DropAnimation } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, ChevronDownIcon, GripVerticalIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { idCreate } from '../../shared/idCreate';
import { useLocale } from '../hooks/useLocale';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { animateListReorder } from '../utils/animateListReorder';
import { cn } from '../utils/cn';
import type { Locale } from '../utils/locale';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './base/alert-dialog';
import { Badge } from './base/badge';
import { Button } from './base/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from './base/card';
import { Checkbox } from './base/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './base/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './base/select';
import { StatusBadge } from './base/status-badge';
import { CookMealCard } from './CookMealCard';
import { CookMealEditorDialog } from './CookMealEditorDialog';
import type { CookMealEditorMeal, CookMealEditorSaveHandlers } from './CookMealEditorDialog';

export type CookMenuCourseDraft = {
    courseId: string;
    title: string;
    mealIds: string[];
    mealSelectionLimit: number | null;
};

export type CookMenuCourseMealOption = {
    mealId: string;
    title: string;
    description: string;
    imageUrl?: string | null;
    imageFileUploadId?: string | null;
    publishedAt?: string | null;
};

const COURSE_TITLE_PRESETS: Record<Locale, string[]> = {
    de: ['Amuse Bouche', 'Vorspeise', 'Hauptspeise', 'Dessert', 'Zwischengang', 'Käsegang', 'Kindergang', 'Fingerfood', 'Weinbegleitung'],
    en: ['Amuse Bouche', 'Starter', 'Main course', 'Dessert', 'Intermediate course', 'Cheese course', 'Children course', 'Fingerfood', 'Wine pairing'],
};

const VERTICAL_SORT_DROP_ANIMATION: DropAnimation = {
    duration: 200,
    easing: 'ease-out',
};

function useVerticalSortSensors() {
    return useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
}

function sortableItemStyle(
    transform: { x: number; y: number; scaleX: number; scaleY: number } | null,
    transition: string | undefined,
    prefersReducedMotion: boolean,
): CSSProperties {
    return {
        transform: CSS.Transform.toString(transform),
        transition: prefersReducedMotion ? undefined : transition,
    };
}

function mealSelectionLimitClamp(limit: number | null | undefined, mealCount: number): number | null {
    if (limit == null) return null;
    if (mealCount >= 2 && limit >= 2 && limit <= mealCount) return limit;
    return null;
}

function courseReady(course: CookMenuCourseDraft): boolean {
    return course.title.trim().length > 0 && course.mealIds.length > 0;
}

export function CookMenuCoursesEditor({
    courses,
    onChange,
    meals,
    mealSaveHandlers,
}: {
    courses: CookMenuCourseDraft[];
    onChange: (courses: CookMenuCourseDraft[]) => void;
    meals: CookMenuCourseMealOption[];
    mealSaveHandlers?: CookMealEditorSaveHandlers;
}) {
    const locale = useLocale();
    const prefersReducedMotion = usePrefersReducedMotion();
    const coursesListRef = useRef<HTMLDivElement>(null);
    const mealListRefs = useRef(new Map<string, HTMLUListElement>());
    const courseSensors = useVerticalSortSensors();
    const [expandedId, setExpandedId] = useState<string | null>(() => courses.find((course) => !courseReady(course))?.courseId ?? null);
    const [pickerCourseId, setPickerCourseId] = useState<string | null>(null);
    const [deleteCourseId, setDeleteCourseId] = useState<string | null>(null);
    const [deleteMealTarget, setDeleteMealTarget] = useState<{ courseId: string; mealId: string } | null>(null);
    const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
    const [editingMeal, setEditingMeal] = useState<CookMealEditorMeal | null>(null);
    const [mealEditorOpen, setMealEditorOpen] = useState(false);
    const mealsById = new Map(meals.map((meal) => [meal.mealId, meal]));
    const titlePresets = COURSE_TITLE_PRESETS[locale];
    const pickerCourse = courses.find((course) => course.courseId === pickerCourseId) ?? null;
    const deleteCourse = courses.find((course) => course.courseId === deleteCourseId) ?? null;
    const deleteMeal = deleteMealTarget != null ? (mealsById.get(deleteMealTarget.mealId) ?? null) : null;
    const activeCourse = activeCourseId != null ? (courses.find((course) => course.courseId === activeCourseId) ?? null) : null;
    const activeCourseIndex = activeCourseId != null ? courses.findIndex((course) => course.courseId === activeCourseId) : -1;
    const courseIds = courses.map((course) => course.courseId);

    function openMealEditor(meal: CookMenuCourseMealOption) {
        setEditingMeal(meal);
        setMealEditorOpen(true);
    }

    function updateCourse(courseId: string, patch: Partial<CookMenuCourseDraft>) {
        onChange(courses.map((course) => (course.courseId === courseId ? { ...course, ...patch } : course)));
    }

    function moveCourse(index: number, delta: number) {
        const nextIndex = index + delta;
        if (nextIndex < 0 || nextIndex >= courses.length) return;
        animateListReorder(coursesListRef.current, () => {
            onChange(arrayMove(courses, index, nextIndex));
        });
    }

    function reorderCourses(event: DragEndEvent) {
        const { active, over } = event;
        setActiveCourseId(null);
        if (over == null || active.id === over.id) return;
        const from = courses.findIndex((course) => course.courseId === active.id);
        const to = courses.findIndex((course) => course.courseId === over.id);
        if (from < 0 || to < 0) return;
        onChange(arrayMove(courses, from, to));
    }

    function removeCourse(courseId: string) {
        if (courses.length <= 1) return;
        const next = courses.filter((course) => course.courseId !== courseId);
        onChange(next);
        if (expandedId === courseId) {
            setExpandedId(next.find((course) => !courseReady(course))?.courseId ?? next[0]?.courseId ?? null);
        }
        setDeleteCourseId(null);
    }

    function requestRemoveCourse(courseId: string) {
        if (courses.length <= 1) return;
        const course = courses.find((entry) => entry.courseId === courseId);
        if (course == null) return;
        if (course.mealIds.length > 0) {
            setDeleteCourseId(courseId);
            return;
        }
        removeCourse(courseId);
    }

    function addCourse(afterIndex: number) {
        const next: CookMenuCourseDraft = {
            courseId: idCreate(),
            title: titlePresets[1] ?? { de: 'Vorspeise', en: 'Starter' }[locale],
            mealIds: [],
            mealSelectionLimit: null,
        };
        const copy = courses.slice();
        copy.splice(afterIndex + 1, 0, next);
        onChange(copy);
        setExpandedId(next.courseId);
    }

    function moveMeal(courseId: string, mealIndex: number, delta: number) {
        const course = courses.find((entry) => entry.courseId === courseId);
        if (course == null) return;
        const nextIndex = mealIndex + delta;
        if (nextIndex < 0 || nextIndex >= course.mealIds.length) return;
        animateListReorder(mealListRefs.current.get(courseId) ?? null, () => {
            updateCourse(courseId, { mealIds: arrayMove(course.mealIds, mealIndex, nextIndex) });
        });
    }

    function reorderMeals(courseId: string, mealIds: string[]) {
        const course = courses.find((entry) => entry.courseId === courseId);
        updateCourse(courseId, {
            mealIds,
            mealSelectionLimit: mealSelectionLimitClamp(course?.mealSelectionLimit, mealIds.length),
        });
    }

    function removeMeal(courseId: string, mealId: string) {
        const course = courses.find((entry) => entry.courseId === courseId);
        if (course == null) return;
        const nextMealIds = course.mealIds.filter((id) => id !== mealId);
        updateCourse(courseId, {
            mealIds: nextMealIds,
            mealSelectionLimit: mealSelectionLimitClamp(course.mealSelectionLimit, nextMealIds.length),
        });
        setDeleteMealTarget(null);
    }

    function doneCourse(index: number) {
        const after = courses.slice(index + 1).find((course) => !courseReady(course));
        const before = courses.slice(0, index).find((course) => !courseReady(course));
        setExpandedId(after?.courseId ?? before?.courseId ?? null);
    }

    function onCourseDragStart(event: DragStartEvent) {
        setActiveCourseId(String(event.active.id));
    }

    return (
        <div className="grid gap-3">
            <DndContext
                sensors={courseSensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragStart={onCourseDragStart}
                onDragEnd={reorderCourses}
                onDragCancel={() => setActiveCourseId(null)}
            >
                <SortableContext items={courseIds} strategy={verticalListSortingStrategy}>
                    <div ref={coursesListRef} className="grid gap-3">
                        {courses.map((course, index) => {
                            const open = expandedId === course.courseId;
                            const ready = courseReady(course);
                            const mealCountLabel =
                                course.mealIds.length === 1
                                    ? { de: '1 Gericht', en: '1 meal' }[locale]
                                    : { de: `${course.mealIds.length} Gerichte`, en: `${course.mealIds.length} meals` }[locale];

                            return (
                                <SortableCourseCard
                                    key={course.courseId}
                                    courseId={course.courseId}
                                    prefersReducedMotion={prefersReducedMotion}
                                    open={open}
                                    dragHandleLabel={{ de: 'Gang verschieben', en: 'Drag to reorder course' }[locale]}
                                    title={
                                        <CardTitle className="min-w-0 text-sm font-medium">
                                            <button
                                                type="button"
                                                aria-expanded={open}
                                                className={cn(
                                                    'group/course-header flex min-h-10 min-w-0 w-full cursor-pointer items-center gap-2 py-2 pr-2 pl-3 text-left outline-none md:pl-1',
                                                    'transition-[color,background-color] duration-200 ease-out motion-reduce:transition-none',
                                                    'hover:bg-muted hover:text-foreground',
                                                    'active:bg-muted/80',
                                                    'focus-visible:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset',
                                                )}
                                                onClick={() => setExpandedId(open ? null : course.courseId)}
                                            >
                                                <ChevronDownIcon
                                                    className={cn(
                                                        'size-4 shrink-0 text-muted-foreground transition-[color,transform] duration-200 ease-out motion-reduce:transition-none',
                                                        'group-hover/course-header:text-foreground',
                                                        !open && '-rotate-90',
                                                    )}
                                                    aria-hidden
                                                />
                                                <span className="min-w-0 flex-1 truncate">
                                                    <span className="text-muted-foreground">
                                                        {{ de: 'Gang', en: 'Course' }[locale]} {index + 1}
                                                    </span>
                                                    <span className="mx-1.5 text-muted-foreground/60">·</span>
                                                    <span>{course.title.trim() || { de: 'Ohne Titel', en: 'Untitled' }[locale]}</span>
                                                </span>
                                                {ready ? (
                                                    <Badge variant="secondary" className="shrink-0 font-normal">
                                                        {mealCountLabel}
                                                    </Badge>
                                                ) : (
                                                    <StatusBadge tone="warning" className="shrink-0 font-normal">
                                                        {{ de: 'Unvollständig', en: 'Incomplete' }[locale]}
                                                    </StatusBadge>
                                                )}
                                            </button>
                                        </CardTitle>
                                    }
                                    actions={
                                        <CardAction className="flex items-center gap-0.5 self-center pl-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                className="md:hidden"
                                                disabled={index === 0}
                                                aria-label={{ de: 'Gang nach oben', en: 'Move course up' }[locale]}
                                                onClick={() => moveCourse(index, -1)}
                                            >
                                                <ArrowUpIcon className="size-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                className="md:hidden"
                                                disabled={index === courses.length - 1}
                                                aria-label={{ de: 'Gang nach unten', en: 'Move course down' }[locale]}
                                                onClick={() => moveCourse(index, 1)}
                                            >
                                                <ArrowDownIcon className="size-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                disabled={courses.length <= 1}
                                                aria-label={{ de: 'Gang entfernen', en: 'Remove course' }[locale]}
                                                onClick={() => requestRemoveCourse(course.courseId)}
                                            >
                                                <Trash2Icon className="size-4" />
                                            </Button>
                                        </CardAction>
                                    }
                                >
                                    {open ? (
                                        <CardContent className="grid gap-4 px-4 pt-3 pb-4">
                                            <div className="grid gap-1.5">
                                                <label htmlFor={`course-title-${course.courseId}`} className="text-sm font-medium">
                                                    {{ de: 'Name', en: 'Name' }[locale]}
                                                </label>
                                                <CourseTitleSelect
                                                    id={`course-title-${course.courseId}`}
                                                    value={course.title}
                                                    presets={titlePresets}
                                                    onChange={(title) => updateCourse(course.courseId, { title })}
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <p className="text-sm font-medium">
                                                    {{ de: 'Gerichtsoptionen', en: 'Meal options' }[locale]}
                                                </p>
                                                {course.mealIds.length === 0 ? (
                                                    <p className="text-sm text-muted-foreground">
                                                        {
                                                            {
                                                                de: 'Noch keine Gerichte in diesem Gang.',
                                                                en: 'No meals in this course yet.',
                                                            }[locale]
                                                        }
                                                    </p>
                                                ) : (
                                                    <CourseMealsSortableList
                                                        courseId={course.courseId}
                                                        courseTitle={course.title}
                                                        mealIds={course.mealIds}
                                                        mealsById={mealsById}
                                                        prefersReducedMotion={prefersReducedMotion}
                                                        listRef={(element) => {
                                                            if (element == null) mealListRefs.current.delete(course.courseId);
                                                            else mealListRefs.current.set(course.courseId, element);
                                                        }}
                                                        onReorder={(mealIds) => reorderMeals(course.courseId, mealIds)}
                                                        onMove={(mealIndex, delta) => moveMeal(course.courseId, mealIndex, delta)}
                                                        onEdit={openMealEditor}
                                                        onRemove={(mealId) => setDeleteMealTarget({ courseId: course.courseId, mealId })}
                                                    />
                                                )}
                                                <Button type="button" variant="outline" onClick={() => setPickerCourseId(course.courseId)}>
                                                    <PlusIcon className="size-4" />
                                                    {{ de: 'Gerichte wählen', en: 'Choose meals' }[locale]}
                                                </Button>
                                            </div>

                                            {course.mealIds.length >= 2 ? (
                                                <div className="grid gap-2 border-t border-border pt-3">
                                                    <label className="flex items-center gap-2 text-sm">
                                                        <Checkbox
                                                            checked={course.mealSelectionLimit != null}
                                                            onCheckedChange={(checked) =>
                                                                updateCourse(course.courseId, {
                                                                    mealSelectionLimit:
                                                                        checked === true ? Math.min(2, course.mealIds.length) : null,
                                                                })
                                                            }
                                                        />
                                                        {{ de: 'Mehrere Gerichte erlauben', en: 'Allow multiple dishes' }[locale]}
                                                    </label>
                                                    {course.mealSelectionLimit != null ? (
                                                        <div className="flex flex-wrap items-center gap-2 text-sm">
                                                            <span className="text-muted-foreground">
                                                                {{ de: 'Auswahl bis zu', en: 'Select up to' }[locale]}
                                                            </span>
                                                            <Select
                                                                value={String(course.mealSelectionLimit)}
                                                                onValueChange={(value) =>
                                                                    updateCourse(course.courseId, {
                                                                        mealSelectionLimit: mealSelectionLimitClamp(
                                                                            Number(value),
                                                                            course.mealIds.length,
                                                                        ),
                                                                    })
                                                                }
                                                            >
                                                                <SelectTrigger
                                                                    className="w-20"
                                                                    aria-label={{ de: 'Auswahlgrenze', en: 'Selection limit' }[locale]}
                                                                >
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {Array.from({ length: course.mealIds.length - 1 }, (_, i) => i + 2).map(
                                                                        (n) => (
                                                                            <SelectItem key={n} value={String(n)}>
                                                                                {n}
                                                                            </SelectItem>
                                                                        ),
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ) : null}

                                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                                                <Button type="button" variant="ghost" size="sm" onClick={() => addCourse(index)}>
                                                    <PlusIcon className="size-4" />
                                                    {{ de: 'Gang darunter einfügen', en: 'Insert course below' }[locale]}
                                                </Button>
                                                <Button type="button" size="sm" onClick={() => doneCourse(index)}>
                                                    <CheckIcon className="size-4" />
                                                    {{ de: 'Fertig', en: 'Done' }[locale]}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    ) : null}
                                </SortableCourseCard>
                            );
                        })}
                    </div>
                </SortableContext>

                <DragOverlay
                    adjustScale={false}
                    dropAnimation={prefersReducedMotion ? null : VERTICAL_SORT_DROP_ANIMATION}
                    modifiers={[restrictToVerticalAxis]}
                >
                    {activeCourse != null && activeCourseIndex >= 0 ? (
                        <CourseDragOverlayCard
                            index={activeCourseIndex}
                            title={activeCourse.title}
                            ready={courseReady(activeCourse)}
                            mealCount={activeCourse.mealIds.length}
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>

            <Button type="button" variant="outline" className="justify-self-start" onClick={() => addCourse(courses.length - 1)}>
                <PlusIcon className="size-4" />
                {{ de: 'Gang hinzufügen', en: 'Add course' }[locale]}
            </Button>

            <CookMenuMealsPickerDialog
                open={pickerCourse != null}
                onOpenChange={(open) => {
                    if (!open) setPickerCourseId(null);
                }}
                meals={meals}
                selectedMealIds={pickerCourse?.mealIds ?? []}
                mealSaveHandlers={mealSaveHandlers}
                onConfirm={(mealIds) => {
                    if (pickerCourse == null) return;
                    updateCourse(pickerCourse.courseId, {
                        mealIds,
                        mealSelectionLimit: mealSelectionLimitClamp(pickerCourse.mealSelectionLimit, mealIds.length),
                    });
                    setPickerCourseId(null);
                }}
            />

            <CookMealEditorDialog
                open={mealEditorOpen}
                onOpenChange={(open) => {
                    setMealEditorOpen(open);
                    if (!open) setEditingMeal(null);
                }}
                meal={editingMeal}
                saveHandlers={mealSaveHandlers}
                onSaved={() => {
                    setMealEditorOpen(false);
                    setEditingMeal(null);
                }}
            />

            <AlertDialog open={deleteCourse != null} onOpenChange={(open) => !open && setDeleteCourseId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{{ de: 'Gang löschen?', en: 'Delete this course?' }[locale]}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {
                                {
                                    de: 'Die Gerichtsoptionen in diesem Gang gehen verloren.',
                                    en: 'Meal options in this course will be removed.',
                                }[locale]
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={() => {
                                if (deleteCourseId != null) removeCourse(deleteCourseId);
                            }}
                        >
                            {{ de: 'Löschen', en: 'Delete' }[locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={deleteMealTarget != null} onOpenChange={(open) => !open && setDeleteMealTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{{ de: 'Gericht entfernen?', en: 'Remove this meal?' }[locale]}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {
                                {
                                    de:
                                        deleteMeal != null
                                            ? `„${deleteMeal.title}“ wird aus diesem Gang entfernt.`
                                            : 'Dieses Gericht wird aus dem Gang entfernt.',
                                    en:
                                        deleteMeal != null
                                            ? `“${deleteMeal.title}” will be removed from this course.`
                                            : 'This meal will be removed from the course.',
                                }[locale]
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={() => {
                                if (deleteMealTarget != null) {
                                    removeMeal(deleteMealTarget.courseId, deleteMealTarget.mealId);
                                }
                            }}
                        >
                            {{ de: 'Entfernen', en: 'Remove' }[locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function SortableCourseCard({
    courseId,
    open,
    prefersReducedMotion,
    dragHandleLabel,
    title,
    actions,
    children,
}: {
    courseId: string;
    open: boolean;
    prefersReducedMotion: boolean;
    dragHandleLabel: string;
    title: ReactNode;
    actions: ReactNode;
    children: ReactNode;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: courseId,
        animateLayoutChanges: prefersReducedMotion ? () => false : undefined,
    });

    return (
        <Card
            ref={setNodeRef}
            style={sortableItemStyle(transform, transition, prefersReducedMotion)}
            data-reorder-id={courseId}
            className={cn('gap-0 overflow-hidden py-0', isDragging && 'border-dashed bg-muted/50 shadow-none')}
        >
            <div className={cn(isDragging && 'invisible')}>
                <CardHeader className={cn('items-center gap-0 p-0 pr-2', open && 'border-b [.border-b]:pb-0')}>
                    <div className="flex min-w-0 items-center">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="ml-1 hidden shrink-0 cursor-grab touch-none md:inline-flex active:cursor-grabbing"
                            aria-label={dragHandleLabel}
                            {...attributes}
                            {...listeners}
                        >
                            <GripVerticalIcon className="size-4" />
                        </Button>
                        <div className="min-w-0 flex-1">{title}</div>
                    </div>
                    {actions}
                </CardHeader>
                {children}
            </div>
        </Card>
    );
}

function CourseDragOverlayCard({ index, title, ready, mealCount }: { index: number; title: string; ready: boolean; mealCount: number }) {
    const locale = useLocale();
    const mealCountLabel =
        mealCount === 1 ? { de: '1 Gericht', en: '1 meal' }[locale] : { de: `${mealCount} Gerichte`, en: `${mealCount} meals` }[locale];

    return (
        <Card className="gap-0 py-0 shadow-lg ring-1 ring-border">
            <CardHeader className="items-center gap-0 p-0 pr-2">
                <div className="flex min-w-0 flex-1 items-center">
                    <span className="ml-1 flex size-8 items-center justify-center text-muted-foreground" aria-hidden>
                        <GripVerticalIcon className="size-4" />
                    </span>
                    <CardTitle className="flex min-h-10 min-w-0 flex-1 items-center gap-2 py-2 pr-2 text-sm font-medium">
                        <ChevronDownIcon className="size-4 shrink-0 -rotate-90 text-muted-foreground" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">
                            <span className="text-muted-foreground">
                                {{ de: 'Gang', en: 'Course' }[locale]} {index + 1}
                            </span>
                            <span className="mx-1.5 text-muted-foreground/60">·</span>
                            <span>{title.trim() || { de: 'Ohne Titel', en: 'Untitled' }[locale]}</span>
                        </span>
                        {ready ? (
                            <Badge variant="secondary" className="shrink-0 font-normal">
                                {mealCountLabel}
                            </Badge>
                        ) : (
                            <StatusBadge tone="warning" className="shrink-0 font-normal">
                                {{ de: 'Unvollständig', en: 'Incomplete' }[locale]}
                            </StatusBadge>
                        )}
                    </CardTitle>
                </div>
            </CardHeader>
        </Card>
    );
}

function CourseMealsSortableList({
    courseId,
    courseTitle,
    mealIds,
    mealsById,
    prefersReducedMotion,
    listRef,
    onReorder,
    onMove,
    onEdit,
    onRemove,
}: {
    courseId: string;
    courseTitle: string;
    mealIds: string[];
    mealsById: Map<string, CookMenuCourseMealOption>;
    prefersReducedMotion: boolean;
    listRef: (element: HTMLUListElement | null) => void;
    onReorder: (mealIds: string[]) => void;
    onMove: (mealIndex: number, delta: number) => void;
    onEdit: (meal: CookMenuCourseMealOption) => void;
    onRemove: (mealId: string) => void;
}) {
    const locale = useLocale();
    const sensors = useVerticalSortSensors();
    const [activeMealId, setActiveMealId] = useState<string | null>(null);
    const activeMeal = activeMealId != null ? (mealsById.get(activeMealId) ?? null) : null;

    function onDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveMealId(null);
        if (over == null || active.id === over.id) return;
        const from = mealIds.indexOf(String(active.id));
        const to = mealIds.indexOf(String(over.id));
        if (from < 0 || to < 0) return;
        onReorder(arrayMove(mealIds, from, to));
    }

    return (
        <DndContext
            id={`course-meals-${courseId}`}
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragStart={(event) => setActiveMealId(String(event.active.id))}
            onDragEnd={onDragEnd}
            onDragCancel={() => setActiveMealId(null)}
        >
            <SortableContext items={mealIds} strategy={verticalListSortingStrategy}>
                <ul ref={listRef} className="grid gap-2">
                    {mealIds.map((mealId, mealIndex) => {
                        const meal = mealsById.get(mealId);
                        if (meal == null) return null;
                        return (
                            <SortableMealOption
                                key={mealId}
                                mealId={mealId}
                                meal={meal}
                                courseTitle={courseTitle}
                                prefersReducedMotion={prefersReducedMotion}
                                mealIndex={mealIndex}
                                mealCount={mealIds.length}
                                dragHandleLabel={{ de: 'Gericht verschieben', en: 'Drag to reorder meal' }[locale]}
                                onMove={onMove}
                                onEdit={onEdit}
                                onRemove={onRemove}
                            />
                        );
                    })}
                </ul>
            </SortableContext>
            <DragOverlay
                adjustScale={false}
                dropAnimation={prefersReducedMotion ? null : VERTICAL_SORT_DROP_ANIMATION}
                modifiers={[restrictToVerticalAxis]}
            >
                {activeMeal != null ? <CookMealCard meal={activeMeal} dialogTitle={courseTitle} showStatusBadge={false} /> : null}
            </DragOverlay>
        </DndContext>
    );
}

function SortableMealOption({
    mealId,
    meal,
    courseTitle,
    prefersReducedMotion,
    mealIndex,
    mealCount,
    dragHandleLabel,
    onMove,
    onEdit,
    onRemove,
}: {
    mealId: string;
    meal: CookMenuCourseMealOption;
    courseTitle: string;
    prefersReducedMotion: boolean;
    mealIndex: number;
    mealCount: number;
    dragHandleLabel: string;
    onMove: (mealIndex: number, delta: number) => void;
    onEdit: (meal: CookMenuCourseMealOption) => void;
    onRemove: (mealId: string) => void;
}) {
    const locale = useLocale();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: mealId,
        animateLayoutChanges: prefersReducedMotion ? () => false : undefined,
    });

    return (
        <li
            ref={setNodeRef}
            style={sortableItemStyle(transform, transition, prefersReducedMotion)}
            data-reorder-id={mealId}
            className={cn(isDragging && 'rounded-xl border border-dashed border-border bg-muted/50')}
        >
            <div className={cn(isDragging && 'invisible')}>
                <CookMealCard
                    meal={meal}
                    dialogTitle={courseTitle}
                    showStatusBadge={false}
                    onAddImage={() => onEdit(meal)}
                    action={
                        <div className="flex shrink-0 flex-col items-center gap-0.5">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="hidden cursor-grab touch-none md:inline-flex active:cursor-grabbing"
                                aria-label={dragHandleLabel}
                                {...attributes}
                                {...listeners}
                            >
                                <GripVerticalIcon className="size-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="md:hidden"
                                disabled={mealIndex === 0}
                                aria-label={{ de: 'Gericht nach oben', en: 'Move meal up' }[locale]}
                                onClick={() => onMove(mealIndex, -1)}
                            >
                                <ArrowUpIcon className="size-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="md:hidden"
                                disabled={mealIndex === mealCount - 1}
                                aria-label={{ de: 'Gericht nach unten', en: 'Move meal down' }[locale]}
                                onClick={() => onMove(mealIndex, 1)}
                            >
                                <ArrowDownIcon className="size-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={{ de: 'Gericht bearbeiten', en: 'Edit meal' }[locale]}
                                onClick={() => onEdit(meal)}
                            >
                                <PencilIcon className="size-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                aria-label={{ de: 'Gericht entfernen', en: 'Remove meal' }[locale]}
                                onClick={() => onRemove(mealId)}
                            >
                                <Trash2Icon className="size-4" />
                            </Button>
                        </div>
                    }
                />
            </div>
        </li>
    );
}

function CourseTitleSelect({
    id,
    value,
    presets,
    onChange,
}: {
    id: string;
    value: string;
    presets: string[];
    onChange: (title: string) => void;
}) {
    const locale = useLocale();
    const trimmed = value.trim();
    const valueInPresets = presets.includes(value);
    const items = trimmed.length > 0 && !valueInPresets ? [value, ...presets] : presets;

    return (
        <Select value={trimmed.length > 0 ? value : undefined} onValueChange={(next) => onChange(next.slice(0, 255))} required>
            <SelectTrigger id={id} className="w-full">
                <SelectValue placeholder={{ de: 'z. B. Vorspeise', en: 'e.g. Starter' }[locale]} />
            </SelectTrigger>
            <SelectContent>
                {items.map((item) => (
                    <SelectItem key={item} value={item}>
                        {item}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function CookMenuMealsPickerDialog({
    open,
    onOpenChange,
    meals,
    selectedMealIds,
    onConfirm,
    mealSaveHandlers,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    meals: CookMenuCourseMealOption[];
    selectedMealIds: string[];
    onConfirm: (mealIds: string[]) => void;
    mealSaveHandlers?: CookMealEditorSaveHandlers;
}) {
    const locale = useLocale();
    const [draftIds, setDraftIds] = useState<string[]>(selectedMealIds);
    const [pendingMeals, setPendingMeals] = useState<CookMenuCourseMealOption[]>([]);
    const [editorMeal, setEditorMeal] = useState<CookMealEditorMeal | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const visibleMeals = [
        ...pendingMeals.filter((pending) => !meals.some((meal) => meal.mealId === pending.mealId)),
        ...meals.map((meal) => pendingMeals.find((pending) => pending.mealId === meal.mealId) ?? meal),
    ];

    useEffect(() => {
        setPendingMeals((current) =>
            current.filter((pending) => {
                const catalog = meals.find((meal) => meal.mealId === pending.mealId);
                if (catalog == null) return true;
                // Drop optimistic rows once the catalog catches up with the same fields.
                return (
                    catalog.title !== pending.title ||
                    catalog.description !== pending.description ||
                    (catalog.imageUrl ?? null) !== (pending.imageUrl ?? null) ||
                    (catalog.imageFileUploadId ?? null) !== (pending.imageFileUploadId ?? null)
                );
            }),
        );
    }, [meals]);

    useEffect(() => {
        if (open) {
            setDraftIds(selectedMealIds);
            setEditorOpen(false);
            setEditorMeal(null);
        }
    }, [open, selectedMealIds]);

    function toggle(mealId: string) {
        setDraftIds((current) => (current.includes(mealId) ? current.filter((id) => id !== mealId) : [...current, mealId]));
    }

    function openCreateEditor() {
        setEditorMeal(null);
        setEditorOpen(true);
    }

    function openEditEditor(meal: CookMenuCourseMealOption) {
        setEditorMeal(meal);
        setEditorOpen(true);
    }

    function onMealSaved(saved: CookMealEditorMeal) {
        const meal: CookMenuCourseMealOption = {
            mealId: saved.mealId,
            title: saved.title,
            description: saved.description,
            imageUrl: saved.imageUrl,
            imageFileUploadId: saved.imageFileUploadId,
            publishedAt: saved.publishedAt,
        };
        // Dialog-local until `userUpdates` refreshes the parent `meals` catalog.
        setPendingMeals((current) => {
            const without = current.filter((entry) => entry.mealId !== meal.mealId);
            return [...without, meal];
        });
        setDraftIds((current) => (current.includes(meal.mealId) ? current : [...current, meal.mealId]));
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{{ de: 'Gerichte wählen', en: 'Choose meals' }[locale]}</DialogTitle>
                        <DialogDescription>
                            {
                                {
                                    de: 'Wähle die Gerichtsoptionen für diesen Gang oder erstelle ein neues Gericht.',
                                    en: 'Pick meal options for this course, or create a new meal.',
                                }[locale]
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <Button type="button" variant="outline" className="justify-self-start border-dashed" onClick={openCreateEditor}>
                        <PlusIcon className="size-4" />
                        {{ de: 'Neues Gericht', en: 'New meal' }[locale]}
                    </Button>
                    {visibleMeals.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Noch keine Gerichte. Erstelle eines oben.',
                                    en: 'No meals yet. Create one above.',
                                }[locale]
                            }
                        </p>
                    ) : (
                        <ul className="grid max-h-80 gap-2 overflow-y-auto">
                            {visibleMeals.map((meal) => {
                                const checked = draftIds.includes(meal.mealId);
                                return (
                                    <li key={meal.mealId}>
                                        <CookMealCard
                                            meal={meal}
                                            selected={checked}
                                            showStatusBadge={false}
                                            onAddImage={() => openEditEditor(meal)}
                                            action={
                                                <div className="flex shrink-0 flex-col items-stretch gap-1">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant={checked ? 'default' : 'outline'}
                                                        onClick={() => toggle(meal.mealId)}
                                                    >
                                                        {checked
                                                            ? { de: 'Ausgewählt', en: 'Selected' }[locale]
                                                            : { de: 'Auswählen', en: 'Select' }[locale]}
                                                    </Button>
                                                    <Button type="button" size="sm" variant="ghost" onClick={() => openEditEditor(meal)}>
                                                        {{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                                                    </Button>
                                                </div>
                                            }
                                        />
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                        </Button>
                        <Button
                            type="button"
                            onClick={() => onConfirm(draftIds)}
                            disabled={draftIds.length === 0 && visibleMeals.length === 0}
                        >
                            {{ de: 'Übernehmen', en: 'Apply' }[locale]}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CookMealEditorDialog
                open={editorOpen}
                onOpenChange={(nextOpen) => {
                    setEditorOpen(nextOpen);
                    if (!nextOpen) setEditorMeal(null);
                }}
                meal={editorMeal}
                saveHandlers={mealSaveHandlers}
                onSaved={onMealSaved}
            />
        </>
    );
}
