import { BookingRequestOfferCallSlotDeclineForCustomerEmail } from '../../templates/BookingRequestOfferCallSlotDeclineForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferCallSlotDeclineForCustomerEmailEnPreview() {
    return (
        <BookingRequestOfferCallSlotDeclineForCustomerEmail
            locale="en"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            declinerFirstName="Ben"
            reason="Unfortunately I am already booked at that time."
            offerUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-requests/1/offers/1?tab=call`}
        />
    );
}
