/**
 * Stripe Address Element requires ISO 3166-1 alpha-2 country codes.
 * Places usually stores the short code already; map common long names as a fallback.
 */
export function toStripeCountryCode(country: string): string {
    const trimmed = country.trim();
    if (/^[A-Za-z]{2}$/.test(trimmed)) {
        return trimmed.toUpperCase();
    }

    const byName: Record<string, string> = {
        deutschland: 'DE',
        germany: 'DE',
        österreich: 'AT',
        osterreich: 'AT',
        austria: 'AT',
        schweiz: 'CH',
        switzerland: 'CH',
        'united states': 'US',
        'united states of america': 'US',
        usa: 'US',
        frankreich: 'FR',
        france: 'FR',
        niederlande: 'NL',
        netherlands: 'NL',
        belgien: 'BE',
        belgium: 'BE',
        luxemburg: 'LU',
        luxembourg: 'LU',
        italien: 'IT',
        italy: 'IT',
        spanien: 'ES',
        spain: 'ES',
        polen: 'PL',
        poland: 'PL',
        tschechien: 'CZ',
        'czech republic': 'CZ',
        czechia: 'CZ',
    };

    return byName[trimmed.toLowerCase()] ?? '';
}
