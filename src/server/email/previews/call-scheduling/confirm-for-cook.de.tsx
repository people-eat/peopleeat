import { DEFAULT_TIME_ZONE } from '../../../../shared';
import { BookingRequestOfferCallSlotConfirmForCookEmail } from '../../templates/BookingRequestOfferCallSlotConfirmForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferCallSlotConfirmForCookEmailDePreview() {
    return (
        <BookingRequestOfferCallSlotConfirmForCookEmail
            locale="de"
            timeZone={DEFAULT_TIME_ZONE}
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            accepterFirstName="Ben"
            startAt={new Date('2030-06-15T17:00:00.000Z')}
            offerUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-request-offers/1?tab=call`}
        />
    );
}
