import { BookingRequestOfferCallSlotDeclineForCookEmail } from '../../templates/BookingRequestOfferCallSlotDeclineForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferCallSlotDeclineForCookEmailEnPreview() {
    return (
        <BookingRequestOfferCallSlotDeclineForCookEmail
            locale="en"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            declinerFirstName="Ben"
            reason="Unfortunately I am already booked at that time."
            offerUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-request-offers/1?tab=call`}
        />
    );
}
