import {
    ArrowDownIcon,
    ArrowUpIcon,
    ChevronDownIcon,
    CircleHelpIcon,
    ImageIcon,
    ListIcon,
    MessageSquareQuoteIcon,
    MousePointerClickIcon,
    PlusIcon,
    Trash2Icon,
    TypeIcon,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { t as catalogT } from '../../i18n/t';
import type { ContentSection, ContentSectionKind, Locale } from '../../shared';
import { fileUploadPublicUrl } from '../../shared/contentSection';
import { idCreate } from '../../shared/idCreate';
import { uploadErrorMessage, uploadFile } from '../chat/fileUpload';
import { useT } from '../hooks/useT';
import { animateListReorder } from '../utils/animateListReorder';
import { cn } from '../utils/cn';
import { IMAGE_CROP_ACCEPT } from '../utils/imageCropCompress';
import type { ImageCropVariant } from '../utils/imageCropCompress';
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
import { Button } from './base/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from './base/card';
import { Checkbox } from './base/checkbox';
import { Input } from './base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './base/select';
import { Textarea } from './base/textarea';

const ImageCropDialog = lazy(async () => {
    const mod = await import('./ImageCropDialog');
    return { default: mod.ImageCropDialog };
});

const KIND_OPTIONS: ContentSectionKind[] = ['content', 'image', 'quote', 'list', 'cta', 'qa'];

function emptySection(kind: ContentSectionKind): ContentSection {
    const sectionId = idCreate();
    switch (kind) {
        case 'content':
            return { sectionId, kind, bodyDe: '', bodyEn: '' };
        case 'image':
            return { sectionId, kind, imageFileUploadId: '00000000000000000000' };
        case 'quote':
            return { sectionId, kind, quoteDe: '', quoteEn: '' };
        case 'list':
            return { sectionId, kind, style: 'BULLET', itemsDe: [''], itemsEn: [] };
        case 'cta':
            return {
                sectionId,
                kind,
                headlineDe: '',
                headlineEn: '',
                buttonLabelDe: '',
                buttonLabelEn: '',
                href: '',
            };
        case 'qa':
            return {
                sectionId,
                kind,
                entries: [{ entryId: idCreate(), questionDe: '', questionEn: '', answerDe: '', answerEn: '' }],
            };
    }
}

export function ContentSectionsEditor({
    sections,
    onChange,
    editLocale,
    uiLocale,
}: {
    sections: ContentSection[];
    onChange: (sections: ContentSection[]) => void;
    editLocale: Locale;
    uiLocale: Locale;
}) {
    const { t } = useT('common');
    const sectionsListRef = useRef<HTMLDivElement>(null);
    const [expandedId, setExpandedId] = useState<string | null>(sections[0]?.sectionId ?? null);
    const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

    function updateAt(index: number, next: ContentSection) {
        const copy = [...sections];
        copy[index] = next;
        onChange(copy);
    }

    function move(index: number, delta: number) {
        const target = index + delta;
        if (target < 0 || target >= sections.length) return;
        const item = sections[index];
        if (item == null) return;
        animateListReorder(sectionsListRef.current, () => {
            const copy = [...sections];
            copy.splice(index, 1);
            copy.splice(target, 0, item);
            onChange(copy);
        });
    }

    function removeAt(index: number) {
        const copy = sections.filter((_, i) => i !== index);
        onChange(copy);
        if (expandedId === sections[index]?.sectionId) {
            setExpandedId(copy[0]?.sectionId ?? null);
        }
        setDeleteIndex(null);
    }

    function add(kind: ContentSectionKind) {
        const next = emptySection(kind);
        onChange([...sections, next]);
        setExpandedId(next.sectionId);
    }

    return (
        <div className="flex flex-col gap-4">
            <Card className="gap-4 py-4">
                <CardHeader className="px-4">
                    <CardTitle>{t('contentSections.addSection')}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 px-4">
                    <div className="flex flex-wrap gap-2">
                        {KIND_OPTIONS.map((kind) => (
                            <Button key={kind} type="button" variant="outline" size="sm" onClick={() => add(kind)}>
                                <PlusIcon className="size-3.5" />
                                {t(`contentSections.kind.${kind}`)}
                            </Button>
                        ))}
                    </div>
                    {sections.length === 0 ? <p className="text-sm text-muted-foreground">{t('contentSections.noSectionsYet')}</p> : null}
                </CardContent>
            </Card>

            <div ref={sectionsListRef} className="flex flex-col gap-4">
                {sections.map((section, index) => {
                    const open = expandedId === section.sectionId;
                    return (
                        <Card
                            key={section.sectionId}
                            data-reorder-id={section.sectionId}
                            data-content-editor-anchor={`section:${section.sectionId}`}
                            className="gap-0 py-0"
                        >
                            <CardHeader className={cn('items-center gap-2 py-2 pl-4 pr-2', open && 'border-b [.border-b]:pb-2')}>
                                <CardTitle className="min-w-0 text-sm font-medium">
                                    <button
                                        type="button"
                                        aria-expanded={open}
                                        className="flex min-w-0 w-full items-center gap-2 text-left"
                                        onClick={() => setExpandedId(open ? null : section.sectionId)}
                                    >
                                        <ChevronDownIcon
                                            className={cn(
                                                'size-4 shrink-0 text-muted-foreground transition-transform',
                                                !open && '-rotate-90',
                                            )}
                                            aria-hidden
                                        />
                                        <KindIcon kind={section.kind} />
                                        <span className="min-w-0 flex-1 truncate">{sectionSummary(section, editLocale, uiLocale)}</span>
                                    </button>
                                </CardTitle>
                                <CardAction className="flex items-center gap-0.5 self-center">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => move(index, -1)}
                                        disabled={index === 0}
                                    >
                                        <ArrowUpIcon className="size-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => move(index, 1)}
                                        disabled={index === sections.length - 1}
                                    >
                                        <ArrowDownIcon className="size-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => setDeleteIndex(index)}
                                    >
                                        <Trash2Icon className="size-4" />
                                    </Button>
                                </CardAction>
                            </CardHeader>
                            {open ? (
                                <CardContent className="px-4 pt-3 pb-4">
                                    <SectionFields
                                        section={section}
                                        editLocale={editLocale}
                                        uiLocale={uiLocale}
                                        onChange={(next) => updateAt(index, next)}
                                    />
                                </CardContent>
                            ) : null}
                        </Card>
                    );
                })}
            </div>

            <AlertDialog open={deleteIndex !== null} onOpenChange={(open) => !open && setDeleteIndex(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('contentSections.deleteSectionTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('contentSections.deleteSectionBody')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('contentSections.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={() => {
                                if (deleteIndex !== null) removeAt(deleteIndex);
                            }}
                        >
                            {t('contentSections.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function KindIcon({ kind }: { kind: ContentSectionKind }) {
    const className = 'size-4 shrink-0 text-muted-foreground';
    switch (kind) {
        case 'content':
            return <TypeIcon className={className} />;
        case 'image':
            return <ImageIcon className={className} />;
        case 'quote':
            return <MessageSquareQuoteIcon className={className} />;
        case 'list':
            return <ListIcon className={className} />;
        case 'cta':
            return <MousePointerClickIcon className={className} />;
        case 'qa':
            return <CircleHelpIcon className={className} />;
    }
}

function sectionSummary(section: ContentSection, editLocale: Locale, uiLocale: Locale): string {
    const kindLabel = catalogT(uiLocale, 'common', `contentSections.kind.${section.kind}`);
    const withDetail = (detail: string) => {
        const trimmed = detail.trim();
        return trimmed ? `${kindLabel}: ${trimmed}` : kindLabel;
    };
    switch (section.kind) {
        case 'content':
            return withDetail(
                editLocale === 'en' ? section.titleEn || section.titleDe || section.bodyDe : section.titleDe || section.bodyDe,
            );
        case 'image':
            return kindLabel;
        case 'quote':
            return withDetail(editLocale === 'en' ? section.quoteEn || section.quoteDe : section.quoteDe);
        case 'list':
            return withDetail(editLocale === 'en' ? section.titleEn || section.titleDe || '' : section.titleDe || '');
        case 'cta':
            return withDetail(editLocale === 'en' ? section.headlineEn || section.headlineDe : section.headlineDe);
        case 'qa': {
            const first = section.entries[0];
            const firstQuestion = first ? (editLocale === 'en' ? first.questionEn || first.questionDe : first.questionDe) : '';
            const count = section.entries.length;
            const countLabel =
                count === 1
                    ? catalogT(uiLocale, 'common', 'contentSections.entryCountOne')
                    : catalogT(uiLocale, 'common', 'contentSections.entryCountOther', { count });
            return withDetail(firstQuestion.trim() || countLabel);
        }
    }
}

function SectionFields({
    section,
    editLocale,
    uiLocale,
    onChange,
}: {
    section: ContentSection;
    editLocale: Locale;
    uiLocale: Locale;
    onChange: (section: ContentSection) => void;
}) {
    const { t } = useT('common');
    switch (section.kind) {
        case 'content':
            return (
                <div className="flex flex-col gap-4">
                    <Field label={t('contentSections.title')}>
                        <Input
                            value={editLocale === 'en' ? (section.titleEn ?? '') : (section.titleDe ?? '')}
                            onChange={(e) =>
                                onChange(
                                    editLocale === 'en' ? { ...section, titleEn: e.target.value } : { ...section, titleDe: e.target.value },
                                )
                            }
                        />
                    </Field>
                    <Field label={t('contentSections.subtitle')}>
                        <Input
                            value={editLocale === 'en' ? (section.subtitleEn ?? '') : (section.subtitleDe ?? '')}
                            onChange={(e) =>
                                onChange(
                                    editLocale === 'en'
                                        ? { ...section, subtitleEn: e.target.value }
                                        : { ...section, subtitleDe: e.target.value },
                                )
                            }
                        />
                    </Field>
                    <Field label={t('contentSections.bodyMarkdown')}>
                        <Textarea
                            rows={8}
                            value={editLocale === 'en' ? section.bodyEn : section.bodyDe}
                            onChange={(e) =>
                                onChange(
                                    editLocale === 'en' ? { ...section, bodyEn: e.target.value } : { ...section, bodyDe: e.target.value },
                                )
                            }
                        />
                    </Field>
                    <ImageUploadField
                        fileUploadId={section.imageFileUploadId}
                        uiLocale={uiLocale}
                        variant="content"
                        onChange={(imageFileUploadId) => onChange({ ...section, imageFileUploadId })}
                    />
                    {section.imageFileUploadId ? (
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                                checked={Boolean(section.imageFirst)}
                                onCheckedChange={(checked) => onChange({ ...section, imageFirst: checked === true })}
                            />
                            {t('contentSections.showImageFirst')}
                        </label>
                    ) : null}
                </div>
            );
        case 'image':
            return (
                <ImageUploadField
                    fileUploadId={section.imageFileUploadId === '00000000000000000000' ? null : section.imageFileUploadId}
                    uiLocale={uiLocale}
                    variant="contentWide"
                    onChange={(imageFileUploadId) =>
                        onChange({
                            ...section,
                            imageFileUploadId: imageFileUploadId ?? '00000000000000000000',
                        })
                    }
                />
            );
        case 'quote':
            return (
                <div className="flex flex-col gap-4">
                    <Field label={t('contentSections.quote')}>
                        <Textarea
                            rows={3}
                            value={editLocale === 'en' ? section.quoteEn : section.quoteDe}
                            onChange={(e) =>
                                onChange(
                                    editLocale === 'en' ? { ...section, quoteEn: e.target.value } : { ...section, quoteDe: e.target.value },
                                )
                            }
                        />
                    </Field>
                    <Field label={t('contentSections.attribution')}>
                        <Input
                            value={editLocale === 'en' ? (section.attributionEn ?? '') : (section.attributionDe ?? '')}
                            onChange={(e) =>
                                onChange(
                                    editLocale === 'en'
                                        ? { ...section, attributionEn: e.target.value }
                                        : { ...section, attributionDe: e.target.value },
                                )
                            }
                        />
                    </Field>
                </div>
            );
        case 'list':
            return (
                <div className="flex flex-col gap-4">
                    <Field label={t('contentSections.title')}>
                        <Input
                            value={editLocale === 'en' ? (section.titleEn ?? '') : (section.titleDe ?? '')}
                            onChange={(e) =>
                                onChange(
                                    editLocale === 'en' ? { ...section, titleEn: e.target.value } : { ...section, titleDe: e.target.value },
                                )
                            }
                        />
                    </Field>
                    <Field label={t('contentSections.style')}>
                        <Select
                            value={section.style}
                            onValueChange={(value) => onChange({ ...section, style: value as 'BULLET' | 'NUMBERED' })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="BULLET">{t('contentSections.bullets')}</SelectItem>
                                <SelectItem value="NUMBERED">{t('contentSections.numbered')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={t('contentSections.itemsOnePerLine')}>
                        <Textarea
                            rows={6}
                            value={(editLocale === 'en' ? section.itemsEn : section.itemsDe).join('\n')}
                            onChange={(e) => {
                                const items = e.target.value.split('\n');
                                onChange(editLocale === 'en' ? { ...section, itemsEn: items } : { ...section, itemsDe: items });
                            }}
                        />
                    </Field>
                </div>
            );
        case 'cta':
            return (
                <div className="flex flex-col gap-4">
                    <Field label={t('contentSections.headline')}>
                        <Input
                            value={editLocale === 'en' ? section.headlineEn : section.headlineDe}
                            onChange={(e) =>
                                onChange(
                                    editLocale === 'en'
                                        ? { ...section, headlineEn: e.target.value }
                                        : { ...section, headlineDe: e.target.value },
                                )
                            }
                        />
                    </Field>
                    <Field label={t('contentSections.body')}>
                        <Textarea
                            rows={3}
                            value={editLocale === 'en' ? (section.bodyEn ?? '') : (section.bodyDe ?? '')}
                            onChange={(e) =>
                                onChange(
                                    editLocale === 'en' ? { ...section, bodyEn: e.target.value } : { ...section, bodyDe: e.target.value },
                                )
                            }
                        />
                    </Field>
                    <Field label={t('contentSections.buttonLabel')}>
                        <Input
                            value={editLocale === 'en' ? section.buttonLabelEn : section.buttonLabelDe}
                            onChange={(e) =>
                                onChange(
                                    editLocale === 'en'
                                        ? { ...section, buttonLabelEn: e.target.value }
                                        : { ...section, buttonLabelDe: e.target.value },
                                )
                            }
                        />
                    </Field>
                    <Field label={t('contentSections.url')}>
                        <Input value={section.href} onChange={(e) => onChange({ ...section, href: e.target.value })} />
                    </Field>
                </div>
            );
        case 'qa':
            return (
                <div className="flex flex-col gap-4">
                    <Field label={t('contentSections.title')}>
                        <Input
                            value={editLocale === 'en' ? (section.titleEn ?? '') : (section.titleDe ?? '')}
                            onChange={(e) =>
                                onChange(
                                    editLocale === 'en' ? { ...section, titleEn: e.target.value } : { ...section, titleDe: e.target.value },
                                )
                            }
                        />
                    </Field>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{t('contentSections.entries')}</span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    onChange({
                                        ...section,
                                        entries: [
                                            ...section.entries,
                                            {
                                                entryId: idCreate(),
                                                questionDe: '',
                                                questionEn: '',
                                                answerDe: '',
                                                answerEn: '',
                                            },
                                        ],
                                    })
                                }
                            >
                                <PlusIcon className="size-3.5" />
                                {t('contentSections.entry')}
                            </Button>
                        </div>
                        {section.entries.map((entry, entryIndex) => (
                            <div key={entry.entryId} className="flex flex-col gap-3 rounded-md border border-border/70 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {t('contentSections.entryN', { n: entryIndex + 1 })}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        disabled={section.entries.length <= 1}
                                        onClick={() =>
                                            onChange({
                                                ...section,
                                                entries: section.entries.filter((_, i) => i !== entryIndex),
                                            })
                                        }
                                    >
                                        <Trash2Icon className="size-4" />
                                    </Button>
                                </div>
                                <Field label={t('contentSections.question')}>
                                    <Input
                                        value={editLocale === 'en' ? entry.questionEn : entry.questionDe}
                                        onChange={(e) => {
                                            const entries = section.entries.map((current, i) =>
                                                i === entryIndex
                                                    ? editLocale === 'en'
                                                        ? { ...current, questionEn: e.target.value }
                                                        : { ...current, questionDe: e.target.value }
                                                    : current,
                                            );
                                            onChange({ ...section, entries });
                                        }}
                                    />
                                </Field>
                                <Field label={t('contentSections.answerMarkdown')}>
                                    <Textarea
                                        rows={4}
                                        value={editLocale === 'en' ? entry.answerEn : entry.answerDe}
                                        onChange={(e) => {
                                            const entries = section.entries.map((current, i) =>
                                                i === entryIndex
                                                    ? editLocale === 'en'
                                                        ? { ...current, answerEn: e.target.value }
                                                        : { ...current, answerDe: e.target.value }
                                                    : current,
                                            );
                                            onChange({ ...section, entries });
                                        }}
                                    />
                                </Field>
                            </div>
                        ))}
                    </div>
                </div>
            );
    }
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <label className={cn('flex flex-col gap-1.5 text-sm', className)}>
            <span className="font-medium">{label}</span>
            {children}
        </label>
    );
}

function ImageUploadField({
    fileUploadId,
    uiLocale,
    variant,
    onChange,
}: {
    fileUploadId: string | null | undefined;
    uiLocale: Locale;
    variant: Extract<ImageCropVariant, 'content' | 'contentWide'>;
    onChange: (fileUploadId: string | null) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [cropSrc, setCropSrc] = useState<string | null>(null);
    const { t } = useT('common');
    const previewClassName =
        variant === 'content'
            ? 'aspect-square h-auto w-full max-w-xs rounded-lg object-cover'
            : 'aspect-video h-auto w-full max-w-md rounded-lg object-cover';

    useEffect(() => {
        return () => {
            if (cropSrc != null) URL.revokeObjectURL(cropSrc);
        };
    }, [cropSrc]);

    function onSelected(file: File | undefined) {
        if (file == null) return;
        setError(null);
        if (!file.type.startsWith('image/')) {
            setError(t('contentSections.chooseImage'));
            if (inputRef.current) inputRef.current.value = '';
            return;
        }
        setCropSrc((previous) => {
            if (previous != null) URL.revokeObjectURL(previous);
            return URL.createObjectURL(file);
        });
        if (inputRef.current) inputRef.current.value = '';
    }

    async function onCropConfirm(file: File) {
        setError(null);
        setBusy(true);
        try {
            const uploaded = await uploadFile(file);
            onChange(uploaded.fileUploadId);
        } catch (uploadError) {
            setError(uploadErrorMessage(uploadError, uiLocale));
            throw uploadError instanceof Error ? uploadError : new Error('Content section image upload failed');
        } finally {
            setBusy(false);
        }
    }

    function onCropOpenChange(open: boolean) {
        if (open) return;
        setCropSrc((previous) => {
            if (previous != null) URL.revokeObjectURL(previous);
            return null;
        });
    }

    return (
        <>
            <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">{t('contentSections.image')}</span>
                {fileUploadId ? <img src={fileUploadPublicUrl(fileUploadId)} alt="" className={previewClassName} /> : null}
                <input
                    ref={inputRef}
                    type="file"
                    accept={IMAGE_CROP_ACCEPT}
                    className="sr-only"
                    disabled={busy}
                    onChange={(event) => onSelected(event.target.files?.[0])}
                />
                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
                        {busy ? t('contentSections.uploading') : t('contentSections.selectImage')}
                    </Button>
                    {fileUploadId ? (
                        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmRemove(true)}>
                            {t('contentSections.remove')}
                        </Button>
                    ) : null}
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t('contentSections.removeImageTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>{t('contentSections.removeImageBody')}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{t('contentSections.cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                                variant="destructive"
                                onClick={() => {
                                    onChange(null);
                                    setConfirmRemove(false);
                                }}
                            >
                                {t('contentSections.remove')}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            {cropSrc != null ? (
                <Suspense fallback={null}>
                    <ImageCropDialog open onOpenChange={onCropOpenChange} imageSrc={cropSrc} variant={variant} onConfirm={onCropConfirm} />
                </Suspense>
            ) : null}
        </>
    );
}
