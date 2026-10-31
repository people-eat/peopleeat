import { useEffect, useMemo, useState } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';

import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { AdminTestimonialListCard } from '../../components/AdminTestimonialListCard';
import type { AdminTestimonialListCardTestimonial } from '../../components/AdminTestimonialListCard';
import { Button } from '../../components/base/button';
import { Input } from '../../components/base/input';
import type { GqlCAdminTestimonialsPageQuery } from '../../graphql/generated';
import { AdminTestimonialsPageUpdatesDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import type { Locale } from '../../utils/locale';
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

function typeFilterLabel(value: TypeFilter, locale: Locale): string {
    if (value === 'ALL') return { de: 'Alle', en: 'All' }[locale];
    return testimonialTypeLabel(value, locale);
}

function publicationFilterLabel(value: PublicationFilter, locale: Locale): string {
    if (value === 'ALL') return { de: 'Alle', en: 'All' }[locale];
    return testimonialPublicationStatusLabel(value, locale);
}

function linkFilterLabel(value: LinkFilter, locale: Locale): string {
    return {
        ALL: { de: 'Alle', en: 'All' },
        LINKED: { de: 'Verknüpft', en: 'Linked' },
        UNLINKED: { de: 'Unverknüpft', en: 'Unlinked' },
    }[value][locale];
}

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

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-6">
                <div>
                    <h1 className="font-serif text-4xl/tight text-foreground">{adminTestimonialsPageTitle[locale]}</h1>
                    <p className="text-muted-foreground">{adminTestimonialsPageDescription[locale]}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Input
                        value={searchText}
                        onChange={(event) => setSearchText(event.target.value)}
                        placeholder={{ de: 'Autor oder Text suchen…', en: 'Search author or body…' }[locale]}
                        aria-label={{ de: 'Bewertungen suchen', en: 'Search testimonials' }[locale]}
                        className="max-w-xs"
                    />
                    <div className="flex gap-1">
                        {(['ALL', 'CUSTOMER', 'COOK'] as const).map((option) => (
                            <Button
                                key={option}
                                type="button"
                                size="sm"
                                variant={typeFilter === option ? 'default' : 'outline'}
                                onClick={() => setTypeFilter(option)}
                            >
                                {typeFilterLabel(option, locale)}
                            </Button>
                        ))}
                    </div>
                    <div className="flex gap-1">
                        {(['ALL', 'PUBLISHED', 'PENDING_REVIEW'] as const).map((option) => (
                            <Button
                                key={option}
                                type="button"
                                size="sm"
                                variant={publicationFilter === option ? 'default' : 'outline'}
                                onClick={() => setPublicationFilter(option)}
                            >
                                {publicationFilterLabel(option, locale)}
                            </Button>
                        ))}
                    </div>
                    <div className="flex gap-1">
                        {(['ALL', 'LINKED', 'UNLINKED'] as const).map((option) => (
                            <Button
                                key={option}
                                type="button"
                                size="sm"
                                variant={linkFilter === option ? 'default' : 'outline'}
                                onClick={() => setLinkFilter(option)}
                            >
                                {linkFilterLabel(option, locale)}
                            </Button>
                        ))}
                    </div>
                </div>

                <p className="text-sm text-muted-foreground tabular-nums">
                    {
                        {
                            de: `${filtered.length} von ${rows.length} Bewertungen`,
                            en: `${filtered.length} of ${rows.length} testimonials`,
                        }[locale]
                    }
                </p>

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
