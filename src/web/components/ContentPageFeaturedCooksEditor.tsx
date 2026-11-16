import { ArrowDownIcon, ArrowUpIcon, PlusIcon, XIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { t } from '../../i18n/t';
import type { Locale } from '../../shared';
import { Button } from './base/button';
import { Card, CardContent, CardHeader, CardTitle } from './base/card';
import { Checkbox } from './base/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './base/dialog';
import { Input } from './base/input';

export type FeaturedCookOption = {
    cookId: string;
    displayName: string;
    city: string | null;
    cuisineStyle: string | null;
    isPubliclyListed: boolean;
    /** When known, drives banned-specific admin warnings. */
    userStatus?: 'ACTIVE' | 'BANNED' | 'ANONYMIZED';
};

function featuredCookListingWarning(cook: FeaturedCookOption, locale: Locale): string | null {
    if (cook.userStatus === 'BANNED') {
        return t(locale, 'common', 'contentPageFeaturedCooks.banned');
    }
    if (!cook.isPubliclyListed) {
        return t(locale, 'common', 'contentPageFeaturedCooks.notPublic');
    }
    return null;
}

export function ContentPageFeaturedCooksEditor({
    locale,
    assignedIds,
    candidates,
    emptyHint,
    busy,
    onSave,
    candidateSearch,
    onCandidateSearchChange,
}: {
    locale: Locale;
    assignedIds: string[];
    candidates: FeaturedCookOption[];
    emptyHint: string;
    busy?: boolean;
    onSave: (cookIds: string[]) => Promise<void>;
    /** When set, picker search is controlled by the parent (e.g. server-side cook lookup). */
    candidateSearch?: string;
    onCandidateSearchChange?: (value: string) => void;
}) {
    const assignedSignature = assignedIds.join(',');
    const stableAssignedIds = useMemo(() => (assignedSignature === '' ? [] : assignedSignature.split(',')), [assignedSignature]);
    const [draftIds, setDraftIds] = useState(stableAssignedIds);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [localSearch, setLocalSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const remoteSearch = onCandidateSearchChange != null;
    const search = remoteSearch ? (candidateSearch ?? '') : localSearch;

    // Sync from props when membership/order changes — not on every new array identity from `.map()`.
    useEffect(() => {
        setDraftIds(stableAssignedIds);
    }, [stableAssignedIds]);

    const byId = useMemo(() => new Map(candidates.map((cook) => [cook.cookId, cook])), [candidates]);
    const dirty = draftIds.join(',') !== assignedSignature;

    const draftCooks = draftIds.flatMap((cookId) => {
        const cook = byId.get(cookId);
        return cook
            ? [cook]
            : [
                  {
                      cookId,
                      displayName: cookId.slice(0, 8),
                      city: null,
                      cuisineStyle: null,
                      isPubliclyListed: false,
                  } satisfies FeaturedCookOption,
              ];
    });

    const filteredCandidates = remoteSearch
        ? candidates
        : candidates.filter((cook) => {
              const haystack = `${cook.displayName} ${cook.city ?? ''} ${cook.cuisineStyle ?? ''}`.toLowerCase();
              return haystack.includes(search.trim().toLowerCase());
          });

    async function save() {
        setSaving(true);
        try {
            await onSave(draftIds);
            toast.success(t(locale, 'common', 'contentPageFeaturedCooks.saved'));
        } catch {
            toast.error(t(locale, 'common', 'saveFailed'));
        } finally {
            setSaving(false);
        }
    }

    function move(index: number, delta: number) {
        const nextIndex = index + delta;
        if (nextIndex < 0 || nextIndex >= draftIds.length) return;
        const next = [...draftIds];
        const [item] = next.splice(index, 1);
        next.splice(nextIndex, 0, item!);
        setDraftIds(next);
    }

    return (
        <Card className="gap-4 py-4" data-content-editor-anchor="featured-cooks">
            <CardHeader className="px-4">
                <CardTitle>{t(locale, 'common', 'contentPageFeaturedCooks.title')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 px-4">
                <p className="text-sm text-muted-foreground">{emptyHint}</p>
                {draftCooks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t(locale, 'common', 'contentPageFeaturedCooks.noneSelected')}</p>
                ) : (
                    <ul className="divide-y divide-border border border-border">
                        {draftCooks.map((cook, index) => {
                            const warning = featuredCookListingWarning(cook, locale);
                            return (
                                <li key={cook.cookId} className="flex items-center gap-2 px-3 py-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{cook.displayName}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {[cook.city, cook.cuisineStyle].filter(Boolean).join(' · ') || cook.cookId.slice(0, 8)}
                                        </p>
                                        {warning != null ? <p className="text-xs text-destructive">{warning}</p> : null}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        disabled={index === 0 || saving || busy}
                                        onClick={() => move(index, -1)}
                                        aria-label={t(locale, 'common', 'contentPageTestimonials.moveUp')}
                                    >
                                        <ArrowUpIcon className="size-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        disabled={index === draftCooks.length - 1 || saving || busy}
                                        onClick={() => move(index, 1)}
                                        aria-label={t(locale, 'common', 'contentPageTestimonials.moveDown')}
                                    >
                                        <ArrowDownIcon className="size-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        disabled={saving || busy}
                                        onClick={() => setDraftIds(draftIds.filter((id) => id !== cook.cookId))}
                                        aria-label={t(locale, 'common', 'remove')}
                                    >
                                        <XIcon className="size-4" />
                                    </Button>
                                </li>
                            );
                        })}
                    </ul>
                )}
                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={saving || busy} onClick={() => setPickerOpen(true)}>
                        <PlusIcon className="size-4" />
                        {t(locale, 'common', 'contentPageFeaturedCooks.choose')}
                    </Button>
                    <Button type="button" size="sm" disabled={!dirty || saving || busy} onClick={() => void save()}>
                        {t(locale, 'common', 'contentPageFeaturedCooks.save')}
                    </Button>
                    {dirty ? (
                        <Button type="button" variant="ghost" size="sm" disabled={saving || busy} onClick={() => setDraftIds(assignedIds)}>
                            {t(locale, 'common', 'contentPageTestimonials.reset')}
                        </Button>
                    ) : null}
                </div>
            </CardContent>

            <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t(locale, 'common', 'contentPageFeaturedCooks.selectTitle')}</DialogTitle>
                        <DialogDescription>{t(locale, 'common', 'contentPageFeaturedCooks.selectDescription')}</DialogDescription>
                    </DialogHeader>
                    <Input
                        value={search}
                        onChange={(event) => {
                            const next = event.target.value;
                            if (onCandidateSearchChange) onCandidateSearchChange(next);
                            else setLocalSearch(next);
                        }}
                        placeholder={t(locale, 'common', 'contentPageFeaturedCooks.searchPlaceholder')}
                    />
                    <ul className="max-h-72 divide-y divide-border overflow-y-auto border border-border">
                        {filteredCandidates.length === 0 ? (
                            <li className="px-3 py-4 text-sm text-muted-foreground">
                                {t(locale, 'common', 'contentPageTestimonials.noCandidates')}
                            </li>
                        ) : (
                            filteredCandidates.map((cook) => {
                                const checked = draftIds.includes(cook.cookId);
                                const warning = featuredCookListingWarning(cook, locale);
                                return (
                                    <li key={cook.cookId} className="flex items-center gap-3 px-3 py-2">
                                        <Checkbox
                                            checked={checked}
                                            onCheckedChange={(next) => {
                                                if (next) {
                                                    setDraftIds([...draftIds, cook.cookId]);
                                                } else {
                                                    setDraftIds(draftIds.filter((id) => id !== cook.cookId));
                                                }
                                            }}
                                        />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">{cook.displayName}</p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {[cook.city, cook.cuisineStyle].filter(Boolean).join(' · ')}
                                            </p>
                                            {warning != null ? <p className="text-xs text-muted-foreground">{warning}</p> : null}
                                        </div>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                    <DialogFooter>
                        <Button type="button" onClick={() => setPickerOpen(false)}>
                            {t(locale, 'common', 'contentPageTestimonials.done')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
