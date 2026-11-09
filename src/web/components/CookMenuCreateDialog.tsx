import { useForm, useSelector } from '@tanstack/react-form';
import { FileTextIcon, PencilSparklesIcon, SparklesIcon, TextCursorInputIcon, XIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { useMutation, useQuery } from 'urql';

import { COOK_MENU_SUGGESTION_FILE_MAX } from '../../shared/cookMenuSuggestion';
import { FILE_UPLOAD_ACCEPT } from '../../shared/fileUploadMediaTypes';
import { useComposerFileAttachments } from '../chat/useComposerFileAttachments';
import {
    CookMenuCreateDialogMealsDocument,
    CookMenuCreateDialogSuggestionApplyDocument,
    CookMenuCreateDialogSuggestionFromTextDocument,
} from '../graphql/generated';
import type { GqlCCookMenuCreateDialogSuggestionFromTextMutation } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import type { Locale } from '../utils/locale';
import { AttachmentGroup } from './base/attachment';
import { Badge } from './base/badge';
import { Button } from './base/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './base/dialog';
import { Input } from './base/input';
import { Spinner } from './base/spinner';
import { StatusAlert } from './base/status-alert';
import { Textarea } from './base/textarea';
import { CookMealCard } from './CookMealCard';
import { MessageComposerAttachment } from './message-composer-attachment';
import { useMessageComposerFileIntake } from './message-composer-file-intake';

type CreateStep = 'chooser' | 'input' | 'generating' | 'review';
type SuggestionDraft = GqlCCookMenuCreateDialogSuggestionFromTextMutation['user']['cook']['menuSuggestionFromText'];
type SuggestionMealOption = SuggestionDraft['courses'][number]['mealOptions'][number];
type CookMenuCreateContext = 'library' | 'offer';

const GENERATING_INTERVAL_MS = 2500;

function mealOptionKey(courseIndex: number, mealIndex: number, meal: SuggestionMealOption): string {
    return meal.mealId ?? `new-${courseIndex}-${mealIndex}-${meal.title ?? ''}`;
}

function suggestionHasMeals(draft: SuggestionDraft): boolean {
    return draft.courses.some((course) => course.mealOptions.length > 0);
}

function generatingStatusCopy(locale: Locale, index: number, fromFiles: boolean): string {
    const lines = [
        fromFiles
            ? { de: 'Deine Datei wird gelesen…', en: 'Reading your file…' }
            : { de: 'Dein Text wird gelesen…', en: 'Reading your text…' },
        { de: 'Wir suchen passende Gerichte aus deinen Gerichten…', en: 'Finding dishes you already have…' },
        { de: 'Die Gänge werden zusammengestellt…', en: 'Putting the courses together…' },
    ] as const;
    return (lines[index] ?? lines[0])[locale];
}

function suggestionReuseSummary(locale: Locale, reusedCount: number, newCount: number): string {
    const fromDishes =
        reusedCount === 1
            ? { de: '1 aus deinen Gerichten', en: '1 from your dishes' }[locale]
            : { de: `${reusedCount} aus deinen Gerichten`, en: `${reusedCount} from your dishes` }[locale];
    const newDrafts =
        newCount === 1
            ? { de: '1 neuer Entwurf', en: '1 new draft' }[locale]
            : { de: `${newCount} neue Entwürfe`, en: `${newCount} new drafts` }[locale];
    if (newCount === 0) {
        return { de: `Alle ${reusedCount} aus deinen Gerichten`, en: `All ${reusedCount} from your dishes` }[locale];
    }
    if (reusedCount === 0) return newDrafts;
    return `${fromDishes}, ${newDrafts}`;
}

function CreateChooserCard({
    icon,
    title,
    description,
    tone,
    disabled,
    onClick,
}: {
    icon: ReactNode;
    title: string;
    description: string;
    tone: 'accent' | 'sky';
    disabled?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            className={cn(
                'grid cursor-pointer gap-2 rounded-xl border p-4 text-left outline-none transition-[color,background-color,border-color,box-shadow,opacity] focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                tone === 'accent'
                    ? 'border-accent/35 bg-accent/10 hover:border-accent/50 hover:bg-accent/15 active:bg-accent/20 focus-visible:border-accent focus-visible:ring-accent/50'
                    : 'border-sky-300 bg-sky-50 hover:border-sky-400 hover:bg-sky-100/80 active:bg-sky-100 focus-visible:border-sky-500 focus-visible:ring-sky-500/50',
            )}
            disabled={disabled}
            onClick={onClick}
        >
            <span
                className={cn(
                    'flex size-10 items-center justify-center rounded-lg',
                    tone === 'accent' ? 'bg-accent/15 text-accent' : 'bg-sky-100 text-sky-700',
                )}
                aria-hidden
            >
                {icon}
            </span>
            <span className="font-medium">{title}</span>
            <span className="text-sm text-muted-foreground">{description}</span>
        </button>
    );
}

export function CookMenuCreateDialog({
    open,
    onOpenChange,
    onEmptyCreate,
    onApplied,
    busy = false,
    context = 'library',
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEmptyCreate: () => void;
    onApplied: (menuId: string) => void;
    busy?: boolean;
    context?: CookMenuCreateContext;
}) {
    const locale = useLocale();
    const formId = useId();
    const openRef = useRef(open);
    const generateRequestIdRef = useRef(0);
    const [step, setStep] = useState<CreateStep>('chooser');
    const [generatingIndex, setGeneratingIndex] = useState(0);
    const [generatingFromFiles, setGeneratingFromFiles] = useState(false);
    const [generateFailed, setGenerateFailed] = useState(false);
    const [draft, setDraft] = useState<SuggestionDraft | null>(null);
    const [, suggestFromText] = useMutation(CookMenuCreateDialogSuggestionFromTextDocument);
    const [, applySuggestion] = useMutation(CookMenuCreateDialogSuggestionApplyDocument);
    const [applying, setApplying] = useState(false);
    const [{ data: mealsData }] = useQuery({ query: CookMenuCreateDialogMealsDocument, pause: !open });
    const mealsById = new Map((mealsData?.currentSession.user?.cook?.meals ?? []).map((meal) => [meal.mealId, meal]));
    const { attachments, onAttachmentsAdd, onAttachmentRemove, clearAttachments, uploadedFileUploadIds, hasUploading } =
        useComposerFileAttachments();
    const notesForm = useForm({
        defaultValues: { notes: '' },
        onSubmit: async ({ value }) => {
            await generate(value.notes);
        },
    });
    const notes = useSelector(notesForm.store, (state) => state.values.notes);
    const { fileInputRef, isDragOver, formHandlers, onPickerChange, onPaste, openPicker } = useMessageComposerFileIntake({
        enabled: !busy && !hasUploading && step === 'input',
        multiple: true,
        onAdd: (files) => {
            const remaining = COOK_MENU_SUGGESTION_FILE_MAX - attachments.length;
            if (remaining <= 0) return;
            onAttachmentsAdd(files.slice(0, remaining));
        },
        value: notes,
        onValueChange: (next) => notesForm.setFieldValue('notes', next),
    });
    openRef.current = open;
    const workStep = step !== 'chooser';
    const filesAtCap = attachments.length >= COOK_MENU_SUGGESTION_FILE_MAX;

    useEffect(() => {
        if (open) return;
        generateRequestIdRef.current += 1;
        setStep('chooser');
        setDraft(null);
        setGenerateFailed(false);
        setApplying(false);
        setGeneratingFromFiles(false);
        notesForm.reset();
        clearAttachments();
    }, [open, clearAttachments, notesForm]);

    useEffect(() => {
        setGenerateFailed(false);
    }, [notes, attachments.length]);

    useEffect(() => {
        if (step !== 'generating') {
            setGeneratingIndex(0);
            return;
        }
        const timer = globalThis.setInterval(() => {
            setGeneratingIndex((current) => Math.min(current + 1, 2));
        }, GENERATING_INTERVAL_MS);
        return () => globalThis.clearInterval(timer);
    }, [step]);

    async function generate(notesValue: string) {
        const trimmed = notesValue.trim();
        if ((trimmed.length === 0 && uploadedFileUploadIds.length === 0) || hasUploading) return;
        const requestId = ++generateRequestIdRef.current;
        const fromFiles = uploadedFileUploadIds.length > 0;
        setGenerateFailed(false);
        setGeneratingFromFiles(fromFiles);
        setStep('generating');
        try {
            const result = await suggestFromText({
                text: trimmed.length > 0 ? trimmed : null,
                fileUploadIds: uploadedFileUploadIds.length > 0 ? uploadedFileUploadIds : null,
            });
            if (requestId !== generateRequestIdRef.current || !openRef.current) return;
            const suggestion = result.data?.user.cook.menuSuggestionFromText;
            if (result.error || suggestion == null || !suggestionHasMeals(suggestion)) {
                throw new Error('generate failed');
            }
            setDraft(suggestion);
            setStep('review');
        } catch {
            if (requestId !== generateRequestIdRef.current || !openRef.current) return;
            setGenerateFailed(true);
            setStep('input');
        }
    }

    async function onApply() {
        if (draft == null || applying || !suggestionHasMeals(draft)) return;
        setApplying(true);
        try {
            const result = await applySuggestion({
                suggestion: {
                    title: draft.title,
                    description: draft.description,
                    courses: draft.courses.map((course) => ({
                        title: course.title,
                        mealOptions: course.mealOptions.map((meal) => ({
                            type: meal.type,
                            mealId: meal.mealId,
                            title: meal.title,
                            description: meal.description,
                        })),
                    })),
                },
            });
            const applied = result.data?.user.cook.menuSuggestionApply;
            if (result.error || !applied?.success || applied.referenceId == null) {
                throw new Error('apply failed');
            }
            if (!openRef.current) return;
            onApplied(applied.referenceId);
            onOpenChange(false);
        } catch {
            if (!openRef.current) return;
            toast.error({ de: 'Menü konnte nicht angelegt werden.', en: 'Could not create the menu.' }[locale]);
        } finally {
            setApplying(false);
        }
    }

    function removeMeal(courseIndex: number, mealIndex: number) {
        if (draft == null) return;
        const previous = draft;
        const course = draft.courses[courseIndex];
        if (course == null) return;
        const removedCourse = course.mealOptions.length <= 1;
        const courses = draft.courses
            .map((row, index) => {
                if (index !== courseIndex) return row;
                return { ...row, mealOptions: row.mealOptions.filter((_, optionIndex) => optionIndex !== mealIndex) };
            })
            .filter((row) => row.mealOptions.length > 0);
        setDraft({ ...draft, courses });
        toast(
            removedCourse
                ? { de: `Gang „${course.title}“ entfernt.`, en: `Removed course "${course.title}".` }[locale]
                : { de: 'Gericht entfernt.', en: 'Dish removed.' }[locale],
            {
                action: {
                    label: { de: 'Rückgängig', en: 'Undo' }[locale],
                    onClick: () => setDraft(previous),
                },
            },
        );
    }

    const reusedCount =
        draft?.courses.reduce((sum, course) => sum + course.mealOptions.filter((meal) => meal.type === 'EXISTING_MEAL').length, 0) ?? 0;
    const newCount =
        draft?.courses.reduce((sum, course) => sum + course.mealOptions.filter((meal) => meal.type === 'NEW_MEAL').length, 0) ?? 0;
    const generateDisabled = busy || hasUploading || (notes.trim().length === 0 && uploadedFileUploadIds.length === 0);
    const title =
        step === 'chooser'
            ? { de: 'Wie möchtest du das Menü anlegen?', en: 'How do you want to create this menu?' }[locale]
            : step === 'review'
              ? { de: 'Prüfe deinen Menüvorschlag', en: 'Review your menu suggestion' }[locale]
              : { de: 'Aus Text oder Datei', en: 'From text or a file' }[locale];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                    'flex w-full flex-col overflow-hidden',
                    workStep
                        ? 'h-dvh max-h-dvh max-w-full gap-0 rounded-none p-0 sm:h-auto sm:min-h-[min(36rem,90dvh)] sm:max-h-[min(90dvh,100%)] sm:max-w-3xl sm:rounded-lg'
                        : 'sm:max-w-3xl',
                )}
                onInteractOutside={(event) => {
                    if (step === 'generating' || step === 'review') event.preventDefault();
                }}
            >
                <DialogHeader className={cn('pr-8 text-left', workStep && 'shrink-0 px-6 pt-6 pb-4')}>
                    <DialogTitle>{title}</DialogTitle>
                    {step === 'input' || step === 'generating' ? (
                        <DialogDescription>
                            {
                                {
                                    de: 'Wir nutzen zuerst deine Gerichte und schlagen nur für Lücken neue vor. Gespeichert wird erst, wenn du zustimmst.',
                                    en: 'We use your dishes first and only suggest new ones for gaps. Nothing is saved until you confirm.',
                                }[locale]
                            }
                        </DialogDescription>
                    ) : null}
                    {step === 'review' && draft != null && suggestionHasMeals(draft) ? (
                        <DialogDescription>{suggestionReuseSummary(locale, reusedCount, newCount)}</DialogDescription>
                    ) : null}
                </DialogHeader>

                {step === 'chooser' ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <CreateChooserCard
                            tone="accent"
                            icon={<PencilSparklesIcon className="size-5" />}
                            title={{ de: 'Aus Text oder Datei', en: 'From text or a file' }[locale]}
                            description={
                                {
                                    de: 'Füge eine Speisekarte ein oder beschreibe den Anlass. Wir nutzen zuerst deine Gerichte.',
                                    en: 'Paste a menu or describe the occasion. We use your dishes first.',
                                }[locale]
                            }
                            disabled={busy}
                            onClick={() => setStep('input')}
                        />
                        <CreateChooserCard
                            tone="sky"
                            icon={<TextCursorInputIcon className="size-5" />}
                            title={{ de: 'Selbst zusammenstellen', en: 'Start from scratch' }[locale]}
                            description={
                                {
                                    de: 'Titel und drei Gänge, die du selbst füllst.',
                                    en: 'A title and three courses you fill yourself.',
                                }[locale]
                            }
                            disabled={busy}
                            onClick={onEmptyCreate}
                        />
                    </div>
                ) : null}

                {step === 'generating' ? (
                    <div className="shrink-0 border-b border-border px-6 py-3">
                        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                            <Spinner aria-hidden />
                            {generatingStatusCopy(locale, generatingIndex, generatingFromFiles)}
                        </p>
                        {generatingFromFiles ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                                {
                                    {
                                        de: 'Bei längeren Dateien kann das etwas dauern.',
                                        en: 'Longer files can take a little while.',
                                    }[locale]
                                }
                            </p>
                        ) : null}
                    </div>
                ) : null}

                {step === 'input' || step === 'generating' ? (
                    <form
                        id={formId}
                        className="min-h-0 flex-1 overflow-y-auto"
                        {...formHandlers}
                        onSubmit={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void notesForm.handleSubmit();
                        }}
                    >
                        <div className="grid content-start gap-4 p-2">
                            <notesForm.Field name="notes">
                                {(field) => (
                                    <label className="grid w-full gap-2 self-start text-sm">
                                        <span className="font-medium">
                                            {{ de: 'Speisekarte oder Anlass', en: 'Menu or occasion' }[locale]}
                                        </span>
                                        <Textarea
                                            name={field.name}
                                            className="min-h-40 sm:min-h-48"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(event) => field.handleChange(event.target.value)}
                                            onPaste={onPaste}
                                            disabled={busy || step === 'generating'}
                                            placeholder={
                                                {
                                                    de: 'Speisekarte einfügen oder Anlass beschreiben, z. B. Italienisches 4-Gänge-Menü für 8 Gäste, eine Person vegetarisch.',
                                                    en: 'Paste a menu or describe the occasion, e.g. Italian 4-course dinner for 8, one vegetarian guest.',
                                                }[locale]
                                            }
                                        />
                                    </label>
                                )}
                            </notesForm.Field>
                            <div
                                className={cn(
                                    'grid gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3',
                                    isDragOver && 'ring-2 ring-ring/50',
                                )}
                            >
                                <p className="text-sm font-medium">{{ de: 'Dateien', en: 'Files' }[locale]}</p>
                                <p className="text-sm text-muted-foreground">
                                    {filesAtCap
                                        ? {
                                              de: `PDF, Foto einer Speisekarte (auch handschriftlich), Text oder Word. ${COOK_MENU_SUGGESTION_FILE_MAX} von ${COOK_MENU_SUGGESTION_FILE_MAX} Dateien.`,
                                              en: `PDF, photo of a menu (handwritten works too), text, or Word. ${COOK_MENU_SUGGESTION_FILE_MAX} of ${COOK_MENU_SUGGESTION_FILE_MAX} files.`,
                                          }[locale]
                                        : {
                                              de: 'PDF, Foto einer Speisekarte (auch handschriftlich), Text oder Word. Bis zu 5 Dateien.',
                                              en: 'PDF, photo of a menu (handwritten works too), text, or Word. Up to 5 files.',
                                          }[locale]}
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="hidden text-sm text-muted-foreground sm:inline">
                                        {{ de: 'Dateien hierher ziehen oder', en: 'Drag files here or' }[locale]}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={busy || step === 'generating' || filesAtCap}
                                        onClick={openPicker}
                                    >
                                        <FileTextIcon className="size-4" />
                                        {{ de: 'Datei hinzufügen', en: 'Add file' }[locale]}
                                    </Button>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="sr-only"
                                    accept={FILE_UPLOAD_ACCEPT}
                                    multiple
                                    onChange={onPickerChange}
                                />
                                {attachments.length > 0 ? (
                                    <AttachmentGroup>
                                        {attachments.map((attachment) => (
                                            <MessageComposerAttachment
                                                key={attachment.localId}
                                                attachment={attachment}
                                                disabled={busy || step === 'generating'}
                                                onRemove={() => onAttachmentRemove(attachment.localId)}
                                            />
                                        ))}
                                    </AttachmentGroup>
                                ) : null}
                            </div>
                            {generateFailed ? (
                                <StatusAlert tone="error">
                                    {
                                        {
                                            de: 'Daraus konnten wir kein Menü machen. Versuch es noch einmal, gern mit mehr Details zu den Gängen.',
                                            en: 'We could not build a menu from this. Try again, ideally with more detail on the courses.',
                                        }[locale]
                                    }
                                </StatusAlert>
                            ) : null}
                        </div>
                    </form>
                ) : null}

                {step === 'review' && draft != null ? (
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <div className="grid content-start gap-4 p-2">
                            <label className="grid gap-2 text-sm">
                                <span className="font-medium">{{ de: 'Titel', en: 'Title' }[locale]}</span>
                                <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
                            </label>
                            {newCount > 0 ? (
                                <StatusAlert tone="info">
                                    {
                                        {
                                            de: 'Neue Gerichte haben noch kein Foto. Für Angebote reicht das. Für deine öffentliche Kochseite brauchst du später Fotos.',
                                            en: 'New dishes have no photo yet. That is fine for offers. Your public cook page needs photos later.',
                                        }[locale]
                                    }
                                </StatusAlert>
                            ) : null}
                            {suggestionHasMeals(draft) ? (
                                draft.courses.map((course, courseIndex) => (
                                    <section key={`${course.title}-${courseIndex}`} className="grid gap-2">
                                        <p className="text-sm font-semibold">{course.title}</p>
                                        <ul className="grid gap-2">
                                            {course.mealOptions.map((meal, mealIndex) => {
                                                const existing = meal.mealId != null ? mealsById.get(meal.mealId) : undefined;
                                                return (
                                                    <li key={mealOptionKey(courseIndex, mealIndex, meal)}>
                                                        <CookMealCard
                                                            meal={{
                                                                title: existing?.title ?? meal.title ?? '',
                                                                description: existing?.description ?? meal.description ?? '',
                                                                imageUrl: existing?.imageUrl,
                                                                publishedAt: existing?.publishedAt,
                                                            }}
                                                            density="compact"
                                                            showStatusBadge={false}
                                                            dialogTitle={course.title}
                                                            action={
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    aria-label={{ de: 'Gericht entfernen', en: 'Remove dish' }[locale]}
                                                                    onClick={() => removeMeal(courseIndex, mealIndex)}
                                                                >
                                                                    <XIcon className="size-4" />
                                                                </Button>
                                                            }
                                                            meta={
                                                                meal.type === 'NEW_MEAL' ? (
                                                                    <Badge variant="outline">{{ de: 'Neu', en: 'New' }[locale]}</Badge>
                                                                ) : undefined
                                                            }
                                                        />
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </section>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    {
                                        {
                                            de: 'Keine Gerichte mehr übrig. Ändere deine Angaben und versuch es erneut.',
                                            en: 'No dishes left. Edit your details and try again.',
                                        }[locale]
                                    }
                                </p>
                            )}
                            <label className="grid gap-2 text-sm">
                                <span className="font-medium">{{ de: 'Beschreibung', en: 'Description' }[locale]}</span>
                                <Textarea
                                    rows={3}
                                    value={draft.description}
                                    onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                                />
                            </label>
                        </div>
                    </div>
                ) : null}

                <DialogFooter className={cn('flex-row justify-end', workStep && 'shrink-0 border-t border-border px-6 py-3')}>
                    {step === 'chooser' ? (
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                        </Button>
                    ) : null}
                    {step === 'input' || step === 'generating' ? (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1 sm:flex-none"
                                disabled={step === 'generating'}
                                onClick={() => setStep('chooser')}
                            >
                                {{ de: 'Zurück', en: 'Back' }[locale]}
                            </Button>
                            <Button
                                type="submit"
                                form={formId}
                                className="flex-1 sm:flex-none"
                                disabled={generateDisabled || step === 'generating'}
                            >
                                {step === 'generating' ? <Spinner aria-hidden /> : <SparklesIcon className="size-4" />}
                                {
                                    {
                                        de: step === 'generating' ? 'Wird vorbereitet…' : 'Menü vorschlagen',
                                        en: step === 'generating' ? 'Preparing…' : 'Suggest menu',
                                    }[locale]
                                }
                            </Button>
                        </>
                    ) : null}
                    {step === 'review' ? (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1 sm:flex-none"
                                disabled={applying}
                                onClick={() => setStep('input')}
                            >
                                {{ de: 'Angaben ändern', en: 'Edit details' }[locale]}
                            </Button>
                            <Button
                                type="button"
                                className="flex-1 sm:flex-none"
                                disabled={applying || draft == null || !suggestionHasMeals(draft)}
                                onClick={() => void onApply()}
                            >
                                {context === 'offer'
                                    ? {
                                          de: applying ? 'Wird angelegt…' : 'Anlegen und auswählen',
                                          en: applying ? 'Creating…' : 'Create and select',
                                      }[locale]
                                    : {
                                          de: applying ? 'Wird angelegt…' : 'Menü anlegen',
                                          en: applying ? 'Creating…' : 'Create menu',
                                      }[locale]}
                            </Button>
                        </>
                    ) : null}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
