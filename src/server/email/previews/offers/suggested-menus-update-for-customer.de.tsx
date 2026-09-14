import { CookBookingRequestOfferSuggestedMenusUpdateForCustomerEmail } from '../../templates/CookBookingRequestOfferSuggestedMenusUpdateForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function CookBookingRequestOfferSuggestedMenusUpdateForCustomerEmailDePreview() {
    return (
        <CookBookingRequestOfferSuggestedMenusUpdateForCustomerEmail
            locale="de"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            cookFirstName={emailPreviewFixtures.booking.cookFirstName}
            bookingRequestId={emailPreviewFixtures.booking.bookingRequestId}
            offerUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-requests/${emailPreviewFixtures.booking.bookingRequestId}/offers/${emailPreviewFixtures.booking.bookingRequestOfferId}?tab=offer`}
        />
    );
}
