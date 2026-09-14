import { Text } from 'react-email';

import type { Locale } from '../../../shared/locale';
import { emailStyles } from './emailStyles';

export function EmailSignOff({ locale }: { locale: Locale }) {
    const closing = { de: 'Liebe Grüße,', en: 'Kind regards,' }[locale];
    const team = { de: 'Dein peopleeat Team ❤️', en: 'Your peopleeat Team ❤️' }[locale];

    return (
        <Text style={emailStyles.signOff}>
            {closing}
            <br />
            {team}
        </Text>
    );
}
