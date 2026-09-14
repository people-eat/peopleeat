import { GiftCardPayForCustomerEmail } from '../../templates/GiftCardPayForCustomerEmail';
import { emailPreviewFixtures } from '../emailPreviewUtils';

export default function GiftCardPayForCustomerEmailDePreview() {
    const { giftCard, webPageUrl } = emailPreviewFixtures;
    return (
        <GiftCardPayForCustomerEmail
            redeemCode={giftCard.redeemCode}
            balanceCents={giftCard.balanceCents}
            expiresAt={giftCard.expiresAt}
            recipientName={giftCard.recipientName}
            message={giftCard.message.de}
            locale="de"
            webPageUrl={webPageUrl}
            buyerFirstName={giftCard.buyerFirstName}
        />
    );
}
