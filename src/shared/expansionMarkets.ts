import { inlineCopy } from './locale';
import type { Locale } from './locale';
import { toStripeCountryCode } from './toStripeCountryCode';

const expansionMarketSlugs = ['netherlands', 'switzerland'] as const;
export type ExpansionMarketSlug = (typeof expansionMarketSlugs)[number];

export const BOOKING_REQUEST_MARKET_CLOSED_ERROR = 'bookingRequestMarketClosed';

type ExpansionMarketCity = {
    nameDe: string;
    nameEn: string;
    latitude: number;
    longitude: number;
};

type ExpansionMarketFaq = {
    question: { de: string; en: string };
    answer: { de: string; en: string };
};

export type ExpansionMarket = {
    slug: ExpansionMarketSlug;
    countryCode: 'NL' | 'CH';
    nameDe: string;
    nameEn: string;
    /** Accusative of motion: "in die Niederlande" / "in die Schweiz". */
    comingToPhraseDe: string;
    comingToPhraseEn: string;
    /** Locative: "in den Niederlanden" / "in der Schweiz". */
    inCountryDe: string;
    inCountryEn: string;
    flagSrc: string;
    flagMarkSrc: string;
    comingToPath: string;
    foundingChefPath: string;
    cities: readonly ExpansionMarketCity[];
    comingToTitle: { de: string; en: string };
    comingToDescription: { de: string; en: string };
    foundingChefTitle: { de: string; en: string };
    foundingChefDescription: { de: string; en: string };
    comingToFaqs: readonly ExpansionMarketFaq[];
    foundingChefFaqs: readonly ExpansionMarketFaq[];
};

const netherlandsCities = [
    { nameDe: 'Amsterdam', nameEn: 'Amsterdam', latitude: 52.3676, longitude: 4.9041 },
    { nameDe: 'Rotterdam', nameEn: 'Rotterdam', latitude: 51.9244, longitude: 4.4777 },
    { nameDe: 'Den Haag', nameEn: 'The Hague', latitude: 52.0705, longitude: 4.3007 },
    { nameDe: 'Utrecht', nameEn: 'Utrecht', latitude: 52.0907, longitude: 5.1214 },
    { nameDe: 'Eindhoven', nameEn: 'Eindhoven', latitude: 51.4416, longitude: 5.4697 },
] as const satisfies readonly ExpansionMarketCity[];

const switzerlandCities = [
    { nameDe: 'Zürich', nameEn: 'Zurich', latitude: 47.3769, longitude: 8.5417 },
    { nameDe: 'Genf', nameEn: 'Geneva', latitude: 46.2044, longitude: 6.1432 },
    { nameDe: 'Basel', nameEn: 'Basel', latitude: 47.5596, longitude: 7.5886 },
    { nameDe: 'Bern', nameEn: 'Bern', latitude: 46.948, longitude: 7.4474 },
    { nameDe: 'Lausanne', nameEn: 'Lausanne', latitude: 46.5197, longitude: 6.6323 },
] as const satisfies readonly ExpansionMarketCity[];

function cityList(cities: readonly ExpansionMarketCity[], locale: Locale): string {
    const names = cities.map((city) => (locale === 'de' ? city.nameDe : city.nameEn));
    if (names.length === 0) return '';
    if (names.length === 1) return names[0] ?? '';
    const last = names.at(-1) ?? '';
    const head = names.slice(0, -1).join(', ');
    return locale === 'de' ? `${head} und ${last}` : `${head}, and ${last}`;
}

