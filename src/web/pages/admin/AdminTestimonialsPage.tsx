import { Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { formatDate } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { AdminTestimonialOfferLink } from '../../components/AdminTestimonialOfferLink';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { Input } from '../../components/base/input';
import { TestimonialRatingStars } from '../../components/TestimonialRatingStars';
import type { GqlCAdminTestimonialsPageQuery } from '../../graphql/generated';
import {
    AdminCookTestimonialDeleteDocument,
    AdminCookTestimonialPublishDocument,
    AdminCustomerTestimonialDeleteDocument,
    AdminCustomerTestimonialPublishDocument,
    AdminTestimonialsPageUpdatesDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { cn } from '../../utils/cn';
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

type ListRow = {
    kind: AdminTestimonialType;
    id: string;
    rating: number | null;
    authorName: string;
    body: string;
    bookingRequestOfferId: string | null;
    publicationStatus: 'PUBLISHED' | 'PENDING_REVIEW';
    createdAt: string;
};

function testimonialDetailTo(row: ListRow): { to: string; params: Record<string, string> } {
    return row.kind === 'CUSTOMER'
        ? { to: '/{-$locale}/admin/testimonials/customer/$customerTestimonialId', params: { customerTestimonialId: row.id } }
        : { to: '/{-$locale}/admin/testimonials/cook/$cookTestimonialId', params: { cookTestimonialId: row.id } };
}

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
    const timeZone = useTimeZone();
    const client = useClient();
    const seed = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState(seed);
    const [searchText, setSearchText] = useState('');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
    const [publicationFilter, setPublicationFilter] = useState<PublicationFilter>('ALL');
    const [linkFilter, setLinkFilter] = useState<LinkFilter>('ALL');

    const [, publishCustomer] = useMutation(AdminCustomerTestimonialPublishDocument);
    const [, publishCook] = useMutation(AdminCookTestimonialPublishDocument);
    const [, deleteCustomer] = useMutation(AdminCustomerTestimonialDeleteDocument);
    const [, deleteCook] = useMutation(AdminCookTestimonialDeleteDocument);

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
            kind: 'CUSTOMER',
            id: testimonial.customerTestimonialId,
            rating: testimonial.rating ?? null,
            authorName: testimonial.displayAuthorName || `${testimonial.user.firstName} ${testimonial.user.lastName}`,
            body: testimonial.body,
            bookingRequestOfferId: testimonial.bookingRequestOfferId ?? null,
            publicationStatus: testimonial.publicationStatus,
            createdAt: testimonial.createdAt,
        }));
        const cookRows: ListRow[] = (admin?.cookTestimonials ?? []).map((testimonial) => ({
            kind: 'COOK',
            id: testimonial.cookTestimonialId,
            rating: testimonial.rating ?? null,
            authorName: testimonial.displayAuthorName || `${testimonial.cook.user.firstName} ${testimonial.cook.user.lastName}`,
            body: testimonial.body ?? '',
            bookingRequestOfferId: testimonial.bookingRequestOfferId ?? null,
            publicationStatus: testimonial.publicationStatus,
            createdAt: testimonial.createdAt,
        }));
        return [...customerRows, ...cookRows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }, [admin]);

    const filtered = useMemo(() => {
        const q = searchText.trim().toLowerCase();
        return rows.filter((row) => {
            if (typeFilter !== 'ALL' && row.kind !== typeFilter) return false;
            if (publicationFilter !== 'ALL' && row.publicationStatus !== publicationFilter) return false;
            if (linkFilter === 'LINKED' && !row.bookingRequestOfferId) return false;
            if (linkFilter === 'UNLINKED' && row.bookingRequestOfferId) return false;
            if (!q) return true;
            return row.authorName.toLowerCase().includes(q) || row.body.toLowerCase().includes(q);
        });
    }, [rows, searchText, typeFilter, publicationFilter, linkFilter]);

    async function togglePublish(row: ListRow) {
        const next = row.publicationStatus === 'PUBLISHED' ? 'PENDING_REVIEW' : 'PUBLISHED';
        if (row.kind === 'CUSTOMER') {
            const result = await publishCustomer({ customerTestimonialId: row.id, publicationStatus: next });
            if (result.error || !result.data?.admin.customerTestimonialPublish.success) {
                toast.error({ de: 'Status konnte nicht geändert werden.', en: 'Could not update the status.' }[locale]);
                return;
            }
        } else {
            const result = await publishCook({ cookTestimonialId: row.id, publicationStatus: next });
            if (result.error || !result.data?.admin.cookTestimonialPublish.success) {
                toast.error({ de: 'Status konnte nicht geändert werden.', en: 'Could not update the status.' }[locale]);
                return;
            }
        }
        toast.success({ de: 'Status aktualisiert.', en: 'Status updated.' }[locale]);
    }

    async function remove(row: ListRow) {
        if (!window.confirm({ de: 'Bewertung wirklich löschen?', en: 'Delete this testimonial?' }[locale])) return;
        if (row.kind === 'CUSTOMER') {
            const result = await deleteCustomer({ customerTestimonialId: row.id });
            if (result.error || !result.data?.admin.customerTestimonialDelete.success) {
                toast.error({ de: 'Löschen fehlgeschlagen.', en: 'Could not delete the testimonial.' }[locale]);
                return;
            }
        } else {
            const result = await deleteCook({ cookTestimonialId: row.id });
            if (result.error || !result.data?.admin.cookTestimonialDelete.success) {
                toast.error({ de: 'Löschen fehlgeschlagen.', en: 'Could not delete the testimonial.' }[locale]);
                return;
            }
        }
        toast.success({ de: 'Gelöscht.', en: 'Deleted.' }[locale]);
    }

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

                <ul className="divide-y divide-border rounded-xl border border-border bg-secondary">
                    {filtered.map((row) => {
                        const detail = testimonialDetailTo(row);
                        return (
                            <li
                                key={`${row.kind}-${row.id}`}
                                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                            >
                                <div className="min-w-0 flex-1 space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline">{testimonialTypeLabel(row.kind, locale)}</Badge>
                                        <Badge variant={row.publicationStatus === 'PUBLISHED' ? 'default' : 'secondary'}>
                                            {testimonialPublicationStatusLabel(row.publicationStatus, locale)}
                                        </Badge>
                                        <TestimonialRatingStars rating={row.rating} />
                                    </div>
                                    <Link
                                        to={detail.to as never}
                                        params={detail.params as never}
                                        className="block font-medium text-foreground hover:underline"
                                    >
                                        {row.authorName}
                                    </Link>
                                    <p className={cn('line-clamp-2 text-sm text-muted-foreground', !row.body && 'italic')}>
                                        {row.body || { de: '(ohne Text)', en: '(no body)' }[locale]}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                        <span className="tabular-nums">
                                            {formatDate(row.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                                        </span>
                                        {row.bookingRequestOfferId ? (
                                            <AdminTestimonialOfferLink bookingRequestOfferId={row.bookingRequestOfferId} />
                                        ) : (
                                            <span>{{ de: 'Nicht verknüpft', en: 'Not linked' }[locale]}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex shrink-0 flex-wrap gap-2">
                                    <Button type="button" size="sm" variant="outline" onClick={() => void togglePublish(row)}>
                                        {row.publicationStatus === 'PUBLISHED'
                                            ? { de: 'Zurückstellen', en: 'Unpublish' }[locale]
                                            : { de: 'Veröffentlichen', en: 'Publish' }[locale]}
                                    </Button>
                                    <Button type="button" size="sm" variant="destructive" onClick={() => void remove(row)}>
                                        {{ de: 'Löschen', en: 'Delete' }[locale]}
                                    </Button>
                                </div>
                            </li>
                        );
                    })}
                    {filtered.length === 0 ? (
                        <li className="p-8 text-center text-sm text-muted-foreground">
                            {{ de: 'Keine Bewertungen gefunden.', en: 'No testimonials found.' }[locale]}
                        </li>
                    ) : null}
                </ul>
            </main>
        </AdminPathPageChrome>
    );
}
