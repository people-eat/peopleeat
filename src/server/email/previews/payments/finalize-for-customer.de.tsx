import { BookingRequestOfferPaymentFinalizeForCustomerEmail } from '../../templates/BookingRequestOfferPaymentFinalizeForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferPaymentFinalizeForCustomerEmailDePreview() {
    return (
        <BookingRequestOfferPaymentFinalizeForCustomerEmail
            locale="de"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            cookFirstName={emailPreviewFixtures.booking.cookFirstName}
            bookingRequestId={emailPreviewFixtures.booking.bookingRequestId}
            chatUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-requests/${emailPreviewFixtures.booking.bookingRequestId}/offers/${emailPreviewFixtures.booking.bookingRequestOfferId}?tab=chat`}
        />
    );
}
