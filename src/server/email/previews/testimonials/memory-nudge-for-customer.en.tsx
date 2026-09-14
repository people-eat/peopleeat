import { BookingRequestOfferTestimonialReminderForCustomerEmail } from '../../templates/BookingRequestOfferTestimonialReminderForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferTestimonialReminderMemoryNudgeForCustomerEnPreview() {
    const { recipientFirstName, webPageUrl } = emailPreviewFixtures;
    return (
        <BookingRequestOfferTestimonialReminderForCustomerEmail
            kind="MEMORY_NUDGE"
            locale="en"
            webPageUrl={webPageUrl}
            recipientFirstName={recipientFirstName}
            counterpartyFirstName="Ben"
            primaryUrl={`${webPageUrl}/profile/booking-requests/1/offers/1`}
        />
    );
}
