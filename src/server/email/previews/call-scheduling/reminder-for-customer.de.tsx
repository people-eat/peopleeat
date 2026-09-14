import { DEFAULT_TIME_ZONE } from '../../../../shared';
import { BookingRequestOfferCallSlotReminderForCustomerEmail } from '../../templates/BookingRequestOfferCallSlotReminderForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferCallSlotReminderForCustomerEmailDePreview() {
    return (
        <BookingRequestOfferCallSlotReminderForCustomerEmail
            locale="de"
            timeZone={DEFAULT_TIME_ZONE}
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            startAt={new Date('2030-06-15T17:00:00.000Z')}
            counterpartyFirstName="Ben"
            offerUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-requests/1/offers/1?tab=call`}
        />
    );
}
