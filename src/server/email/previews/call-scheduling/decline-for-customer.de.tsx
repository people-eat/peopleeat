import { BookingRequestOfferCallSlotDeclineForCustomerEmail } from '../../templates/BookingRequestOfferCallSlotDeclineForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferCallSlotDeclineForCustomerEmailDePreview() {
    return (
        <BookingRequestOfferCallSlotDeclineForCustomerEmail
            locale="de"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            declinerFirstName="Ben"
            reason="Leider bin ich zu der Zeit schon vergeben."
            offerUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-requests/1/offers/1?tab=call`}
        />
    );
}
