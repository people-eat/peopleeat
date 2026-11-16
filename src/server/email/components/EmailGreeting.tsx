import { Text } from 'react-email';

import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { emailStyles } from './emailStyles';

export function EmailGreeting({ recipientFirstName, locale }: { recipientFirstName?: string; locale: Locale }) {
    const name = recipientFirstName?.trim();
    const greeting = name ? tEmail(locale, 'common.greetingNamed', { name }) : tEmail(locale, 'common.greeting');

    return <Text style={emailStyles.text}>{greeting}</Text>;
}
