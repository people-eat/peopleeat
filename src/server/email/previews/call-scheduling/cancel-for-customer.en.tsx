import { DEFAULT_TIME_ZONE } from '../../../../shared';
import { BookingRequestOfferCallSlotCancelForCustomerEmail } from '../../templates/BookingRequestOfferCallSlotCancelForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferCallSlotCancelForCustomerEmailEnPreview() {
    return (
        <BookingRequestOfferCallSlotCancelForCustomerEmail
            locale="en"
            timeZone={DEFAULT_TIME_ZONE}
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            cancelerFirstName="Ben"
            startAt={new Date('2030-06-15T17:00:00.000Z')}
            reason="Something unexpected came up."
            wasConfirmed
            offerUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-requests/1/offers/1?tab=call`}
        />
    );
}
