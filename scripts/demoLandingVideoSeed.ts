/**
 * Idempotent seed for German landing-page booking-video demos.
 *
 * Usage: npm run demo:landing-video-seed
 *
 * Reads DATABASE_URL from .env.local. Safe to re-run: deletes previous demo
 * rows by stable ids, then recreates. Leaves BOOKING_REQUEST_RESTRICTIONS off.
 *
 * Writes scripts/demo-landing-video-manifest.json with URLs, session cookie,
 * and clip deep-links for the ChatGPT recording brief.
 */
import { config } from 'dotenv';
import { eq, inArray, like, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { bookingRequestOfferPriceCalculate } from '../src/shared/bookingRequestOfferPrice';
import { idCreate } from '../src/shared/idCreate';
import * as schema from '../src/server/db/schema';
import {
    bookingRequestCooks,
    bookingRequestOfferEvents,
    bookingRequestOffers,
    bookingRequestParticipants,
    bookingRequests,
    cookCallAvailabilityRules,
    cookCallSlotBookings,
    cooks,
    cookieSettings,
    featureToggles,
    meals,
    menuCourseMealOptions,
    menuCourses,
    menus,
    sessions,
    users,
} from '../src/server/db/schema';

config({ path: ['.env.local'] });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error('DATABASE_URL is not set (.env.local)');
    process.exit(1);
}

const webPageUrl = (process.env.WEB_PAGE_URL ?? 'http://localhost:3000/').replace(/\/?$/, '/');
const sessionCookieName = process.env.sessionCookieName ?? 'people-eat-session-id';

const db = drizzle(databaseUrl, { schema });

/** Stable 20-char nanoIds so re-seeds replace the same rows. */
const IDS = {
    annaUserId: 'dmLvAnnaCustomer0001',
    annaSessionId: 'dmLvAnnaSession00001',
    cookMarcoId: 'dmLvCookMarco0000001',
    cookLenaId: 'dmLvCookLena00000001',
    cookSophieId: 'dmLvCookSophie000001',
    bookingRequestId: 'dmLvBookingRequest01',
    offerMarcoId: 'dmLvOfferMarco000001',
    offerLenaId: 'dmLvOfferLena0000001',
    offerSophieId: 'dmLvOfferSophie00001',
    callSlotId: 'dmLvCallSlot00000001',
} as const;

const munichVenue = {
    displayText: 'Leopoldstraße 50, 80802 München, Deutschland',
    latitude: 48.1589,
    longitude: 11.5851,
    addressLine1: 'Leopoldstraße 50',
    addressLine2: '',
    city: 'München',
    postCode: '80802',
    state: 'BY',
    country: 'DE',
} as const;

const cookOrigins = {
    marco: {
        displayText: 'Belgradstraße 12, 80796 München, Deutschland',
        latitude: 48.1645,
        longitude: 11.5732,
        addressLine1: 'Belgradstraße 12',
        addressLine2: '',
        city: 'München',
        postCode: '80796',
        state: 'BY',
        country: 'DE',
    },
    lena: {
        displayText: 'Isabellastraße 8, 80798 München, Deutschland',
        latitude: 48.1552,
        longitude: 11.5768,
        addressLine1: 'Isabellastraße 8',
        addressLine2: '',
        city: 'München',
        postCode: '80798',
        state: 'BY',
        country: 'DE',
    },
    sophie: {
        displayText: 'Hohenzollernstraße 40, 80801 München, Deutschland',
        latitude: 48.1601,
        longitude: 11.5804,
        addressLine1: 'Hohenzollernstraße 40',
        addressLine2: '',
        city: 'München',
        postCode: '80801',
        state: 'BY',
        country: 'DE',
    },
} as const;

const farFutureLegal = {
    lastAcceptedPrivacyPolicy: new Date('9999-12-31T00:00:00.000Z'),
    lastAcceptedTerms: new Date('9999-12-31T00:00:00.000Z'),
};

function nextSaturdayAt19Berlin(from = new Date()): Date {
    const date = new Date(from);
    date.setUTCHours(18, 0, 0, 0); // 19:00 Europe/Berlin in winter (CET)
    const day = date.getUTCDay();
    const daysUntilSaturday = (6 - day + 7) % 7 || 7;
    date.setUTCDate(date.getUTCDate() + daysUntilSaturday + 21); // ~4 weeks out
    return date;
}

