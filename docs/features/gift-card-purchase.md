# Gift card purchase

Signed-in visitors buy printable peopleeat gift cards online and receive redeem codes plus PDF voucher and receipt by email after payment.

## Behavior

On `/gift-card`, buyers choose an amount (minimum €25), occasion, a single recipient display name (couples and families welcome), and a
personal message.

Anonymous buyers complete identity before purchase: email OTP (+ name-only registration for new accounts), or passkey for existing users who
already registered one (skips OTP). Phone, birth date, and preferred communication stay optional.

After configuration, checkout opens on a dedicated full-page Stripe flow. Successful payment marks the card paid, generates a printable
voucher and a purchase receipt as PDFs, and emails the redeem code with both attachments. PDF generation is best-effort per file — email
still sends if one capture fails.

Buyers review codes, status, and PDF downloads under `/profile/gift-cards` (customer sidebar). Paid cards always offer **Generate /
Regenerate PDFs** so missing or stale voucher/receipt files can be re-captured on demand (same headless path as pay). Admins can do the same
from gift-card detail — see [admin-gift-cards.md](./admin-gift-cards.md).

Voucher validity is three years from create or update.

## Decisions

### Alternatives considered

| Topic                  | Options                                            |
| ---------------------- | -------------------------------------------------- |
| Captcha failure UX     | Error union from mutation vs sticky session field  |
| Prepared-row cleanup   | Stripe webhook expiry vs queued job                |
| Anonymous purchase     | Guest Stripe buyer vs require signed-in user       |
| Checkout UI            | Dialog on `/gift-card` vs dedicated checkout route |
| Recipient name         | First + last vs single display name                |
| Redeem code visibility | Always return vs only after pay                    |
| Email locale           | Default locale vs explicit locale on create        |
| Purchase PDFs          | Receipt only vs voucher + receipt                  |

### Chosen

- Sticky session purchase error plus subscription updates so bilingual copy stays on the client while mutations stay result-only.
- Queued prepared-row expiry (~15 minutes), cancelled on successful pay.
- Require a signed-in user (email OTP or passkey + terms); buyer email always from the account.
- Full-page checkout route per gift card id.
- Single `recipientName` field.
- Redeem code on public types only when paid; admins always see it.
- Explicit locale on create, persisted for the pay email.
- Both voucher (no billing block) and simple receipt PDFs via headless capture, soft-fail per PDF.

## Next steps

Stripe webhooks for payment success are not wired yet; checkout finalizes when the client confirms pay after Elements. Webhooks should reuse
the same finalize path as pay so abandoned tabs still mint codes. See [architecture/stripe-payment.md](../architecture/stripe-payment.md).

## Implementation

| Piece     | Location                                                                                                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Table     | `giftCards` in `src/server/db/schema.ts` (`invoiceFileUploadId`, `voucherFileUploadId` → `FileUploads`)                                                                                                                                                 |
| Commands  | `giftCardCreate`, `giftCardPay`, `giftCardPdfsRegenerate` under `UserMutation`; admin `giftCardPdfsRegenerate`                                                                                                                                          |
| PDF utils | `giftCardPdfsCreate` / `giftCardPdfsRegenerateForPayedCard` in `src/server/utils/giftCardPdfsCreate.ts`                                                                                                                                                 |
| Queries   | `sessionGiftCardFindOne`, `sessionGiftCardPurchaseErrorFindOne`, `userGiftCardFindMany`, `adminGiftCardFindMany`, `adminGiftCardCounts`, `adminGiftCardCreationsFindMany`, `adminGiftCardOccasionStatsFindMany`, `adminGiftCardSalesMonthStatsFindMany` |
| Mappers   | `toGqlGiftCard`, `toGqlUserGiftCard`, `toGqlAdminGiftCard`, `toGqlInvoiceAddress`, `toGqlFileUpload`                                                                                                                                                    |
| Utils     | `redeemCodeCreate`, `verifyRecaptchaV3`, `adminGiftCardCriterionWhere`, `createServerToken`, `giftCardFileUploadFindOne`                                                                                                                                |
| Job       | `giftCardPreparedExpire`                                                                                                                                                                                                                                |
| Email     | `GiftCardPayForCustomerEmail` + voucher + receipt PDF attachments ([styles/emails.md](../styles/emails.md))                                                                                                                                             |
| Receipt   | `/server/gift-cards/$giftCardId/receipt` + `GiftCardReceiptPage`                                                                                                                                                                                        |
| Voucher   | `/server/gift-cards/$giftCardId/voucher` + `GiftCardVoucherPage` ([browser-capture.md](../architecture/browser-capture.md))                                                                                                                             |
| Stripe UI | `StripePaymentPanel` via `React.lazy` on `/gift-card/$giftCardId/checkout` ([stripe-payment.md](../architecture/stripe-payment.md))                                                                                                                     |
| Profile   | `/profile/gift-cards` — `ProfileGiftCardsPage` + `CustomerGiftCardCard` (`useUserUpdatesSeed` + `userUpdates`; create/pay publish after commit)                                                                                                         |
| Env       | `STRIPE_PUBLISHABLE_KEY`, `RECAPTCHA_*`, `SERVER_TOKEN_SECRET` — all required at boot                                                                                                                                                                   |

Minimum balance **2500 cents**. reCAPTCHA v3 action `gift_card_purchase`.

Session fields: `Session.giftCard` (latest card for the session), `Session.giftCardPurchaseError` (e.g. captcha failure). Mutations return
`MutationResult` only.

Constraints:

- Partial unique index — at most one `PREPARED` row per session.
- Cleanup job checks payment intent status before delete; if already succeeded, the row is kept for pay to finalize.
- Failed job enqueue after write is a hard failure; client retry reschedules cleanup on the existing prepared row.

Purchase UI: TanStack Form on `/gift-card` with draft in URL search (`amount`, `occasion`, `recipient`, `message`, `step=auth`) →
`/gift-card/<id>/checkout` → success and profile history.
