import { tool } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { vi } from 'vitest';
import { z } from 'zod';

import { idCreate } from '../../shared/idCreate';
import type { Log, User, UserCreate } from '../db/schema';
import * as schema from '../db/schema';
import { logs, sessions, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSCookMutation, GqlSSession, GqlSUserMutation } from '../graphql/generated';
import type { Klaviyo } from '../klaviyo/Klaviyo';
import type { LiveKit } from '../livekit/LiveKit';
import type { ObjectStorage } from '../objectStorage/ObjectStorage';
import type { Places } from '../places/Places';
import type { StripePayment } from '../stripe/StripePayment';
import { aiGenerationsCreate } from '../utils/aiGenerationsCreate';
import { loggerCreate } from '../utils/loggerCreate';

config({ path: ['.env.test'], override: true });

// eslint-disable-next-line no-restricted-syntax
const databaseUrl = process.env.DATABASE_URL ?? '';

export const testDb = drizzle(databaseUrl, { schema });
export const testLogger = loggerCreate(testDb);

/** Stamp a mutation parent id the way guards do (TypeScript-only via extensions). */
export function userMutationParent(userId: string): GqlSUserMutation {
    return { userId } as GqlSUserMutation;
}

export function cookMutationParent(cookId: string): GqlSCookMutation {
    return { cookId } as GqlSCookMutation;
}

export function adminMutationParent(adminId: string): GqlSAdminMutation {
    return { adminId } as GqlSAdminMutation;
}

// Single source of truth for the LLM stub used by every command test that
// builds a `ServerRuntime`. The `notImplemented` defaults from `ai/test` throw
// if a test ever reaches the model — exactly what we want, because no unit
// test should burn real tokens. Tests that need the agent to run can pass
// `doGenerate` / `doStream` overrides via the constructor; the typical command
// test mocks `chatTurnRunDetached` instead, so the model is never
// invoked at all.
function aiForTest(): ServerRuntime['ai'] {
    return {
        customerAssistantModel: () => new MockLanguageModelV3(),
        cookAssistantModel: () => new MockLanguageModelV3(),
        adminAssistantModel: () => new MockLanguageModelV3(),
        bookingRequestAssistantModel: () => new MockLanguageModelV3(),
        chatTitlerModel: () => new MockLanguageModelV3(),
        cookMenuSuggestionModel: () => new MockLanguageModelV3(),
        cookMenuSuggestionFromInventoryModel: () => new MockLanguageModelV3(),
        cookMenuTitleDescriptionModel: () => new MockLanguageModelV3(),
        bookingRequestOfferCallRecordingTranscriptModel: () => new MockLanguageModelV3(),
        cookBiographySuggestModel: () => new MockLanguageModelV3(),
        cookBiographySummaryModel: () => new MockLanguageModelV3(),
        cookMenuEvaluationModel: () => new MockLanguageModelV3(),
        webSearchTool: () => tool({ description: 'web search (test stub)', inputSchema: z.object({}) }),
    };
}

// Shared `ServerRuntime` stub for command tests. Real DB + log; every runtime
// function is a `vi.fn()` so tests can introspect via
// `vi.mocked(stubRuntime.publish.chatTurnUpdates).mock.calls` /
// `toHaveBeenCalledWith(...)`. `publish.*` channels are silent no-ops so tests
// can observe what the command published without per-test overrides. The
// `chatTurnUpdates` wire payload is lean `{ chatId, chatTurnId, revision }` —
// the subscription resolver reloads the turn aggregate, so tests assert on
// persisted DB rows plus the published ids, not a full GraphQL snapshot on the wire.
function serverRuntimeStubCreate(): ServerRuntime {
    return {
        db: testDb,
        log: testLogger,
        aiGenerations: aiGenerationsCreate(testDb),
        subscribe: {
            to: vi.fn<ServerRuntime['subscribe']['to']>(() => {
                throw new Error('subscribe.to not used');
            }),
        },
        publish: {
            userUpdates: vi.fn<ServerRuntime['publish']['userUpdates']>(async () => {}),
            chatTurnUpdates: vi.fn<ServerRuntime['publish']['chatTurnUpdates']>(async () => {}),
            sessionUpdates: vi.fn<ServerRuntime['publish']['sessionUpdates']>(async () => {}),
            adminUpdates: vi.fn<ServerRuntime['publish']['adminUpdates']>(async () => {}),
        },
        jobs: {
            // Default resolves so fire-and-forget side-effect enqueues (Klaviyo
            // sync, titles, …) do not fail unrelated command tests. Tests that
            // assert on enqueue still mock via `vi.mocked(...).mockResolvedValue`.
            enqueue: vi.fn(async () => idCreate()),
            // Default to "no active jobs" so reads that derive UI state from
            // pg-boss resolve to a calm `false` without standing up the queue.
            activeCount: vi.fn(async () => 0),
            findByData: vi.fn(async () => []),
            findById: vi.fn(async () => []),
            cancel: vi.fn(async () => {}),
        },
        ai: aiForTest(),
        email: {
            send: vi.fn<ServerRuntime['email']['send']>(async () => ({ outboundEmailId: idCreate() })),
            usageGet: vi.fn<ServerRuntime['email']['usageGet']>(async () => null),
        },
        browser: {
            capture: vi.fn<ServerRuntime['browser']['capture']>(() => {
                throw new Error('browser.capture not used');
            }),
            capturePdf: vi.fn<ServerRuntime['browser']['capturePdf']>(() => {
                throw new Error('browser.capturePdf not used');
            }),
        },
        // Stripe is capability-optional; command tests that need it mock
        // individual methods. Defaults throw so accidental Stripe calls fail
        // loudly instead of hitting the real API.
        stripe: stripePaymentStubCreate(),
        places: placesStubCreate(),
        livekit: livekitStubCreate(),
        objectStorage: objectStorageStubCreate(),
        slack: slackStubCreate(),
        klaviyo: klaviyoStubCreate(),
        whatsapp: whatsappStubCreate(),
    };
}

