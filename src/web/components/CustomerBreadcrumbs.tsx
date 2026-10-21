import { Link, useMatch, useRouterState } from '@tanstack/react-router';
import { Fragment } from 'react';

import { useLocale } from '../hooks/useLocale';
import { accountPageTitle } from '../pages/accountLabels';
import { customerNavRouteByPath, customerNavRouteBySlug } from '../pages/profile/customerCatalog';
import {
    profileCustomerBookingRequestOfferCheckoutPageTitle,
    profileCustomerBookingRequestOfferPageTitle,
} from '../pages/profile/profileCustomerBookingRequestOfferLabels';
import { profileCustomerSupportRequestCreatePageTitle } from '../pages/profile/ProfileCustomerSupportRequestCreatePage';
import { profileCustomerSupportRequestPageTitle } from '../pages/profile/profileCustomerSupportRequestLabels';
import { DEFAULT_LOCALE } from '../utils/locale';
import type { Locale } from '../utils/locale';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from './base/breadcrumb';

function pathWithoutLocale(pathname: string, locale: Locale): string {
    if (locale !== DEFAULT_LOCALE && pathname.startsWith(`/${locale}/`)) {
        return pathname.slice(locale.length + 1) || '/';
    }
    if (locale !== DEFAULT_LOCALE && pathname === `/${locale}`) {
        return '/';
    }
    return pathname;
}

type Crumb = {
    label: string;
    to?:
        | '/{-$locale}/profile/booking-requests'
        | '/{-$locale}/profile/booking-requests/$bookingRequestId'
        | '/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId'
        | '/{-$locale}/profile/support-requests';
    params?: { bookingRequestId: string; bookingRequestOfferId?: string };
};

function bookingRequestOccasionFromLoader(bookingRequest: { occasion: string } | null | undefined): string | null {
    const occasion = bookingRequest?.occasion.trim() ?? '';
    return occasion.length > 0 ? occasion : null;
}

function supportRequestSubjectFromLoader(supportRequest: { subject: string } | null | undefined): string | null {
    const subject = supportRequest?.subject.trim() ?? '';
    return subject.length > 0 ? subject : null;
}

