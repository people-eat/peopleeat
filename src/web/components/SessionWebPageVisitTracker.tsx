import { useLocation, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { useMutation } from 'urql';

import { webPageKeyFromPath } from '../../shared';
import { SessionWebPageVisitTrackerCreateDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { pathWithoutLocale } from '../utils/locale';

/**
 * Emits WEB_PAGE_VISITED for public routes once per navigation. Skips admin /
 * profile paths (see webPageKeyFromPath). See docs/architecture/session-events.md.
 */
export function SessionWebPageVisitTracker() {
    const locale = useLocale();
    const pathname = useLocation({ select: (location) => location.pathname });
    const searchStr = useLocation({ select: (location) => location.searchStr ?? '' });
    const isLoading = useRouterState({ select: (state) => state.isLoading });
    const [, visitCreate] = useMutation(SessionWebPageVisitTrackerCreateDocument);
    const lastKeyRef = useRef<string | null>(null);

    useEffect(() => {
        if (isLoading) return;

        const stripped = pathWithoutLocale(pathname, locale);
        const match = webPageKeyFromPath(stripped, searchStr);
        if (!match) return;

        const storedPath =
            match.webPageKey === 'BOOKING_REQUEST_PLAN' && match.params?.partnerVenueId
                ? `${stripped}?venueId=${encodeURIComponent(match.params.partnerVenueId)}`
                : stripped;

        const dedupeKey = JSON.stringify({
            webPageKey: match.webPageKey,
            path: storedPath,
            params: match.params ?? null,
        });
        if (lastKeyRef.current === dedupeKey) return;
        lastKeyRef.current = dedupeKey;

        void visitCreate({
            input: {
                webPageKey: match.webPageKey,
                path: storedPath,
                cityId: match.params?.cityId,
                cookId: match.params?.cookId,
                blogPostId: match.params?.blogPostId,
                partnerVenueId: match.params?.partnerVenueId,
                occasionId: match.params?.occasionId,
                bookingRequestId: match.params?.bookingRequestId,
            },
        });
    }, [isLoading, locale, pathname, searchStr, visitCreate]);

    return null;
}
