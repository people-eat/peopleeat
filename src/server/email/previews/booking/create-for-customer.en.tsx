import { DEFAULT_TIME_ZONE } from '../../../../shared';
import { UserBookingRequestCreateForCustomerEmail } from '../../templates/UserBookingRequestCreateForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function UserBookingRequestCreateForCustomerEmailEnPreview() {
    return (
        <UserBookingRequestCreateForCustomerEmail
            locale="en"
            timeZone={DEFAULT_TIME_ZONE}
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            bookingRequestId={emailPreviewFixtures.booking.bookingRequestId}
            occasion={emailPreviewFixtures.booking.occasion}
            dateTime={emailPreviewFixtures.booking.dateTime}
            address={emailPreviewFixtures.booking.address}
            priceClassLabel={emailPreviewFixtures.booking.priceClassLabel}
            adultCount={emailPreviewFixtures.booking.adultCount}
            discountedCount={emailPreviewFixtures.booking.discountedCount}
            requestUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-requests/${emailPreviewFixtures.booking.bookingRequestId}`}
        />
    );
}
