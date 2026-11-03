import { BookingEventCalendarDateMovedEmail } from '../../templates/BookingEventCalendarDateMovedEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingEventCalendarDateMovedEmailDePreview() {
    return (
        <BookingEventCalendarDateMovedEmail
            locale="de"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            requestUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-requests/${emailPreviewFixtures.booking.bookingRequestId}`}
        />
    );
}
