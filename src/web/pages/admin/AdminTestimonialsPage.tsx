import { useEffect, useMemo, useState } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';

import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { AdminTestimonialListCard } from '../../components/AdminTestimonialListCard';
import type { AdminTestimonialListCardTestimonial } from '../../components/AdminTestimonialListCard';
import { Button } from '../../components/base/button';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import type { GqlCAdminTestimonialsPageQuery } from '../../graphql/generated';
import { AdminTestimonialsPageUpdatesDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { testimonialPublicationStatusLabel, testimonialTypeLabel } from './adminTestimonialsShared';
import type { AdminTestimonialType } from './adminTestimonialsShared';

export const adminTestimonialsPageTitle = { de: 'Bewertungen', en: 'Reviews' } as const;
export const adminTestimonialsPageDescription = {
    de: 'Kunden- und Koch-Bewertungen verwalten.',
    en: 'Manage customer and cook reviews.',
} as const;

type TypeFilter = 'ALL' | AdminTestimonialType;
type PublicationFilter = 'ALL' | 'PUBLISHED' | 'PENDING_REVIEW';
type LinkFilter = 'ALL' | 'LINKED' | 'UNLINKED';

type ListRow = AdminTestimonialListCardTestimonial & {
    bookingRequestOfferId: string | null;
};

export function AdminTestimonialsPage({ data }: { data: GqlCAdminTestimonialsPageQuery }) {
    const locale = useLocale();
    const client = useClient();
    const seed = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState(seed);
    const [searchText, setSearchText] = useState('');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
    const [publicationFilter, setPublicationFilter] = useState<PublicationFilter>('ALL');
    const [linkFilter, setLinkFilter] = useState<LinkFilter>('ALL');

    useEffect(() => {
        setAdmin(seed);
    }, [seed]);

    useEffect(() => {
        const { unsubscribe } = pipe(
            client.executeSubscription(createRequest(AdminTestimonialsPageUpdatesDocument, {})),
            subscribe(({ data: subscriptionData }) => {
                const next = subscriptionData?.adminUpdates;
                if (!next) return;
                setAdmin((prev) =>
                    prev
                        ? {
                              ...prev,
                              customerTestimonials: next.customerTestimonials,
                              cookTestimonials: next.cookTestimonials,
                          }
                        : prev,
                );
            }),
        );
        return unsubscribe;
    }, [client]);

    const rows = useMemo<ListRow[]>(() => {
        const customerRows: ListRow[] = (admin?.customerTestimonials ?? []).map((testimonial) => ({
            kind: 'customer',
            testimonialId: testimonial.customerTestimonialId,
            displayAuthorName: testimonial.displayAuthorName || `${testimonial.user.firstName} ${testimonial.user.lastName}`,
            displayLocation: testimonial.displayLocation ?? null,
            displayOccasion: testimonial.displayOccasion ?? null,
            body: testimonial.body,
            rating: testimonial.rating ?? null,
            publicationStatus: testimonial.publicationStatus,
            publishedAt: testimonial.publishedAt ?? null,
            createdAt: testimonial.createdAt,
            imageUrls: testimonial.imageUrls,
            publicPagePlacements: testimonial.publicPagePlacements,
            bookingRequestOfferId: testimonial.bookingRequestOfferId ?? null,
        }));
        const cookRows: ListRow[] = (admin?.cookTestimonials ?? []).map((testimonial) => ({
            kind: 'cook',
            testimonialId: testimonial.cookTestimonialId,
            displayAuthorName: testimonial.displayAuthorName || `${testimonial.cook.user.firstName} ${testimonial.cook.user.lastName}`,
            displayLocation: testimonial.displayLocation ?? null,
            displayOccasion: testimonial.displayOccasion ?? null,
            body: testimonial.body ?? null,
            rating: testimonial.rating ?? null,
            publicationStatus: testimonial.publicationStatus,
            publishedAt: testimonial.publishedAt ?? null,
            createdAt: testimonial.createdAt,
            imageUrls: testimonial.imageUrls,
            publicPagePlacements: testimonial.publicPagePlacements,
            bookingRequestOfferId: testimonial.bookingRequestOfferId ?? null,
        }));
        return [...customerRows, ...cookRows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }, [admin]);

    const filtered = useMemo(() => {
        const q = searchText.trim().toLowerCase();
        return rows.filter((row) => {
            if (typeFilter !== 'ALL' && row.kind.toUpperCase() !== typeFilter) return false;
            if (publicationFilter !== 'ALL' && row.publicationStatus !== publicationFilter) return false;
            if (linkFilter === 'LINKED' && !row.bookingRequestOfferId) return false;
            if (linkFilter === 'UNLINKED' && row.bookingRequestOfferId) return false;
            if (!q) return true;
            const body = row.body ?? '';
            return row.displayAuthorName.toLowerCase().includes(q) || body.toLowerCase().includes(q);
        });
    }, [rows, searchText, typeFilter, publicationFilter, linkFilter]);

    const hasActiveFilters = searchText.trim() !== '' || typeFilter !== 'ALL' || publicationFilter !== 'ALL' || linkFilter !== 'ALL';

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-6">
                <div className="flex flex-wrap items-center gap-3">
                    <Input
                        type="search"
                        value={searchText}
                        onChange={(event) => setSearchText(event.target.value)}
                        placeholder={{ de: 'Autor oder Text suchen…', en: 'Search author or body…' }[locale]}
                        aria-label={{ de: 'Bewertungen suchen', en: 'Search testimonials' }[locale]}
                        className="max-w-xs"
                    />
                    <Select value={typeFilter} onValueChange={(value) => setTypeFilter((value as TypeFilter | null) ?? 'ALL')}>
                        <SelectTrigger size="sm" aria-label={{ de: 'Autor-Typ filtern', en: 'Filter by author type' }[locale]}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">{{ de: 'Alle Autoren', en: 'All authors' }[locale]}</SelectItem>
                            <SelectItem value="CUSTOMER">{testimonialTypeLabel('CUSTOMER', locale)}</SelectItem>
                            <SelectItem value="COOK">{testimonialTypeLabel('COOK', locale)}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select
                        value={publicationFilter}
                        onValueChange={(value) => setPublicationFilter((value as PublicationFilter | null) ?? 'ALL')}
                    >
                        <SelectTrigger size="sm" aria-label={{ de: 'Status filtern', en: 'Filter by status' }[locale]}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">{{ de: 'Alle Statuswerte', en: 'All statuses' }[locale]}</SelectItem>
                            <SelectItem value="PUBLISHED">{testimonialPublicationStatusLabel('PUBLISHED', locale)}</SelectItem>
                            <SelectItem value="PENDING_REVIEW">{testimonialPublicationStatusLabel('PENDING_REVIEW', locale)}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={linkFilter} onValueChange={(value) => setLinkFilter((value as LinkFilter | null) ?? 'ALL')}>
                        <SelectTrigger size="sm" aria-label={{ de: 'Verknüpfung filtern', en: 'Filter by link' }[locale]}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">{{ de: 'Alle Verknüpfungen', en: 'All links' }[locale]}</SelectItem>
                            <SelectItem value="LINKED">{{ de: 'Verknüpft', en: 'Linked' }[locale]}</SelectItem>
                            <SelectItem value="UNLINKED">{{ de: 'Unverknüpft', en: 'Unlinked' }[locale]}</SelectItem>
                        </SelectContent>
                    </Select>
                    {hasActiveFilters ? (
                        <Button
                            type="button"
                            variant="link"
                            className="h-auto p-0 text-sm text-muted-foreground"
                            onClick={() => {
                                setSearchText('');
                                setTypeFilter('ALL');
                                setPublicationFilter('ALL');
                                setLinkFilter('ALL');
                            }}
                        >
                            {{ de: 'Filter zurücksetzen', en: 'Clear filters' }[locale]}
                        </Button>
                    ) : null}
                    <p className="text-sm text-muted-foreground tabular-nums sm:ml-auto">
                        {
                            {
                                de: `${filtered.length} von ${rows.length} Bewertungen`,
                                en: `${filtered.length} of ${rows.length} testimonials`,
                            }[locale]
                        }
                    </p>
                </div>

                {filtered.length === 0 ? (
                    <p className="rounded-xl border border-border bg-secondary p-8 text-center text-sm text-muted-foreground">
                        {{ de: 'Keine Bewertungen gefunden.', en: 'No testimonials found.' }[locale]}
                    </p>
                ) : (
                    <ul className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {filtered.map((row) => (
                            <li key={`${row.kind}-${row.testimonialId}`} className="min-h-0">
                                <AdminTestimonialListCard testimonial={row} />
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </AdminPathPageChrome>
    );
}
