import { Navigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';

import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { StatusAlert } from '../../components/base/status-alert';
import type { GqlCAdminOfferChatReviewsPageAdminFragment, GqlCAdminOfferChatReviewsPageQuery } from '../../graphql/generated';
import { AdminOfferChatReviewsPageUpdatesDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { adminStubRouteBySlug } from './adminCatalog';

const route = adminStubRouteBySlug('offer-chat-reviews');

export const adminOfferChatReviewsPageTitle = route.title;
export const adminOfferChatReviewsPageDescription = route.description;

export function adminOfferChatReviewsPageVariables() {
    return {
        pendingOfferChatReviews: {
            skip: 0,
            take: 1,
            hasAdminChatReviewPending: true as const,
        },
    };
}

export function AdminOfferChatReviewsPage({ data }: { data: GqlCAdminOfferChatReviewsPageQuery }) {
    const locale = useLocale();
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState<GqlCAdminOfferChatReviewsPageAdminFragment | null>(seedAdmin);
    const variables = adminOfferChatReviewsPageVariables();

    useEffect(() => {
        setAdmin(seedAdmin);
    }, [seedAdmin]);

    useEffect(() => {
        if (!seedAdmin) return;
        const request = createRequest(AdminOfferChatReviewsPageUpdatesDocument, variables);
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                if (result.data?.adminUpdates) setAdmin(result.data.adminUpdates);
            }),
        );
        return unsubscribe;
    }, [client, seedAdmin]);

    const firstPending = admin?.pendingOfferChatReviews[0] ?? null;
    const pendingCount = admin?.pendingOfferChatReviewsCounts[0] ?? 0;

    if (firstPending) {
        return (
            <Navigate
                to="/{-$locale}/admin/offer-chat-reviews/$bookingRequestOfferId"
                params={{ bookingRequestOfferId: firstPending.bookingRequestOfferId }}
                replace
            />
        );
    }

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="mx-auto grid w-full max-w-3xl content-start gap-6">
                <div className="grid gap-2">
                    <h1 className="font-serif text-4xl/tight text-foreground">{adminOfferChatReviewsPageTitle[locale]}</h1>
                    <p className="text-muted-foreground">{adminOfferChatReviewsPageDescription[locale]}</p>
                </div>
                {pendingCount === 0 ? (
                    <StatusAlert tone="success" title={{ de: 'Alles geprüft', en: 'All reviewed' }[locale]}>
                        {
                            {
                                de: 'Keine Angebots-Chats warten auf Prüfung.',
                                en: 'No offer chats are waiting for review.',
                            }[locale]
                        }
                    </StatusAlert>
                ) : null}
            </main>
        </AdminPathPageChrome>
    );
}