const netherlands: ExpansionMarket = {
    slug: 'netherlands',
    countryCode: 'NL',
    nameDe: 'Niederlande',
    nameEn: 'the Netherlands',
    comingToPhraseDe: 'in die Niederlande',
    comingToPhraseEn: 'to the Netherlands',
    inCountryDe: 'in den Niederlanden',
    inCountryEn: 'in the Netherlands',
    flagSrc: '/countries/flag-netherlands.png',
    flagMarkSrc: '/countries/flag-netherlands-peopleeat.png',
    comingToPath: '/coming-to/netherlands',
    foundingChefPath: '/how-to-become-a-chef/netherlands',
    cities: netherlandsCities,
    comingToTitle: {
        de: 'peopleeat kommt in die Niederlande',
        en: 'peopleeat is coming to the Netherlands',
    },
    comingToDescription: {
        de: 'Köche können sich jetzt anmelden. Gastgeber buchen Anfang 2027. Amsterdam, Rotterdam, Den Haag, Utrecht, Eindhoven.',
        en: 'Chefs can join now. Hosts book from early 2027. Amsterdam, Rotterdam, The Hague, Utrecht, Eindhoven.',
    },
    foundingChefTitle: {
        de: 'Gründungskoch in den Niederlanden',
        en: 'Become a founding chef in the Netherlands',
    },
    foundingChefDescription: {
        de: 'Melde dich früh als Privatkoch in den Niederlanden an. Profil jetzt, Gastanfragen ab Anfang 2027.',
        en: 'Join early as a private chef in the Netherlands. Profile now, guest requests from early 2027.',
    },
    comingToFaqs: [
        {
            question: {
                de: 'Kann ich in den Niederlanden schon einen Koch buchen?',
                en: 'Can I book a chef in the Netherlands already?',
            },
            answer: {
                de: 'Nein. peopleeat nimmt in den Niederlanden noch keine Buchungsanfragen von Gastgebern entgegen. Der Start für Gäste ist Anfang 2027. Köche können sich jetzt anmelden.',
                en: 'No. peopleeat is not taking host booking requests in the Netherlands yet. Guest booking starts in early 2027. Chefs can join now.',
            },
        },
        {
            question: {
                de: 'Kann ich mich als Koch jetzt registrieren?',
                en: 'Can I register as a chef now?',
            },
            answer: {
                de: 'Ja. Gründungsköche in Amsterdam, Rotterdam, Den Haag, Utrecht und Eindhoven können Profil und erstes Menü jetzt anlegen. Gastanfragen folgen Anfang 2027.',
                en: 'Yes. Founding chefs in Amsterdam, Rotterdam, The Hague, Utrecht, and Eindhoven can set up a profile and first menu now. Guest requests follow in early 2027.',
            },
        },
        {
            question: {
                de: 'In welchen Städten startet peopleeat?',
                en: 'Which cities is peopleeat launching in?',
            },
            answer: {
                de: 'Zum Start nennen wir Amsterdam, Rotterdam, Den Haag, Utrecht und Eindhoven. Köche mit passendem Reisegebiet können auch umliegende Orte abdecken.',
                en: 'At launch we name Amsterdam, Rotterdam, The Hague, Utrecht, and Eindhoven. Chefs with a matching travel radius can also cover nearby places.',
            },
        },
        {
            question: {
                de: 'Was passiert, wenn ich trotzdem eine Anfrage sende?',
                en: 'What happens if I still send a request?',
            },
            answer: {
                de: 'Eine Adresse in den Niederlanden können wir noch nicht als Buchungsanfrage annehmen. Bitte warte auf den Start Anfang 2027, oder registriere dich als Koch, wenn du kochen möchtest.',
                en: 'We cannot accept a booking request for an address in the Netherlands yet. Please wait for the early 2027 launch, or register as a chef if you want to cook.',
            },
        },
    ],
    foundingChefFaqs: [
        {
            question: {
                de: 'Bekomme ich sofort Buchungsanfragen?',
                en: 'Will I receive booking requests right away?',
            },
            answer: {
                de: 'Nein. Du kannst Profil und Menü jetzt fertigstellen. Gastanfragen in den Niederlanden starten Anfang 2027. So bist du am ersten Tag bereit.',
                en: 'No. You can finish your profile and menu now. Guest requests in the Netherlands start in early 2027. That way you are ready on day one.',
            },
        },
        {
            question: {
                de: 'Warum sollte ich mich früh anmelden?',
                en: 'Why should I join early?',
            },
            answer: {
                de: 'Du gehörst zum ersten Koch-Netzwerk vor Ort, dein Profil ist zum Start live, und du wirst auf den ersten Stadtseiten hervorgehoben. Wir begleiten dich persönlich beim Onboarding.',
                en: 'You join the first local chef network, your profile is live at launch, and you are featured on the first city pages. We support you directly during onboarding.',
            },
        },
        {
            question: {
                de: 'Welche Städte kann ich abdecken?',
                en: 'Which cities can I cover?',
            },
            answer: {
                de: 'Trage deinen Startort und Radius ein. Typische Städte sind Amsterdam, Rotterdam, Den Haag, Utrecht und Eindhoven.',
                en: 'Set your travel origin and radius. Typical cities are Amsterdam, Rotterdam, The Hague, Utrecht, and Eindhoven.',
            },
        },
        {
            question: {
                de: 'Gibt es einen Preisvorteil für Gründungsköche?',
                en: 'Is there a price benefit for founding chefs?',
            },
            answer: {
                de: 'Die Vorteile jetzt sind Startplatz, Sichtbarkeit auf den ersten Stadtseiten und direkte Betreuung. Eine gesonderte Gebührenregel nennen wir hier nicht.',
                en: 'The benefits now are your place at launch, visibility on the first city pages, and direct support. We do not name a separate fee arrangement here.',
            },
        },
    ],
};

