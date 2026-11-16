import { Navigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../../i18n/t';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { StatusAlert } from '../../components/base/status-alert';
import type { GqlCAdminOfferChatReviewsPageAdminFragment, GqlCAdminOfferChatReviewsPageQuery } from '../../graphql/generated';
import { AdminOfferChatReviewsPageUpdatesDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import type { Locale } from '../../utils/locale';
import { adminStubRouteBySlug, adminStubRouteDescription, adminStubRouteTitle } from './adminCatalog';

const route = adminStubRouteBySlug('offer-chat-reviews');

export function adminOfferChatReviewsPageTitle(locale: Locale): string {
    return adminStubRouteTitle(route.slug, locale);
}
export function adminOfferChatReviewsPageDescription(locale: Locale): string {
    return adminStubRouteDescription(route.slug, locale);
}

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
                    <h1 className="font-serif text-4xl/tight text-foreground">{adminOfferChatReviewsPageTitle(locale)}</h1>
                    <p className="text-muted-foreground">{adminOfferChatReviewsPageDescription(locale)}</p>
                </div>
                {pendingCount === 0 ? (
                    <StatusAlert tone="success" title={t(locale, 'admin', 'copy.allReviewed')}>
                        {t(locale, 'admin', 'copy.noOfferChatsAreWaitingForReview')}
                    </StatusAlert>
                ) : null}
            </main>
        </AdminPathPageChrome>
    );
}
