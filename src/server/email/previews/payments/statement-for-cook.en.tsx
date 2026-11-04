import { BookingRequestOfferPaymentStatementForCookEmail } from '../../templates/BookingRequestOfferPaymentStatementForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferPaymentStatementForCookEmailEnPreview() {
    return (
        <BookingRequestOfferPaymentStatementForCookEmail
            locale="en"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            bookingRequestId={emailPreviewFixtures.booking.bookingRequestId}
            bookingRequestOfferId={emailPreviewFixtures.booking.bookingRequestOfferId}
            occasion={emailPreviewFixtures.booking.occasion}
        />
    );
}
