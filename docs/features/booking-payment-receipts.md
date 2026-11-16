# Booking payment receipts

Paid offers can email and download a guest payment receipt and a cook payout statement. Neither document is an invoice. The cook still
invoices the guest.

## Behavior

The feature is off until an operator turns it on. It can be on for one guest or one cook without turning it on for everyone. The guest's
switch controls the receipt. The cook's switch controls the statement.

When a booking is paid (card, saved-card pull, or a total covered entirely by credit), peopleeat creates the PDFs for each person whose
switch is on.

The guest receipt shows the payment date, occasion, event, cook, booking number, menu, travel, service fee, payment processing, any gift
card or promo credit, the amount paid, and the billing address when checkout stored one. It is attached to the booking confirmation email
for a paid booking. Saving a card for a later charge does not attach it. The guest can generate or download it on the offer page.

The cook statement shows the same event, the guest, the billing address when present, menu, travel, the amount to invoice the guest, the
peopleeat fee withheld, and the payout. It is emailed to the cook when the PDF is created. The cook can generate or download it on the offer
page. The completed-offer note still asks the cook to invoice the guest for menu and travel.

Operators can regenerate both documents from the offer. A regenerate replaces the file on the offer. A copy already attached to an email
stays on that email. Price changes after payment refresh the files without sending another email.

€0 bookings and bookings paid outside the card flow can still have a document. A missing billing address omits that block. The guest name
then comes from the account.

## Decisions

### Alternatives considered

| Topic                              | Options                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| Document type                      | Stripe receipt, Stripe invoice, own PDF                                         |
| Who the paper says sold the dinner | Cook invoices the guest, peopleeat invoices the guest, courtesy statements only |
| Rollout                            | Always on, feature toggle per person                                            |

### Chosen

Own PDFs, same capture path as gift-card receipts. Courtesy statements only: the guest gets a payment receipt, the cook gets a payout
statement, and both say they are not an invoice. The cook keeps invoicing the guest. A feature toggle gates each side for that person so the
documents can be tried before they go out to everyone. Stripe Invoices stay off this flow because checkout already collects the card with a
destination charge, a later pull, and price changes.

## Next steps

Accountant guidance (November 2026). The courtesy PDFs above stay labeled as not an invoice. Real invoices are a separate trail, and
automatic generation waits on invoice numbers.

Three invoices per held event:

1. The cook invoices the guest for menu and travel, the amount the completed offer already shows the cook.
2. peopleeat invoices the cook for the peopleeat fee withheld from the payout.
3. peopleeat invoices the guest for the peopleeat fee plus the card-processing fee, as one sum with no fee breakdown. Menu and travel stay
   off that invoice.

First build, before any invoice numbers:

1. Collect a billing address from each cook, separate from the travel origin, as a popup.
2. Let an admin upload the peopleeat-to-cook invoice PDF on each event that took place. The cook can download that file on the offer.

The peopleeat-to-guest invoice is the same kind of file later. Sequential invoice numbers and credit notes come after these two steps.

## Implementation

Toggle `BOOKING_REQUEST_OFFER_PAYMENT_RECEIPTS` in `src/shared/featureToggle.ts`. Missing row stays off. Customer capture checks the guest
`userId`. Cook capture checks the cook `userId`.

| Piece     | Location                                                                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Columns   | `BookingRequestOffers.customerReceiptFileUploadId`, `cookStatementFileUploadId`                                                                                    |
| Capture   | `bookingRequestOfferPaymentPdfsCreate`                                                                                                                             |
| Routes    | `/server/booking-request-offers/$bookingRequestOfferId/customer-receipt` and `.../cook-statement`                                                                  |
| Page      | `BookingRequestOfferPaymentDocumentPage` (`publicBooking.paymentDocument.*`)                                                                                       |
| Email     | Customer confirmation attaches the receipt when the offer is `PAYED`. Cook mail `BOOKING_REQUEST_OFFER_PAYMENT_STATEMENT` sends only when the statement PDF exists |
| Mutations | `bookingRequestOfferCustomerReceiptRegenerate`, cook `bookingRequestOfferCookStatementRegenerate`, admin `bookingRequestOfferPaymentDocumentsRegenerate`           |
| Refresh   | Amendment apply and cook handover of an already paid offer recapture without a new email                                                                           |

Paid statuses are `PAYED`, `TRANSFERRED`, and `PAYED_OUT_OF_SYSTEM`. Automatic email runs on the transition that sends the booking
confirmation while status is `PAYED` (checkout, pull, and €0 accept). `SETUP` does not create documents.

Admin download uses the file-upload rule for these two foreign keys. The guest and cook download as owners of the file.