// Path within the customer profile workspace only — no leading “Profile” crumb.
// The sidebar already establishes the product area.
export function CustomerBreadcrumbs() {
    const locale = useLocale();
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const path = pathWithoutLocale(pathname, locale);
    const listRoute = customerNavRouteBySlug('booking-requests');
    const supportListRoute = customerNavRouteBySlug('support-requests');
    const bookingMatch = path.match(/^\/profile\/booking-requests\/([^/]+)(?:\/(edit|offers\/([^/]+)(?:\/(checkout))?))?$/);
    const isSupportCreate = path === '/profile/support-requests/create';
    const supportMatch = !isSupportCreate ? path.match(/^\/profile\/support-requests\/([^/]+)$/) : null;
    const navRoute = customerNavRouteByPath(path);
    const detailOccasion = useMatch({
        from: '/{-$locale}/profile/booking-requests_/$bookingRequestId',
        shouldThrow: false,
        select: (match) => bookingRequestOccasionFromLoader(match.loaderData?.currentSession.user?.bookingRequest),
    });
    const editOccasion = useMatch({
        from: '/{-$locale}/profile/booking-requests_/$bookingRequestId_/edit',
        shouldThrow: false,
        select: (match) => bookingRequestOccasionFromLoader(match.loaderData?.currentSession.user?.bookingRequest),
    });
    const offerCrumbLabels = useMatch({
        from: '/{-$locale}/profile/booking-requests_/$bookingRequestId_/offers_/$bookingRequestOfferId',
        shouldThrow: false,
        select: (match) => {
            const bookingRequest = match.loaderData?.currentSession.user?.bookingRequest;
            const offerId = match.params.bookingRequestOfferId;
            const offer = bookingRequest?.offers.find((entry) => entry.bookingRequestOfferId === offerId);
            const cookDisplay = offer?.cook.user.display.trim() ?? '';
            return {
                occasion: bookingRequestOccasionFromLoader(bookingRequest),
                cookDisplay: cookDisplay.length > 0 ? cookDisplay : null,
            };
        },
    });
    const checkoutCrumbLabels = useMatch({
        from: '/{-$locale}/profile/booking-requests_/$bookingRequestId_/offers_/$bookingRequestOfferId_/checkout',
        shouldThrow: false,
        select: (match) => {
            const bookingRequest = match.loaderData?.currentSession.user?.bookingRequest;
            const offerId = match.params.bookingRequestOfferId;
            const offer = bookingRequest?.offers.find((entry) => entry.bookingRequestOfferId === offerId);
            const cookDisplay = offer?.cook.user.display.trim() ?? '';
            return {
                occasion: bookingRequestOccasionFromLoader(bookingRequest),
                cookDisplay: cookDisplay.length > 0 ? cookDisplay : null,
            };
        },
    });
    const supportSubject = useMatch({
        from: '/{-$locale}/profile/support-requests_/$supportRequestId',
        shouldThrow: false,
        select: (match) => supportRequestSubjectFromLoader(match.loaderData?.currentSession.user?.supportRequest),
    });
    const occasionLabel =
        detailOccasion ??
        editOccasion ??
        offerCrumbLabels?.occasion ??
        checkoutCrumbLabels?.occasion ??
        { de: 'Buchungsanfrage', en: 'Booking request' }[locale];
    const offerCookLabel =
        offerCrumbLabels?.cookDisplay ?? checkoutCrumbLabels?.cookDisplay ?? profileCustomerBookingRequestOfferPageTitle[locale];

    const crumbs: Crumb[] = [];

    if (path === '/profile') {
        crumbs.push({ label: { de: 'Übersicht', en: 'Overview' }[locale] });
    } else if (path === '/profile/account') {
        crumbs.push({ label: accountPageTitle[locale] });
    } else if (isSupportCreate) {
        crumbs.push({ label: supportListRoute.title[locale], to: '/{-$locale}/profile/support-requests' });
        crumbs.push({ label: profileCustomerSupportRequestCreatePageTitle[locale] });
    } else if (supportMatch) {
        crumbs.push({ label: supportListRoute.title[locale], to: '/{-$locale}/profile/support-requests' });
        crumbs.push({ label: supportSubject ?? profileCustomerSupportRequestPageTitle[locale] });
    } else if (bookingMatch) {
        const bookingRequestId = bookingMatch[1]!;
        const suffix = bookingMatch[2];
        const bookingRequestOfferId = bookingMatch[3];
        const isCheckout = bookingMatch[4] === 'checkout';
        crumbs.push({ label: listRoute.title[locale], to: '/{-$locale}/profile/booking-requests' });
        if (suffix === 'edit') {
            crumbs.push({
                label: occasionLabel,
                to: '/{-$locale}/profile/booking-requests/$bookingRequestId',
                params: { bookingRequestId },
            });
            crumbs.push({ label: { de: 'Bearbeiten', en: 'Edit' }[locale] });
        } else if (suffix?.startsWith('offers/') && bookingRequestOfferId) {
            crumbs.push({
                label: occasionLabel,
                to: '/{-$locale}/profile/booking-requests/$bookingRequestId',
                params: { bookingRequestId },
            });
            if (isCheckout) {
                crumbs.push({
                    label: offerCookLabel,
                    to: '/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId',
                    params: { bookingRequestId, bookingRequestOfferId },
                });
                crumbs.push({ label: profileCustomerBookingRequestOfferCheckoutPageTitle[locale] });
            } else {
                crumbs.push({ label: offerCookLabel });
            }
        } else {
            crumbs.push({ label: occasionLabel });
        }
    } else if (navRoute) {
        crumbs.push({ label: navRoute.title[locale] });
    }

    if (crumbs.length === 0) {
        return null;
    }

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {crumbs.map((crumb, index) => {
                    const isLast = index === crumbs.length - 1;
                    return (
                        <Fragment key={`${crumb.label}-${index}`}>
                            {index > 0 ? <BreadcrumbSeparator /> : null}
                            <BreadcrumbItem>
                                {isLast || !crumb.to ? (
                                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        {crumb.params ? (
                                            <Link to={crumb.to} params={crumb.params}>
                                                {crumb.label}
                                            </Link>
                                        ) : (
                                            <Link to={crumb.to}>{crumb.label}</Link>
                                        )}
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                        </Fragment>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