const switzerland: ExpansionMarket = {
    slug: 'switzerland',
    countryCode: 'CH',
    nameDe: 'Schweiz',
    nameEn: 'Switzerland',
    comingToPhraseDe: 'in die Schweiz',
    comingToPhraseEn: 'to Switzerland',
    inCountryDe: 'in der Schweiz',
    inCountryEn: 'in Switzerland',
    flagSrc: '/countries/flag-switzerland.png',
    flagMarkSrc: '/countries/flag-switzerland-peopleeat.png',
    comingToPath: '/coming-to/switzerland',
    foundingChefPath: '/how-to-become-a-chef/switzerland',
    cities: switzerlandCities,
    comingToTitle: {
        de: 'peopleeat kommt in die Schweiz',
        en: 'peopleeat is coming to Switzerland',
    },
    comingToDescription: {
        de: 'Köche können sich jetzt anmelden. Gastgeber buchen Anfang 2027. Zürich, Genf, Basel, Bern, Lausanne.',
        en: 'Chefs can join now. Hosts book from early 2027. Zurich, Geneva, Basel, Bern, Lausanne.',
    },
    foundingChefTitle: {
        de: 'Gründungskoch in der Schweiz',
        en: 'Become a founding chef in Switzerland',
    },
    foundingChefDescription: {
        de: 'Melde dich früh als Privatkoch in der Schweiz an. Profil jetzt, Gastanfragen ab Anfang 2027.',
        en: 'Join early as a private chef in Switzerland. Profile now, guest requests from early 2027.',
    },
    comingToFaqs: [
        {
            question: {
                de: 'Kann ich in der Schweiz schon einen Koch buchen?',
                en: 'Can I book a chef in Switzerland already?',
            },
            answer: {
                de: 'Nein. peopleeat nimmt in der Schweiz noch keine Buchungsanfragen von Gastgebern entgegen. Der Start für Gäste ist Anfang 2027. Köche können sich jetzt anmelden.',
                en: 'No. peopleeat is not taking host booking requests in Switzerland yet. Guest booking starts in early 2027. Chefs can join now.',
            },
        },
        {
            question: {
                de: 'Kann ich mich als Koch jetzt registrieren?',
                en: 'Can I register as a chef now?',
            },
            answer: {
                de: 'Ja. Gründungsköche in Zürich, Genf, Basel, Bern und Lausanne können Profil und erstes Menü jetzt anlegen. Gastanfragen folgen Anfang 2027.',
                en: 'Yes. Founding chefs in Zurich, Geneva, Basel, Bern, and Lausanne can set up a profile and first menu now. Guest requests follow in early 2027.',
            },
        },
        {
            question: {
                de: 'In welchen Städten startet peopleeat?',
                en: 'Which cities is peopleeat launching in?',
            },
            answer: {
                de: 'Zum Start nennen wir Zürich, Genf, Basel, Bern und Lausanne. Köche mit passendem Reisegebiet können auch umliegende Orte abdecken.',
                en: 'At launch we name Zurich, Geneva, Basel, Bern, and Lausanne. Chefs with a matching travel radius can also cover nearby places.',
            },
        },
        {
            question: {
                de: 'Was passiert, wenn ich trotzdem eine Anfrage sende?',
                en: 'What happens if I still send a request?',
            },
            answer: {
                de: 'Eine Adresse in der Schweiz können wir noch nicht als Buchungsanfrage annehmen. Bitte warte auf den Start Anfang 2027, oder registriere dich als Koch, wenn du kochen möchtest.',
                en: 'We cannot accept a booking request for an address in Switzerland yet. Please wait for the early 2027 launch, or register as a chef if you want to cook.',
            },
        },
    ],
    foundingChefFaqs: [
        {
            question: {
                de: 'Bekomme ich sofort Buchungsanfragen?',
                en: 'Will I receive booking requests right away?',
            },
            answer: {
                de: 'Nein. Du kannst Profil und Menü jetzt fertigstellen. Gastanfragen in der Schweiz starten Anfang 2027. So bist du am ersten Tag bereit.',
                en: 'No. You can finish your profile and menu now. Guest requests in Switzerland start in early 2027. That way you are ready on day one.',
            },
        },
        {
            question: {
                de: 'Warum sollte ich mich früh anmelden?',
                en: 'Why should I join early?',
            },
            answer: {
                de: 'Du gehörst zum ersten Koch-Netzwerk vor Ort, dein Profil ist zum Start live, und du wirst auf den ersten Stadtseiten hervorgehoben. Wir begleiten dich persönlich beim Onboarding.',
                en: 'You join the first local chef network, your profile is live at launch, and you are featured on the first city pages. We support you directly during onboarding.',
            },
        },
        {
            question: {
                de: 'Welche Städte kann ich abdecken?',
                en: 'Which cities can I cover?',
            },
            answer: {
                de: 'Trage deinen Startort und Radius ein. Typische Städte sind Zürich, Genf, Basel, Bern und Lausanne.',
                en: 'Set your travel origin and radius. Typical cities are Zurich, Geneva, Basel, Bern, and Lausanne.',
            },
        },
        {
            question: {
                de: 'Gibt es einen Preisvorteil für Gründungsköche?',
                en: 'Is there a price benefit for founding chefs?',
            },
            answer: {
                de: 'Die Vorteile jetzt sind Startplatz, Sichtbarkeit auf den ersten Stadtseiten und direkte Betreuung. Eine gesonderte Gebührenregel nennen wir hier nicht.',
                en: 'The benefits now are your place at launch, visibility on the first city pages, and direct support. We do not name a separate fee arrangement here.',
            },
        },
    ],
};

