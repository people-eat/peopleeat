import { Link } from '@tanstack/react-router';
import { ExternalLinkIcon } from 'lucide-react';
import { useQuery } from 'urql';

import { AdminTestimonialOfferLinkDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';

/**
 * Testimonials only carry `bookingRequestOfferId` — the admin offer route
 * needs `bookingRequestId` too, so this lazily resolves it before rendering
 * the link. Renders nothing while loading or when the offer is unknown.
 */
export function AdminTestimonialOfferLink({ bookingRequestOfferId }: { bookingRequestOfferId: string }) {
    const locale = useLocale();
    const [{ data, fetching }] = useQuery({
        query: AdminTestimonialOfferLinkDocument,
        variables: { bookingRequestOfferId },
    });

    const offer = data?.currentSession.user?.admin?.bookingRequestOffer ?? null;
    if (fetching || !offer) return null;

    return (
        <Link
            to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
            params={{ bookingRequestId: offer.bookingRequestId, bookingRequestOfferId: offer.bookingRequestOfferId }}
            className="inline-flex items-center gap-1 text-sm text-foreground hover:underline"
        >
            <ExternalLinkIcon className="size-3.5" aria-hidden />
            {{ de: 'Angebot ansehen', en: 'View offer' }[locale]}
        </Link>
    );
}
