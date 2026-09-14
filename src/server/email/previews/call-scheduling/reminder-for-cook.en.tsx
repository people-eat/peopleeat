import { DEFAULT_TIME_ZONE } from '../../../../shared';
import { BookingRequestOfferCallSlotReminderForCookEmail } from '../../templates/BookingRequestOfferCallSlotReminderForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferCallSlotReminderForCookEmailEnPreview() {
    return (
        <BookingRequestOfferCallSlotReminderForCookEmail
            locale="en"
            timeZone={DEFAULT_TIME_ZONE}
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            startAt={new Date('2030-06-15T17:00:00.000Z')}
            counterpartyFirstName="Ben"
            offerUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-request-offers/1?tab=call`}
        />
    );
}
