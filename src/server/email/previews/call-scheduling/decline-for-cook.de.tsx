import { BookingRequestOfferCallSlotDeclineForCookEmail } from '../../templates/BookingRequestOfferCallSlotDeclineForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferCallSlotDeclineForCookEmailDePreview() {
    return (
        <BookingRequestOfferCallSlotDeclineForCookEmail
            locale="de"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            declinerFirstName="Ben"
            reason="Leider bin ich zu der Zeit schon vergeben."
            offerUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-request-offers/1?tab=call`}
        />
    );
}
