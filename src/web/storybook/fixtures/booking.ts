import type { AdminBookingRequestCookWithoutOfferCardRow } from '../../components/AdminBookingRequestCookWithoutOfferCard';
import type { AdminBookingRequestListCardRequest } from '../../components/AdminBookingRequestListCard';
import type { AdminBookingRequestOfferCardOffer } from '../../components/AdminBookingRequestOfferCard';
import type { AdminOfferPartyCardPerson } from '../../components/AdminOfferPartyCards';
import type { CookBookingRequestCardRequest } from '../../components/CookBookingRequestCard';
import type { CookBookingRequestOfferCardOffer } from '../../components/CookBookingRequestOfferCard';
import type { CookBookingRequestSummaryCardParticipant } from '../../components/CookBookingRequestSummaryCard';
import type { CustomerBookingRequestCardRequest } from '../../components/CustomerBookingRequestCard';
import type { CustomerBookingRequestOfferCardOffer } from '../../components/CustomerBookingRequestOfferCard';
import type { PublicCookCardCook } from '../../components/PublicCookCard';
import type { SupportRequestSummaryCardRequest } from '../../components/SupportRequestSummaryCard';
import { callBookingsByStatus, callOverviewItems } from './calls';
import { fixtureAddress, fixtureCook, fixtureCookAlt, fixtureCustomer, fixtureEventDateTime, fixtureOccasion } from './people';

export const fixtureBookingRequestId = 'brFixture00000000001';
export const fixtureOfferId = 'broFixture0000000001';

export const fixturePublicCook: PublicCookCardCook = {
    cookId: fixtureCook.cookId,
    cuisineStyle: fixtureCook.cuisineStyle,
    cookingPhilosophy: fixtureCook.cookingPhilosophy,
    city: fixtureCook.city,
    rating: { averageRating: 4.8, reviewCount: 24 },
    user: {
        display: fixtureCook.display,
        profilePicture: { url: fixtureCook.profilePictureUrl },
    },
};

export const fixtureCustomerOffer: CustomerBookingRequestOfferCardOffer = {
    bookingRequestOfferId: fixtureOfferId,
    status: 'USER_NEEDS_TO_ACCEPT',
    userUnreadNotificationCount: 2,
    totalCentsCustomer: 48000,
    totalWithoutDiscountsCentsCustomer: 52000,
    configuredMenu: { title: 'Herbstmenü mit Trüffel' },
    suggestedMenus: [],
    callBookings: callOverviewItems(callBookingsByStatus.pendingFromCook),
    cook: {
        city: fixtureCook.city,
        cuisineStyle: fixtureCook.cuisineStyle,
        cookingPhilosophy: fixtureCook.cookingPhilosophy,
        user: {
            display: fixtureCook.display,
            profilePicture: { url: fixtureCook.profilePictureUrl },
        },
    },
};

export const fixtureCookOffer: CookBookingRequestOfferCardOffer = {
    bookingRequestOfferId: fixtureOfferId,
    status: 'USER_NEEDS_TO_ACCEPT',
    cookAccepted: false,
    userAccepted: false,
    cookUnreadNotificationCount: 1,
    totalWithoutDiscountsCentsCustomer: 52000,
    payoutCentsCook: 41000,
    callBookings: callOverviewItems(callBookingsByStatus.pendingFromCustomer),
    bookingRequest: {
        occasion: fixtureOccasion,
        dateTime: fixtureEventDateTime,
        exactEventAddress: { ...fixtureAddress },
        participants: [{ type: 'ADULT' }, { type: 'ADULT' }, { type: 'DISCOUNTED' }],
        user: { display: fixtureCustomer.display },
    },
};

export const fixtureAdminOffer: AdminBookingRequestOfferCardOffer = {
    bookingRequestOfferId: fixtureOfferId,
    status: 'USER_NEEDS_TO_ACCEPT',
    userUnreadNotificationCount: 1,
    cookUnreadNotificationCount: 2,
    totalCentsCustomer: 48000,
    totalWithoutDiscountsCentsCustomer: 52000,
    configuredMenu: { title: 'Herbstmenü mit Trüffel' },
    suggestedMenus: [],
    callBookings: callOverviewItems(callBookingsByStatus.confirmed),
    cook: {
        cuisineStyle: fixtureCook.cuisineStyle,
        cookingPhilosophy: fixtureCook.cookingPhilosophy,
        exactTravelOriginAddress: { city: fixtureCook.city },
        user: {
            firstName: fixtureCook.firstName,
            lastName: fixtureCook.lastName,
            profilePicture: { url: fixtureCook.profilePictureUrl },
        },
    },
};

export const fixtureCookRequest: CookBookingRequestCardRequest = {
    bookingRequestId: fixtureBookingRequestId,
    occasion: fixtureOccasion,
    dateTime: fixtureEventDateTime,
    estimatedCookPayoutCents: 39000,
    exactEventAddress: { ...fixtureAddress },
    participants: [{ type: 'ADULT' }, { type: 'ADULT' }, { type: 'ADULT' }, { type: 'DISCOUNTED' }],
};

