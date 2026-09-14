import { Img, Section } from 'react-email';

import { SITE_EMAIL_NEW_MESSAGE_ICON, SITE_EMAIL_NEW_MESSAGE_ICON_DISPLAY } from '../../../shared/siteBranding';
import { emailAssetUrl, emailStyles } from './emailStyles';

/** Centered new-message illustration for offer-chat notify emails. */
export function EmailNewMessageHero({ webPageUrl }: { webPageUrl: string }) {
    return (
        <Section style={emailStyles.heroSection}>
            <Img
                src={emailAssetUrl(webPageUrl, SITE_EMAIL_NEW_MESSAGE_ICON)}
                width={SITE_EMAIL_NEW_MESSAGE_ICON_DISPLAY.width}
                height={SITE_EMAIL_NEW_MESSAGE_ICON_DISPLAY.height}
                alt=""
                style={emailStyles.heroImage}
            />
        </Section>
    );
}
