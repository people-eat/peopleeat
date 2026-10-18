/**
 * Booking-request domain vocabulary — enums and JSONB shapes for
 * `BookingRequests` / offers / offer events / call-slot bookings.
 * See `docs/architecture/booking.md` and `docs/features/booking.md`.
 */

import type { CookTravelOriginAddress } from './cook';
import type { GiftCardInvoiceAddress } from './giftCard';

/** Exact venue — same Places shape as `CookTravelOriginAddress`. */
export type BookingRequestExactEventAddress = CookTravelOriginAddress;

/** Billing address on the request — same shape as gift-card invoice address. */
export type BookingRequestInvoiceAddress = GiftCardInvoiceAddress;

/** Slack ops thread root — predecessor `references` JSONB shape. */
export type BookingRequestReferences = {
    slackTs?: string;
    slackChannelId?: string;
};

const bookingRequestPriceClassTypes = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type BookingRequestPriceClassType = (typeof bookingRequestPriceClassTypes)[number];

const bookingRequestPublicationStatuses = [
    'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW',
    'PUBLICATION_AUTO_APPROVED',
    'PUBLICATION_APPROVED_BY_ADMIN',
] as const;
export type BookingRequestPublicationStatus = (typeof bookingRequestPublicationStatuses)[number];

const bookingRequestParticipantTypes = ['ADULT', 'DISCOUNTED'] as const;
export type BookingRequestParticipantType = (typeof bookingRequestParticipantTypes)[number];

const bookingRequestOfferPaymentStatuses = ['EMPTY', 'SETUP', 'PAYED', 'TRANSFERRED', 'FAILED', 'PAYED_OUT_OF_SYSTEM'] as const;
export type BookingRequestOfferPaymentStatus = (typeof bookingRequestOfferPaymentStatuses)[number];

/** Statuses where money has actually moved — drives testimonial-reminder eligibility. */
export function bookingRequestOfferPaymentIsPaid(paymentStatus: BookingRequestOfferPaymentStatus): boolean {
    return paymentStatus === 'PAYED' || paymentStatus === 'TRANSFERRED' || paymentStatus === 'PAYED_OUT_OF_SYSTEM';
}

/** Derived request lifecycle — not stored on `BookingRequests`. */
const bookingRequestStatuses = [
    'WAITING_FOR_OFFERS',
    'OFFERS_WAITING_FOR_REVIEW',
    'DEPOSIT_PAYMENT_PENDING',
    'PAYMENT_PULL_PENDING',
    'EVENT_PENDING',
    'COMPLETED',
    'EXPIRED',
    'CANCELED',
] as const;
export type BookingRequestStatus = (typeof bookingRequestStatuses)[number];

/** Statuses where a customer may still cancel (mirrors predecessor cancelable set). */
export const bookingRequestCancelableStatuses: ReadonlySet<BookingRequestStatus> = new Set([
    'WAITING_FOR_OFFERS',
    'OFFERS_WAITING_FOR_REVIEW',
    'EXPIRED',
]);

/** Derived offer lifecycle — not stored on `BookingRequestOffers`. */
const bookingRequestOfferStatuses = [
    'USER_NEEDS_TO_ACCEPT',
    'COOK_NEEDS_TO_ACCEPT',
    'USER_REQUESTED_MENU_CHANGES',
    'USER_DECLINED',
    'COOK_DECLINED',
    'USER_CHOOSE_DIFFERENT_OFFER',
    'USER_NEEDS_DEPOSIT_PAYMENT',
    'PAYMENT_PULL_PENDING',
    'EVENT_PENDING',
    'COMPLETED',
    'EXPIRED',
    'CANCELED',
] as const;
export type BookingRequestOfferStatus = (typeof bookingRequestOfferStatuses)[number];

export type BookingRequestStatusDeriveInput = {
    offerCount: number;
    acceptedOfferPaymentStatus?: BookingRequestOfferPaymentStatus | null;
    canceledAt: Date | null;
    expiresAt: Date | null;
    eventDate: Date;
    now?: Date;
};

