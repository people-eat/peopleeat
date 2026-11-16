import { Text } from 'react-email';

import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { emailStyles } from './emailStyles';

export function EmailSignOff({ locale }: { locale: Locale }) {
    return (
        <Text style={emailStyles.signOff}>
            {tEmail(locale, 'common.signOffClosing')}
            <br />
            {tEmail(locale, 'common.signOffTeam')}
        </Text>
    );
}
