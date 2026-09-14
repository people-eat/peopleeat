import { BookingRequestOfferTestimonialReminderForCustomerEmail } from '../../templates/BookingRequestOfferTestimonialReminderForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferTestimonialReminderMorningForCustomerEnPreview() {
    const { recipientFirstName, webPageUrl } = emailPreviewFixtures;
    return (
        <BookingRequestOfferTestimonialReminderForCustomerEmail
            kind="REMINDER_MORNING"
            locale="en"
            webPageUrl={webPageUrl}
            recipientFirstName={recipientFirstName}
            counterpartyFirstName="Ben"
            primaryUrl={`${webPageUrl}/profile/booking-requests/1/offers/1?tab=testimonial`}
        />
    );
}