export function bookingRequestStatusDerive(input: BookingRequestStatusDeriveInput): BookingRequestStatus {
    const now = input.now ?? new Date();
    const { offerCount, acceptedOfferPaymentStatus, canceledAt, expiresAt, eventDate } = input;

    if (canceledAt) {
        return 'CANCELED';
    }

    if (acceptedOfferPaymentStatus == null && expiresAt && now > expiresAt) {
        return 'EXPIRED';
    }

    if (acceptedOfferPaymentStatus == null && offerCount === 0) {
        return 'WAITING_FOR_OFFERS';
    }

    if (acceptedOfferPaymentStatus == null && offerCount > 0) {
        return 'OFFERS_WAITING_FOR_REVIEW';
    }

    if (acceptedOfferPaymentStatus == null) {
        return 'WAITING_FOR_OFFERS';
    }

    if (acceptedOfferPaymentStatus === 'EMPTY') {
        return 'DEPOSIT_PAYMENT_PENDING';
    }

    if (acceptedOfferPaymentStatus === 'SETUP') {
        return 'PAYMENT_PULL_PENDING';
    }

    if (now <= eventDate) {
        return 'EVENT_PENDING';
    }

    return 'COMPLETED';
}

export type BookingRequestOfferStatusDeriveInput = {
    userAccepted: boolean | null;
    cookAccepted: boolean | null;
    userRequestedMenuAdjustments: boolean | null;
    paymentStatus: BookingRequestOfferPaymentStatus;
    paymentDataPresent: boolean;
    bookingRequestCanceledAt: Date | null;
    bookingRequestExpiresAt: Date | null;
    bookingRequestDateTime: Date;
    hasAcceptedAlternative: boolean;
    now?: Date;
};

export function bookingRequestOfferStatusDerive(input: BookingRequestOfferStatusDeriveInput): BookingRequestOfferStatus {
    const now = input.now ?? new Date();
    const isExpired = input.bookingRequestExpiresAt != null && now > input.bookingRequestExpiresAt;
    const eventDate = input.bookingRequestDateTime;

    if (input.cookAccepted === false && (input.userAccepted === true || input.userAccepted === null)) {
        return 'COOK_DECLINED';
    }
    if (input.userAccepted === false && (input.cookAccepted === true || input.cookAccepted === null)) {
        return 'USER_DECLINED';
    }
    if (
        input.userAccepted === null &&
        input.cookAccepted === true &&
        !input.hasAcceptedAlternative &&
        !isExpired &&
        !input.userRequestedMenuAdjustments
    ) {
        return 'USER_NEEDS_TO_ACCEPT';
    }
    if (input.cookAccepted === null && !input.hasAcceptedAlternative && !isExpired && !input.userRequestedMenuAdjustments) {
        return 'COOK_NEEDS_TO_ACCEPT';
    }
    if (input.bookingRequestCanceledAt) {
        return 'CANCELED';
    }

    if (!(input.userAccepted === true && input.cookAccepted === true) && input.userRequestedMenuAdjustments) {
        return 'USER_REQUESTED_MENU_CHANGES';
    }

    const dualAccepted = input.userAccepted === true && input.cookAccepted === true;

    if (
        dualAccepted &&
        input.paymentDataPresent === false &&
        input.paymentStatus !== 'PAYED_OUT_OF_SYSTEM' &&
        input.paymentStatus !== 'PAYED'
    ) {
        return 'USER_NEEDS_DEPOSIT_PAYMENT';
    }

    if (dualAccepted && input.paymentDataPresent && input.paymentStatus === 'EMPTY') {
        return 'USER_NEEDS_DEPOSIT_PAYMENT';
    }

    if (dualAccepted && input.paymentDataPresent && input.paymentStatus === 'SETUP') {
        return 'PAYMENT_PULL_PENDING';
    }

    if (input.paymentStatus !== 'EMPTY' && input.paymentStatus !== 'SETUP' && now <= eventDate) {
        return 'EVENT_PENDING';
    }

    if (dualAccepted && input.paymentDataPresent && now >= eventDate) {
        return 'COMPLETED';
    }

    if (dualAccepted && input.paymentStatus === 'PAYED_OUT_OF_SYSTEM') {
        return 'COMPLETED';
    }

    if (isExpired) {
        return 'EXPIRED';
    }

    return 'USER_CHOOSE_DIFFERENT_OFFER';
}

