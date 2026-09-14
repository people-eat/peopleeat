import { DEFAULT_TIME_ZONE } from '../../../../shared';
import { BookingRequestCooksNotifyForCookEmail } from '../../templates/BookingRequestCooksNotifyForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestCooksNotifyForCookEmailEnPreview() {
    return (
        <BookingRequestCooksNotifyForCookEmail
            locale="en"
            timeZone={DEFAULT_TIME_ZONE}
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            occasion={emailPreviewFixtures.booking.occasion}
            dateTime={emailPreviewFixtures.booking.dateTime}
            city={emailPreviewFixtures.booking.city}
            poolUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-request-pool/${emailPreviewFixtures.booking.bookingRequestId}`}
        />
    );
}