function daysFromNowAt(hourBerlin: number, dayOffset: number): Date {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + dayOffset);
    date.setUTCHours(hourBerlin - 1, 0, 0, 0); // CET winter offset
    return date;
}

async function wipePreviousDemo(): Promise<void> {
    const demoUserIds = [IDS.annaUserId, IDS.cookMarcoId, IDS.cookLenaId, IDS.cookSophieId];

    await db.delete(sessions).where(eq(sessions.sessionId, IDS.annaSessionId));
    await db.delete(sessions).where(inArray(sessions.userId, demoUserIds));
    await db.delete(users).where(inArray(users.userId, demoUserIds));
    await db.delete(users).where(
        or(
            like(users.emailAddress, 'demo.landing.video%@peopleeat.demo'),
            like(users.emailAddress, '%@demo.people-eat.local'),
        ),
    );
}

async function ensureRestrictionsOff(): Promise<void> {
    await db
        .insert(featureToggles)
        .values({ featureToggleKey: 'BOOKING_REQUEST_RESTRICTIONS', enabled: false })
        .onConflictDoUpdate({
            target: featureToggles.featureToggleKey,
            set: { enabled: false, updatedAt: new Date() },
        });
}

async function insertUser(input: {
    userId: string;
    emailAddress: string;
    firstName: string;
    lastName: string;
}): Promise<void> {
    await db.insert(users).values({
        userId: input.userId,
        emailAddress: input.emailAddress,
        firstName: input.firstName,
        lastName: input.lastName,
        status: 'ACTIVE',
        locale: 'de',
        timeZone: 'Europe/Berlin',
        preferredCommunication: 'E_MAIL',
        ...farFutureLegal,
    });
}

async function insertCook(input: {
    cookId: string;
    stageName: string;
    biography: string;
    biographySummary: string;
    cuisineStyle: string;
    cookingPhilosophy: string;
    origin: (typeof cookOrigins)[keyof typeof cookOrigins];
    callSchedulingEnabled: boolean;
}): Promise<void> {
    await db.insert(cooks).values({
        cookId: input.cookId,
        isVisible: true,
        isApprovedByAdmin: true,
        stageName: input.stageName,
        biography: input.biography,
        biographySummary: input.biographySummary,
        cuisineStyle: input.cuisineStyle,
        cookingPhilosophy: input.cookingPhilosophy,
        exactTravelOriginAddress: input.origin,
        travelExpensesAmount: 30,
        maximumTravelDistance: 40,
        callSchedulingEnabled: input.callSchedulingEnabled,
        callDurationMinutes: 30,
        stripeAccountId: `acct_demo_${input.cookId.slice(-6)}`,
        stripeAccountActive: true,
    });

    if (input.callSchedulingEnabled) {
        // Mon–Fri 10:00–18:00 Europe/Berlin wall clock as minute-of-day.
        for (const dayOfWeek of [1, 2, 3, 4, 5]) {
            await db.insert(cookCallAvailabilityRules).values({
                cookCallAvailabilityRuleId: idCreate(),
                cookId: input.cookId,
                dayOfWeek,
                startMinuteOfDay: 10 * 60,
                endMinuteOfDay: 18 * 60,
            });
        }
    }
}

async function insertMenuWithCourses(input: {
    cookId: string;
    title: string;
    description: string;
    courses: { title: string; meals: { title: string; description: string }[] }[];
    bookingRequestOfferId?: string;
}): Promise<string> {
    const menuId = idCreate();
    const now = new Date();
    await db.insert(menus).values({
        menuId,
        cookId: input.cookId,
        title: input.title,
        description: input.description,
        publishedAt: now,
        bookingRequestOfferId: input.bookingRequestOfferId,
        copyOfMenuId: undefined,
    });

    for (const [courseIndex, course] of input.courses.entries()) {
        const courseId = idCreate();
        await db.insert(menuCourses).values({
            courseId,
            menuId,
            cookId: input.cookId,
            index: courseIndex,
            title: course.title,
        });
        for (const [mealIndex, meal] of course.meals.entries()) {
            const mealId = idCreate();
            await db.insert(meals).values({
                mealId,
                cookId: input.cookId,
                title: meal.title,
                description: meal.description,
                publishedAt: now,
            });
            await db.insert(menuCourseMealOptions).values({
                mealOptionId: idCreate(),
                courseId,
                cookId: input.cookId,
                mealId,
                index: mealIndex,
            });
        }
    }
    return menuId;
}

