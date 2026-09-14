import { BookingRequestOfferTestimonialReminderForCookEmail } from '../../templates/BookingRequestOfferTestimonialReminderForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferTestimonialReminderEveningForCookEnPreview() {
    const { recipientFirstName, webPageUrl } = emailPreviewFixtures;
    return (
        <BookingRequestOfferTestimonialReminderForCookEmail
            kind="REMINDER_EVENING"
            locale="en"
            webPageUrl={webPageUrl}
            recipientFirstName={recipientFirstName}
            counterpartyFirstName="Ada"
            primaryUrl={`${webPageUrl}/profile/booking-request-offers/1?tab=testimonial`}
        />
    );
}
