import { BookingRequestOfferTestimonialReminderForCookEmail } from '../../templates/BookingRequestOfferTestimonialReminderForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferTestimonialReminderEveningForCookDePreview() {
    const { recipientFirstName, webPageUrl } = emailPreviewFixtures;
    return (
        <BookingRequestOfferTestimonialReminderForCookEmail
            kind="REMINDER_EVENING"
            locale="de"
            webPageUrl={webPageUrl}
            recipientFirstName={recipientFirstName}
            counterpartyFirstName="Ada"
            primaryUrl={`${webPageUrl}/profile/booking-request-offers/1?tab=testimonial`}
        />
    );
}
