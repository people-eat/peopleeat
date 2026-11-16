import { useEffect, useMemo, useState } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../../i18n/t';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { AdminTestimonialListCard } from '../../components/AdminTestimonialListCard';
import type { AdminTestimonialListCardTestimonial } from '../../components/AdminTestimonialListCard';
import { Button } from '../../components/base/button';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import type { GqlCAdminTestimonialsPageQuery } from '../../graphql/generated';
import { AdminTestimonialsPageUpdatesDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import type { Locale } from '../../utils/locale';
import { testimonialPublicationStatusLabel, testimonialTypeLabel } from './adminTestimonialsShared';
import type { AdminTestimonialType } from './adminTestimonialsShared';

export function adminTestimonialsPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'nav.testimonials.title');
}
export function adminTestimonialsPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.testimonials.description');
}

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
                setAdmin((prev) => (prev ? { ...prev, testimonials: next.testimonials } : prev));
            }),
        );
        return unsubscribe;
    }, [client]);

    const rows = useMemo<ListRow[]>(() => {
        return (admin?.testimonials ?? []).flatMap((testimonial): ListRow[] => {
            if (testimonial.__typename === 'AdminCustomerTestimonial') {
                return [
                    {
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
                    },
                ];
            }
            if (testimonial.__typename === 'AdminCookTestimonial') {
                return [
                    {
                        kind: 'cook',
                        testimonialId: testimonial.cookTestimonialId,
                        displayAuthorName:
                            testimonial.displayAuthorName || `${testimonial.cook.user.firstName} ${testimonial.cook.user.lastName}`,
                        displayLocation: testimonial.displayLocation ?? null,
                        displayOccasion: testimonial.displayOccasion ?? null,
                        body: testimonial.cookBody ?? null,
                        rating: testimonial.rating ?? null,
                        publicationStatus: testimonial.publicationStatus,
                        publishedAt: testimonial.publishedAt ?? null,
                        createdAt: testimonial.createdAt,
                        imageUrls: testimonial.imageUrls,
                        publicPagePlacements: testimonial.publicPagePlacements,
                        bookingRequestOfferId: testimonial.bookingRequestOfferId ?? null,
                    },
                ];
            }
            return [];
        });
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
                        placeholder={t(locale, 'admin', 'copy.searchAuthorOrBody')}
                        aria-label={t(locale, 'admin', 'copy.searchTestimonials')}
                        className="max-w-xs"
                    />
                    <Select value={typeFilter} onValueChange={(value) => setTypeFilter((value as TypeFilter | null) ?? 'ALL')}>
                        <SelectTrigger size="sm" aria-label={t(locale, 'admin', 'copy.filterByAuthorType')}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">{t(locale, 'admin', 'copy.allAuthors')}</SelectItem>
                            <SelectItem value="CUSTOMER">{testimonialTypeLabel('CUSTOMER', locale)}</SelectItem>
                            <SelectItem value="COOK">{testimonialTypeLabel('COOK', locale)}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select
                        value={publicationFilter}
                        onValueChange={(value) => setPublicationFilter((value as PublicationFilter | null) ?? 'ALL')}
                    >
                        <SelectTrigger size="sm" aria-label={t(locale, 'admin', 'copy.filterByStatus')}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">{t(locale, 'admin', 'copy.allStatuses2')}</SelectItem>
                            <SelectItem value="PUBLISHED">{testimonialPublicationStatusLabel('PUBLISHED', locale)}</SelectItem>
                            <SelectItem value="PENDING_REVIEW">{testimonialPublicationStatusLabel('PENDING_REVIEW', locale)}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={linkFilter} onValueChange={(value) => setLinkFilter((value as LinkFilter | null) ?? 'ALL')}>
                        <SelectTrigger size="sm" aria-label={t(locale, 'admin', 'copy.filterByLink')}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">{t(locale, 'admin', 'copy.allLinks')}</SelectItem>
                            <SelectItem value="LINKED">{t(locale, 'admin', 'copy.linked')}</SelectItem>
                            <SelectItem value="UNLINKED">{t(locale, 'admin', 'copy.unlinked')}</SelectItem>
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
                            {t(locale, 'admin', 'copy.clearFilters')}
                        </Button>
                    ) : null}
                    <p className="text-sm text-muted-foreground tabular-nums sm:ml-auto">
                        {t(locale, 'admin', 'copy.testimonialsVisibleOfTotal', {
                            visible: filtered.length,
                            total: rows.length,
                        })}
                    </p>
                </div>

                {filtered.length === 0 ? (
                    <p className="rounded-xl border border-border bg-secondary p-8 text-center text-sm text-muted-foreground">
                        {t(locale, 'admin', 'copy.noTestimonialsFound')}
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