/** Cook offer inbox list tabs — derived from `BookingRequestOfferStatus`, not stored. */
const bookingRequestOfferListBuckets = ['ACTIVE', 'COMPLETED', 'ARCHIVED'] as const;
export type BookingRequestOfferListBucket = (typeof bookingRequestOfferListBuckets)[number];

const bookingRequestOfferListBucketByStatus: Record<BookingRequestOfferStatus, BookingRequestOfferListBucket> = {
    USER_NEEDS_TO_ACCEPT: 'ACTIVE',
    COOK_NEEDS_TO_ACCEPT: 'ACTIVE',
    USER_REQUESTED_MENU_CHANGES: 'ACTIVE',
    USER_NEEDS_DEPOSIT_PAYMENT: 'ACTIVE',
    PAYMENT_PULL_PENDING: 'ACTIVE',
    EVENT_PENDING: 'ACTIVE',
    COMPLETED: 'COMPLETED',
    USER_DECLINED: 'ARCHIVED',
    COOK_DECLINED: 'ARCHIVED',
    USER_CHOOSE_DIFFERENT_OFFER: 'ARCHIVED',
    EXPIRED: 'ARCHIVED',
    CANCELED: 'ARCHIVED',
};

export function bookingRequestOfferListBucketDerive(status: BookingRequestOfferStatus): BookingRequestOfferListBucket {
    return bookingRequestOfferListBucketByStatus[status];
}

/**
 * Stripe ids stored on an offer while payment progresses.
 * Discriminated loosely — commands own which combination is valid per status.
 */
export type BookingRequestOfferPaymentData =
    | {
          setupIntentId: string;
          clientSecret: string;
      }
    | {
          paymentIntentId: string;
          clientSecret: string;
          transferId?: string;
          /** Top-up Connect transfer when payout > pull (destination charge). */
          extraTransferId?: string;
      }
    | {
          setupIntentId: string;
          paymentIntentId: string;
          clientSecret: string;
          transferId?: string;
          extraTransferId?: string;
      }
    | {
          transferId: string;
          extraTransferId?: string;
      };

/** Frozen customer menu selection on an accepted/configured offer (snapshot, not live Menus rows). */
type BookingRequestOfferConfiguredMenuMeal = {
    mealTitle: string;
    mealDescription: string;
    mealImageUrl?: string;
};

type BookingRequestOfferConfiguredMenuCourse = {
    title: string;
    meals: BookingRequestOfferConfiguredMenuMeal[];
};

export type BookingRequestOfferConfiguredMenu = {
    /** Undefined when an offline / ad-hoc menu never lived on the cook profile. */
    menuId: string | undefined;
    title: string;
    description: string;
    courses: BookingRequestOfferConfiguredMenuCourse[];
};

/** Draft meal option inside a booking-request AI-generated menu recommendation. */
export type BookingRequestCookMenuEvaluationGeneratedMealOption = {
    type: 'EXISTING_MEAL' | 'NEW_MEAL';
    mealId: string | null;
    title: string | null;
    description: string | null;
};

/**
 * Optional AI ranking + inventory-generated menu recommendation on
 * `BookingRequestCooks`. Written by the `cook-booking-request-menu-evaluation-generate`
 * job; `generatedMenu` stays a draft until the cook applies it.
 */
export type BookingRequestCookMenuEvaluation = {
    evaluationSummary: string;
    menus: {
        menuId: string;
        evaluationSummary: string;
        isSuitable: boolean;
    }[];
    generatedMenu: {
        title: string;
        description: string;
        courses: {
            title: string;
            mealOptions: BookingRequestCookMenuEvaluationGeneratedMealOption[];
        }[];
    } | null;
};

const cookCallSlotBookingStatuses = ['PENDING', 'CONFIRMED', 'CANCELED', 'COMPLETED', 'DECLINED'] as const;
export type CookCallSlotBookingStatus = (typeof cookCallSlotBookingStatuses)[number];

const cookCallSlotBookingActors = ['CUSTOMER', 'COOK'] as const;
export type CookCallSlotBookingActor = (typeof cookCallSlotBookingActors)[number];

