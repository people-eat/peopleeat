import { ArrowDownIcon, ArrowUpIcon, PlusIcon, XIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { inlineCopy } from '../../shared';

import type { Locale } from '../../shared';
import type { SectionPageTestimonial } from '../sections/SectionPageTestimonials';
import { Badge } from './base/badge';
import { Button } from './base/button';
import { Card, CardContent, CardHeader, CardTitle } from './base/card';
import { Checkbox } from './base/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './base/dialog';
import { Input } from './base/input';
import { StatusBadge } from './base/status-badge';
import { TestimonialRatingStars } from './TestimonialRatingStars';

export type TestimonialEntry = {
    testimonialType: 'COOK' | 'CUSTOMER';
    testimonialId: string;
};

export type TestimonialCandidateOption = TestimonialEntry & {
    displayAuthorName: string;
    displayLocation: string | null;
    displayOccasion: string | null;
    body: string | null;
    rating: number | null;
    publicationStatus: 'PUBLISHED' | 'PENDING_REVIEW';
};

function entryKey(entry: TestimonialEntry): string {
    return `${entry.testimonialType}:${entry.testimonialId}`;
}

function entryFromKey(key: string): TestimonialEntry {
    const [testimonialType, testimonialId] = key.split(':');
    return { testimonialType: testimonialType as TestimonialEntry['testimonialType'], testimonialId: testimonialId! };
}

/** Admin junction row (`AdminPageTestimonial` on city / partner / occasion editors). */
export type ContentPageAdminTestimonialAssignment = {
    index: number;
    isPubliclyListed: boolean;
    testimonial:
        | {
              __typename: 'AdminCustomerTestimonial';
              customerTestimonialId: string;
              displayAuthorName: string;
              displayLocation: string | null;
              displayOccasion: string | null;
              body: string;
              rating: number | null;
              publicationStatus: 'PUBLISHED' | 'PENDING_REVIEW';
          }
        | {
              __typename: 'AdminCookTestimonial';
              cookTestimonialId: string;
              displayAuthorName: string;
              displayLocation: string | null;
              displayOccasion: string | null;
              cookBody: string | null;
              rating: number | null;
              publicationStatus: 'PUBLISHED' | 'PENDING_REVIEW';
          };
};

export function testimonialEntryFromAdminAssignment(row: ContentPageAdminTestimonialAssignment): TestimonialEntry {
    return row.testimonial.__typename === 'AdminCustomerTestimonial'
        ? { testimonialType: 'CUSTOMER', testimonialId: row.testimonial.customerTestimonialId }
        : { testimonialType: 'COOK', testimonialId: row.testimonial.cookTestimonialId };
}

/** Optimistic assignment rebuild after a local testimonials save (mirrors cook assign rebuild). */
export function adminTestimonialAssignmentFromCandidate(
    entry: TestimonialEntry,
    index: number,
    candidate: TestimonialCandidateOption | undefined,
): ContentPageAdminTestimonialAssignment {
    const isPubliclyListed = candidate?.publicationStatus === 'PUBLISHED';
    if (entry.testimonialType === 'CUSTOMER') {
        return {
            index,
            isPubliclyListed,
            testimonial: {
                __typename: 'AdminCustomerTestimonial',
                customerTestimonialId: entry.testimonialId,
                displayAuthorName: candidate?.displayAuthorName ?? entry.testimonialId.slice(0, 8),
                displayLocation: candidate?.displayLocation ?? null,
                displayOccasion: candidate?.displayOccasion ?? null,
                body: candidate?.body ?? '',
                rating: candidate?.rating ?? null,
                publicationStatus: candidate?.publicationStatus ?? 'PENDING_REVIEW',
            },
        };
    }
    return {
        index,
        isPubliclyListed,
        testimonial: {
            __typename: 'AdminCookTestimonial',
            cookTestimonialId: entry.testimonialId,
            displayAuthorName: candidate?.displayAuthorName ?? entry.testimonialId.slice(0, 8),
            displayLocation: candidate?.displayLocation ?? null,
            displayOccasion: candidate?.displayOccasion ?? null,
            cookBody: candidate?.body ?? null,
            rating: candidate?.rating ?? null,
            publicationStatus: candidate?.publicationStatus ?? 'PENDING_REVIEW',
        },
    };
}

/**
 * Map curated admin junction rows into `ContentPageView` preview shape.
 * Uses `isPubliclyListed` (same gate as public pages) so pending rows stay visible with a warning.
 */
export function contentPageTestimonialsForPreview(
    assigned: ReadonlyArray<ContentPageAdminTestimonialAssignment>,
): SectionPageTestimonial[] {
    return assigned.map((row) => {
        if (row.testimonial.__typename === 'AdminCustomerTestimonial') {
            return {
                index: row.index,
                isPubliclyListed: row.isPubliclyListed,
                testimonial: {
                    __typename: 'CustomerTestimonial' as const,
                    customerTestimonialId: row.testimonial.customerTestimonialId,
                    authorName: row.testimonial.displayAuthorName,
                    location: row.testimonial.displayLocation,
                    occasion: row.testimonial.displayOccasion,
                    body: row.testimonial.body,
                    rating: row.testimonial.rating,
                },
            };
        }
        return {
            index: row.index,
            isPubliclyListed: row.isPubliclyListed,
            testimonial: {
                __typename: 'CookTestimonial' as const,
                cookTestimonialId: row.testimonial.cookTestimonialId,
                authorName: row.testimonial.displayAuthorName,
                location: row.testimonial.displayLocation,
                occasion: row.testimonial.displayOccasion,
                cookBody: row.testimonial.cookBody,
                rating: row.testimonial.rating,
            },
        };
    });
}

/**
 * Ordered picker for `CityTestimonials` / `PartnerTestimonials` curation —
 * spans both the `CUSTOMER` and `COOK` testimonial catalogs. See
 * docs/architecture/testimonials.md.
 */
export function ContentPageTestimonialsEditor({
    locale,
    assignedEntries,
    candidates,
    emptyHint,
    busy,
    onSave,
}: {
    locale: Locale;
    assignedEntries: TestimonialEntry[];
    candidates: TestimonialCandidateOption[];
    emptyHint: string;
    busy?: boolean;
    onSave: (entries: TestimonialEntry[]) => Promise<void>;
}) {
    const assignedSignature = assignedEntries.map(entryKey).join(',');
    const assignedKeys = useMemo(() => (assignedSignature === '' ? [] : assignedSignature.split(',')), [assignedSignature]);
    const [draftKeys, setDraftKeys] = useState(assignedKeys);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);

    // Sync from props when membership/order changes — not on every new array identity from `.map()`.
    useEffect(() => {
        setDraftKeys(assignedKeys);
    }, [assignedKeys]);

    const byKey = useMemo(() => new Map(candidates.map((candidate) => [entryKey(candidate), candidate])), [candidates]);
    const dirty = draftKeys.join(',') !== assignedSignature;

    const draftCandidates = draftKeys.flatMap((key) => {
        const candidate = byKey.get(key);
        if (candidate) return [candidate];
        const entry = entryFromKey(key);
        return [
            {
                ...entry,
                displayAuthorName: entry.testimonialId.slice(0, 8),
                displayLocation: null,
                displayOccasion: null,
                body: null,
                rating: null,
                publicationStatus: 'PENDING_REVIEW' as const,
            },
        ];
    });

    const filteredCandidates = candidates.filter((candidate) => {
        const haystack = `${candidate.displayAuthorName} ${candidate.displayLocation ?? ''} ${candidate.displayOccasion ?? ''} ${
            candidate.body ?? ''
        }`.toLowerCase();
        return haystack.includes(search.trim().toLowerCase());
    });

    async function save() {
        setSaving(true);
        try {
            await onSave(draftKeys.map(entryFromKey));
            toast.success(inlineCopy({ de: 'Bewertungen gespeichert', en: 'Testimonials saved' }, locale));
        } catch {
            toast.error(inlineCopy({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }, locale));
        } finally {
            setSaving(false);
        }
    }

    function move(index: number, delta: number) {
        const nextIndex = index + delta;
        if (nextIndex < 0 || nextIndex >= draftKeys.length) return;
        const next = [...draftKeys];
        const [item] = next.splice(index, 1);
        next.splice(nextIndex, 0, item!);
        setDraftKeys(next);
    }

    return (
        <Card className="gap-4 py-4" data-content-editor-anchor="testimonials">
            <CardHeader className="px-4">
                <CardTitle>{inlineCopy({ de: 'Bewertungen auf der Seite', en: 'Testimonials on this page' }, locale)}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 px-4">
                <p className="text-sm text-muted-foreground">{emptyHint}</p>
                {draftCandidates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {inlineCopy({ de: 'Keine Bewertungen ausgewählt.', en: 'No testimonials selected.' }, locale)}
                    </p>
                ) : (
                    <ul className="divide-y divide-border border border-border">
                        {draftCandidates.map((candidate, index) => (
                            <li key={entryKey(candidate)} className="flex items-center gap-2 px-3 py-2">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="truncate text-sm font-medium">{candidate.displayAuthorName}</p>
                                        <Badge variant="outline" className="shrink-0">
                                            {candidate.testimonialType === 'COOK'
                                                ? inlineCopy({ de: 'Koch', en: 'Chef' }, locale)
                                                : inlineCopy({ de: 'Kunde', en: 'Customer' }, locale)}
                                        </Badge>
                                        <TestimonialRatingStars rating={candidate.rating} className="shrink-0" />
                                    </div>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {candidate.body?.trim() ||
                                            [candidate.displayLocation, candidate.displayOccasion].filter(Boolean).join(' · ')}
                                    </p>
                                    {candidate.publicationStatus === 'PENDING_REVIEW' ? (
                                        <StatusBadge tone="warning" className="mt-1 font-normal">
                                            {inlineCopy(
                                                { de: 'Nicht öffentlich, wartet auf Freigabe', en: 'Not on public page, pending review' },
                                                locale,
                                            )}
                                        </StatusBadge>
                                    ) : null}
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    disabled={index === 0 || saving || busy}
                                    onClick={() => move(index, -1)}
                                    aria-label={inlineCopy({ de: 'Nach oben', en: 'Move up' }, locale)}
                                >
                                    <ArrowUpIcon className="size-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    disabled={index === draftCandidates.length - 1 || saving || busy}
                                    onClick={() => move(index, 1)}
                                    aria-label={inlineCopy({ de: 'Nach unten', en: 'Move down' }, locale)}
                                >
                                    <ArrowDownIcon className="size-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    disabled={saving || busy}
                                    onClick={() => setDraftKeys(draftKeys.filter((key) => key !== entryKey(candidate)))}
                                    aria-label={inlineCopy({ de: 'Entfernen', en: 'Remove' }, locale)}
                                >
                                    <XIcon className="size-4" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={saving || busy} onClick={() => setPickerOpen(true)}>
                        <PlusIcon className="size-4" />
                        {inlineCopy({ de: 'Bewertungen wählen', en: 'Choose testimonials' }, locale)}
                    </Button>
                    <Button type="button" size="sm" disabled={!dirty || saving || busy} onClick={() => void save()}>
                        {inlineCopy({ de: 'Bewertungen speichern', en: 'Save testimonials' }, locale)}
                    </Button>
                    {dirty ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={saving || busy}
                            onClick={() => setDraftKeys(assignedKeys)}
                        >
                            {inlineCopy({ de: 'Zurücksetzen', en: 'Reset' }, locale)}
                        </Button>
                    ) : null}
                </div>
            </CardContent>

            <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{inlineCopy({ de: 'Bewertungen auswählen', en: 'Select testimonials' }, locale)}</DialogTitle>
                        <DialogDescription>
                            {inlineCopy(
                                {
                                    de: 'Ausgewählte Bewertungen erscheinen in der gewählten Reihenfolge.',
                                    en: 'Selected testimonials appear in the chosen order.',
                                },
                                locale,
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={inlineCopy({ de: 'Suchen…', en: 'Search…' }, locale)}
                    />
                    <ul className="max-h-72 divide-y divide-border overflow-y-auto border border-border">
                        {filteredCandidates.length === 0 ? (
                            <li className="px-3 py-4 text-sm text-muted-foreground">
                                {inlineCopy({ de: 'Keine Kandidaten.', en: 'No candidates.' }, locale)}
                            </li>
                        ) : (
                            filteredCandidates.map((candidate) => {
                                const key = entryKey(candidate);
                                const checked = draftKeys.includes(key);
                                return (
                                    <li key={key} className="flex items-center gap-3 px-3 py-2">
                                        <Checkbox
                                            checked={checked}
                                            onCheckedChange={(next) => {
                                                if (next) {
                                                    setDraftKeys([...draftKeys, key]);
                                                } else {
                                                    setDraftKeys(draftKeys.filter((existing) => existing !== key));
                                                }
                                            }}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="truncate text-sm font-medium">{candidate.displayAuthorName}</p>
                                                <Badge variant="outline" className="shrink-0">
                                                    {candidate.testimonialType === 'COOK'
                                                        ? inlineCopy({ de: 'Koch', en: 'Chef' }, locale)
                                                        : inlineCopy({ de: 'Kunde', en: 'Customer' }, locale)}
                                                </Badge>
                                                {candidate.publicationStatus === 'PENDING_REVIEW' ? (
                                                    <StatusBadge tone="warning" className="shrink-0 font-normal">
                                                        {inlineCopy({ de: 'Nicht öffentlich', en: 'Not on public page' }, locale)}
                                                    </StatusBadge>
                                                ) : null}
                                                <TestimonialRatingStars rating={candidate.rating} className="shrink-0" />
                                            </div>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {candidate.body?.trim() ||
                                                    [candidate.displayLocation, candidate.displayOccasion].filter(Boolean).join(' · ')}
                                            </p>
                                        </div>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                    <DialogFooter>
                        <Button type="button" onClick={() => setPickerOpen(false)}>
                            {inlineCopy({ de: 'Fertig', en: 'Done' }, locale)}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
