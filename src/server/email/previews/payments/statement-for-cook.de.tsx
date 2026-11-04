import { BookingRequestOfferPaymentStatementForCookEmail } from '../../templates/BookingRequestOfferPaymentStatementForCookEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function BookingRequestOfferPaymentStatementForCookEmailDePreview() {
    return (
        <BookingRequestOfferPaymentStatementForCookEmail
            locale="de"
            webPageUrl={emailPreviewFixtures.webPageUrl}
            recipientFirstName={emailPreviewFixtures.recipientFirstName}
            bookingRequestId={emailPreviewFixtures.booking.bookingRequestId}
            bookingRequestOfferId={emailPreviewFixtures.booking.bookingRequestOfferId}
            occasion={emailPreviewFixtures.booking.occasion}
        />
    );
}
