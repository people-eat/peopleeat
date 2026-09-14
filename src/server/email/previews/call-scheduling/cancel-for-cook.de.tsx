import { DEFAULT_TIME_ZONE } from '../../../../shared';
import { BookingRequestOfferCallSlotCancelForCookEmail } from '../../templates/BookingRequestOfferCallSlotCancelForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferCallSlotCancelForCookEmailDePreview() {
    return (
        <BookingRequestOfferCallSlotCancelForCookEmail
            locale="de"
            timeZone={DEFAULT_TIME_ZONE}
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            cancelerFirstName="Ben"
            startAt={new Date('2030-06-15T17:00:00.000Z')}
            reason="Leider hat sich etwas dazwischen geschoben."
            wasConfirmed
            offerUrl={`${emailPreviewFixtures.webPageUrl}/profile/booking-request-offers/1?tab=call`}
        />
    );
}
