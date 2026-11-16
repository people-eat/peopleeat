import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import {
    BookingRequestEmailBookingNumber,
    BookingRequestEmailCancellationPolicy,
    BookingRequestEmailDetails,
    EmailButton,
    EmailLayout,
    EmailText,
} from '../components';

interface UserBookingRequestCreateForCustomerEmailProps {
    locale: Locale;
    timeZone: string;
    venueCountry?: string | null;
    webPageUrl: string;
    recipientFirstName?: string;
    bookingRequestId: string;
    occasion: string;
    dateTime: Date;
    address: string;
    priceClassLabel: string;
    adultCount: number;
    discountedCount: number;
    requestUrl: string;
    requestedCookFirstName?: string | null;
    requestedMenuTitle?: string | null;
}

export function UserBookingRequestCreateForCustomerEmail({
    locale,
    timeZone,
    venueCountry,
    webPageUrl,
    recipientFirstName,
    bookingRequestId,
    occasion,
    dateTime,
    address,
    priceClassLabel,
    adultCount,
    discountedCount,
    requestUrl,
    requestedCookFirstName,
    requestedMenuTitle,
}: UserBookingRequestCreateForCustomerEmailProps) {
    const cookName = requestedCookFirstName?.trim() || null;
    const menuTitle = requestedMenuTitle?.trim() || null;
    const subject = userBookingRequestCreateForCustomerEmailSubject(locale);
    const preview = cookName ? tEmail(locale, 'booking.create.previewDirect', { cookName }) : tEmail(locale, 'booking.create.previewPool');
    const steps = cookName
        ? [
              menuTitle
                  ? tEmail(locale, 'booking.create.stepDirectMenu', { cookName, menuTitle })
                  : tEmail(locale, 'booking.create.stepDirect', { cookName }),
              tEmail(locale, 'booking.create.stepDirectDecide'),
              tEmail(locale, 'booking.create.stepDirectOpen'),
              tEmail(locale, 'booking.create.stepDirectChat'),
          ]
        : [
              tEmail(locale, 'booking.create.stepPoolMenus'),
              tEmail(locale, 'booking.create.stepPoolNotify'),
              tEmail(locale, 'booking.create.stepPoolAdjust'),
              tEmail(locale, 'booking.create.stepPoolChat'),
          ];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{tEmail(locale, 'booking.create.intro')}</EmailText>
            <EmailText style={{ marginBottom: '8px' }}>
                <strong>{tEmail(locale, 'booking.create.nextHeading')}</strong>
            </EmailText>
            {steps.map((step) => (
                <EmailText key={step} style={{ marginBottom: '4px' }}>
                    {step}
                </EmailText>
            ))}
            <EmailText>{tEmail(locale, 'booking.create.statusNote')}</EmailText>
            <EmailButton href={requestUrl}>{tEmail(locale, 'common.ctaRequest')}</EmailButton>
            <BookingRequestEmailDetails
                locale={locale}
                timeZone={timeZone}
                venueCountry={venueCountry}
                occasion={occasion}
                dateTime={dateTime}
                address={address}
                priceClassLabel={priceClassLabel}
                adultCount={adultCount}
                discountedCount={discountedCount}
                travelAndFeesNote
            />
            <BookingRequestEmailBookingNumber locale={locale} bookingRequestId={bookingRequestId} />
            <BookingRequestEmailCancellationPolicy locale={locale} webPageUrl={webPageUrl} />
        </EmailLayout>
    );
}

export function userBookingRequestCreateForCustomerEmailSubject(locale: Locale): string {
    return tEmail(locale, 'booking.create.subject');
}