const expansionMarkets: Record<ExpansionMarketSlug, ExpansionMarket> = {
    netherlands,
    switzerland,
};

export const expansionMarketList: readonly ExpansionMarket[] = expansionMarketSlugs.map((slug) => expansionMarkets[slug]);

export function expansionMarketFromParam(value: string | undefined | null): ExpansionMarket | null {
    if (value === 'netherlands' || value === 'switzerland') {
        return expansionMarkets[value];
    }
    return null;
}

export function expansionMarketFromCountry(country: string | null | undefined): ExpansionMarket | null {
    const code = toStripeCountryCode(country ?? '');
    if (code === 'NL') return expansionMarkets.netherlands;
    if (code === 'CH') return expansionMarkets.switzerland;
    return null;
}

export function expansionMarketCityList(market: ExpansionMarket, locale: Locale): string {
    return cityList(market.cities, locale);
}

export function expansionMarketFaqEntries(
    faqs: readonly ExpansionMarketFaq[],
    locale: Locale,
): ReadonlyArray<{ question: string; answer: string }> {
    return faqs.map((faq) => ({
        question: inlineCopy(faq.question, locale),
        answer: inlineCopy(faq.answer, locale),
    }));
}

export function placesRegionCodeNormalize(value: string | null | undefined): string {
    const trimmed = value?.trim() ?? '';
    if (/^[A-Za-z]{2}$/.test(trimmed)) {
        return trimmed.toUpperCase();
    }
    return 'DE';
}

export function bookingRequestMarketClosedAssert(country: string, errorPrefix: string): void {
    const market = expansionMarketFromCountry(country);
    if (!market) return;
    throw new Error(`${errorPrefix}: ${BOOKING_REQUEST_MARKET_CLOSED_ERROR}:${market.slug}`);
}

export function bookingRequestMarketClosedFromMessage(message: string | undefined | null): ExpansionMarket | null {
    if (!message) return null;
    const match = message.match(new RegExp(`${BOOKING_REQUEST_MARKET_CLOSED_ERROR}:(netherlands|switzerland)`));
    const slug = match?.[1];
    return expansionMarketFromParam(slug);
}