export const fixtureCookRequestDeclined: CookBookingRequestCardRequest = {
    ...fixtureCookRequest,
    cookPoolDetails: {
        declinedAt: '2026-10-01T12:00:00.000Z',
        declinationReason: 'Leider schon ausgebucht an dem Tag.',
    },
};

export const fixtureCustomerRequest: CustomerBookingRequestCardRequest = {
    bookingRequestId: fixtureBookingRequestId,
    status: 'OFFERS_WAITING_FOR_REVIEW',
    occasion: fixtureOccasion,
    dateTime: fixtureEventDateTime,
    exactEventAddress: { ...fixtureAddress },
    participants: [{ type: 'ADULT' }, { type: 'ADULT' }, { type: 'DISCOUNTED' }],
    offers: [
        {
            bookingRequestOfferId: fixtureOfferId,
            userUnreadNotificationCount: 2,
            callBookings: callOverviewItems(callBookingsByStatus.pendingFromCook),
            cook: {
                cookId: fixtureCook.cookId,
                user: {
                    display: fixtureCook.display,
                    profilePicture: { url: fixtureCook.profilePictureUrl },
                },
            },
        },
        {
            bookingRequestOfferId: 'broFixture0000000002',
            userUnreadNotificationCount: 0,
            cook: {
                cookId: fixtureCookAlt.cookId,
                user: {
                    display: fixtureCookAlt.display,
                    profilePicture: null,
                },
            },
        },
    ],
};

export const fixtureAdminRequest: AdminBookingRequestListCardRequest = {
    bookingRequestId: fixtureBookingRequestId,
    status: 'OFFERS_WAITING_FOR_REVIEW',
    publicationStatus: 'PUBLICATION_APPROVED_BY_ADMIN',
    occasion: fixtureOccasion,
    dateTime: fixtureEventDateTime,
    createdAt: '2026-09-20T10:00:00.000Z',
    exactEventAddress: { ...fixtureAddress },
    participants: [{ type: 'ADULT' }, { type: 'ADULT' }, { type: 'DISCOUNTED' }],
    customer: {
        userId: fixtureCustomer.userId,
        firstName: fixtureCustomer.firstName,
        lastName: fixtureCustomer.lastName,
        emailAddress: fixtureCustomer.emailAddress,
    },
    offers: [
        {
            bookingRequestOfferId: fixtureOfferId,
            status: 'USER_NEEDS_TO_ACCEPT',
            createdAt: '2026-09-21T09:00:00.000Z',
            userUnreadNotificationCount: 1,
            cookUnreadNotificationCount: 2,
            cook: {
                cookId: fixtureCook.cookId,
                user: {
                    userId: fixtureCook.userId,
                    firstName: fixtureCook.firstName,
                    lastName: fixtureCook.lastName,
                },
            },
        },
    ],
};

export const fixtureCookWithoutOffer: AdminBookingRequestCookWithoutOfferCardRow = {
    estimatedTravelDistanceKm: 12.4,
    estimatedTravelExpensesCents: 1800,
    suggestedMenuPriceCents: 9500,
    notifiedAt: null,
    cook: {
        cookId: fixtureCook.cookId,
        cuisineStyle: fixtureCook.cuisineStyle,
        cookingPhilosophy: fixtureCook.cookingPhilosophy,
        exactTravelOriginAddress: { city: fixtureCook.city },
        user: {
            firstName: fixtureCook.firstName,
            lastName: fixtureCook.lastName,
            profilePicture: { url: fixtureCook.profilePictureUrl },
        },
    },
};

export const fixtureAdminPartyCook: AdminOfferPartyCardPerson = {
    userId: fixtureCook.userId,
    displayName: fixtureCook.display,
    emailAddress: fixtureCook.emailAddress,
    profilePictureUrl: fixtureCook.profilePictureUrl,
};

export const fixtureAdminPartyCustomer: AdminOfferPartyCardPerson = {
    userId: fixtureCustomer.userId,
    displayName: fixtureCustomer.display,
    emailAddress: fixtureCustomer.emailAddress,
    profilePictureUrl: fixtureCustomer.profilePictureUrl,
};

export const fixtureSummaryParticipants: CookBookingRequestSummaryCardParticipant[] = [
    {
        bookingRequestParticipantId: 'partFixture000000001',
        type: 'ADULT',
        name: 'Anna',
        restrictions: ['Keine Nüsse'],
    },
    {
        bookingRequestParticipantId: 'partFixture000000002',
        type: 'ADULT',
        name: 'Tom',
        restrictions: [],
    },
    {
        bookingRequestParticipantId: 'partFixture000000003',
        type: 'DISCOUNTED',
        name: 'Lea',
        restrictions: ['Vegetarisch'],
    },
];

export const fixtureSupportRequest: SupportRequestSummaryCardRequest = {
    supportRequestId: 'supFixture0000000001',
    subject: 'Frage zur Anreise des Kochs',
    status: 'OPEN',
    userUnreadNotificationCount: 1,
    adminUnreadNotificationCount: 3,
    createdAt: '2026-10-18T14:30:00.000Z',
    bookingRequest: {
        bookingRequestId: fixtureBookingRequestId,
        occasion: fixtureOccasion,
        dateTime: fixtureEventDateTime,
    },
};