function whatsappStubCreate(): ServerRuntime['whatsapp'] {
    return {
        sendTemplate: vi.fn(async () => null),
        sendText: vi.fn(async () => ({
            outboundWhatsAppMessageId: idCreate(),
            whatsAppMessageId: idCreate(),
        })),
        sendReaction: vi.fn(async () => ({
            providerMessageId: `console-react-${idCreate()}`,
        })),
        downloadMedia: vi.fn(async () => null),
        markMessageAsRead: vi.fn(async () => undefined),
        webhookSignatureVerify: vi.fn(() => false),
    };
}

function klaviyoStubCreate(): Klaviyo {
    return {
        isConfigured: vi.fn(() => false),
        profileUpsert: vi.fn(async () => {
            throw new Error('klaviyo.profileUpsert not used');
        }),
        newsletterSubscribe: vi.fn(async () => undefined),
    };
}

function slackStubCreate(): ServerRuntime['slack'] {
    return {
        isConfigured: vi.fn(() => false),
        channels: {
            bookingRequests: undefined,
            cashCows: undefined,
            signUps: undefined,
            supportRequests: undefined,
            giftCardPurchases: undefined,
            bookingRequestReports: undefined,
            opsAlerts: undefined,
            whatsAppMessages: undefined,
        },
        postMessage: vi.fn(async () => undefined),
    };
}

function objectStorageStubCreate(): ObjectStorage {
    return {
        isConfigured: vi.fn(() => false),
        s3Credentials: vi.fn(() => {
            throw new Error('objectStorage.s3Credentials not used');
        }),
        getObject: vi.fn(async () => {
            throw new Error('objectStorage.getObject not used');
        }),
        signedGetUrl: vi.fn(async () => {
            throw new Error('objectStorage.signedGetUrl not used');
        }),
        listObjects: vi.fn(async () => {
            throw new Error('objectStorage.listObjects not used');
        }),
    };
}

function livekitStubCreate(): LiveKit {
    return {
        url: vi.fn(() => {
            throw new Error('livekit.url not used');
        }),
        roomPrefix: vi.fn(() => 'test'),
        roomService: vi.fn(() => {
            throw new Error('livekit.roomService not used');
        }),
        egress: vi.fn(() => {
            throw new Error('livekit.egress not used');
        }),
        accessTokenCreate: vi.fn(async () => {
            throw new Error('livekit.accessTokenCreate not used');
        }),
    };
}

function placesStubCreate(): Places {
    return {
        locationSuggestions: vi.fn(async () => {
            throw new Error('places.locationSuggestions not used');
        }),
        geoCoordinatesForCity: vi.fn(async () => {
            throw new Error('places.geoCoordinatesForCity not used');
        }),
        drivingDistanceKm: vi.fn(async () => null),
    };
}

