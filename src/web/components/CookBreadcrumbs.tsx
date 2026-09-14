import { Link, useMatch, useRouterState } from '@tanstack/react-router';
import { Fragment } from 'react';

import { useLocale } from '../hooks/useLocale';
import { accountPageTitle } from '../pages/accountLabels';
import { cookNavRouteByPath, cookNavRouteBySlug } from '../pages/profile/cookCatalog';
import {
    profileCookBookingRequestOfferCreatePageTitle,
    profileCookBookingRequestOfferMenusEditPageTitle,
    profileCookBookingRequestOfferPageTitle,
    profileCookBookingRequestOfferPriceEditPageTitle,
} from '../pages/profile/profileCookBookingRequestOfferLabels';
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
        | '/{-$locale}/profile'
        | '/{-$locale}/profile/chef-profile'
        | '/{-$locale}/profile/travel'
        | '/{-$locale}/profile/meals'
        | '/{-$locale}/profile/meals/$mealId'
        | '/{-$locale}/profile/menus'
        | '/{-$locale}/profile/menus/$menuId'
        | '/{-$locale}/profile/booking-request-pool'
        | '/{-$locale}/profile/booking-request-pool/$bookingRequestId'
        | '/{-$locale}/profile/booking-request-offers'
        | '/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId';
    params?: { mealId: string } | { menuId: string } | { bookingRequestId: string } | { bookingRequestOfferId: string };
};

