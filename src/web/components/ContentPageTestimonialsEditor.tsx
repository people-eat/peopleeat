import { ArrowDownIcon, ArrowUpIcon, PlusIcon, XIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { Locale } from '../../shared';
import { Badge } from './base/badge';
import { Button } from './base/button';
import { Card, CardContent, CardHeader, CardTitle } from './base/card';
import { Checkbox } from './base/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './base/dialog';
import { Input } from './base/input';
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
            toast.success({ de: 'Bewertungen gespeichert', en: 'Testimonials saved' }[locale]);
        } catch {
            toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
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
                <CardTitle>{{ de: 'Bewertungen auf der Seite', en: 'Testimonials on this page' }[locale]}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 px-4">
                <p className="text-sm text-muted-foreground">{emptyHint}</p>
                {draftCandidates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {{ de: 'Keine Bewertungen ausgewählt.', en: 'No testimonials selected.' }[locale]}
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
                                                ? { de: 'Koch', en: 'Chef' }[locale]
                                                : { de: 'Kunde', en: 'Customer' }[locale]}
                                        </Badge>
                                        <TestimonialRatingStars rating={candidate.rating} className="shrink-0" />
                                    </div>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {candidate.body?.trim() ||
                                            [candidate.displayLocation, candidate.displayOccasion].filter(Boolean).join(' · ')}
                                    </p>
                                    {candidate.publicationStatus === 'PENDING_REVIEW' ? (
                                        <p className="text-xs text-destructive">
                                            {
                                                {
                                                    de: 'Nicht öffentlich sichtbar, wartet auf Freigabe.',
                                                    en: 'Not shown publicly, pending review.',
                                                }[locale]
                                            }
                                        </p>
                                    ) : null}
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    disabled={index === 0 || saving || busy}
                                    onClick={() => move(index, -1)}
                                    aria-label={{ de: 'Nach oben', en: 'Move up' }[locale]}
                                >
                                    <ArrowUpIcon className="size-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    disabled={index === draftCandidates.length - 1 || saving || busy}
                                    onClick={() => move(index, 1)}
                                    aria-label={{ de: 'Nach unten', en: 'Move down' }[locale]}
                                >
                                    <ArrowDownIcon className="size-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    disabled={saving || busy}
                                    onClick={() => setDraftKeys(draftKeys.filter((key) => key !== entryKey(candidate)))}
                                    aria-label={{ de: 'Entfernen', en: 'Remove' }[locale]}
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
                        {{ de: 'Bewertungen wählen', en: 'Choose testimonials' }[locale]}
                    </Button>
                    <Button type="button" size="sm" disabled={!dirty || saving || busy} onClick={() => void save()}>
                        {{ de: 'Bewertungen speichern', en: 'Save testimonials' }[locale]}
                    </Button>
                    {dirty ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={saving || busy}
                            onClick={() => setDraftKeys(assignedKeys)}
                        >
                            {{ de: 'Zurücksetzen', en: 'Reset' }[locale]}
                        </Button>
                    ) : null}
                </div>
            </CardContent>

            <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{{ de: 'Bewertungen auswählen', en: 'Select testimonials' }[locale]}</DialogTitle>
                        <DialogDescription>
                            {
                                {
                                    de: 'Ausgewählte Bewertungen erscheinen in der gewählten Reihenfolge.',
                                    en: 'Selected testimonials appear in the chosen order.',
                                }[locale]
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={{ de: 'Suchen…', en: 'Search…' }[locale]}
                    />
                    <ul className="max-h-72 divide-y divide-border overflow-y-auto border border-border">
                        {filteredCandidates.length === 0 ? (
                            <li className="px-3 py-4 text-sm text-muted-foreground">
                                {{ de: 'Keine Kandidaten.', en: 'No candidates.' }[locale]}
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
                                                        ? { de: 'Koch', en: 'Chef' }[locale]
                                                        : { de: 'Kunde', en: 'Customer' }[locale]}
                                                </Badge>
                                                {candidate.publicationStatus === 'PENDING_REVIEW' ? (
                                                    <Badge variant="destructive" className="shrink-0">
                                                        {{ de: 'Ausstehend', en: 'Pending' }[locale]}
                                                    </Badge>
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
                            {{ de: 'Fertig', en: 'Done' }[locale]}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
