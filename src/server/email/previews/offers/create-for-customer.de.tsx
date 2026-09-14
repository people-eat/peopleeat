import { DEFAULT_TIME_ZONE } from '../../../../shared';
import { CookBookingRequestOfferCreateForCustomerEmail } from '../../templates/CookBookingRequestOfferCreateForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function CookBookingRequestOfferCreateForCustomerEmailDePreview() {
    return (
        <CookBookingRequestOfferCreateForCustomerEmail
            locale="de"
            timeZone={DEFAULT_TIME_ZONE}
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            cookFirstName={emailPreviewFixtures.booking.cookFirstName}
            bookingRequestId={emailPreviewFixtures.booking.bookingRequestId}
            occasion={emailPreviewFixtures.booking.occasion}
            dateTime={emailPreviewFixtures.booking.dateTime}
            address={emailPreviewFixtures.booking.address}
            suggestedMenuTitles={[...emailPreviewFixtures.booking.suggestedMenuTitles]}
            offerUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-requests/${emailPreviewFixtures.booking.bookingRequestId}/offers/${emailPreviewFixtures.booking.bookingRequestOfferId}`}
        />
    );
}
