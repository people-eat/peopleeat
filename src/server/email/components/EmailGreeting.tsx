import { Text } from 'react-email';

import type { Locale } from '../../../shared/locale';
import { emailStyles } from './emailStyles';

export function EmailGreeting({ recipientFirstName, locale }: { recipientFirstName?: string; locale: Locale }) {
    const name = recipientFirstName?.trim();
    const greeting = name ? { de: `Hallo ${name},`, en: `Hey ${name},` }[locale] : { de: 'Hallo,', en: 'Hey,' }[locale];

    return <Text style={emailStyles.text}>{greeting}</Text>;
}