const bookingRequestOfferCallRoomStatuses = ['ACTIVE', 'ENDED'] as const;
export type BookingRequestOfferCallRoomStatus = (typeof bookingRequestOfferCallRoomStatuses)[number];

const bookingRequestOfferCallRecordingStatuses = ['PENDING', 'EGRESS_COMPLETE', 'TRANSCRIBING', 'COMPLETED', 'FAILED'] as const;
export type BookingRequestOfferCallRecordingStatus = (typeof bookingRequestOfferCallRecordingStatuses)[number];

/** Structured STT segments persisted on `BookingRequestOfferCallRecordings.transcriptJson`. */
export type BookingRequestOfferCallTranscriptSegment = {
    startedAtMs: number;
    endedAtMs: number;
    text: string;
    speakerLabel?: string;
};

/**
 * Offer timeline / negotiation “chat” event keys.
 * Payloads are validated in commands when events are written — DB stores JSONB.
 */
const bookingRequestOfferEventTypes = [
    'COOK_CREATED',
    'COOK_UPDATED_SUGGESTED_MENU',
    'USER_REQUESTED_MENU_CHANGES',
    'USER_CONFIGURED_MENU',
    'USER_MESSAGE_SIMPLE',
    'COOK_MESSAGE_SIMPLE',
    'ADMIN_MESSAGE_SIMPLE',
    'COOK_ACCEPTED',
    'COOK_DECLINED',
    'USER_ACCEPTED',
    'USER_DECLINED',
    'USER_CANCELLED',
    'ADMIN_HANDED_OVER_CLOSED',
    'ADMIN_HANDED_OVER_TO_COOK',
    'USER_PARTICIPANTS_UPDATED',
    'USER_RESTRICTIONS_UPDATED',
    'USER_DATE_UPDATED',
    'USER_TIME_UPDATED',
    'USER_PREFERENCES_UPDATED',
    'USER_LOCATION_UPDATED',
    'COOK_CHANGED_PRICE',
    'SYSTEM_CHANGED_PRICE',
    'USER_CALL_SLOT_REQUESTED',
    'COOK_CALL_SLOT_REQUESTED',
    'COOK_CALL_SLOT_CONFIRMED',
    'USER_CALL_SLOT_CONFIRMED',
    'COOK_CALL_SLOT_DECLINED',
    'USER_CALL_SLOT_DECLINED',
    'USER_CALL_SLOT_CANCELLED',
    'COOK_CALL_SLOT_CANCELLED',
] as const;
export type BookingRequestOfferEventType = (typeof bookingRequestOfferEventTypes)[number];

/** Party that applied an emoji reaction on a `*_MESSAGE_SIMPLE` event. */
const bookingRequestOfferChatReactorRoles = ['USER', 'COOK', 'ADMIN'] as const;
export type BookingRequestOfferChatReactorRole = (typeof bookingRequestOfferChatReactorRoles)[number];

type BookingRequestOfferPriceSnapshot = {
    platformFeePercentCook: number;
    platformFeePercentCustomer: number;
    travelExpensesCents: number;
    menuPriceCents: number;
    paymentProviderFeeCents: number;
    platformFeeCentsCook: number;
    platformFeeCentsCustomer: number;
    payoutCentsCook: number;
    totalWithoutDiscountsCentsCustomer: number;
};

