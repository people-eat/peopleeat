import { DEFAULT_TIME_ZONE } from '../../../../shared';
import { BookingRequestOfferPullPaymentAnnouncementForCustomerEmail } from '../../templates/BookingRequestOfferPullPaymentAnnouncementForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferPullPaymentAnnouncementForCustomerEmailDePreview() {
    return (
        <BookingRequestOfferPullPaymentAnnouncementForCustomerEmail
            locale="de"
            timeZone={DEFAULT_TIME_ZONE}
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            bookingRequestId={emailPreviewFixtures.booking.bookingRequestId}
            totalCentsCustomer={emailPreviewFixtures.booking.totalCentsCustomer}
            pullPaymentDate={emailPreviewFixtures.booking.pullPaymentDate}
            requestUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-requests/${emailPreviewFixtures.booking.bookingRequestId}`}
        />
    );
}
