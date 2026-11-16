import { Heading, Link, Text } from 'react-email';

import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { SITE_CONTACT_EMAIL } from '../../../shared/siteBranding';
import { emailStyles } from './emailStyles';

export function EmailQuestions({ locale }: { locale: Locale }) {
    return (
        <>
            <Heading as="h2" style={emailStyles.sectionHeading}>
                {tEmail(locale, 'common.questionsTitle')}
            </Heading>
            <Text style={emailStyles.text}>
                {tEmail(locale, 'common.questionsBefore')}
                <Link href={`mailto:${SITE_CONTACT_EMAIL}`} style={emailStyles.link}>
                    {SITE_CONTACT_EMAIL}
                </Link>
                {tEmail(locale, 'common.questionsAfter')}
            </Text>
        </>
    );
}