// Path within the cook profile workspace only — no leading “Profile” crumb.
// The sidebar already establishes the product area.
export function CookBreadcrumbs() {
    const locale = useLocale();
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const path = pathWithoutLocale(pathname, locale);
    const navRoute = cookNavRouteByPath(path);
    const chefProfileRoute = cookNavRouteBySlug('chef-profile');
    const travelRoute = cookNavRouteBySlug('travel');
    const mealsRoute = cookNavRouteBySlug('meals');
    const menusRoute = cookNavRouteBySlug('menus');
    const poolRoute = cookNavRouteBySlug('booking-request-pool');
    const offersRoute = cookNavRouteBySlug('booking-request-offers');
    const offerCustomerDisplayFromDetail = useMatch({
        from: '/{-$locale}/profile/booking-request-offers_/$bookingRequestOfferId',
        shouldThrow: false,
        select: (match) => {
            const display = match.loaderData?.currentSession.user?.cook?.bookingRequestOffer?.bookingRequest.user.display.trim() ?? '';
            return display.length > 0 ? display : null;
        },
    });
    const offerCustomerDisplayFromPriceEdit = useMatch({
        from: '/{-$locale}/profile/booking-request-offers_/$bookingRequestOfferId_/edit-price',
        shouldThrow: false,
        select: (match) => {
            const display = match.loaderData?.currentSession.user?.cook?.bookingRequestOffer?.bookingRequest.user.display.trim() ?? '';
            return display.length > 0 ? display : null;
        },
    });
    const offerCustomerDisplayFromMenusEdit = useMatch({
        from: '/{-$locale}/profile/booking-request-offers_/$bookingRequestOfferId_/edit-menus',
        shouldThrow: false,
        select: (match) => {
            const display = match.loaderData?.currentSession.user?.cook?.bookingRequestOffer?.bookingRequest.user.display.trim() ?? '';
            return display.length > 0 ? display : null;
        },
    });
    const offerCustomerDisplay = offerCustomerDisplayFromDetail ?? offerCustomerDisplayFromPriceEdit ?? offerCustomerDisplayFromMenusEdit;

    const crumbs: Crumb[] = [];

    const mealMatch = path.match(/^\/profile\/meals\/([^/]+)(\/edit)?$/);
    const menuMatch = path.match(/^\/profile\/menus\/([^/]+)(\/edit)?$/);
    const offerEditMatch = path.match(/^\/profile\/booking-request-offers\/([^/]+)\/(edit-price|edit-menus)$/);
    const offerMatch = path.match(/^\/profile\/booking-request-offers\/([^/]+)$/);

    if (path === '/profile') {
        crumbs.push({ label: { de: 'Übersicht', en: 'Overview' }[locale] });
    } else if (path === '/profile/account') {
        crumbs.push({ label: accountPageTitle[locale] });
    } else if (path === '/profile/chef-profile/edit') {
        crumbs.push({ label: chefProfileRoute.title[locale], to: '/{-$locale}/profile/chef-profile' });
        crumbs.push({ label: { de: 'Bearbeiten', en: 'Edit' }[locale] });
    } else if (path === '/profile/travel/edit') {
        crumbs.push({ label: travelRoute.title[locale], to: '/{-$locale}/profile/travel' });
        crumbs.push({ label: { de: 'Bearbeiten', en: 'Edit' }[locale] });
    } else if (mealMatch) {
        const mealId = mealMatch[1]!;
        const isEdit = mealMatch[2] != null;
        crumbs.push({ label: mealsRoute.title[locale], to: '/{-$locale}/profile/meals' });
        if (isEdit) {
            crumbs.push({
                label: { de: 'Gericht', en: 'Meal' }[locale],
                to: '/{-$locale}/profile/meals/$mealId',
                params: { mealId },
            });
            crumbs.push({ label: { de: 'Bearbeiten', en: 'Edit' }[locale] });
        } else {
            crumbs.push({ label: { de: 'Gericht', en: 'Meal' }[locale] });
        }
    } else if (menuMatch) {
        const menuId = menuMatch[1]!;
        const isEdit = menuMatch[2] != null;
        crumbs.push({ label: menusRoute.title[locale], to: '/{-$locale}/profile/menus' });
        if (isEdit) {
            crumbs.push({
                label: { de: 'Menü', en: 'Menu' }[locale],
                to: '/{-$locale}/profile/menus/$menuId',
                params: { menuId },
            });
            crumbs.push({ label: { de: 'Bearbeiten', en: 'Edit' }[locale] });
        } else {
            crumbs.push({ label: { de: 'Menü', en: 'Menu' }[locale] });
        }
    } else if (path.match(/^\/profile\/booking-request-pool\/[^/]+\/create$/)) {
        const bookingRequestId = path.split('/')[3]!;
        crumbs.push({ label: poolRoute.title[locale], to: '/{-$locale}/profile/booking-request-pool' });
        crumbs.push({
            label: { de: 'Anfrage', en: 'Request' }[locale],
            to: '/{-$locale}/profile/booking-request-pool/$bookingRequestId',
            params: { bookingRequestId },
        });
        crumbs.push({ label: profileCookBookingRequestOfferCreatePageTitle[locale] });
    } else if (path.startsWith('/profile/booking-request-pool/') && path !== '/profile/booking-request-pool') {
        crumbs.push({ label: poolRoute.title[locale], to: '/{-$locale}/profile/booking-request-pool' });
        crumbs.push({ label: { de: 'Anfrage', en: 'Request' }[locale] });
    } else if (offerEditMatch) {
        const bookingRequestOfferId = offerEditMatch[1]!;
        const editKind = offerEditMatch[2]!;
        crumbs.push({ label: offersRoute.title[locale], to: '/{-$locale}/profile/booking-request-offers' });
        crumbs.push({
            label: offerCustomerDisplay ?? profileCookBookingRequestOfferPageTitle[locale],
            to: '/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId',
            params: { bookingRequestOfferId },
        });
        crumbs.push({
            label:
                editKind === 'edit-price'
                    ? profileCookBookingRequestOfferPriceEditPageTitle[locale]
                    : profileCookBookingRequestOfferMenusEditPageTitle[locale],
        });
    } else if (offerMatch) {
        crumbs.push({ label: offersRoute.title[locale], to: '/{-$locale}/profile/booking-request-offers' });
        crumbs.push({
            label: offerCustomerDisplay ?? profileCookBookingRequestOfferPageTitle[locale],
        });
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
