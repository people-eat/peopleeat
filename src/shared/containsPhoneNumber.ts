/**
 * Detects phone-number-like digit sequences in free text (DE/international formats).
 * Matches numbers with optional country codes and common separators (spaces, dashes, dots, slashes, parentheses).
 */
export function containsPhoneNumber(text: string): boolean {
    const matches = text.match(/(?:\+|00)?\d(?:[\s\-./()]*\d){6,14}/gu);
    if (!matches) {
        return false;
    }

    return matches.some((match) => {
        const digits = match.replace(/\D/gu, '');
        return digits.length >= 7 && digits.length <= 15;
    });
}
