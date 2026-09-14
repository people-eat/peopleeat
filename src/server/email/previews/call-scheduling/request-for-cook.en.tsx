import { DEFAULT_TIME_ZONE } from '../../../../shared';
import { BookingRequestOfferCallSlotRequestForCookEmail } from '../../templates/BookingRequestOfferCallSlotRequestForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferCallSlotRequestForCookEmailEnPreview() {
    return (
        <BookingRequestOfferCallSlotRequestForCookEmail
            locale="en"
            timeZone={DEFAULT_TIME_ZONE}
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            senderFirstName="Ben"
            startAt={new Date('2030-06-15T17:00:00.000Z')}
            eventDateTime={new Date('2030-07-04T18:00:00.000Z')}
            occasion="Birthday party"
            offerUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-request-offers/1?tab=call`}
        />
    );
}
