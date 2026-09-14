import { DEFAULT_TIME_ZONE } from '../../../../shared';
import { BookingRequestOfferCallSlotConfirmForCustomerEmail } from '../../templates/BookingRequestOfferCallSlotConfirmForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferCallSlotConfirmForCustomerEmailEnPreview() {
    return (
        <BookingRequestOfferCallSlotConfirmForCustomerEmail
            locale="en"
            timeZone={DEFAULT_TIME_ZONE}
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            accepterFirstName="Ben"
            startAt={new Date('2030-06-15T17:00:00.000Z')}
            offerUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-requests/1/offers/1?tab=call`}
        />
    );
}