function stripePaymentStubCreate(): StripePayment {
    const unused =
        (name: keyof StripePayment): (() => Promise<never>) =>
        async () => {
            throw new Error(`stripe.${name} not used`);
        };

    return {
        customerIdFindOne: vi.fn(unused('customerIdFindOne')),
        customerUpdate: vi.fn(unused('customerUpdate')),
        setupIntentCreate: vi.fn(unused('setupIntentCreate')),
        setupIntentSucceededCheck: vi.fn(unused('setupIntentSucceededCheck')),
        setupIntentPaymentMethodIdFindOne: vi.fn(unused('setupIntentPaymentMethodIdFindOne')),
        paymentIntentCreate: vi.fn(unused('paymentIntentCreate')),
        paymentIntentAmountUpdate: vi.fn(unused('paymentIntentAmountUpdate')),
        paymentIntentCreateWithSplit: vi.fn(unused('paymentIntentCreateWithSplit')),
        paymentIntentCreateFromPaymentMethodWithSplit: vi.fn(unused('paymentIntentCreateFromPaymentMethodWithSplit')),
        paymentIntentSucceededCheck: vi.fn(unused('paymentIntentSucceededCheck')),
        paymentIntentCancel: vi.fn(unused('paymentIntentCancel')),
        paymentIntentRefund: vi.fn(unused('paymentIntentRefund')),
        paymentIntentPaymentMethodIdFindOne: vi.fn(unused('paymentIntentPaymentMethodIdFindOne')),
        paymentIntentDestinationTransferIdFindOne: vi.fn(unused('paymentIntentDestinationTransferIdFindOne')),
        accountCreate: vi.fn(unused('accountCreate')),
        accountOnboardingUrlCreate: vi.fn(unused('accountOnboardingUrlCreate')),
        accountDashboardUrlCreate: vi.fn(unused('accountDashboardUrlCreate')),
        accountOnboardingCompletedCheck: vi.fn(unused('accountOnboardingCompletedCheck')),
        // Default calm true so admin offer hydrates in shared-DB tests do not throw when a
        // leftover cook row has an active Stripe account id.
        accountPayoutsEnabledCheck: vi.fn(async () => true),
        accountRequirementsFindOne: vi.fn(unused('accountRequirementsFindOne')),
        accountBalanceFindOne: vi.fn(unused('accountBalanceFindOne')),
        accountBalanceTransactionsFindMany: vi.fn(unused('accountBalanceTransactionsFindMany')),
        transferCreate: vi.fn(unused('transferCreate')),
        transferReverse: vi.fn(unused('transferReverse')),
        payoutCreate: vi.fn(unused('payoutCreate')),
        accountPayoutsFindMany: vi.fn(unused('accountPayoutsFindMany')),
        webhookEventConstruct: vi.fn(() => {
            throw new Error('stripe.webhookEventConstruct not used');
        }),
    };
}

interface CommandSetup {
    serverRuntime: ServerRuntime;
    requestingSession: GqlSSession;
}

interface CommandSetupWithUser extends CommandSetup {
    user: User;
}

// One-line setup for command tests — see `commandSetup.withUser` for the
// variant that also seeds a user row. Plain `commandSetup()` persists a
// session row whose `userId` is null; that's the right shape for tests that
// exercise "user not found" paths or that seed users themselves with extra
// context. The session is always persisted so the `logs.sessionId` FK
// (`sessions.sessionId`) holds when the command logs an error.
async function commandSetupBase(): Promise<CommandSetup> {
    const sessionId = idCreate();
    await testDb.insert(sessions).values({ sessionId });

    const requestingSession = {
        gqlTypeName: 'Session',
        sessionId,
        userId: null,
    } as unknown as GqlSSession;
    return { serverRuntime: serverRuntimeStubCreate(), requestingSession };
}

// Far-future acceptance so command tests stay green when another file publishes
// a new privacy/terms version into the shared test DB (parallel workers).
// Must stay after any `publishedAt` used by legal find tests (e.g. publicLegalFind
// inserts `2999-01-01` rows briefly) — otherwise assertLegalAcceptanceCurrent
// flakes with Unauthorized under vitest parallelism.
const defaultLegalAcceptance = {
    lastAcceptedPrivacyPolicy: new Date('9999-12-31T00:00:00.000Z'),
    lastAcceptedTerms: new Date('9999-12-31T00:00:00.000Z'),
};

async function commandSetupWithUser(overrides: Partial<UserCreate> = {}): Promise<CommandSetupWithUser> {
    const userId = overrides.userId ?? idCreate();
    const sessionId = idCreate();

    // `sessions.userId` references `users.userId`, so the user has to land
    // before the session — Postgres checks the FK at statement time. The two
    // writes can't run in parallel. Pass `lastAcceptedPrivacyPolicy` /
    // `lastAcceptedTerms: null` (or a past date) when a test needs stale acceptance.
    const [user] = await testDb
        .insert(users)
        .values({
            userId,
            emailAddress: `${userId.toLowerCase()}@example.com`,
            firstName: 'test',
            lastName: 'user',
            ...defaultLegalAcceptance,
            ...overrides,
        })
        .returning();
    if (!user) throw new Error('commandSetup.withUser: insert returned no rows');

    await testDb.insert(sessions).values({ sessionId, userId: user.userId });

    const requestingSession = {
        gqlTypeName: 'Session',
        sessionId,
        userId: user.userId,
    } as unknown as GqlSSession;
    return { serverRuntime: serverRuntimeStubCreate(), requestingSession, user };
}

export const commandSetup: {
    (): Promise<CommandSetup>;
    withUser: (overrides?: Partial<UserCreate>) => Promise<CommandSetupWithUser>;
} = Object.assign(commandSetupBase, { withUser: commandSetupWithUser });

// `testLog` writes are dispatched async via `loggerCreate`'s pending queue.
// We drain before reading; otherwise the SELECT can race the INSERT and
// return nothing.
export async function findLogsForSession(sessionId: string): Promise<Log[]> {
    await testLogger.drain();
    return testDb.select().from(logs).where(eq(logs.sessionId, sessionId));
}
