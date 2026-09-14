import { Img, Section } from 'react-email';

import { SITE_LOGO, SITE_LOGO_DISPLAY, SITE_NAME } from '../../../shared/siteBranding';
import { emailAssetUrl, emailStyles } from './emailStyles';

export function EmailHeader({ webPageUrl }: { webPageUrl: string }) {
    return (
        <Section style={emailStyles.header}>
            <Img
                src={emailAssetUrl(webPageUrl, SITE_LOGO)}
                alt={SITE_NAME}
                width={SITE_LOGO_DISPLAY.width}
                height={SITE_LOGO_DISPLAY.height}
                style={emailStyles.logo}
            />
        </Section>
    );
}
