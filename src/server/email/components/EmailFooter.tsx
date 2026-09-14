import { Img, Link, Section } from 'react-email';

import { SITE_EMAIL_INSTAGRAM_ICON, SITE_EMAIL_INSTAGRAM_ICON_DISPLAY, SITE_INSTAGRAM_URL } from '../../../shared/siteBranding';
import { emailAssetUrl, emailStyles } from './emailStyles';

export function EmailFooter({ webPageUrl }: { webPageUrl: string }) {
    return (
        <Section style={emailStyles.footer}>
            <Link href={SITE_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                <Img
                    src={emailAssetUrl(webPageUrl, SITE_EMAIL_INSTAGRAM_ICON)}
                    alt="Instagram"
                    width={SITE_EMAIL_INSTAGRAM_ICON_DISPLAY.width}
                    height={SITE_EMAIL_INSTAGRAM_ICON_DISPLAY.height}
                    style={emailStyles.footerIcon}
                />
            </Link>
        </Section>
    );
}
