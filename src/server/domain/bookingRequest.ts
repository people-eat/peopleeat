/**
 * Booking-request domain vocabulary — enums and JSONB shapes for
 * `BookingRequests` / offers / offer events / call-slot bookings.
 * See `docs/architecture/booking.md` and `docs/features/booking.md`.
 */

import type { BookingRequestOfferStatus } from '../../shared/bookingRequestOfferStatus';
import type { BookingRequestStatus } from '../../shared/bookingRequestStatus';
import type { CookTravelOriginAddress } from './cook';
import type { GiftCardInvoiceAddress } from './giftCard';

export type { BookingRequestOfferStatus } from '../../shared/bookingRequestOfferStatus';
export type { BookingRequestStatus } from '../../shared/bookingRequestStatus';
export type { CookCallSlotBookingActor, CookCallSlotBookingStatus } from '../../shared/cookCallSlotBookingStatus';

/** Exact venue — same Places shape as `CookTravelOriginAddress`. */
export type BookingRequestExactEventAddress = CookTravelOriginAddress;

/** Billing address on the request — same shape as gift-card invoice address. */
export type BookingRequestInvoiceAddress = GiftCardInvoiceAddress;

/** Slack ops thread root — `{ slackTs, slackChannelId }` JSONB shape. */
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

/**
 * Why an open offer's price was auto-adjusted after a customer pre-accept edit.
 * Null means not auto-adjusted. `UNKNOWN` is for rows migrated from the old boolean flag.
 * Cleared when the cook confirms or manually edits price.
 */
export const bookingRequestOfferPriceAutoAdjustReasons = ['PARTICIPANTS', 'TRAVEL', 'PARTICIPANTS_AND_TRAVEL', 'UNKNOWN'] as const;
export type BookingRequestOfferPriceAutoAdjustReason = (typeof bookingRequestOfferPriceAutoAdjustReasons)[number];

/** Statuses where money has actually moved — drives testimonial-reminder eligibility. */
export function bookingRequestOfferPaymentIsPaid(paymentStatus: BookingRequestOfferPaymentStatus): boolean {
    return paymentStatus === 'PAYED' || paymentStatus === 'TRANSFERRED' || paymentStatus === 'PAYED_OUT_OF_SYSTEM';
}

