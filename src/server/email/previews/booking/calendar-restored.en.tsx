import { BookingEventCalendarRestoredEmail } from '../../templates/BookingEventCalendarRestoredEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingEventCalendarRestoredEmailEnPreview() {
    return (
        <BookingEventCalendarRestoredEmail
            locale="en"
            timeZone="Europe/Berlin"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            occasion={emailPreviewFixtures.booking.occasion}
            startAt={emailPreviewFixtures.booking.dateTime}
            bookingUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-requests/${emailPreviewFixtures.booking.bookingRequestId}`}
        />
    );
}
