import type { PropsWithChildren } from 'react';
import { Body, Container, Head, Html } from 'react-email';

import type { Locale } from '../../../shared/locale';
import { EMAIL_PREVIEW_WEB_PAGE_URL, emailStyles } from '../components/emailStyles';

/**
 * Coolify `Dockerfile.email` bakes `EMAIL_PREVIEW_WEB_PAGE_URL=https://demo.people-eat.com`
 * at `email:build` time. Local `email:dev` keeps the localhost fallback.
 */
// eslint-disable-next-line no-restricted-syntax -- preview-only bake-in; not app boot env
const emailPreviewWebPageUrl = process.env.EMAIL_PREVIEW_WEB_PAGE_URL ?? EMAIL_PREVIEW_WEB_PAGE_URL;

/** Shared sample props for React Email previews (`npm run email:dev`). */
export const emailPreviewFixtures = {
    webPageUrl: emailPreviewWebPageUrl,
    recipientFirstName: 'Ada',
    otpCode: '123456',
    giftCard: {
        redeemCode: 'ABCD-EFGH-JKMN',
        balanceCents: 15_000,
        expiresAt: new Date('2029-09-15T00:00:00.000Z'),
        recipientName: 'Ada & Charles',
        message: { de: 'Guten Appetit!', en: 'Enjoy your meal!' },
        buyerFirstName: 'Ada',
    },
    booking: {
        bookingRequestId: 'br_preview_01example',
        bookingRequestOfferId: 'bro_preview_01example',
        occasion: 'Geburtstag',
        dateTime: new Date('2030-06-15T18:00:00.000Z'),
        address: 'Leopoldstraße 1, 80802 München',
        city: 'München',
        priceClassLabel: 'Signature Menü (ab 90,00 € p.P.)',
        adultCount: 6,
        discountedCount: 2,
        suggestedMenuTitles: ['Sommerabend', 'Mediterran'],
        cookFirstName: 'Marco',
        customerFirstName: 'Ada',
        totalCentsCustomer: 89_900,
        pullPaymentDate: new Date('2030-06-01T00:00:00.000Z'),
        cancelReason: 'Terminverschiebung',
        declineReason: 'Passt leider nicht zum Anlass',
    },
} as const;

/**
 * Minimal document chrome for previewing a single email building block in
 * isolation (logo, greeting, questions, …). Full templates use `EmailLayout`.
 */
export function EmailComponentPreview({ locale, children }: PropsWithChildren<{ locale: Locale }>) {
    return (
        <Html lang={locale}>
            <Head>
                <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap" rel="stylesheet" />
            </Head>
            <Body style={emailStyles.body}>
                <Container style={emailStyles.container}>{children}</Container>
            </Body>
        </Html>
    );
}
