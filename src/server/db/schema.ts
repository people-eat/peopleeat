import { sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import {
    boolean,
    customType,
    date,
    doublePrecision,
    foreignKey,
    index,
    integer,
    jsonb,
    pgTable,
    primaryKey,
    smallint,
    text,
    timestamp,
    unique,
    uniqueIndex,
    varchar,
} from 'drizzle-orm/pg-core';

import type { ContentSection } from '../../shared/contentSection';
import type { FeatureToggleKey } from '../../shared/featureToggle';
import { NANO_ID_LENGTH } from '../../shared/idCreate';

import type { Locale } from '../../shared/locale';
import { occasionFormatsSectionEmpty } from '../../shared/occasionFormatsSection';
import type { OccasionFormatsSection } from '../../shared/occasionFormatsSection';
import type { WebPageKey } from '../../shared/webPage';
import type { AiGenerationKind } from '../domain/aiGeneration';
import type {
    BookingRequestCookMenuEvaluation,
    BookingRequestExactEventAddress,
    BookingRequestInvoiceAddress,
    BookingRequestOfferCallRecordingStatus,
    BookingRequestOfferCallRoomStatus,
    BookingRequestOfferCallTranscriptSegment,
    BookingRequestOfferChatReactorRole,
    BookingRequestOfferConfiguredMenu,
    BookingRequestOfferEventPayload,
    BookingRequestOfferEventType,
    BookingRequestOfferParticipantAmendment,
    BookingRequestOfferPaymentData,
    BookingRequestOfferPaymentStatus,
    BookingRequestOfferPriceAutoAdjustReason,
    BookingRequestParticipantType,
    BookingRequestPriceClassType,
    BookingRequestPublicationStatus,
    BookingRequestReferences,
    CookCallSlotBookingActor,
    CookCallSlotBookingStatus,
} from '../domain/bookingRequest';
import type { ChatSurface } from '../domain/chatMessage';
import type { ChatMessageBody, ChatMessageRole, ChatMessageStatus, ChatTurnStatus, ChatTurnUsage } from '../domain/chatMessageBody';
import type { CookCallAvailabilityExceptionType, CookTravelOriginAddress } from '../domain/cook';
import type { GiftCardInvoiceAddress, GiftCardPaymentStatus } from '../domain/giftCard';
import type { NewsletterSubscriptionSource } from '../domain/newsletterSubscription';
import type { OutboundEmailProvider, OutboundEmailPurpose, OutboundEmailRelatedEntityType } from '../domain/outboundEmail';
import type { SessionGeoInformation } from '../domain/session';
import type { SessionEventKey, SessionEventPayloadByKey } from '../domain/sessionEvent';
import type { SupportRequestReferences, SupportRequestStatus } from '../domain/supportRequest';
import type { CookTestimonialLowRatingAnswers, TestimonialPublicationStatus, TestimonialType } from '../domain/testimonial';
import type { UserPreferredCommunication, UserStatus } from '../domain/user';
import type {
    OutboundWhatsAppProvider,
    OutboundWhatsAppPurpose,
    OutboundWhatsAppRelatedEntityType,
    WhatsAppMessageDirection,
    WhatsAppMessageKind,
} from '../domain/whatsapp';

/** Entity PK/FK column — 20-char URL-safe nanoId. */
function nanoId() {
    return varchar({ length: NANO_ID_LENGTH });
}

// Drizzle has no first-class `bytea` builder; the `customType` helper wraps
// `bytea` so the column round-trips as a Node `Buffer` on read and accepts
// `Buffer | Uint8Array` on write. Used by `fileUploads.bytes`.
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
    dataType() {
        return 'bytea';
    },
});

export const sessions = pgTable(
    'Sessions',
    {
        sessionId: nanoId().primaryKey(),
        userId: nanoId(),
        // Import-preserved prior-session link (runtime no longer writes this).
        previousSessionId: nanoId(),
        lastInteractionAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        wasTerminatedAt: timestamp({ withTimezone: true }),
        connectionActive: boolean().notNull().default(false),
        userAgent: varchar(),
        // `ipHash` is `SHA256(VISITOR_IP_HASH_SALT + ":" + clientIp)`, computed
        // on every session upsert by `sessionUpsert`. Nullable because local
        // dev / unproxied requests have no resolvable IP (see
        // `clientIpFromRequest`). See docs/architecture/authentication.md.
        ipHash: varchar(),
        // First-touch attribution: stamped only on create from the request
        // `Referer` header (SSR loaders forward the browser page Referer into
        // `/api/graphql`). Never overwritten on later upserts.
        referrer: varchar(),
        // First path the visitor hit (`x-landing-path` from the SSR route
        // loader). Same sticky-on-create rule as `referrer`.
        landingPath: varchar(),
        // Import-preserved geo blob (runtime no longer writes this).
        geoInformation: jsonb().$type<SessionGeoInformation>(),
        // Derived from `userAgent` via `isbot` on every upsert so bot vs human
        // classification stays current if the UA string changes.
        isBot: boolean().notNull().default(false),
        // Ephemeral gift-card purchase UX error (e.g. reCAPTCHA failure). Cleared
        // on the next successful `giftCardCreate`. Surfaced on `Session` via
        // `sessionUpdates` — mutations return `MutationResult` only.
        giftCardPurchaseError: varchar().$type<'RECAPTCHA_FAILED'>(),
        // TOTP second-factor pending after primary auth (email OTP / passkey).
        // Session stays unbound (`userId` null) until `authTotpVerify`.
        // See docs/architecture/authentication.md.
        pendingTotpUserId: nanoId(),
        pendingTotpExpiresAt: timestamp({ withTimezone: true }),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.pendingTotpUserId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        index('Sessions_ipHash_idx').on(table.ipHash),
        index('Sessions_createdAt_idx').on(table.createdAt),
        index('Sessions_pendingTotpUserId_idx').on(table.pendingTotpUserId),
    ],
);

export type SessionCreate = typeof sessions.$inferInsert;
export type Session = typeof sessions.$inferSelect;

// Per-session marketing-cookie consent (GA + Clarity). Absence of a row means
// undecided — the cookie banner is shown. See docs/features/cookie-consent.md.
export const cookieSettings = pgTable(
    'CookieSettings',
    {
        sessionId: nanoId().primaryKey(),
        googleAnalytics: boolean().notNull(),
        clarity: boolean().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.sessionId],
            foreignColumns: [sessions.sessionId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
    ],
);

export type CookieSettingCreate = typeof cookieSettings.$inferInsert;
export type CookieSetting = typeof cookieSettings.$inferSelect;

