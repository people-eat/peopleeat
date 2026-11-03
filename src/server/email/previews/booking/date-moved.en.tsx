import { BookingEventCalendarDateMovedEmail } from '../../templates/BookingEventCalendarDateMovedEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingEventCalendarDateMovedEmailEnPreview() {
    return (
        <BookingEventCalendarDateMovedEmail
            locale="en"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            requestUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-requests/${emailPreviewFixtures.booking.bookingRequestId}`}
        />
    );
}