async function insertOffer(input: {
    bookingRequestOfferId: string;
    cookId: string;
    menuPriceCents: number;
    travelDistanceKm: number;
    travelExpensesCents: number;
    cookAccepted?: boolean;
}): Promise<ReturnType<typeof bookingRequestOfferPriceCalculate>> {
    const price = bookingRequestOfferPriceCalculate({
        menuPriceCents: input.menuPriceCents,
        travelExpensesCents: input.travelExpensesCents,
    });

    await db.insert(bookingRequestOffers).values({
        bookingRequestOfferId: input.bookingRequestOfferId,
        bookingRequestId: IDS.bookingRequestId,
        cookId: input.cookId,
        userAccepted: null,
        cookAccepted: input.cookAccepted ?? true,
        userUnreadNotificationCount: 0,
        cookUnreadNotificationCount: 0,
        adminChatReviewPendingCount: 0,
        travelDistanceKm: input.travelDistanceKm,
        menuPriceCents: price.menuPriceCents,
        travelExpensesCents: price.travelExpensesCents,
        paymentProviderFeeCents: price.paymentProviderFeeCents,
        platformFeePercentCook: price.platformFeePercentCook,
        platformFeePercentCustomer: price.platformFeePercentCustomer,
        platformFeeCentsCook: price.platformFeeCentsCook,
        platformFeeCentsCustomer: price.platformFeeCentsCustomer,
        payoutCentsCook: price.payoutCentsCook,
        totalWithoutDiscountsCentsCustomer: price.totalWithoutDiscountsCentsCustomer,
        paymentStatus: 'EMPTY',
    });

    return price;
}

