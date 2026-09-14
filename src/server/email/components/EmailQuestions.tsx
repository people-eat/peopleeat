import { Heading, Link, Text } from 'react-email';

import type { Locale } from '../../../shared/locale';
import { SITE_CONTACT_EMAIL } from '../../../shared/siteBranding';
import { emailStyles } from './emailStyles';

export function EmailQuestions({ locale }: { locale: Locale }) {
    const title = { de: 'Du hast Fragen?', en: 'You have questions?' }[locale];
    const before = {
        de: 'Kontaktiere uns gerne unter ',
        en: 'Feel free to contact us at ',
    }[locale];
    const after = {
        de: ' jederzeit bei Fragen und Anliegen. Unser Team steht dir gerne jederzeit zur Verfügung.',
        en: ' anytime with questions or concerns. Our team is always happy to help.',
    }[locale];

    return (
        <>
            <Heading as="h2" style={emailStyles.sectionHeading}>
                {title}
            </Heading>
            <Text style={emailStyles.text}>
                {before}
                <Link href={`mailto:${SITE_CONTACT_EMAIL}`} style={emailStyles.link}>
                    {SITE_CONTACT_EMAIL}
                </Link>
                {after}
            </Text>
        </>
    );
}
