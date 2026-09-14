import { GiftCardPayForCustomerEmail } from '../../templates/GiftCardPayForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function GiftCardPayForCustomerEmailEnPreview() {
    const { giftCard, webPageUrl } = emailPreviewFixtures;
    return (
        <GiftCardPayForCustomerEmail
            redeemCode={giftCard.redeemCode}
            balanceCents={giftCard.balanceCents}
            expiresAt={giftCard.expiresAt}
            recipientName={giftCard.recipientName}
            message={giftCard.message.en}
            locale="en"
            webPageUrl={webPageUrl}
            buyerFirstName={giftCard.buyerFirstName}
        />
    );
}