async function main(): Promise<void> {
    const parsedUrl = new URL(databaseUrl!);
    console.log(`Seeding demo landing video data into ${parsedUrl.host}${parsedUrl.pathname}`);

    await wipePreviousDemo();
    await ensureRestrictionsOff();

    await insertUser({
        userId: IDS.annaUserId,
        emailAddress: 'anna.mueller@demo.people-eat.local',
        firstName: 'Anna',
        lastName: 'Müller',
    });
    await insertUser({
        userId: IDS.cookMarcoId,
        emailAddress: 'marco.rossi@demo.people-eat.local',
        firstName: 'Marco',
        lastName: 'Rossi',
    });
    await insertUser({
        userId: IDS.cookLenaId,
        emailAddress: 'lena.hartmann@demo.people-eat.local',
        firstName: 'Lena',
        lastName: 'Hartmann',
    });
    await insertUser({
        userId: IDS.cookSophieId,
        emailAddress: 'sophie.berger@demo.people-eat.local',
        firstName: 'Sophie',
        lastName: 'Berger',
    });

    await insertCook({
        cookId: IDS.cookMarcoId,
        stageName: 'Marco Rossi',
        biography:
            'Ich koche italienisch mit Produkten aus der Region. Pasta frisch, Saucen langsam, und der Tisch soll sich wie bei Freunden anfühlen.',
        biographySummary: 'Italienische Küche aus München, warm und einladend.',
        cuisineStyle: 'Italienisch',
        cookingPhilosophy: 'Saisonal',
        origin: cookOrigins.marco,
        callSchedulingEnabled: true,
    });
    await insertCook({
        cookId: IDS.cookLenaId,
        stageName: 'Lena Hartmann',
        biography: 'Modern deutsch, klar und leicht. Ich liebe Gemüse vom Markt und Gerichte, die Gäste ins Gespräch bringen.',
        biographySummary: 'Moderne deutsche Küche mit Fokus auf Gemüse.',
        cuisineStyle: 'Deutsch',
        cookingPhilosophy: 'Regional',
        origin: cookOrigins.lena,
        callSchedulingEnabled: false,
    });
    await insertCook({
        cookId: IDS.cookSophieId,
        stageName: 'Sophie Berger',
        biography: 'Französische Klassiker, unkompliziert serviert. Weniger Theater, mehr Geschmack.',
        biographySummary: 'Französische Klassiker für den privaten Tisch.',
        cuisineStyle: 'Französisch',
        cookingPhilosophy: 'Klassisch',
        origin: cookOrigins.sophie,
        callSchedulingEnabled: false,
    });

    // Inventory menus (visible under cook profile; offer pages use offer-scoped copies below).
    await insertMenuWithCourses({
        cookId: IDS.cookMarcoId,
        title: 'Abend in der Toskana',
        description: 'Drei Gänge mit Antipasti, frischer Pasta und einem leichten Dessert.',
        courses: [
            {
                title: 'Vorspeise',
                meals: [
                    {
                        title: 'Burrata mit Ofentomaten',
                        description: 'Burrata, geröstete Kirschtomaten, Basilikum, Olivenöl.',
                    },
                ],
            },
            {
                title: 'Hauptspeise',
                meals: [
                    {
                        title: 'Tagliatelle al Tartufo',
                        description: 'Frische Tagliatelle mit Trüffelbutter und Parmigiano.',
                    },
                    {
                        title: 'Branzino vom Blech',
                        description: 'Wolfsbarsch mit Zitrone, Fenchel und Oliven.',
                    },
                ],
            },
            {
                title: 'Dessert',
                meals: [
                    {
                        title: 'Tiramisu im Glas',
                        description: 'Klassisch, nicht zu süß, mit Espresso und Mascarpone.',
                    },
                ],
            },
        ],
    });

    await insertMenuWithCourses({
        cookId: IDS.cookLenaId,
        title: 'Münchner Marktmenü',
        description: 'Leichte deutsche Küche mit Gemüse und einem klaren Hauptgang.',
        courses: [
            {
                title: 'Vorspeise',
                meals: [{ title: 'Rote-Bete-Carpaccio', description: 'Mit Ziegenkäse, Walnuss und Meerrettich.' }],
            },
            {
                title: 'Hauptspeise',
                meals: [{ title: 'Zander auf Selleriepüree', description: 'Knusprige Haut, Braune Butter, Kapern.' }],
            },
            {
                title: 'Dessert',
                meals: [{ title: 'Apfeltarte', description: 'Warm, mit Vanilleeis.' }],
            },
        ],
    });

    await insertMenuWithCourses({
        cookId: IDS.cookSophieId,
        title: 'Paris chez toi',
        description: 'Drei französische Gänge für einen festlichen Abend.',
        courses: [
            {
                title: 'Vorspeise',
                meals: [{ title: 'Soupe à l’oignon', description: 'Zwiebelsuppe mit Gruyère-Croutons.' }],
            },
            {
                title: 'Hauptspeise',
                meals: [{ title: 'Poulet rôti', description: 'Ofenhuhn mit Estragon und Kartoffelgratin.' }],
            },
            {
                title: 'Dessert',
                meals: [{ title: 'Crème brûlée', description: 'Vanille, knusprige Karamellkruste.' }],
            },
        ],
    });

    const eventDateTime = nextSaturdayAt19Berlin();
    const expiresAt = new Date(eventDateTime.getTime() - 2 * 24 * 60 * 60 * 1000);

    await db.insert(bookingRequests).values({
        bookingRequestId: IDS.bookingRequestId,
        userId: IDS.annaUserId,
        occasion: 'Geburtstag',
        dateTime: eventDateTime,
        exactEventAddress: munichVenue,
        priceClassType: 'MEDIUM',
        originalMessage:
            'Hallo! Ich feiere meinen 40. Geburtstag mit engen Freunden. Offene Küche ist okay, wir freuen uns über italienische Impulse und ein entspanntes Tempo.',
        adjustedMessage:
            'Hallo! Ich feiere meinen 40. Geburtstag mit engen Freunden. Offene Küche ist okay, wir freuen uns über italienische Impulse und ein entspanntes Tempo.',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: ['Italienisch', 'Saisonal'],
        expiresAt,
    });

    for (let i = 0; i < 8; i += 1) {
        await db.insert(bookingRequestParticipants).values({
            bookingRequestParticipantId: idCreate(),
            bookingRequestId: IDS.bookingRequestId,
            type: 'ADULT',
            name: i === 0 ? 'Anna' : `Gast ${i}`,
            restrictions: [],
        });
    }

    const now = new Date();
    for (const cookId of [IDS.cookMarcoId, IDS.cookLenaId, IDS.cookSophieId]) {
        await db.insert(bookingRequestCooks).values({
            cookId,
            bookingRequestId: IDS.bookingRequestId,
            notifiedAt: now,
            firstOpenedAt: now,
            travelDistanceKm: cookId === IDS.cookMarcoId ? 4.2 : cookId === IDS.cookLenaId ? 3.1 : 2.8,
        });
    }

    // 8 adults × ~€85 / soft Signature guidance → realistic menu totals.
    const marcoPrice = await insertOffer({
        bookingRequestOfferId: IDS.offerMarcoId,
        cookId: IDS.cookMarcoId,
        menuPriceCents: 68_000,
        travelDistanceKm: 4.2,
        travelExpensesCents: Math.round(4.2 * 30 * 2),
    });
    const lenaPrice = await insertOffer({
        bookingRequestOfferId: IDS.offerLenaId,
        cookId: IDS.cookLenaId,
        menuPriceCents: 60_000,
        travelDistanceKm: 3.1,
        travelExpensesCents: Math.round(3.1 * 30 * 2),
    });
    const sophiePrice = await insertOffer({
        bookingRequestOfferId: IDS.offerSophieId,
        cookId: IDS.cookSophieId,
        menuPriceCents: 72_000,
        travelDistanceKm: 2.8,
        travelExpensesCents: Math.round(2.8 * 30 * 2),
    });

    // Offer-scoped menu copies (what the customer sees on each offer).
    await insertMenuWithCourses({
        cookId: IDS.cookMarcoId,
        bookingRequestOfferId: IDS.offerMarcoId,
        title: 'Abend in der Toskana',
        description: 'Drei Gänge mit Antipasti, frischer Pasta und einem leichten Dessert.',
        courses: [
            {
                title: 'Vorspeise',
                meals: [{ title: 'Burrata mit Ofentomaten', description: 'Burrata, geröstete Kirschtomaten, Basilikum, Olivenöl.' }],
            },
            {
                title: 'Hauptspeise',
                meals: [
                    { title: 'Tagliatelle al Tartufo', description: 'Frische Tagliatelle mit Trüffelbutter und Parmigiano.' },
                    { title: 'Branzino vom Blech', description: 'Wolfsbarsch mit Zitrone, Fenchel und Oliven.' },
                ],
            },
            {
                title: 'Dessert',
                meals: [{ title: 'Tiramisu im Glas', description: 'Klassisch, nicht zu süß, mit Espresso und Mascarpone.' }],
            },
        ],
    });
    await insertMenuWithCourses({
        cookId: IDS.cookLenaId,
        bookingRequestOfferId: IDS.offerLenaId,
        title: 'Münchner Marktmenü',
        description: 'Leichte deutsche Küche mit Gemüse und einem klaren Hauptgang.',
        courses: [
            {
                title: 'Vorspeise',
                meals: [{ title: 'Rote-Bete-Carpaccio', description: 'Mit Ziegenkäse, Walnuss und Meerrettich.' }],
            },
            {
                title: 'Hauptspeise',
                meals: [{ title: 'Zander auf Selleriepüree', description: 'Knusprige Haut, Braune Butter, Kapern.' }],
            },
            {
                title: 'Dessert',
                meals: [{ title: 'Apfeltarte', description: 'Warm, mit Vanilleeis.' }],
            },
        ],
    });
    await insertMenuWithCourses({
        cookId: IDS.cookSophieId,
        bookingRequestOfferId: IDS.offerSophieId,
        title: 'Paris chez toi',
        description: 'Drei französische Gänge für einen festlichen Abend.',
        courses: [
            {
                title: 'Vorspeise',
                meals: [{ title: 'Soupe à l’oignon', description: 'Zwiebelsuppe mit Gruyère-Croutons.' }],
            },
            {
                title: 'Hauptspeise',
                meals: [{ title: 'Poulet rôti', description: 'Ofenhuhn mit Estragon und Kartoffelgratin.' }],
            },
            {
                title: 'Dessert',
                meals: [{ title: 'Crème brûlée', description: 'Vanille, knusprige Karamellkruste.' }],
            },
        ],
    });

    // Marco offer chat timeline (German).
    const chatBase = Date.now() - 60 * 60 * 1000;
    await db.insert(bookingRequestOfferEvents).values([
        {
            bookingRequestOfferEventId: idCreate(),
            bookingRequestOfferId: IDS.offerMarcoId,
            type: 'USER_MESSAGE_SIMPLE',
            payload: {
                messageBody:
                    'Hallo! Ich feiere meinen 40. Geburtstag mit engen Freunden. Offene Küche ist okay, wir freuen uns über italienische Impulse und ein entspanntes Tempo.',
            },
            createdAt: new Date(chatBase),
        },
        {
            bookingRequestOfferEventId: idCreate(),
            bookingRequestOfferId: IDS.offerMarcoId,
            type: 'COOK_CREATED',
            payload: {
                menuTitles: ['Abend in der Toskana'],
                menuPriceCents: marcoPrice.menuPriceCents,
                totalWithoutDiscountsCentsCustomer: marcoPrice.totalWithoutDiscountsCentsCustomer,
            },
            createdAt: new Date(chatBase + 60_000),
        },
        {
            bookingRequestOfferEventId: idCreate(),
            bookingRequestOfferId: IDS.offerMarcoId,
            type: 'COOK_MESSAGE_SIMPLE',
            payload: {
                messageBody:
                    'Liebe Anna, herzlichen Glückwunsch zum Geburtstag im Voraus. Ich würde euch Burrata, frische Pasta und ein leichtes Tiramisu vorschlagen. Passt das für euch?',
            },
            createdAt: new Date(chatBase + 120_000),
        },
        {
            bookingRequestOfferEventId: idCreate(),
            bookingRequestOfferId: IDS.offerMarcoId,
            type: 'USER_MESSAGE_SIMPLE',
            payload: {
                messageBody: 'Das klingt wunderbar. Können wir vorab kurz telefonieren und Allergien durchgehen?',
            },
            createdAt: new Date(chatBase + 180_000),
        },
        {
            bookingRequestOfferEventId: idCreate(),
            bookingRequestOfferId: IDS.offerMarcoId,
            type: 'COOK_MESSAGE_SIMPLE',
            payload: {
                messageBody: 'Sehr gerne. Ich habe diese Woche noch freie Termine. Schau gerne unter Anruf vorbei.',
            },
            createdAt: new Date(chatBase + 240_000),
        },
    ]);

    // Sibling offers: minimal create milestones so cards look live.
    for (const [offerId, price] of [
        [IDS.offerLenaId, lenaPrice] as const,
        [IDS.offerSophieId, sophiePrice] as const,
    ]) {
        await db.insert(bookingRequestOfferEvents).values([
            {
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId: offerId,
                type: 'USER_MESSAGE_SIMPLE',
                payload: {
                    messageBody:
                        'Hallo! Ich feiere meinen 40. Geburtstag mit engen Freunden. Offene Küche ist okay, wir freuen uns über italienische Impulse und ein entspanntes Tempo.',
                },
            },
            {
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId: offerId,
                type: 'COOK_CREATED',
                payload: {
                    menuTitles: offerId === IDS.offerLenaId ? ['Münchner Marktmenü'] : ['Paris chez toi'],
                    menuPriceCents: price.menuPriceCents,
                    totalWithoutDiscountsCentsCustomer: price.totalWithoutDiscountsCentsCustomer,
                },
            },
        ]);
    }

    const callStart = daysFromNowAt(11, 2);
    const callEnd = new Date(callStart.getTime() + 30 * 60 * 1000);
    await db.insert(cookCallSlotBookings).values({
        cookCallSlotBookingId: IDS.callSlotId,
        cookId: IDS.cookMarcoId,
        userId: IDS.annaUserId,
        bookingRequestOfferId: IDS.offerMarcoId,
        startAt: callStart,
        endAt: callEnd,
        status: 'CONFIRMED',
        initiator: 'CUSTOMER',
        customerMessage: 'Kurzes Kennenlernen vor dem Geburtstag.',
    });

    await db.insert(sessions).values({
        sessionId: IDS.annaSessionId,
        userId: IDS.annaUserId,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X) peopleeat-demo-landing-video',
        isBot: false,
        landingPath: '/',
        referrer: 'https://people-eat.com/',
    });
    await db.insert(cookieSettings).values({
        sessionId: IDS.annaSessionId,
        googleAnalytics: false,
        clarity: false,
    });

    const requestPath = `/profile/booking-requests/${IDS.bookingRequestId}`;
    const offerPath = `${requestPath}/offers/${IDS.offerMarcoId}`;
    const manifest = {
        seededAt: new Date().toISOString(),
        locale: 'de',
        baseUrl: webPageUrl.replace(/\/$/, ''),
        sessionCookie: {
            name: sessionCookieName,
            value: IDS.annaSessionId,
            domain: 'localhost',
            path: '/',
            httpOnly: true,
            sameSite: 'Lax',
        },
        localeCookie: { name: 'locale', value: 'de' },
        people: {
            customer: {
                name: 'Anna Müller',
                email: 'anna.mueller@demo.people-eat.local',
                userId: IDS.annaUserId,
            },
            cooks: [
                { name: 'Marco Rossi', email: 'marco.rossi@demo.people-eat.local', cookId: IDS.cookMarcoId },
                { name: 'Lena Hartmann', email: 'lena.hartmann@demo.people-eat.local', cookId: IDS.cookLenaId },
                { name: 'Sophie Berger', email: 'sophie.berger@demo.people-eat.local', cookId: IDS.cookSophieId },
            ],
        },
        booking: {
            bookingRequestId: IDS.bookingRequestId,
            occasion: 'Geburtstag',
            guests: 8,
            venue: munichVenue.displayText,
            dateTimeIso: eventDateTime.toISOString(),
            priceClass: 'MEDIUM (Signature)',
            preferences: ['Italienisch', 'Saisonal'],
            heroOfferId: IDS.offerMarcoId,
            offerIds: [IDS.offerMarcoId, IDS.offerLenaId, IDS.offerSophieId],
            confirmedCallSlotId: IDS.callSlotId,
            confirmedCallStartIso: callStart.toISOString(),
        },
        urls: {
            landing: webPageUrl.replace(/\/$/, '') || 'http://localhost:3000',
            bookingForm: `${webPageUrl.replace(/\/$/, '')}/booking-request/form`,
            requestDetail: `${webPageUrl.replace(/\/$/, '')}${requestPath}`,
            marcoOffer: `${webPageUrl.replace(/\/$/, '')}${offerPath}`,
            marcoOfferChat: `${webPageUrl.replace(/\/$/, '')}${offerPath}?tab=chat`,
            marcoOfferCall: `${webPageUrl.replace(/\/$/, '')}${offerPath}?tab=call`,
        },
        featureToggles: {
            BOOKING_REQUEST_RESTRICTIONS: false,
        },
        stripeTestCard: {
            number: '4242424242424242',
            expiry: 'any future date',
            cvc: 'any 3 digits',
            note: 'Use only if Clip D records real checkout. Prefer stopping at Accept confirm if Stripe Elements is flaky.',
        },
        notes: [
            'Clip A creates a NEW request while signed in as Anna. Clips B–D use the pre-seeded Geburtstag request.',
            'Re-run npm run demo:landing-video-seed after Clip D if accept/pay mutated the hero offer.',
            'Meal images are intentionally empty (icon fallback). Do not pause on empty photo grids.',
        ],
    };

    const manifestPath = resolve('scripts/demo-landing-video-manifest.json');
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

    console.log('Demo seed complete.');
    console.log(`Manifest: ${manifestPath}`);
    console.log(`Session cookie: ${sessionCookieName}=${IDS.annaSessionId}`);
    console.log(`Request: ${manifest.urls.requestDetail}`);
    console.log(`Hero offer: ${manifest.urls.marcoOffer}`);
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