// First-party product analytics events scoped to a browser session.
// Typed insert path: `sessionEventCreate`. See docs/architecture/session-events.md.
export const sessionEvents = pgTable(
    'SessionEvents',
    {
        sessionEventId: nanoId().primaryKey(),
        sessionId: nanoId().notNull(),
        type: varchar().$type<SessionEventKey>().notNull(),
        payload: jsonb().$type<SessionEventPayloadByKey[SessionEventKey]>().notNull(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.sessionId],
            foreignColumns: [sessions.sessionId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('SessionEvents_sessionId_createdAt_idx').on(table.sessionId, table.createdAt),
        index('SessionEvents_type_createdAt_idx').on(table.type, table.createdAt),
        // Admin visit time-buckets filter WEB_PAGE_VISITED by payload webPageKey +
        // createdAt range — see adminSessionEventWebPageVisitCreationsFindMany.
        index('SessionEvents_webPageVisit_webPageKey_createdAt_idx')
            .using('btree', sql`(${table.payload}->>'webPageKey')`, table.createdAt)
            .where(sql`${table.type} = 'WEB_PAGE_VISITED'`),
        // Cook analytics: public chef detail visits by params.cookId + createdAt.
        index('SessionEvents_webPageVisit_chefs_cookId_createdAt_idx')
            .using('btree', sql`(${table.payload}->'params'->>'cookId')`, table.createdAt)
            .where(sql`${table.type} = 'WEB_PAGE_VISITED' AND ${table.payload}->>'webPageKey' = 'CHEFS'`),
    ],
);

export type SessionEventCreate = typeof sessionEvents.$inferInsert;
export type SessionEvent = typeof sessionEvents.$inferSelect;

// Session-owned gift-card purchases. One `PREPARED` row per session is upserted
// by `giftCardCreate`; `giftCardPay` flips it to `PAYED`. Unpaid rows are
// removed by the `giftCardPreparedExpire` job (+15 min). See
// `docs/features/gift-card-purchase.md`.
export const giftCards = pgTable(
    'GiftCards',
    {
        giftCardId: nanoId().primaryKey(),
        sessionId: nanoId().notNull(),
        buyerUserId: nanoId(),
        buyerEmail: varchar().notNull(),
        // Buyer UI locale at purchase time — drives the redeem-code email (and
        // future tracked outbound mail). Set from `GiftCardCreate.locale`.
        locale: varchar().$type<Locale>().notNull(),
        occasion: varchar().notNull(),
        // Single display name for the recipient (couples / families welcome).
        recipientName: varchar().notNull(),
        message: varchar().notNull(),
        originalBalanceCents: integer().notNull(),
        balanceCents: integer().notNull(),
        redeemCode: varchar().notNull(),
        paymentIntentId: varchar().notNull(),
        paymentClientSecret: varchar().notNull(),
        paymentStatus: varchar().$type<GiftCardPaymentStatus>().notNull().default('PREPARED'),
        invoiceAddress: jsonb().$type<GiftCardInvoiceAddress>(),
        // Purchase-receipt PDF generated at pay time via Playwright. Nullable
        // until pay succeeds (or when capture soft-fails). References
        // `FileUploads` via a lazy callback — `fileUploads` is declared later
        // in this module. See `docs/features/gift-card-purchase.md`.
        invoiceFileUploadId: nanoId().references((): AnyPgColumn => fileUploads.fileUploadId, {
            onUpdate: 'cascade',
            onDelete: 'set null',
        }),
        // Printable / sharable gift-card voucher PDF (no payment info). Nullable
        // until pay succeeds (or when capture soft-fails).
        voucherFileUploadId: nanoId().references((): AnyPgColumn => fileUploads.fileUploadId, {
            onUpdate: 'cascade',
            onDelete: 'set null',
        }),
        cleanupJobId: varchar(),
        expiresAt: timestamp({ withTimezone: true }).notNull(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.sessionId],
            foreignColumns: [sessions.sessionId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.buyerUserId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        uniqueIndex('GiftCards_redeemCode_uidx').on(table.redeemCode),
        // At most one in-flight checkout per session.
        uniqueIndex('GiftCards_sessionId_prepared_uidx')
            .on(table.sessionId)
            .where(sql`${table.paymentStatus} = 'PREPARED'`),
        index('GiftCards_sessionId_idx').on(table.sessionId),
        index('GiftCards_buyerUserId_idx').on(table.buyerUserId),
        index('GiftCards_paymentStatus_idx').on(table.paymentStatus),
        index('GiftCards_createdAt_idx').on(table.createdAt),
        index('GiftCards_invoiceFileUploadId_idx').on(table.invoiceFileUploadId),
        index('GiftCards_voucherFileUploadId_idx').on(table.voucherFileUploadId),
    ],
);

export type GiftCardCreate = typeof giftCards.$inferInsert;
export type GiftCard = typeof giftCards.$inferSelect;

// Admin-created (global) and churn (booking-scoped) discount codes. Catalog
// row; `BookingRequests.promoCodeId` is the apply FK. Optional
// `bookingRequestId` scopes redemption to one request (churn win-back).
export const promoCodes = pgTable(
    'PromoCodes',
    {
        promoCodeId: nanoId().primaryKey(),
        redeemCode: varchar().notNull(),
        amountCents: integer().notNull(),
        minimumTotalAmountCustomerCents: integer(),
        // Lazy ref — BookingRequests is defined later; circular with apply FK.
        bookingRequestId: nanoId().references((): AnyPgColumn => bookingRequests.bookingRequestId, {
            onUpdate: 'cascade',
            onDelete: 'set null',
        }),
        expiresAt: timestamp({ withTimezone: true }).notNull(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex('PromoCodes_redeemCode_uidx').on(table.redeemCode),
        // One scoped churn code per booking request (NULLs allowed many times).
        uniqueIndex('PromoCodes_bookingRequestId_uidx').on(table.bookingRequestId),
        index('PromoCodes_createdAt_idx').on(table.createdAt),
        index('PromoCodes_expiresAt_idx').on(table.expiresAt),
    ],
);

export type PromoCodeCreate = typeof promoCodes.$inferInsert;
export type PromoCode = typeof promoCodes.$inferSelect;

export const logs = pgTable(
    'Logs',
    {
        logId: nanoId().primaryKey(),
        sessionId: nanoId(),
        level: varchar().notNull(),
        message: varchar().notNull(),
        context: jsonb(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.sessionId],
            foreignColumns: [sessions.sessionId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        index('Logs_createdAt_idx').on(table.createdAt),
    ],
);

export type Log = typeof logs.$inferSelect;
export type LogCreate = typeof logs.$inferInsert;

export const users = pgTable(
    'Users',
    {
        userId: nanoId().primaryKey(),
        // Null after anonymization (`status = 'ANONYMIZED'`). Active users always
        // have an address. Null is the explicit "do not email" signal for jobs.
        // See docs/features/account.md.
        emailAddress: varchar(),
        // Prior addresses archived on email-change verify. Admin-only via
        // AdminUser — never on public User. Cleared on anonymization.
        previousEmailAddresses: jsonb().$type<string[]>().notNull().default([]),
        firstName: varchar().notNull(),
        lastName: varchar().notNull(),
        status: varchar().$type<UserStatus>().notNull().default('ACTIVE'),
        phoneNumber: varchar(),
        // Import-preserved bcrypt hash. Unused at runtime (OTP / passkeys / TOTP).
        // Kept so email+password can be re-enabled later without recovering hashes.
        legacyPasswordHash: varchar(),
        adminNote: text().notNull().default(''),
        birthDate: date({ mode: 'string' }),
        preferredCommunication: varchar().$type<UserPreferredCommunication>(),
        // Profile language for UI mismatch gating and outbound transactional
        // email. Self-registration stamps the UI locale; default `de` for
        // admin-created / backfilled rows. See docs/architecture/i18n.md.
        locale: varchar().$type<Locale>().notNull().default('de'),
        // IANA zone for date/time display and cook call wall-clock. Signup
        // stamps the browser zone; default `Europe/Berlin` for admin-created /
        // backfilled rows. See docs/architecture/i18n.md.
        timeZone: varchar().notNull().default('Europe/Berlin'),
        // Wall-clock acceptance of the then-current published privacy /
        // terms. Null for admin-created users (and until first accept).
        // Self-registration stamps both to `now()`. Gate compares these to
        // the latest published `publishedAt` — see docs/features/admin-legal.md.
        lastAcceptedPrivacyPolicy: timestamp({ withTimezone: true }),
        lastAcceptedTerms: timestamp({ withTimezone: true }),
        // Profile picture — FileUploads row owned by this user. FK is in the
        // SQL migration only (circular with FileUploads.userId → Users). See
        // docs/architecture/file-storage.md and docs/features/profile-pictures.md.
        profilePictureFileUploadId: nanoId(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex('Users_emailAddress_uidx').on(table.emailAddress),
        uniqueIndex('Users_phoneNumber_uidx').on(table.phoneNumber),
        index('Users_profilePictureFileUploadId_idx').on(table.profilePictureFileUploadId),
        index('Users_createdAt_idx').on(table.createdAt),
    ],
);

export type User = typeof users.$inferSelect;
export type UserCreate = typeof users.$inferInsert;

// Admin membership is a 1:1 extension of `Users`: presence of a row whose
// `adminId` equals `Users.userId` means the user is an admin. The PK is also
// the FK, so a user can appear at most once. The `User.admin` resolver and
// `Mutation.admin` `guardAdminMutation` gate both check for a matching row.
// Grant access with `INSERT INTO "Admins" ("adminId") VALUES (…)` (or
// equivalent); revoke by deleting the row. See
// `docs/architecture/authorization-admin.md`.
export const admins = pgTable(
    'Admins',
    {
        adminId: nanoId().primaryKey(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.adminId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
    ],
);

export type Admin = typeof admins.$inferSelect;
export type AdminCreate = typeof admins.$inferInsert;

// Cook membership mirrors `Admins`: a 1:1 extension of `Users` keyed by
// `cookId` = `Users.userId`. Presence of the row means the user is a cook.
// Profile / travel / Stripe columns — see docs/features/cook-profile.md.
export const cooks = pgTable(
    'Cooks',
    {
        cookId: nanoId().primaryKey(),
        isVisible: boolean().notNull().default(false),
        isApprovedByAdmin: boolean().notNull().default(false),
        // Optional public display name; when set, public surfaces prefer it over firstName.
        stageName: varchar(),
        exactTravelOriginAddress: jsonb().$type<CookTravelOriginAddress>(),
        biography: text().notNull().default(''),
        biographySummary: text().notNull().default(''),
        // Landscape brand mark on the public chef About section. Null → marketing
        // benefits fallback. See docs/features/cook-profile.md.
        logoFileUploadId: nanoId().references((): AnyPgColumn => fileUploads.fileUploadId, {
            onUpdate: 'cascade',
            onDelete: 'set null',
        }),
        cuisineStyle: varchar(),
        cookingPhilosophy: varchar(),
        travelExpensesAmount: integer().notNull().default(25),
        maximumTravelDistance: integer(),
        minimumPriceAmount: integer(),
        maximumPriceAmount: integer(),
        minimumParticipants: integer(),
        maximumParticipants: integer(),
        callSchedulingEnabled: boolean().notNull().default(false),
        callDurationMinutes: integer().notNull().default(30),
        stripeAccountId: varchar(),
        stripeAccountActive: boolean().notNull().default(false),
        stripeAccountActiveWasReset: boolean().notNull().default(false),
        // Import-preserved city/geo. `legacyCityName` falls back for public cook
        // city when `exactTravelOriginAddress.city` is empty; lat/lng stay
        // storage-only (not used for travel radius).
        legacyCityName: varchar(),
        legacyLatitude: doublePrecision(),
        legacyLongitude: doublePrecision(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        lastModifiedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.cookId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('Cooks_isApprovedByAdmin_idx').on(table.isApprovedByAdmin),
        index('Cooks_logoFileUploadId_idx').on(table.logoFileUploadId),
    ],
);

export type Cook = typeof cooks.$inferSelect;

export type CookCreate = typeof cooks.$inferInsert;

// Recurring weekly windows for cook discovery calls. `dayOfWeek` matches
// JS `Date.getDay()` (0 = Sunday … 6 = Saturday). Minutes are inclusive start /
// exclusive end after local midnight (0…1440). See docs/features/cook-call-availability.md.
export const cookCallAvailabilityRules = pgTable(
    'CookCallAvailabilityRules',
    {
        cookCallAvailabilityRuleId: nanoId().primaryKey(),
        cookId: nanoId().notNull(),
        dayOfWeek: smallint().notNull(),
        startMinuteOfDay: integer().notNull(),
        endMinuteOfDay: integer().notNull(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.cookId],
            foreignColumns: [cooks.cookId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('CookCallAvailabilityRules_cookId_idx').on(table.cookId),
    ],
);

export type CookCallAvailabilityRule = typeof cookCallAvailabilityRules.$inferSelect;
export type CookCallAvailabilityRuleCreate = typeof cookCallAvailabilityRules.$inferInsert;

// Per-date overrides for cook call availability. Null start/end = whole day.
// BLOCK removes a window; OPEN adds an ad-hoc window. See cook-call-availability.md.
export const cookCallAvailabilityExceptions = pgTable(
    'CookCallAvailabilityExceptions',
    {
        cookCallAvailabilityExceptionId: nanoId().primaryKey(),
        cookId: nanoId().notNull(),
        date: date({ mode: 'string' }).notNull(),
        type: varchar().$type<CookCallAvailabilityExceptionType>().notNull(),
        startMinuteOfDay: integer(),
        endMinuteOfDay: integer(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.cookId],
            foreignColumns: [cooks.cookId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('CookCallAvailabilityExceptions_cookId_idx').on(table.cookId),
        index('CookCallAvailabilityExceptions_cookId_date_idx').on(table.cookId, table.date),
    ],
);

export type CookCallAvailabilityException = typeof cookCallAvailabilityExceptions.$inferSelect;
export type CookCallAvailabilityExceptionCreate = typeof cookCallAvailabilityExceptions.$inferInsert;

// Cook-owned meals. `publishedAt` null = draft; `deletedAt` set = soft-deleted
// (hidden from cook GraphQL; still visible to admins). See docs/features/cook-meals.md.
export const meals = pgTable(
    'Meals',
    {
        mealId: nanoId().primaryKey(),
        cookId: nanoId().notNull(),
        title: varchar().notNull(),
        description: text().notNull(),
        // Lazy callback — `fileUploads` is declared later in this module.
        imageFileUploadId: nanoId().references((): AnyPgColumn => fileUploads.fileUploadId, {
            onUpdate: 'cascade',
            onDelete: 'set null',
        }),
        publishedAt: timestamp({ withTimezone: true }),
        deletedAt: timestamp({ withTimezone: true }),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.cookId],
            foreignColumns: [cooks.cookId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('Meals_cookId_idx').on(table.cookId),
        index('Meals_publishedAt_idx').on(table.publishedAt),
        index('Meals_deletedAt_idx').on(table.deletedAt),
    ],
);

export type Meal = typeof meals.$inferSelect;
export type MealCreate = typeof meals.$inferInsert;

// Cook-owned menus (courses + meal options). `publishedAt` null = draft;
// `deletedAt` set = soft-deleted (hidden from cook GraphQL; still visible to
// admins). Offer-scoped copies set `bookingRequestOfferId` (+ optional
// `copyOfMenuId` pointing at the cook inventory source). See
// docs/features/cook-menus.md and docs/architecture/booking.md.
export const menus = pgTable(
    'Menus',
    {
        menuId: nanoId().primaryKey(),
        cookId: nanoId().notNull(),
        // Lazy — `bookingRequestOffers` is declared later in this module.
        bookingRequestOfferId: nanoId().references((): AnyPgColumn => bookingRequestOffers.bookingRequestOfferId, {
            onUpdate: 'cascade',
            onDelete: 'cascade',
        }),
        // Inventory menu this row was copied from when attached to an offer.
        copyOfMenuId: nanoId().references((): AnyPgColumn => menus.menuId, {
            onUpdate: 'cascade',
            onDelete: 'set null',
        }),
        title: varchar().notNull(),
        description: text().notNull(),
        publishedAt: timestamp({ withTimezone: true }),
        deletedAt: timestamp({ withTimezone: true }),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.cookId],
            foreignColumns: [cooks.cookId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('Menus_cookId_idx').on(table.cookId),
        index('Menus_publishedAt_idx').on(table.publishedAt),
        index('Menus_deletedAt_idx').on(table.deletedAt),
        index('Menus_bookingRequestOfferId_idx').on(table.bookingRequestOfferId),
        index('Menus_copyOfMenuId_idx').on(table.copyOfMenuId),
    ],
);

export type Menu = typeof menus.$inferSelect;
export type MenuCreate = typeof menus.$inferInsert;

export const menuCourses = pgTable(
    'MenuCourses',
    {
        courseId: nanoId().primaryKey(),
        menuId: nanoId().notNull(),
        cookId: nanoId().notNull(),
        index: integer().notNull(),
        title: varchar().notNull(),
        // Null = single-select. Only meaningful when the course has 2+ meal
        // options; clamped to option count on write.
        mealSelectionLimit: integer(),
    },
    (table) => [
        foreignKey({
            columns: [table.menuId],
            foreignColumns: [menus.menuId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.cookId],
            foreignColumns: [cooks.cookId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('MenuCourses_menuId_idx').on(table.menuId),
        index('MenuCourses_cookId_idx').on(table.cookId),
    ],
);

export type MenuCourse = typeof menuCourses.$inferSelect;
export type MenuCourseCreate = typeof menuCourses.$inferInsert;

export const menuCourseMealOptions = pgTable(
    'MenuCourseMealOptions',
    {
        mealOptionId: nanoId().primaryKey(),
        courseId: nanoId().notNull(),
        cookId: nanoId().notNull(),
        mealId: nanoId().notNull(),
        index: integer().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.courseId],
            foreignColumns: [menuCourses.courseId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.mealId],
            foreignColumns: [meals.mealId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.cookId],
            foreignColumns: [cooks.cookId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('MenuCourseMealOptions_courseId_idx').on(table.courseId),
        index('MenuCourseMealOptions_mealId_idx').on(table.mealId),
        index('MenuCourseMealOptions_cookId_idx').on(table.cookId),
    ],
);

export type MenuCourseMealOption = typeof menuCourseMealOptions.$inferSelect;
export type MenuCourseMealOptionCreate = typeof menuCourseMealOptions.$inferInsert;

// Append-only versioned legal documents (privacy / terms / imprint). Draft
// rows have `publishedAt` null and are mutable; publishing stamps
// `publishedAt` and freezes the row. At most one draft per table is enforced
// in commands. German-only body today (`bodyDe` / `changeSummaryDe`); more
// locales can add `*En` later. See docs/features/admin-legal.md.

export const adminLegalPrivacyPolicies = pgTable('AdminLegalPrivacyPolicies', {
    privacyPolicyId: nanoId().primaryKey(),
    bodyDe: text().notNull(),
    changeSummaryDe: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    publishedAt: timestamp({ withTimezone: true }),
});

export type AdminLegalPrivacyPolicy = typeof adminLegalPrivacyPolicies.$inferSelect;
export type AdminLegalPrivacyPolicyCreate = typeof adminLegalPrivacyPolicies.$inferInsert;

export const adminLegalTermsAndConditions = pgTable('AdminLegalTermsAndConditions', {
    termsAndConditionsId: nanoId().primaryKey(),
    bodyDe: text().notNull(),
    changeSummaryDe: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    publishedAt: timestamp({ withTimezone: true }),
});

export type AdminLegalTermsAndConditions = typeof adminLegalTermsAndConditions.$inferSelect;
export type AdminLegalTermsAndConditionsCreate = typeof adminLegalTermsAndConditions.$inferInsert;

export const adminLegalImprints = pgTable('AdminLegalImprints', {
    imprintId: nanoId().primaryKey(),
    bodyDe: text().notNull(),
    changeSummaryDe: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    publishedAt: timestamp({ withTimezone: true }),
});

export type AdminLegalImprint = typeof adminLegalImprints.$inferSelect;
export type AdminLegalImprintCreate = typeof adminLegalImprints.$inferInsert;

// --- Chat ---------------------------------------------------------------------
//
// Durable turn + parts model for AI assistant chats. See
// docs/architecture/chat-persistence.md. Human offer/support threads stay on
// their own domain tables and are not stored here.
//
// Chats → ChatTurns → ChatMessages (one user + one assistant per turn).
// Message bodies are application-owned JSONB parts (`ChatMessageBody`).

// Assistant chats are owned by a user and scoped to a surface (admin /
// customer / cook rail). Pre-ownership rows may have nulls until backfill;
// new inserts always stamp both. `deletedAt` set = soft-deleted (hidden from
// owner GraphQL; still visible to admin inspect).
export const chats = pgTable(
    'Chats',
    {
        chatId: nanoId().primaryKey(),
        userId: nanoId(),
        surface: varchar().$type<ChatSurface>(),
        title: varchar().notNull().default(''),
        deletedAt: timestamp({ withTimezone: true }),
        lastModifiedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('Chats_userId_lastModifiedAt_idx').on(table.userId, table.lastModifiedAt),
        index('Chats_userId_surface_lastModifiedAt_idx').on(table.userId, table.surface, table.lastModifiedAt),
        index('Chats_deletedAt_idx').on(table.deletedAt),
        index('Chats_createdAt_idx').on(table.createdAt),
    ],
);

export type Chat = typeof chats.$inferSelect;
export type ChatCreate = typeof chats.$inferInsert;

export const chatTurns = pgTable(
    'ChatTurns',
    {
        chatTurnId: nanoId().primaryKey(),
        chatId: nanoId().notNull(),
        clientRequestId: nanoId().notNull(),
        sequence: integer().generatedAlwaysAsIdentity(),
        status: varchar().$type<ChatTurnStatus>().notNull().default('queued'),
        revision: integer().notNull().default(0),
        locale: varchar().$type<Locale>(),
        agentName: varchar(),
        modelId: varchar(),
        finishReason: varchar(),
        usage: jsonb().$type<ChatTurnUsage>(),
        failureCode: varchar(),
        startedAt: timestamp({ withTimezone: true }),
        completedAt: timestamp({ withTimezone: true }),
        lastModifiedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.chatId],
            foreignColumns: [chats.chatId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('ChatTurns_chatId_sequence_idx').on(table.chatId, table.sequence),
        unique('ChatTurns_clientRequestId_unique').on(table.clientRequestId),
        // At most one non-terminal turn per chat (queued | running | awaitingInput).
        uniqueIndex('ChatTurns_chatId_active_unique')
            .on(table.chatId)
            .where(sql`${table.status} in ('queued', 'running', 'awaitingInput')`),
    ],
);

export type ChatTurn = typeof chatTurns.$inferSelect;
export type ChatTurnCreate = typeof chatTurns.$inferInsert;

export const chatMessages = pgTable(
    'ChatMessages',
    {
        chatMessageId: nanoId().primaryKey(),
        chatTurnId: nanoId().notNull(),
        role: varchar().$type<ChatMessageRole>().notNull(),
        status: varchar().$type<ChatMessageStatus>().notNull().default('pending'),
        revision: integer().notNull().default(0),
        body: jsonb().$type<ChatMessageBody>().notNull(),
        lastModifiedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.chatTurnId],
            foreignColumns: [chatTurns.chatTurnId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('ChatMessages_chatTurnId_idx').on(table.chatTurnId),
        unique('ChatMessages_chatTurnId_role_unique').on(table.chatTurnId, table.role),
    ],
);

export type ChatMessage = typeof chatMessages.$inferSelect;
export type ChatMessageCreate = typeof chatMessages.$inferInsert;

// --- File uploads -------------------------------------------------------------
//
// Bytes-in-Postgres for user-uploaded file blobs. Each row carries the original
// filename, IANA media type, byte length, and the raw payload. The bytes column
// uses `bytea` via `customType` (Drizzle has no first-class bytea builder).
// Storage location decision (Postgres vs. filesystem vs. object storage) is
// template-wide: see `docs/architecture/file-storage.md`. The store is
// consumer-agnostic — chat is its first consumer (via the
// `ChatMessageUserAttachments` join below), but other surfaces can reference
// `FileUploads.fileUploadId` directly. Per-consumer caps live at the upload
// route (`src/routes/api/file-uploads.ts` enforces 10 MB today) — the column
// itself is unbounded.
//
// `userId` is nullable for system-generated artifacts (e.g. gift-card purchase
// receipts for anonymous buyers). On user delete, rows with that `userId` cascade
// away; null-owner rows stay until their domain FK is cleared.

export const fileUploads = pgTable(
    'FileUploads',
    {
        fileUploadId: nanoId().primaryKey(),
        userId: nanoId(),
        filename: varchar().notNull(),
        mediaType: varchar().notNull(),
        size: integer().notNull(),
        bytes: bytea().notNull(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('FileUploads_userId_idx').on(table.userId),
    ],
);

export type FileUpload = typeof fileUploads.$inferSelect;
export type FileUploadCreate = typeof fileUploads.$inferInsert;

// Join row pinning file uploads to a user-authored assistant-chat message as
// "attachments". `position` is the user-visible order of attachments inside
// the message — preserved from the order the composer sent them so the
// rendered tile row matches what the user dragged in. On chat delete, the
// join rows cascade away but the underlying `FileUploads` row is preserved.
export const chatMessageUserAttachments = pgTable(
    'ChatMessageUserAttachments',
    {
        chatMessageId: nanoId().notNull(),
        fileUploadId: nanoId().notNull(),
        position: integer().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.chatMessageId],
            foreignColumns: [chatMessages.chatMessageId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.fileUploadId],
            foreignColumns: [fileUploads.fileUploadId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        uniqueIndex('ChatMessageUserAttachments_pk').on(table.chatMessageId, table.fileUploadId),
        index('ChatMessageUserAttachments_chatMessageId_idx').on(table.chatMessageId),
    ],
);

export type ChatMessageUserAttachment = typeof chatMessageUserAttachments.$inferSelect;
export type ChatMessageUserAttachmentCreate = typeof chatMessageUserAttachments.$inferInsert;

// --- Auth (email OTP + passkeys) ---------------------------------------------
//
// Passwordless log-on. At most one pending / verified email OTP is session-owned
// so the log-on UI can seed-and-subscribe via `sessionUpdates` and survive reloads.
// `verifiedAt` is the registration ticket for new emails (no Users row until
// `userCreate`). Passkeys belong to a user after first log-on. See
// `docs/architecture/authentication.md` and `docs/features/sign-in.md`.

export const authEmailOtps = pgTable(
    'AuthEmailOtps',
    {
        authEmailOtpId: nanoId().primaryKey(),
        sessionId: nanoId().notNull(),
        emailAddress: varchar().notNull(),
        codeHash: varchar().notNull(),
        // AES-GCM ciphertext of the plaintext code (key derived from AUTH_OTP_PEPPER)
        // so retries can send the same code again instead of minting a new one.
        codeEncrypted: varchar().notNull(),
        expiresAt: timestamp({ withTimezone: true }).notNull(),
        // Set when the code is proven for a new email (registration ticket).
        // Existing users consume the row instead (`consumedAt`) and bind the session.
        verifiedAt: timestamp({ withTimezone: true }),
        consumedAt: timestamp({ withTimezone: true }),
        // Soft-dismiss when the OTP dialog is closed. Row is kept so a retry for
        // the same email can send the same code again; excluded from Session.authEmailOtp.
        dismissedAt: timestamp({ withTimezone: true }),
        attemptCount: integer().notNull().default(0),
        // Last successful email send; drives the send cooldown.
        lastSentAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.sessionId],
            foreignColumns: [sessions.sessionId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('AuthEmailOtps_sessionId_idx').on(table.sessionId),
        index('AuthEmailOtps_emailAddress_createdAt_idx').on(table.emailAddress, table.createdAt),
    ],
);

export type AuthEmailOtp = typeof authEmailOtps.$inferSelect;
export type AuthEmailOtpCreate = typeof authEmailOtps.$inferInsert;

export const authPasskeys = pgTable(
    'AuthPasskeys',
    {
        authPasskeyId: nanoId().primaryKey(),
        userId: nanoId().notNull(),
        credentialId: varchar().notNull(),
        publicKey: bytea().notNull(),
        counter: integer().notNull(),
        transports: jsonb().$type<string[]>(),
        deviceType: varchar(),
        backedUp: boolean().notNull().default(false),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        uniqueIndex('AuthPasskeys_credentialId_uidx').on(table.credentialId),
        index('AuthPasskeys_userId_idx').on(table.userId),
    ],
);

export type AuthPasskey = typeof authPasskeys.$inferSelect;
export type AuthPasskeyCreate = typeof authPasskeys.$inferInsert;

export const authWebAuthnChallenges = pgTable(
    'AuthWebAuthnChallenges',
    {
        authWebAuthnChallengeId: nanoId().primaryKey(),
        challenge: varchar().notNull(),
        type: varchar().notNull(),
        sessionId: nanoId().notNull(),
        userId: nanoId(),
        expiresAt: timestamp({ withTimezone: true }).notNull(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.sessionId],
            foreignColumns: [sessions.sessionId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        uniqueIndex('AuthWebAuthnChallenges_challenge_uidx').on(table.challenge),
        index('AuthWebAuthnChallenges_sessionId_idx').on(table.sessionId),
    ],
);

export type AuthWebAuthnChallenge = typeof authWebAuthnChallenges.$inferSelect;
export type AuthWebAuthnChallengeCreate = typeof authWebAuthnChallenges.$inferInsert;

// TOTP authenticator (optional 2FA after primary auth). One row per user;
// `confirmedAt` null = pending enrollment. Recovery codes are hashed; plaintext
// is returned once on confirm. See docs/architecture/authentication.md.
export type AuthTotpRecoveryCode = {
    hash: string;
    consumedAt: string | null;
};

export const authTimeBasedOneTimePasswords = pgTable(
    'AuthTimeBasedOneTimePasswords',
    {
        authTimeBasedOneTimePasswordId: nanoId().primaryKey(),
        userId: nanoId().notNull(),
        secretEncrypted: varchar().notNull(),
        confirmedAt: timestamp({ withTimezone: true }),
        recoveryCodes: jsonb().$type<AuthTotpRecoveryCode[]>().notNull().default([]),
        lastUsedAt: timestamp({ withTimezone: true }),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        uniqueIndex('AuthTimeBasedOneTimePasswords_userId_uidx').on(table.userId),
    ],
);

export type AuthTimeBasedOneTimePassword = typeof authTimeBasedOneTimePasswords.$inferSelect;
export type AuthTimeBasedOneTimePasswordCreate = typeof authTimeBasedOneTimePasswords.$inferInsert;

// --- Outbound emails ----------------------------------------------------------
//
// One row per send attempt. Polymorphic `relatedEntityType` + `relatedEntityId`
// links the attempt to a domain subject (e.g. gift card) without per-entity FK
// columns. Recipient identity is snapshotted in `toEmail` and optionally
// `userId` so address changes do not break history. Provider lifecycle
// timestamps are first-write-wins (Resend webhooks). See
// `docs/features/outbound-emails.md`.

export const outboundEmails = pgTable(
    'OutboundEmails',
    {
        outboundEmailId: nanoId().primaryKey(),
        provider: varchar().$type<OutboundEmailProvider>().notNull(),
        providerMessageId: varchar(),
        purpose: varchar().$type<OutboundEmailPurpose>().notNull(),
        relatedEntityType: varchar().$type<OutboundEmailRelatedEntityType>(),
        relatedEntityId: nanoId(),
        userId: nanoId(),
        toEmail: varchar().notNull(),
        fromEmail: varchar(),
        subject: varchar().notNull(),
        locale: varchar().$type<Locale>().notNull(),
        failureReason: varchar(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        sentAt: timestamp({ withTimezone: true }),
        failedAt: timestamp({ withTimezone: true }),
        deliveredAt: timestamp({ withTimezone: true }),
        deliveryDelayedAt: timestamp({ withTimezone: true }),
        openedAt: timestamp({ withTimezone: true }),
        clickedAt: timestamp({ withTimezone: true }),
        bouncedAt: timestamp({ withTimezone: true }),
        complainedAt: timestamp({ withTimezone: true }),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        uniqueIndex('OutboundEmails_providerMessageId_uidx').on(table.providerMessageId),
        index('OutboundEmails_relatedEntity_idx').on(table.relatedEntityType, table.relatedEntityId),
        index('OutboundEmails_userId_createdAt_idx').on(table.userId, table.createdAt),
        index('OutboundEmails_toEmail_idx').on(table.toEmail),
        index('OutboundEmails_createdAt_idx').on(table.createdAt),
        index('OutboundEmails_purpose_idx').on(table.purpose),
    ],
);

export type OutboundEmail = typeof outboundEmails.$inferSelect;
export type OutboundEmailCreate = typeof outboundEmails.$inferInsert;

// Join row pinning file uploads to an outbound email send as attachments
// (e.g. gift-card purchase receipt PDF). `position` preserves send order.
// On outbound-email delete, join rows cascade; the underlying `FileUploads`
// row is preserved (gift cards may still reference it via
// `invoiceFileUploadId`).

export const outboundEmailAttachments = pgTable(
    'OutboundEmailAttachments',
    {
        outboundEmailId: nanoId().notNull(),
        fileUploadId: nanoId().notNull(),
        position: integer().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.outboundEmailId],
            foreignColumns: [outboundEmails.outboundEmailId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.fileUploadId],
            foreignColumns: [fileUploads.fileUploadId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        uniqueIndex('OutboundEmailAttachments_pk').on(table.outboundEmailId, table.fileUploadId),
        index('OutboundEmailAttachments_outboundEmailId_idx').on(table.outboundEmailId),
        index('OutboundEmailAttachments_fileUploadId_idx').on(table.fileUploadId),
    ],
);

export type OutboundEmailAttachment = typeof outboundEmailAttachments.$inferSelect;
export type OutboundEmailAttachmentCreate = typeof outboundEmailAttachments.$inferInsert;

// --- Content pages (cities / partners / occasions / blog) --------------------
//
// Shared bilingual section model lives in `src/shared/contentSection.ts` and is
// stored as jsonb on each entity. See docs/architecture/content-sections.md.

const contentPageColumns = {
    pathName: varchar().notNull(),
    previousPathNames: text().array().notNull().default([]),
    titleDe: varchar().notNull(),
    titleEn: varchar().notNull().default(''),
    descriptionDe: varchar().notNull(),
    descriptionEn: varchar().notNull().default(''),
    headlineDe: varchar().notNull(),
    headlineEn: varchar().notNull().default(''),
    subHeadlineDe: varchar().notNull(),
    subHeadlineEn: varchar().notNull().default(''),
    heroImageFileUploadId: nanoId(),
    sections: jsonb().$type<ContentSection[]>().notNull().default([]),
    publishedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
};

export const cities = pgTable(
    'Cities',
    {
        cityId: nanoId().primaryKey(),
        nameDe: varchar().notNull(),
        nameEn: varchar().notNull().default(''),
        // City center for cook travel-radius discovery on the public city page
        // and admin cook assignment candidates. Required on every city.
        latitude: doublePrecision().notNull(),
        longitude: doublePrecision().notNull(),
        ...contentPageColumns,
        // Fixed first-section slot above free content sections. See
        // docs/features/cities.md (ChefForAnyOccasion / CTA card).
        firstSectionHeadlineDe: varchar().notNull().default(''),
        firstSectionHeadlineEn: varchar().notNull().default(''),
        firstSectionBodyDe: text().notNull().default(''),
        firstSectionBodyEn: text().notNull().default(''),
        firstSectionImageFileUploadId: nanoId(),
    },
    (table) => [
        uniqueIndex('Cities_pathName_uidx').on(table.pathName),
        foreignKey({
            columns: [table.heroImageFileUploadId],
            foreignColumns: [fileUploads.fileUploadId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.firstSectionImageFileUploadId],
            foreignColumns: [fileUploads.fileUploadId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        index('Cities_publishedAt_idx').on(table.publishedAt),
    ],
);

export type City = typeof cities.$inferSelect;
export type CityCreate = typeof cities.$inferInsert;

export const partners = pgTable(
    'Partners',
    {
        partnerId: nanoId().primaryKey(),
        name: varchar().notNull(),
        ...contentPageColumns,
        // Fixed first-section slot above free content sections. See
        // docs/features/partners.md (ChefForAnyOccasion / CTA card).
        firstSectionHeadlineDe: varchar().notNull().default(''),
        firstSectionHeadlineEn: varchar().notNull().default(''),
        firstSectionBodyDe: text().notNull().default(''),
        firstSectionBodyEn: text().notNull().default(''),
        firstSectionImageFileUploadId: nanoId(),
        // Optional override for the ChefForAnyOccasion primary CTA. Null /
        // empty keeps the default booking-request form link. See
        // docs/features/partners.md.
        firstSectionCtaUrl: varchar(),
        // Optional promo shown on the public partner CTA card. Null means
        // no banner. On delete of the promo code the assignment is cleared.
        promoCodeId: nanoId(),
        // Dark scrim on hero / first-section CTA image. Admins turn off when
        // the photo already reads dark enough. See docs/features/partners.md.
        heroImageOverlay: boolean().notNull().default(true),
        firstSectionImageOverlay: boolean().notNull().default(true),
        // HowItWorks alternative assets (holiday-home style). See partners.md.
        howItWorksAlternativeMedia: boolean().notNull().default(false),
        // Show travel-origin city on featured cook cards. Admins turn off when
        // cook city is misleading for this partner. See docs/features/partners.md.
        featuredCooksShowCity: boolean().notNull().default(true),
        // Optional partner location (venue / property address). Used by
        // `/booking-request/plan?partnerId=…` and reusable elsewhere.
        // URL venue params override on the plan funnel. See booking-request-plan.md.
        locationAddress: jsonb().$type<BookingRequestExactEventAddress>(),
    },
    (table) => [
        uniqueIndex('Partners_pathName_uidx').on(table.pathName),
        foreignKey({
            columns: [table.heroImageFileUploadId],
            foreignColumns: [fileUploads.fileUploadId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.firstSectionImageFileUploadId],
            foreignColumns: [fileUploads.fileUploadId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.promoCodeId],
            foreignColumns: [promoCodes.promoCodeId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        index('Partners_publishedAt_idx').on(table.publishedAt),
        index('Partners_promoCodeId_idx').on(table.promoCodeId),
    ],
);

export type Partner = typeof partners.$inferSelect;
export type PartnerCreate = typeof partners.$inferInsert;

export const occasions = pgTable(
    'Occasions',
    {
        occasionId: nanoId().primaryKey(),
        name: varchar().notNull(),
        ...contentPageColumns,
        // Fixed first-section slot above free content sections. See
        // docs/features/occasions.md (ChefForAnyOccasion / CTA card).
        firstSectionHeadlineDe: varchar().notNull().default(''),
        firstSectionHeadlineEn: varchar().notNull().default(''),
        firstSectionBodyDe: text().notNull().default(''),
        firstSectionBodyEn: text().notNull().default(''),
        firstSectionImageFileUploadId: nanoId(),
        // Fixed three-format showcase below the CTA. Typed jsonb — not a
        // free-form ContentSection kind. See docs/features/occasions.md.
        formatsSection: jsonb()
            .$type<OccasionFormatsSection>()
            .notNull()
            .default(sql.raw(`'${JSON.stringify(occasionFormatsSectionEmpty())}'::jsonb`)),
        // Optional promo shown on the public occasion CTA card. Null means
        // no banner. On delete of the promo code the assignment is cleared.
        promoCodeId: nanoId(),
    },
    (table) => [
        uniqueIndex('Occasions_pathName_uidx').on(table.pathName),
        foreignKey({
            columns: [table.heroImageFileUploadId],
            foreignColumns: [fileUploads.fileUploadId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.firstSectionImageFileUploadId],
            foreignColumns: [fileUploads.fileUploadId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.promoCodeId],
            foreignColumns: [promoCodes.promoCodeId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        index('Occasions_publishedAt_idx').on(table.publishedAt),
        index('Occasions_promoCodeId_idx').on(table.promoCodeId),
    ],
);

export type Occasion = typeof occasions.$inferSelect;
export type OccasionCreate = typeof occasions.$inferInsert;

// Curated ordered cooks on a city landing page. Empty assignment → public
// page falls back to cooks whose travel radius covers the city center.
// See docs/features/cities.md.
export const cityCooks = pgTable(
    'CityCooks',
    {
        cityId: nanoId().notNull(),
        cookId: nanoId().notNull(),
        position: integer().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.cityId],
            foreignColumns: [cities.cityId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.cookId],
            foreignColumns: [cooks.cookId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        uniqueIndex('CityCooks_pk').on(table.cityId, table.cookId),
        index('CityCooks_cityId_idx').on(table.cityId),
    ],
);

export type CityCook = typeof cityCooks.$inferSelect;
export type CityCookCreate = typeof cityCooks.$inferInsert;

// Curated ordered cooks on a partner landing page. Empty assignment → no cooks
// section (no geo fallback). See docs/features/partners.md.
export const partnerCooks = pgTable(
    'PartnerCooks',
    {
        partnerId: nanoId().notNull(),
        cookId: nanoId().notNull(),
        position: integer().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.partnerId],
            foreignColumns: [partners.partnerId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.cookId],
            foreignColumns: [cooks.cookId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        uniqueIndex('PartnerCooks_pk').on(table.partnerId, table.cookId),
        index('PartnerCooks_partnerId_idx').on(table.partnerId),
    ],
);

export type PartnerCook = typeof partnerCooks.$inferSelect;
export type PartnerCookCreate = typeof partnerCooks.$inferInsert;

// Curated ordered cooks on an occasion landing page. Empty assignment → no
// cooks section (no geo fallback). See docs/features/occasions.md.
export const occasionCooks = pgTable(
    'OccasionCooks',
    {
        occasionId: nanoId().notNull(),
        cookId: nanoId().notNull(),
        position: integer().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.occasionId],
            foreignColumns: [occasions.occasionId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.cookId],
            foreignColumns: [cooks.cookId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        uniqueIndex('OccasionCooks_pk').on(table.occasionId, table.cookId),
        index('OccasionCooks_occasionId_idx').on(table.occasionId),
    ],
);

export type OccasionCook = typeof occasionCooks.$inferSelect;
export type OccasionCookCreate = typeof occasionCooks.$inferInsert;

export const blogPosts = pgTable(
    'BlogPosts',
    {
        blogPostId: nanoId().primaryKey(),
        ...contentPageColumns,
    },
    (table) => [
        uniqueIndex('BlogPosts_pathName_uidx').on(table.pathName),
        foreignKey({
            columns: [table.heroImageFileUploadId],
            foreignColumns: [fileUploads.fileUploadId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        index('BlogPosts_publishedAt_idx').on(table.publishedAt),
    ],
);

export type BlogPost = typeof blogPosts.$inferSelect;
export type BlogPostCreate = typeof blogPosts.$inferInsert;

// --- Fixed-route SEO (WebPages) ----------------------------------------------
//
// Admin-editable title/description for fixed marketing and chrome routes.
// Missing rows use shared defaults (ghost). First admin write upserts.
// Dynamic city/partner/occasion/blog detail SEO stays on those entity tables.
// See docs/features/admin-web-pages.md.

export const webPages = pgTable('WebPages', {
    webPageKey: varchar().$type<WebPageKey>().primaryKey(),
    titleDe: varchar().notNull(),
    titleEn: varchar().notNull().default(''),
    descriptionDe: varchar().notNull(),
    descriptionEn: varchar().notNull().default(''),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export type WebPage = typeof webPages.$inferSelect;
export type WebPageCreate = typeof webPages.$inferInsert;

// --- Feature toggles ---------------------------------------------------------
//
// Fixed-key on/off switches. Missing rows are disabled (ghost). First admin
// write upserts the row. See docs/features/admin-feature-toggles.md.

export const featureToggles = pgTable('FeatureToggles', {
    featureToggleKey: varchar().$type<FeatureToggleKey>().primaryKey(),
    enabled: boolean().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export type FeatureToggle = typeof featureToggles.$inferSelect;
export type FeatureToggleCreate = typeof featureToggles.$inferInsert;

// Per-user overrides of the global FeatureToggles default. A row sets the key
// on or off for that user; absence falls back to the global row (missing global
// = off). See docs/features/admin-feature-toggles.md.
export const featureToggleUserOverrides = pgTable(
    'FeatureToggleUserOverrides',
    {
        userId: nanoId().notNull(),
        featureToggleKey: varchar().$type<FeatureToggleKey>().notNull(),
        enabled: boolean().notNull(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        primaryKey({ columns: [table.userId, table.featureToggleKey] }),
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('FeatureToggleUserOverrides_featureToggleKey_idx').on(table.featureToggleKey),
    ],
);

export type FeatureToggleUserOverride = typeof featureToggleUserOverrides.$inferSelect;
export type FeatureToggleUserOverrideCreate = typeof featureToggleUserOverrides.$inferInsert;

// --- Booking requests / offers / call-slot bookings ----------------------------
//
// Marketplace negotiation spine. GraphQL + commands are planned — tables land
// first. See docs/architecture/booking.md and docs/features/booking.md.

export const bookingRequests = pgTable(
    'BookingRequests',
    {
        bookingRequestId: nanoId().primaryKey(),
        userId: nanoId().notNull(),
        occasion: varchar().notNull(),
        dateTime: timestamp({ withTimezone: true }).notNull(),
        // Sole location store — no separate approx lat/lng / locationName.
        exactEventAddress: jsonb().$type<BookingRequestExactEventAddress>().notNull(),
        priceClassType: varchar().$type<BookingRequestPriceClassType>(),
        originalMessage: text().notNull(),
        adjustedMessage: text(),
        giftCardId: nanoId(),
        promoCodeId: nanoId(),
        expiresAt: timestamp({ withTimezone: true }),
        canceledAt: timestamp({ withTimezone: true }),
        cancellationReason: varchar(),
        // Large-group gate (≥12) sets BLOCKED; admin approve UI is deferred.
        publicationStatus: varchar().$type<BookingRequestPublicationStatus>().notNull(),
        preferences: jsonb().$type<string[]>().notNull(),
        invoiceAddress: jsonb().$type<BookingRequestInvoiceAddress>(),
        // Slack ops thread root — `{ slackTs, slackChannelId }`.
        // See docs/features/slack-notifications.md.
        references: jsonb().$type<BookingRequestReferences>(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.giftCardId],
            foreignColumns: [giftCards.giftCardId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.promoCodeId],
            foreignColumns: [promoCodes.promoCodeId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        index('BookingRequests_userId_idx').on(table.userId),
        index('BookingRequests_dateTime_idx').on(table.dateTime),
        index('BookingRequests_publicationStatus_idx').on(table.publicationStatus),
        index('BookingRequests_expiresAt_idx').on(table.expiresAt),
        index('BookingRequests_canceledAt_idx').on(table.canceledAt),
        index('BookingRequests_giftCardId_idx').on(table.giftCardId),
        index('BookingRequests_promoCodeId_idx').on(table.promoCodeId),
        index('BookingRequests_createdAt_idx').on(table.createdAt),
    ],
);

export type BookingRequest = typeof bookingRequests.$inferSelect;
export type BookingRequestCreate = typeof bookingRequests.$inferInsert;

export const bookingRequestParticipants = pgTable(
    'BookingRequestParticipants',
    {
        bookingRequestParticipantId: nanoId().primaryKey(),
        bookingRequestId: nanoId().notNull(),
        type: varchar().$type<BookingRequestParticipantType>().notNull(),
        name: varchar().notNull(),
        restrictions: jsonb().$type<string[]>().notNull(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.bookingRequestId],
            foreignColumns: [bookingRequests.bookingRequestId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('BookingRequestParticipants_bookingRequestId_idx').on(table.bookingRequestId),
    ],
);

export type BookingRequestParticipant = typeof bookingRequestParticipants.$inferSelect;
export type BookingRequestParticipantCreate = typeof bookingRequestParticipants.$inferInsert;

// Cook ↔ request affinity (invite / notify / decline) before an offer exists.
export const bookingRequestCooks = pgTable(
    'BookingRequestCooks',
    {
        cookId: nanoId().notNull(),
        bookingRequestId: nanoId().notNull(),
        // AI menu ranking + inventory recommendation — see ai-menu-evaluation.md.
        menuEvaluation: jsonb().$type<BookingRequestCookMenuEvaluation>(),
        menuEvaluationLoading: boolean().notNull().default(false),
        declinationReason: varchar(),
        declinedAt: timestamp({ withTimezone: true }),
        notifiedAt: timestamp({ withTimezone: true }),
        firstOpenedAt: timestamp({ withTimezone: true }),
        // Google Routes driving km (haversine fallback) — stamped on first open / offer create.
        travelDistanceKm: doublePrecision(),
    },
    (table) => [
        primaryKey({ columns: [table.cookId, table.bookingRequestId] }),
        foreignKey({
            columns: [table.cookId],
            foreignColumns: [cooks.cookId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.bookingRequestId],
            foreignColumns: [bookingRequests.bookingRequestId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('BookingRequestCooks_bookingRequestId_idx').on(table.bookingRequestId),
        index('BookingRequestCooks_notifiedAt_idx').on(table.notifiedAt),
    ],
);

export type BookingRequestCook = typeof bookingRequestCooks.$inferSelect;
export type BookingRequestCookCreate = typeof bookingRequestCooks.$inferInsert;

export const bookingRequestOffers = pgTable(
    'BookingRequestOffers',
    {
        bookingRequestOfferId: nanoId().primaryKey(),
        bookingRequestId: nanoId().notNull(),
        cookId: nanoId().notNull(),

        // Dual acceptance: null = pending, true = accepted, false = declined.
        userAccepted: boolean(),
        cookAccepted: boolean(),
        userDeclinationReason: varchar(),
        cookDeclinationReason: varchar(),

        userUnreadNotificationCount: smallint().notNull().default(0),
        cookUnreadNotificationCount: smallint().notNull().default(0),
        // Post-hoc admin offer-chat review pipeline: bumped on peer
        // USER/COOK MESSAGE_SIMPLE sends; zeroed on acknowledge. Default 0 so
        // existing offers do not enter the queue on migrate.
        adminChatReviewPendingCount: smallint().notNull().default(0),
        adminChatReviewedAt: timestamp({ withTimezone: true }),

        // Set after customer pre-accept edits that auto-changed offer money; cleared on cook confirm / manual price.
        priceAutoAdjustReason: varchar().$type<BookingRequestOfferPriceAutoAdjustReason>(),
        userRequestedMenuAdjustments: boolean(),

        travelDistanceKm: doublePrecision(),

        menuPriceCents: integer().notNull(),
        travelExpensesCents: integer().notNull(),
        paymentProviderFeeCents: integer().notNull(),
        platformFeePercentCook: smallint().notNull(),
        platformFeePercentCustomer: smallint().notNull(),
        platformFeeCentsCook: integer().notNull(),
        platformFeeCentsCustomer: integer().notNull(),
        payoutCentsCook: integer().notNull(),
        totalWithoutDiscountsCentsCustomer: integer().notNull(),
        totalCentsCustomer: integer(),
        // Gift-card cents currently applied against this dual-accepted offer (restored/recharged on amendments).
        giftCardAppliedCents: integer().notNull().default(0),

        configuredMenu: jsonb().$type<BookingRequestOfferConfiguredMenu>(),
        paymentData: jsonb().$type<BookingRequestOfferPaymentData>(),
        paymentStatus: varchar().$type<BookingRequestOfferPaymentStatus>().notNull().default('EMPTY'),
        // Post–dual-accept groceries / prep lock — blocks customer participant amendments.
        preparationsCompletedAt: timestamp({ withTimezone: true }),
        // Pending cook-gated booking amendment (participants and/or venue; null when none).
        participantAmendment: jsonb().$type<BookingRequestOfferParticipantAmendment>(),
        plannedPaymentPullDateTime: timestamp({ withTimezone: true }),
        paymentDateTime: timestamp({ withTimezone: true }),
        plannedPayoutDateTime: timestamp({ withTimezone: true }),
        payoutDateTime: timestamp({ withTimezone: true }),
        // pg-boss job ids for `bookingRequestOfferTestimonialReminder` sends —
        // scheduled once payment succeeds, rescheduled on event dateTime
        // change, cancelled on booking cancel. See `scheduleTestimonialReminderJobs.ts`.
        testimonialMemoryNudgeJobId: varchar(),
        testimonialReminderMorningJobId: varchar(),
        testimonialReminderEveningJobId: varchar(),
        // pg-boss ids for debounced offer-chat message notify emails (1m;
        // cancelled on that side's unread reset; replaced when another
        // peer message arrives). See `bookingRequestOfferChatMessageNotifySchedule.ts`.
        customerChatMessageNotifyJobId: varchar(),
        cookChatMessageNotifyJobId: varchar(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.bookingRequestId],
            foreignColumns: [bookingRequests.bookingRequestId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.cookId],
            foreignColumns: [cooks.cookId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        uniqueIndex('BookingRequestOffers_bookingRequestId_cookId_uidx').on(table.bookingRequestId, table.cookId),
        // At most one dual-accepted offer per request.
        uniqueIndex('BookingRequestOffers_oneAccepted_uidx')
            .on(table.bookingRequestId)
            .where(sql`${table.userAccepted} = true AND ${table.cookAccepted} = true`),
        index('BookingRequestOffers_bookingRequestId_idx').on(table.bookingRequestId),
        index('BookingRequestOffers_cookId_idx').on(table.cookId),
        index('BookingRequestOffers_paymentStatus_idx').on(table.paymentStatus),
        index('BookingRequestOffers_createdAt_idx').on(table.createdAt),
        index('BookingRequestOffers_adminChatReviewPendingCount_idx').on(table.adminChatReviewPendingCount),
    ],
);

export type BookingRequestOffer = typeof bookingRequestOffers.$inferSelect;
export type BookingRequestOfferCreate = typeof bookingRequestOffers.$inferInsert;

// Append-only offer timeline — negotiation “chat” + domain events (not Chats).
export const bookingRequestOfferEvents = pgTable(
    'BookingRequestOfferEvents',
    {
        bookingRequestOfferEventId: nanoId().primaryKey(),
        bookingRequestOfferId: nanoId().notNull(),
        type: varchar().$type<BookingRequestOfferEventType>().notNull(),
        payload: jsonb().$type<BookingRequestOfferEventPayload>().notNull(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.bookingRequestOfferId],
            foreignColumns: [bookingRequestOffers.bookingRequestOfferId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('BookingRequestOfferEvents_bookingRequestOfferId_idx').on(table.bookingRequestOfferId),
        index('BookingRequestOfferEvents_createdAt_idx').on(table.createdAt),
        index('BookingRequestOfferEvents_type_idx').on(table.type),
    ],
);

export type BookingRequestOfferEvent = typeof bookingRequestOfferEvents.$inferSelect;
export type BookingRequestOfferEventCreate = typeof bookingRequestOfferEvents.$inferInsert;

// Join row pinning FileUploads to a MESSAGE_SIMPLE offer-chat event. Same
// send-order `position` pattern as ChatMessageUserAttachments / support.
// Bytes stay in FileUploads; peers download via GET peer-access rules.
export const bookingRequestOfferEventAttachments = pgTable(
    'BookingRequestOfferEventAttachments',
    {
        bookingRequestOfferEventId: nanoId().notNull(),
        fileUploadId: nanoId().notNull(),
        position: integer().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.bookingRequestOfferEventId],
            foreignColumns: [bookingRequestOfferEvents.bookingRequestOfferEventId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.fileUploadId],
            foreignColumns: [fileUploads.fileUploadId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        uniqueIndex('BookingRequestOfferEventAttachments_pk').on(table.bookingRequestOfferEventId, table.fileUploadId),
        index('BookingRequestOfferEventAttachments_eventId_idx').on(table.bookingRequestOfferEventId),
        index('BookingRequestOfferEventAttachments_fileUploadId_idx').on(table.fileUploadId),
    ],
);

export type BookingRequestOfferEventAttachment = typeof bookingRequestOfferEventAttachments.$inferSelect;
export type BookingRequestOfferEventAttachmentCreate = typeof bookingRequestOfferEventAttachments.$inferInsert;

/** Current emoji reaction per party on a `*_MESSAGE_SIMPLE` offer-chat event. */
export const bookingRequestOfferEventReactions = pgTable(
    'BookingRequestOfferEventReactions',
    {
        bookingRequestOfferEventReactionId: nanoId().primaryKey(),
        bookingRequestOfferEventId: nanoId().notNull(),
        reactorRole: varchar().$type<BookingRequestOfferChatReactorRole>().notNull(),
        reactorUserId: nanoId().notNull(),
        /** Null when the party cleared their reaction (tombstone for idempotent clears). */
        emoji: varchar(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.bookingRequestOfferEventId],
            foreignColumns: [bookingRequestOfferEvents.bookingRequestOfferEventId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.reactorUserId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        uniqueIndex('BookingRequestOfferEventReactions_event_role_uidx').on(table.bookingRequestOfferEventId, table.reactorRole),
        index('BookingRequestOfferEventReactions_eventId_idx').on(table.bookingRequestOfferEventId),
        index('BookingRequestOfferEventReactions_reactorUserId_idx').on(table.reactorUserId),
    ],
);

export type BookingRequestOfferEventReaction = typeof bookingRequestOfferEventReactions.$inferSelect;
export type BookingRequestOfferEventReactionCreate = typeof bookingRequestOfferEventReactions.$inferInsert;

// LiveKit room for an offer (ad-hoc or during a confirmed call-slot join window).
// See docs/features/booking-request-offer-calls.md.
export const bookingRequestOfferCallRooms = pgTable(
    'BookingRequestOfferCallRooms',
    {
        bookingRequestOfferCallRoomId: nanoId().primaryKey(),
        bookingRequestOfferId: nanoId().notNull(),
        livekitRoomName: varchar().notNull(),
        status: varchar().$type<BookingRequestOfferCallRoomStatus>().notNull().default('ACTIVE'),
        createdByUserId: nanoId().notNull(),
        startedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        endedAt: timestamp({ withTimezone: true }),
    },
    (table) => [
        foreignKey({
            columns: [table.bookingRequestOfferId],
            foreignColumns: [bookingRequestOffers.bookingRequestOfferId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.createdByUserId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('BookingRequestOfferCallRooms_bookingRequestOfferId_idx').on(table.bookingRequestOfferId),
        index('BookingRequestOfferCallRooms_status_idx').on(table.status),
        index('BookingRequestOfferCallRooms_startedAt_idx').on(table.startedAt),
    ],
);

export type BookingRequestOfferCallRoom = typeof bookingRequestOfferCallRooms.$inferSelect;
export type BookingRequestOfferCallRoomCreate = typeof bookingRequestOfferCallRooms.$inferInsert;

export const bookingRequestOfferCallRoomParticipants = pgTable(
    'BookingRequestOfferCallRoomParticipants',
    {
        bookingRequestOfferCallRoomParticipantId: nanoId().primaryKey(),
        bookingRequestOfferCallRoomId: nanoId().notNull(),
        sessionId: nanoId().notNull(),
        userId: nanoId().notNull(),
        joinedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        leftAt: timestamp({ withTimezone: true }),
    },
    (table) => [
        foreignKey({
            columns: [table.bookingRequestOfferCallRoomId],
            foreignColumns: [bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.sessionId],
            foreignColumns: [sessions.sessionId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('BookingRequestOfferCallRoomParticipants_roomId_idx').on(table.bookingRequestOfferCallRoomId),
        index('BookingRequestOfferCallRoomParticipants_sessionId_idx').on(table.sessionId),
    ],
);

export type BookingRequestOfferCallRoomParticipant = typeof bookingRequestOfferCallRoomParticipants.$inferSelect;
export type BookingRequestOfferCallRoomParticipantCreate = typeof bookingRequestOfferCallRoomParticipants.$inferInsert;

// Audio egress + post-call transcript for a LiveKit offer call room.
// See docs/features/call-recordings.md.
export const bookingRequestOfferCallRecordings = pgTable(
    'BookingRequestOfferCallRecordings',
    {
        bookingRequestOfferCallRecordingId: nanoId().primaryKey(),
        bookingRequestOfferCallRoomId: nanoId().notNull(),
        livekitEgressId: varchar(),
        objectKey: varchar().notNull(),
        mediaType: varchar(),
        byteSize: integer(),
        status: varchar().$type<BookingRequestOfferCallRecordingStatus>().notNull().default('PENDING'),
        transcriptJson: jsonb().$type<BookingRequestOfferCallTranscriptSegment[]>(),
        transcriptText: text(),
        /** Admin-facing AI summary of the call (generated after STT). */
        summaryText: text(),
        errorMessage: text(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        completedAt: timestamp({ withTimezone: true }),
    },
    (table) => [
        foreignKey({
            columns: [table.bookingRequestOfferCallRoomId],
            foreignColumns: [bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        uniqueIndex('BookingRequestOfferCallRecordings_roomId_uidx').on(table.bookingRequestOfferCallRoomId),
        index('BookingRequestOfferCallRecordings_status_idx').on(table.status),
    ],
);

export type BookingRequestOfferCallRecording = typeof bookingRequestOfferCallRecordings.$inferSelect;
export type BookingRequestOfferCallRecordingCreate = typeof bookingRequestOfferCallRecordings.$inferInsert;

// Discovery-call booking tied to an open offer. Availability rules/exceptions
// live on Cook*; this table is the request / confirm / decline / cancel row.
export const cookCallSlotBookings = pgTable(
    'CookCallSlotBookings',
    {
        cookCallSlotBookingId: nanoId().primaryKey(),
        cookId: nanoId().notNull(),
        userId: nanoId().notNull(),
        bookingRequestOfferId: nanoId().notNull(),
        startAt: timestamp({ withTimezone: true }).notNull(),
        endAt: timestamp({ withTimezone: true }).notNull(),
        status: varchar().$type<CookCallSlotBookingStatus>().notNull().default('PENDING'),
        initiator: varchar().$type<CookCallSlotBookingActor>().notNull(),
        customerMessage: varchar(),
        cookMessage: varchar(),
        declineReason: varchar(),
        // Who cancelled — independent of who proposed the slot.
        canceledBy: varchar().$type<CookCallSlotBookingActor>(),
        canceledReason: varchar(),
        // Set when the first LiveKit room is created during this slot's join window.
        videoCallRoomId: nanoId(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        lastModifiedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.cookId],
            foreignColumns: [cooks.cookId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.bookingRequestOfferId],
            foreignColumns: [bookingRequestOffers.bookingRequestOfferId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.videoCallRoomId],
            foreignColumns: [bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        index('CookCallSlotBookings_cookId_idx').on(table.cookId),
        index('CookCallSlotBookings_userId_idx').on(table.userId),
        index('CookCallSlotBookings_bookingRequestOfferId_idx').on(table.bookingRequestOfferId),
        index('CookCallSlotBookings_startAt_idx').on(table.startAt),
        index('CookCallSlotBookings_status_idx').on(table.status),
        index('CookCallSlotBookings_createdAt_idx').on(table.createdAt),
    ],
);

export type CookCallSlotBooking = typeof cookCallSlotBookings.$inferSelect;
export type CookCallSlotBookingCreate = typeof cookCallSlotBookings.$inferInsert;

// --- Testimonials --------------------------------------------------------------
//
// Customer- and cook-authored quotes. `bookingRequestOfferId` optionally ties a
// row to the completed offer it was written about/from — customer rows tied to
// an offer also count toward that offer's cook public rating
// (`publicCookCustomerTestimonialRatingSummary`). Low ratings (`rating <= 3`)
// default to `PENDING_REVIEW` instead of auto-publishing — see
// `publicationStatusFromRating.ts`. `CityTestimonials` / `PartnerTestimonials` /
// `OccasionTestimonials` are ordered curation junctions (same shape as
// `CityCooks` / `PartnerCooks` / `OccasionCooks`)
// pointing at either catalog via `testimonialType` + `testimonialId`. See
// `docs/architecture/testimonials.md`.

export const customerTestimonials = pgTable(
    'CustomerTestimonials',
    {
        customerTestimonialId: nanoId().primaryKey(),
        userId: nanoId().notNull(),
        // Lazy — `bookingRequestOffers` is declared earlier in this module but
        // the callback keeps the FK declaration self-contained either way.
        bookingRequestOfferId: nanoId().references((): AnyPgColumn => bookingRequestOffers.bookingRequestOfferId, {
            onUpdate: 'cascade',
            onDelete: 'set null',
        }),
        authorName: varchar(),
        location: varchar(),
        occasion: varchar(),
        body: text().notNull(),
        imageUrls: jsonb().$type<string[]>(),
        rating: smallint(),
        publicationStatus: varchar().$type<TestimonialPublicationStatus>().notNull().default('PUBLISHED'),
        publishedAt: timestamp({ withTimezone: true }),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        uniqueIndex('CustomerTestimonials_bookingRequestOfferId_uidx').on(table.bookingRequestOfferId),
        index('CustomerTestimonials_userId_idx').on(table.userId),
        index('CustomerTestimonials_publicationStatus_idx').on(table.publicationStatus),
        index('CustomerTestimonials_createdAt_idx').on(table.createdAt),
    ],
);

export type CustomerTestimonial = typeof customerTestimonials.$inferSelect;
export type CustomerTestimonialCreate = typeof customerTestimonials.$inferInsert;

export const cookTestimonials = pgTable(
    'CookTestimonials',
    {
        cookTestimonialId: nanoId().primaryKey(),
        userId: nanoId().notNull(),
        cookId: nanoId().notNull(),
        bookingRequestOfferId: nanoId().references((): AnyPgColumn => bookingRequestOffers.bookingRequestOfferId, {
            onUpdate: 'cascade',
            onDelete: 'set null',
        }),
        authorName: varchar(),
        location: varchar(),
        occasion: varchar(),
        body: text(),
        imageUrls: jsonb().$type<string[]>(),
        rating: smallint(),
        lowRatingAnswers: jsonb().$type<CookTestimonialLowRatingAnswers>(),
        publicationStatus: varchar().$type<TestimonialPublicationStatus>().notNull().default('PUBLISHED'),
        publishedAt: timestamp({ withTimezone: true }),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.cookId],
            foreignColumns: [cooks.cookId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        uniqueIndex('CookTestimonials_bookingRequestOfferId_uidx').on(table.bookingRequestOfferId),
        index('CookTestimonials_cookId_idx').on(table.cookId),
        index('CookTestimonials_publicationStatus_idx').on(table.publicationStatus),
        index('CookTestimonials_createdAt_idx').on(table.createdAt),
    ],
);

export type CookTestimonial = typeof cookTestimonials.$inferSelect;
export type CookTestimonialCreate = typeof cookTestimonials.$inferInsert;

export const cityTestimonials = pgTable(
    'CityTestimonials',
    {
        cityId: nanoId().notNull(),
        testimonialType: varchar().$type<TestimonialType>().notNull(),
        testimonialId: nanoId().notNull(),
        index: integer().notNull(),
    },
    (table) => [
        primaryKey({ columns: [table.cityId, table.testimonialType, table.testimonialId] }),
        foreignKey({
            columns: [table.cityId],
            foreignColumns: [cities.cityId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('CityTestimonials_cityId_idx').on(table.cityId),
    ],
);

export type CityTestimonial = typeof cityTestimonials.$inferSelect;
export type CityTestimonialCreate = typeof cityTestimonials.$inferInsert;

export const partnerTestimonials = pgTable(
    'PartnerTestimonials',
    {
        partnerId: nanoId().notNull(),
        testimonialType: varchar().$type<TestimonialType>().notNull(),
        testimonialId: nanoId().notNull(),
        index: integer().notNull(),
    },
    (table) => [
        primaryKey({ columns: [table.partnerId, table.testimonialType, table.testimonialId] }),
        foreignKey({
            columns: [table.partnerId],
            foreignColumns: [partners.partnerId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('PartnerTestimonials_partnerId_idx').on(table.partnerId),
    ],
);

export type PartnerTestimonial = typeof partnerTestimonials.$inferSelect;
export type PartnerTestimonialCreate = typeof partnerTestimonials.$inferInsert;

export const occasionTestimonials = pgTable(
    'OccasionTestimonials',
    {
        occasionId: nanoId().notNull(),
        testimonialType: varchar().$type<TestimonialType>().notNull(),
        testimonialId: nanoId().notNull(),
        index: integer().notNull(),
    },
    (table) => [
        primaryKey({ columns: [table.occasionId, table.testimonialType, table.testimonialId] }),
        foreignKey({
            columns: [table.occasionId],
            foreignColumns: [occasions.occasionId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('OccasionTestimonials_occasionId_idx').on(table.occasionId),
    ],
);

export type OccasionTestimonial = typeof occasionTestimonials.$inferSelect;
export type OccasionTestimonialCreate = typeof occasionTestimonials.$inferInsert;

// Customer ↔ admin support cases. Optional booking link (at most one case per
// booking). Messages are domain rows projected to `ChatMessage` — not the
// assistant `Chats` / `ChatMessages` spine. See docs/features/support-requests.md.
export const supportRequests = pgTable(
    'SupportRequests',
    {
        supportRequestId: nanoId().primaryKey(),
        userId: nanoId().notNull(),
        bookingRequestId: nanoId(),
        subject: varchar().notNull(),
        status: varchar().$type<SupportRequestStatus>().notNull().default('OPEN'),
        userUnreadNotificationCount: smallint().notNull().default(0),
        adminUnreadNotificationCount: smallint().notNull().default(0),
        // Slack ops thread root — same shape as BookingRequests.references.
        references: jsonb().$type<SupportRequestReferences>(),
        // pg-boss id for the debounced customer reply-notify email (cancelled on
        // unread reset / resolve; replaced when another admin message arrives).
        customerReplyNotifyJobId: varchar(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        resolvedAt: timestamp({ withTimezone: true }),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.bookingRequestId],
            foreignColumns: [bookingRequests.bookingRequestId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        uniqueIndex('SupportRequests_bookingRequestId_uidx')
            .on(table.bookingRequestId)
            .where(sql`${table.bookingRequestId} IS NOT NULL`),
        index('SupportRequests_userId_idx').on(table.userId),
        index('SupportRequests_status_idx').on(table.status),
        index('SupportRequests_adminUnreadNotificationCount_idx').on(table.adminUnreadNotificationCount),
        index('SupportRequests_createdAt_idx').on(table.createdAt),
    ],
);

export type SupportRequest = typeof supportRequests.$inferSelect;
export type SupportRequestCreate = typeof supportRequests.$inferInsert;

export const supportRequestMessages = pgTable(
    'SupportRequestMessages',
    {
        supportRequestMessageId: nanoId().primaryKey(),
        supportRequestId: nanoId().notNull(),
        authorUserId: nanoId().notNull(),
        body: text().notNull(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.supportRequestId],
            foreignColumns: [supportRequests.supportRequestId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.authorUserId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        index('SupportRequestMessages_supportRequestId_createdAt_idx').on(table.supportRequestId, table.createdAt),
    ],
);

export type SupportRequestMessage = typeof supportRequestMessages.$inferSelect;
export type SupportRequestMessageCreate = typeof supportRequestMessages.$inferInsert;

// Join row pinning FileUploads to a support-request chat message (send-order).
export const supportRequestMessageAttachments = pgTable(
    'SupportRequestMessageAttachments',
    {
        supportRequestMessageId: nanoId().notNull(),
        fileUploadId: nanoId().notNull(),
        position: integer().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.supportRequestMessageId],
            foreignColumns: [supportRequestMessages.supportRequestMessageId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.fileUploadId],
            foreignColumns: [fileUploads.fileUploadId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        uniqueIndex('SupportRequestMessageAttachments_pk').on(table.supportRequestMessageId, table.fileUploadId),
        index('SupportRequestMessageAttachments_messageId_idx').on(table.supportRequestMessageId),
        index('SupportRequestMessageAttachments_fileUploadId_idx').on(table.fileUploadId),
    ],
);

export type SupportRequestMessageAttachment = typeof supportRequestMessageAttachments.$inferSelect;
export type SupportRequestMessageAttachmentCreate = typeof supportRequestMessageAttachments.$inferInsert;

// One-shot LLM calls (menu suggestions, titles, call transcripts, …). Chat
// multi-turn generation metadata stays denormalized on message variant rows —
// see `docs/architecture/ai-generations.md` and `docs/architecture/chat-persistence.md`.
export const aiGenerations = pgTable(
    'AiGenerations',
    {
        aiGenerationId: nanoId().primaryKey(),
        kind: varchar().$type<AiGenerationKind>().notNull(),
        userId: nanoId(),
        sessionId: nanoId(),
        modelId: varchar(),
        system: text().notNull(),
        prompt: text().notNull(),
        output: text().notNull(),
        inputTokens: integer(),
        outputTokens: integer(),
        totalTokens: integer(),
        reasoningTokens: integer(),
        cachedInputTokens: integer(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.sessionId],
            foreignColumns: [sessions.sessionId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        index('AiGenerations_createdAt_idx').on(table.createdAt),
        index('AiGenerations_kind_createdAt_idx').on(table.kind, table.createdAt),
        index('AiGenerations_userId_createdAt_idx').on(table.userId, table.createdAt),
    ],
);

export type AiGeneration = typeof aiGenerations.$inferSelect;
export type AiGenerationCreate = typeof aiGenerations.$inferInsert;

// WhatsApp Concierge inbox — one conversation per E.164 phone. Optional user
// link when `Users.phoneNumber` matches. See docs/architecture/whatsapp.md.
export const whatsAppConversations = pgTable(
    'WhatsAppConversations',
    {
        whatsAppConversationId: nanoId().primaryKey(),
        phoneNumber: varchar().notNull(),
        displayName: varchar(),
        userId: nanoId(),
        lastMessageAt: timestamp({ withTimezone: true }).notNull(),
        adminUnreadCount: smallint().notNull().default(0),
        customerServiceWindowExpiresAt: timestamp({ withTimezone: true }),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        uniqueIndex('WhatsAppConversations_phoneNumber_uidx').on(table.phoneNumber),
        index('WhatsAppConversations_userId_idx').on(table.userId),
        index('WhatsAppConversations_lastMessageAt_idx').on(table.lastMessageAt),
        index('WhatsAppConversations_adminUnreadCount_idx').on(table.adminUnreadCount),
    ],
);

export type WhatsAppConversation = typeof whatsAppConversations.$inferSelect;
export type WhatsAppConversationCreate = typeof whatsAppConversations.$inferInsert;

// One row per WhatsApp send attempt (templates + session replies). Lifecycle
// timestamps are first-write-wins from Meta message_statuses webhooks.
// Defined before WhatsAppMessages so transcript rows can FK to the audit row.
export const outboundWhatsAppMessages = pgTable(
    'OutboundWhatsAppMessages',
    {
        outboundWhatsAppMessageId: nanoId().primaryKey(),
        provider: varchar().$type<OutboundWhatsAppProvider>().notNull(),
        providerMessageId: varchar(),
        purpose: varchar().$type<OutboundWhatsAppPurpose>().notNull(),
        relatedEntityType: varchar().$type<OutboundWhatsAppRelatedEntityType>(),
        relatedEntityId: nanoId(),
        userId: nanoId(),
        toPhoneNumber: varchar().notNull(),
        templateName: varchar(),
        bodySnapshot: text().notNull(),
        locale: varchar().$type<Locale>().notNull(),
        whatsAppConversationId: nanoId(),
        providerConversationId: varchar(),
        pricingCategory: varchar(),
        failureReason: varchar(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
        sentAt: timestamp({ withTimezone: true }),
        failedAt: timestamp({ withTimezone: true }),
        deliveredAt: timestamp({ withTimezone: true }),
        readAt: timestamp({ withTimezone: true }),
    },
    (table) => [
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.whatsAppConversationId],
            foreignColumns: [whatsAppConversations.whatsAppConversationId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        uniqueIndex('OutboundWhatsAppMessages_providerMessageId_uidx').on(table.providerMessageId),
        index('OutboundWhatsAppMessages_relatedEntity_idx').on(table.relatedEntityType, table.relatedEntityId),
        index('OutboundWhatsAppMessages_userId_createdAt_idx').on(table.userId, table.createdAt),
        index('OutboundWhatsAppMessages_toPhoneNumber_idx').on(table.toPhoneNumber),
        index('OutboundWhatsAppMessages_createdAt_idx').on(table.createdAt),
        index('OutboundWhatsAppMessages_purpose_idx').on(table.purpose),
    ],
);

export type OutboundWhatsAppMessage = typeof outboundWhatsAppMessages.$inferSelect;
export type OutboundWhatsAppMessageCreate = typeof outboundWhatsAppMessages.$inferInsert;

export const whatsAppMessages = pgTable(
    'WhatsAppMessages',
    {
        whatsAppMessageId: nanoId().primaryKey(),
        whatsAppConversationId: nanoId().notNull(),
        direction: varchar().$type<WhatsAppMessageDirection>().notNull(),
        messageKind: varchar().$type<WhatsAppMessageKind>().notNull().default('TEXT'),
        body: text().notNull(),
        buttonPayload: varchar(),
        providerMessageId: varchar(),
        outboundWhatsAppMessageId: nanoId(),
        sentByAdminUserId: nanoId(),
        deliveredAt: timestamp({ withTimezone: true }),
        readAt: timestamp({ withTimezone: true }),
        failedAt: timestamp({ withTimezone: true }),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.whatsAppConversationId],
            foreignColumns: [whatsAppConversations.whatsAppConversationId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.outboundWhatsAppMessageId],
            foreignColumns: [outboundWhatsAppMessages.outboundWhatsAppMessageId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.sentByAdminUserId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        uniqueIndex('WhatsAppMessages_providerMessageId_uidx').on(table.providerMessageId),
        index('WhatsAppMessages_whatsAppConversationId_createdAt_idx').on(table.whatsAppConversationId, table.createdAt),
        index('WhatsAppMessages_outboundWhatsAppMessageId_idx').on(table.outboundWhatsAppMessageId),
    ],
);

export type WhatsAppMessage = typeof whatsAppMessages.$inferSelect;
export type WhatsAppMessageCreate = typeof whatsAppMessages.$inferInsert;

export const whatsAppMessageAttachments = pgTable(
    'WhatsAppMessageAttachments',
    {
        whatsAppMessageId: nanoId().notNull(),
        fileUploadId: nanoId().notNull(),
        position: integer().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.whatsAppMessageId],
            foreignColumns: [whatsAppMessages.whatsAppMessageId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        foreignKey({
            columns: [table.fileUploadId],
            foreignColumns: [fileUploads.fileUploadId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        uniqueIndex('WhatsAppMessageAttachments_pk').on(table.whatsAppMessageId, table.fileUploadId),
        index('WhatsAppMessageAttachments_messageId_idx').on(table.whatsAppMessageId),
        index('WhatsAppMessageAttachments_fileUploadId_idx').on(table.fileUploadId),
    ],
);

export type WhatsAppMessageAttachment = typeof whatsAppMessageAttachments.$inferSelect;
export type WhatsAppMessageAttachmentCreate = typeof whatsAppMessageAttachments.$inferInsert;

/** Current emoji reaction per party on a transcript message (Meta `type: reaction`). */
export const whatsAppMessageReactions = pgTable(
    'WhatsAppMessageReactions',
    {
        whatsAppMessageReactionId: nanoId().primaryKey(),
        whatsAppMessageId: nanoId().notNull(),
        direction: varchar().$type<WhatsAppMessageDirection>().notNull(),
        /** Null when the party cleared their reaction (tombstone for webhook idempotency). */
        emoji: varchar(),
        providerMessageId: varchar().notNull(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.whatsAppMessageId],
            foreignColumns: [whatsAppMessages.whatsAppMessageId],
        })
            .onUpdate('cascade')
            .onDelete('cascade'),
        uniqueIndex('WhatsAppMessageReactions_message_direction_uidx').on(table.whatsAppMessageId, table.direction),
        uniqueIndex('WhatsAppMessageReactions_providerMessageId_uidx').on(table.providerMessageId),
        index('WhatsAppMessageReactions_messageId_idx').on(table.whatsAppMessageId),
    ],
);

export type WhatsAppMessageReaction = typeof whatsAppMessageReactions.$inferSelect;
export type WhatsAppMessageReactionCreate = typeof whatsAppMessageReactions.$inferInsert;

/** Marketing newsletter consent rows (footer / profile / go-live import). See docs/features/newsletter.md. */
export const newsletterSubscriptions = pgTable(
    'NewsletterSubscriptions',
    {
        newsletterSubscriptionId: nanoId().primaryKey(),
        emailAddress: varchar().notNull(),
        userId: nanoId(),
        sessionId: nanoId(),
        locale: varchar().$type<Locale>().notNull().default('de'),
        source: varchar().$type<NewsletterSubscriptionSource>().notNull(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex('NewsletterSubscriptions_emailAddress_uidx').on(table.emailAddress),
        index('NewsletterSubscriptions_userId_idx').on(table.userId),
        index('NewsletterSubscriptions_sessionId_idx').on(table.sessionId),
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.userId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
        foreignKey({
            columns: [table.sessionId],
            foreignColumns: [sessions.sessionId],
        })
            .onUpdate('cascade')
            .onDelete('set null'),
    ],
);

export type NewsletterSubscription = typeof newsletterSubscriptions.$inferSelect;
export type NewsletterSubscriptionCreate = typeof newsletterSubscriptions.$inferInsert;

/** Catch-all for imported rows/fields with no product home. */
export const migrationArchives = pgTable(
    'MigrationArchive',
    {
        archiveId: nanoId().primaryKey(),
        sourceTable: varchar().notNull(),
        sourceId: varchar().notNull(),
        payload: jsonb().notNull(),
        createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index('MigrationArchive_sourceTable_sourceId_idx').on(table.sourceTable, table.sourceId),
        index('MigrationArchive_createdAt_idx').on(table.createdAt),
    ],
);

export type MigrationArchive = typeof migrationArchives.$inferSelect;
export type MigrationArchiveCreate = typeof migrationArchives.$inferInsert;
