import type { Locale } from './locale';

/** Static offer-create note for the cook to edit, in the customer's profile language. */
export function bookingRequestSuggestedOfferMessage(locale: Locale): string {
    return {
        de: 'Hallo! Vielen Dank für deine Anfrage. Ich freue mich darauf, euer Event zu einem besonderen Erlebnis zu machen. Bei Fragen stehe ich gerne zur Verfügung.',
        en: "Hi! Thank you for your request. I'm looking forward to making your event a special experience. Happy to answer any questions.",
    }[locale];
}