/** Statuses where a customer may still cancel. */
export const bookingRequestCancelableStatuses: ReadonlySet<BookingRequestStatus> = new Set([
    'WAITING_FOR_OFFERS',
    'OFFERS_WAITING_FOR_REVIEW',
    'EXPIRED',
]);

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

    if (dualAccepted && input.paymentStatus !== 'EMPTY' && input.paymentStatus !== 'SETUP' && now <= eventDate) {
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
export type BookingRequestOfferPendingDeltaPayment = {
    paymentIntentId: string;
    clientSecret: string;
    /** Customer pull cents for the delta PaymentIntent. */
    amountCents: number;
    /** Cook Connect payout delta (may exceed customer pull when gift absorbed the increase). Optional on legacy rows. */
    cookPayoutDeltaCents?: number;
};

export type BookingRequestOfferPaymentData =
    | {
          setupIntentId: string;
          clientSecret: string;
          pendingDeltaPayment?: BookingRequestOfferPendingDeltaPayment;
      }
    | {
          paymentIntentId: string;
          clientSecret: string;
          transferId?: string;
          /** Latest top-up Connect transfer when payout > pull (legacy; prefer `extraTransferIds`). */
          extraTransferId?: string;
          /** All top-up Connect transfers (oldest first). */
          extraTransferIds?: string[];
          /** Partial refunds from post-accept participant amendments (newest last). */
          refundIds?: string[];
          /** Extra customer PaymentIntents from amendment increases (newest last). */
          amendmentPaymentIntentIds?: string[];
          /** On-session delta charge when no reusable PM (amendment increase). */
          pendingDeltaPayment?: BookingRequestOfferPendingDeltaPayment;
      }
    | {
          setupIntentId: string;
          paymentIntentId: string;
          clientSecret: string;
          transferId?: string;
          extraTransferId?: string;
          extraTransferIds?: string[];
          refundIds?: string[];
          amendmentPaymentIntentIds?: string[];
          pendingDeltaPayment?: BookingRequestOfferPendingDeltaPayment;
      }
    | {
          transferId: string;
          extraTransferId?: string;
          extraTransferIds?: string[];
          refundIds?: string[];
          amendmentPaymentIntentIds?: string[];
          pendingDeltaPayment?: BookingRequestOfferPendingDeltaPayment;
          clientSecret?: string;
      };

/** Pending post–dual-accept booking change (participants and/or venue) awaiting cook accept/decline. */
export type BookingRequestOfferParticipantAmendment = {
    /** Stable id for Stripe idempotency keys across accept retries. */
    amendmentApplyId: string;
    requestedAt: string;
    /** Set when cook accept claims the amendment before Stripe money moves (blocks cancel). */
    claimedAt?: string;
    participants?: {
        type: BookingRequestParticipantType;
        name: string;
        restrictions: string[];
    }[];
    exactEventAddress?: BookingRequestExactEventAddress;
    /**
     * Absolute menu total override (admin). When set, cook accept / apply skips
     * paid-headcount menu scaling and uses this amount.
     */
    menuPriceCentsAfter?: number;
    /**
     * Travel after the proposal: venue-recomputed (customer/admin address change) or absolute
     * admin override. When set, wins over live-offer travel for pending GraphQL totals and apply.
     * Absent on legacy pending rows created before venue travel was persisted on the amendment.
     */
    travelExpensesCentsAfter?: number;
    /**
     * Sticky platform fee % after apply (admin). When set, wins over the live offer snapshot.
     */
    platformFeePercentCookAfter?: number;
    platformFeePercentCustomerAfter?: number;
    menuPriceCentsBefore: number;
    /**
     * Absent on legacy pending rows created before venue amendments stored travel snapshots.
     * GraphQL / apply fall back to the live offer travel when missing.
     */
    travelExpensesCentsBefore?: number;
    totalCentsCustomerBefore: number;
    payoutCentsCookBefore: number;
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
    'USER_PARTICIPANT_AMENDMENT_REQUESTED',
    'USER_PARTICIPANT_AMENDMENT_CANCELED',
    'COOK_PARTICIPANT_AMENDMENT_ACCEPTED',
    'COOK_PARTICIPANT_AMENDMENT_DECLINED',
    'ADMIN_PARTICIPANT_AMENDMENT_REQUESTED',
    'ADMIN_PARTICIPANT_AMENDMENT_APPLIED',
    'COOK_PREPARATIONS_COMPLETED',
    'ADMIN_PREPARATIONS_CLEARED',
    'USER_RESTRICTIONS_UPDATED',
    'USER_DATE_UPDATED',
    'USER_TIME_UPDATED',
    'USER_PREFERENCES_UPDATED',
    'USER_LOCATION_UPDATED',
    'COOK_CHANGED_PRICE',
    'SYSTEM_CHANGED_PRICE',
    'ADMIN_CHANGED_PRICE',
    'ADMIN_ACCEPTANCE_UPDATED',
    'ADMIN_PAYMENT_SCHEDULE_UPDATED',
    'ADMIN_CONFIGURED_MENU_UPDATED',
    'SYSTEM_PAYMENT_SETUP',
    'SYSTEM_PAYMENT_SUCCEEDED',
    'SYSTEM_PAYMENT_FAILED',
    'ADMIN_PAYOUT_RELEASED',
    'ADMIN_PAYED_OUT_OF_SYSTEM',
    'USER_CALL_SLOT_REQUESTED',
    'COOK_CALL_SLOT_REQUESTED',
    'COOK_CALL_SLOT_CONFIRMED',
    'USER_CALL_SLOT_CONFIRMED',
    'COOK_CALL_SLOT_DECLINED',
    'USER_CALL_SLOT_DECLINED',
    'USER_CALL_SLOT_CANCELLED',
    'COOK_CALL_SLOT_CANCELLED',
    'USER_CALL_STARTED',
    'COOK_CALL_STARTED',
    'ADMIN_CALL_STARTED',
] as const;
export type BookingRequestOfferEventType = (typeof bookingRequestOfferEventTypes)[number];

/**
 * Ops-only timeline milestones written by admin offer tools. Stored for every offer but
 * projected into `messages` only for admin viewers — peer chat keeps existing public admin
 * milestones (handover, amendments, preparations, call start, admin messages).
 */
export const bookingRequestOfferEventTypesAdminOnly = [
    'ADMIN_CHANGED_PRICE',
    'ADMIN_ACCEPTANCE_UPDATED',
    'ADMIN_PAYMENT_SCHEDULE_UPDATED',
    'ADMIN_CONFIGURED_MENU_UPDATED',
] as const satisfies ReadonlyArray<BookingRequestOfferEventType>;
export type BookingRequestOfferEventTypeAdminOnly = (typeof bookingRequestOfferEventTypesAdminOnly)[number];
export const bookingRequestOfferEventTypeAdminOnlySet: ReadonlySet<BookingRequestOfferEventType> = new Set(
    bookingRequestOfferEventTypesAdminOnly,
);

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
    // `hiddenByAdmin` soft-hides the bubble from customer/cook (admin still sees it).
    USER_MESSAGE_SIMPLE: {
        messageBody: string;
        mediaUrls?: string[];
        originalCreatedAt?: string;
        handedOverFrom?: {
            cookId: string;
            cookDisplayName: string;
            sourceEventId: string;
        };
        hiddenByAdmin?: boolean;
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
        hiddenByAdmin?: boolean;
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
        hiddenByAdmin?: boolean;
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
    USER_PARTICIPANT_AMENDMENT_REQUESTED: {
        participantsAdultBefore: number;
        participantsDiscountedBefore: number;
        participantsAdultAfter: number;
        participantsDiscountedAfter: number;
        locationBefore?: BookingRequestExactEventAddress;
        locationAfter?: BookingRequestExactEventAddress;
        menuPriceCentsBefore: number;
        menuPriceCentsAfter: number;
        travelExpensesCentsBefore?: number;
        travelExpensesCentsAfter?: number;
        totalCentsCustomerBefore: number;
        totalCentsCustomerAfter: number;
        payoutCentsCookBefore: number;
        payoutCentsCookAfter: number;
        giftCardDeltaCents?: number;
    };
    ADMIN_PARTICIPANT_AMENDMENT_REQUESTED: {
        participantsAdultBefore: number;
        participantsDiscountedBefore: number;
        participantsAdultAfter: number;
        participantsDiscountedAfter: number;
        locationBefore?: BookingRequestExactEventAddress;
        locationAfter?: BookingRequestExactEventAddress;
        menuPriceCentsBefore: number;
        menuPriceCentsAfter: number;
        travelExpensesCentsBefore?: number;
        travelExpensesCentsAfter?: number;
        totalCentsCustomerBefore: number;
        totalCentsCustomerAfter: number;
        payoutCentsCookBefore: number;
        payoutCentsCookAfter: number;
        giftCardDeltaCents?: number;
    };
    COOK_PARTICIPANT_AMENDMENT_ACCEPTED: {
        participantsAdultBefore: number;
        participantsDiscountedBefore: number;
        participantsAdultAfter: number;
        participantsDiscountedAfter: number;
        locationBefore?: BookingRequestExactEventAddress;
        locationAfter?: BookingRequestExactEventAddress;
        menuPriceCentsBefore: number;
        menuPriceCentsAfter: number;
        travelExpensesCentsBefore?: number;
        travelExpensesCentsAfter?: number;
        totalCentsCustomerBefore: number;
        totalCentsCustomerAfter: number;
        payoutCentsCookBefore: number;
        payoutCentsCookAfter: number;
        customerDeltaCents: number;
        cookPayoutDeltaCents: number;
        giftCardDeltaCents?: number;
    };
    ADMIN_PARTICIPANT_AMENDMENT_APPLIED: {
        participantsAdultBefore: number;
        participantsDiscountedBefore: number;
        participantsAdultAfter: number;
        participantsDiscountedAfter: number;
        locationBefore?: BookingRequestExactEventAddress;
        locationAfter?: BookingRequestExactEventAddress;
        menuPriceCentsBefore: number;
        menuPriceCentsAfter: number;
        travelExpensesCentsBefore?: number;
        travelExpensesCentsAfter?: number;
        totalCentsCustomerBefore: number;
        totalCentsCustomerAfter: number;
        payoutCentsCookBefore: number;
        payoutCentsCookAfter: number;
        customerDeltaCents: number;
        cookPayoutDeltaCents: number;
        giftCardDeltaCents?: number;
    };
    USER_PARTICIPANT_AMENDMENT_CANCELED: Record<string, never>;
    COOK_PARTICIPANT_AMENDMENT_DECLINED: {
        participantsAdultBefore: number;
        participantsDiscountedBefore: number;
        participantsAdultAfter: number;
        participantsDiscountedAfter: number;
    };
    COOK_PREPARATIONS_COMPLETED: Record<string, never>;
    ADMIN_PREPARATIONS_CLEARED: Record<string, never>;
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
    ADMIN_CHANGED_PRICE: {
        priceBefore: BookingRequestOfferPriceSnapshot;
        priceAfter: BookingRequestOfferPriceSnapshot;
    };
    ADMIN_ACCEPTANCE_UPDATED: {
        userAcceptedBefore: boolean | null;
        userAcceptedAfter: boolean | null;
        cookAcceptedBefore: boolean | null;
        cookAcceptedAfter: boolean | null;
    };
    ADMIN_PAYMENT_SCHEDULE_UPDATED: {
        paymentStatusBefore: BookingRequestOfferPaymentStatus;
        paymentStatusAfter: BookingRequestOfferPaymentStatus;
        paymentDateTimeBefore: string | null;
        paymentDateTimeAfter: string | null;
        plannedPayoutDateTimeBefore: string | null;
        plannedPayoutDateTimeAfter: string | null;
        payoutDateTimeBefore: string | null;
        payoutDateTimeAfter: string | null;
    };
    ADMIN_CONFIGURED_MENU_UPDATED: Record<string, never>;
    SYSTEM_PAYMENT_SETUP: {
        amountCents: number;
    };
    SYSTEM_PAYMENT_SUCCEEDED: {
        amountCents: number;
        source: 'CHECKOUT' | 'PULL' | 'ACCEPT_ZERO' | 'AMENDMENT';
    };
    SYSTEM_PAYMENT_FAILED: {
        source: 'WEBHOOK' | 'PULL';
        detail?: string;
    };
    ADMIN_PAYOUT_RELEASED: {
        amountCents: number;
        source: 'RELEASE' | 'ALREADY_TOOK_PLACE';
    };
    ADMIN_PAYED_OUT_OF_SYSTEM: {
        amountCents: number;
        source: 'MARK_OUT_OF_SYSTEM' | 'ADMIN_DUAL_ACCEPT' | 'ADMIN_OFFER_CREATE';
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
    USER_CALL_STARTED: {
        bookingRequestOfferCallRoomId: string;
    };
    COOK_CALL_STARTED: {
        bookingRequestOfferCallRoomId: string;
    };
    ADMIN_CALL_STARTED: {
        bookingRequestOfferCallRoomId: string;
    };
};

export type BookingRequestOfferEventPayload = BookingRequestOfferEventPayloadByType[BookingRequestOfferEventType];