/** Typed payloads for offer events — commands narrow by `type` when writing. */
type BookingRequestOfferEventPayloadByType = {
    COOK_CREATED: {
        menuTitles?: string[];
        menuPriceCents: number;
        totalWithoutDiscountsCentsCustomer: number;
    };
    COOK_UPDATED_SUGGESTED_MENU: {
        menuTitlesBefore?: string[];
        menuTitlesAfter?: string[];
    };
    USER_REQUESTED_MENU_CHANGES: { messageBody: string };
    USER_CONFIGURED_MENU: Record<string, never>;
    // Attachments live on BookingRequestOfferEventAttachments → FileUploads
    // (not in payload). Optional legacy `mediaUrls` may exist on old rows.
    // `handedOverFrom` / `originalCreatedAt` are set only on chat copies made
    // during admin offer handover (see adminBookingRequestOfferHandover).
    USER_MESSAGE_SIMPLE: {
        messageBody: string;
        mediaUrls?: string[];
        originalCreatedAt?: string;
        handedOverFrom?: {
            cookId: string;
            cookDisplayName: string;
            sourceEventId: string;
        };
    };
    COOK_MESSAGE_SIMPLE: {
        messageBody: string;
        mediaUrls?: string[];
        originalCreatedAt?: string;
        handedOverFrom?: {
            cookId: string;
            cookDisplayName: string;
            sourceEventId: string;
        };
    };
    ADMIN_MESSAGE_SIMPLE: {
        messageBody: string;
        mediaUrls?: string[];
        originalCreatedAt?: string;
        handedOverFrom?: {
            cookId: string;
            cookDisplayName: string;
            sourceEventId: string;
        };
    };
    COOK_ACCEPTED: Record<string, never>;
    COOK_DECLINED: Record<string, never>;
    USER_ACCEPTED: Record<string, never>;
    USER_DECLINED: { reason?: string };
    USER_CANCELLED: { reason?: string };
    ADMIN_HANDED_OVER_CLOSED: {
        cookIdBefore: string;
        cookNameBefore: string;
        cookIdAfter: string;
        cookNameAfter: string;
        chatCopied?: boolean;
    };
    ADMIN_HANDED_OVER_TO_COOK: {
        cookIdBefore: string;
        cookNameBefore: string;
        cookIdAfter: string;
        cookNameAfter: string;
        chatCopied?: boolean;
    };
    USER_PARTICIPANTS_UPDATED: {
        participantsAdultBefore: number;
        participantsDiscountedBefore: number;
        participantsAdultAfter: number;
        participantsDiscountedAfter: number;
    };
    USER_RESTRICTIONS_UPDATED: Record<string, never>;
    USER_DATE_UPDATED: { dateTimeBefore: string; dateTimeAfter: string };
    USER_TIME_UPDATED: { dateTimeBefore: string; dateTimeAfter: string };
    USER_PREFERENCES_UPDATED: { preferencesBefore: string[]; preferencesAfter: string[] };
    USER_LOCATION_UPDATED: {
        locationBefore: BookingRequestExactEventAddress;
        locationAfter: BookingRequestExactEventAddress;
    };
    COOK_CHANGED_PRICE: {
        priceBefore: BookingRequestOfferPriceSnapshot;
        priceAfter: BookingRequestOfferPriceSnapshot;
    };
    SYSTEM_CHANGED_PRICE: {
        priceBefore: BookingRequestOfferPriceSnapshot;
        priceAfter: BookingRequestOfferPriceSnapshot;
    };
    USER_CALL_SLOT_REQUESTED: {
        cookCallSlotBookingId: string;
        startAt: string;
        endAt: string;
        customerMessage?: string;
    };
    COOK_CALL_SLOT_REQUESTED: {
        cookCallSlotBookingId: string;
        startAt: string;
        endAt: string;
        cookMessage?: string;
    };
    COOK_CALL_SLOT_CONFIRMED: {
        cookCallSlotBookingId: string;
        startAt: string;
        endAt: string;
    };
    USER_CALL_SLOT_CONFIRMED: {
        cookCallSlotBookingId: string;
        startAt: string;
        endAt: string;
    };
    COOK_CALL_SLOT_DECLINED: {
        cookCallSlotBookingId: string;
        startAt: string;
        endAt: string;
        declineReason?: string;
    };
    USER_CALL_SLOT_DECLINED: {
        cookCallSlotBookingId: string;
        startAt: string;
        endAt: string;
        declineReason?: string;
    };
    USER_CALL_SLOT_CANCELLED: {
        cookCallSlotBookingId: string;
        startAt: string;
        endAt: string;
        wasConfirmed: boolean;
        reason?: string;
    };
    COOK_CALL_SLOT_CANCELLED: {
        cookCallSlotBookingId: string;
        startAt: string;
        endAt: string;
        wasConfirmed: boolean;
        reason?: string;
    };
};

export type BookingRequestOfferEventPayload = BookingRequestOfferEventPayloadByType[BookingRequestOfferEventType];
