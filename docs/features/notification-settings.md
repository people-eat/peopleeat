# Notification settings

Signed-in people choose which automatic emails and WhatsApp messages they get, by topic, on the account page.

## Behavior

Open **Account** and use the **Notifications** card under **How we reach you**.

The card says sign-in codes, payments, and support always go to the account email. Those have no switch. Cook approval is the same kind of
mail and is not listed as a row. Everything still shows in the app. Concierge replies are not affected.

Each row has **Email address** and **WhatsApp**. A missing saved choice means on, so existing mail continues until someone turns a channel
off. Chat, review reminders, and new requests may have both channels off.

**Evenings you book** (everyone)

- **Changes to the evening**: request, menu, guest count, cancellation, intro call, and the proposals check-in on WhatsApp.
- **Messages from your cook**: an unread message.
- **After the evening**: reminders to write a review.

**When you cook** (only when the account has a cook profile)

- **New requests near you**: these can come often.
- **Your offers**: changes, accepted or declined, menu, guest count, and calls.
- **Messages from your guests**: an unread message.
- **After the evening**: reminders about guests' reviews.

Turning off the last of email or WhatsApp for **Changes to the evening** or **Your offers** asks first. The person can still turn off one
channel and keep the other. Cancel leaves the switch as it was.

With no phone number, every WhatsApp switch looks off and cannot be changed. One line opens the add-number dialog: WhatsApp stays off until
a number is on file. That display is not saved as off. Saving a number for the first time leaves WhatsApp on and says so once, unless that
person had already turned WhatsApp off. An explicit off stays off if the number is removed and added again.

The four choices on **How we reach you** (message, WhatsApp, call, email) are only for the concierge. The same note is on the profile form.
Language applies to the interface, to emails, and to WhatsApp.

## Decisions

### Alternatives considered

| Option                                          | Notes                                                                                        |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| One switch per email template                   | Too many rows for the account page                                                           |
| Reuse preferred communication as the send gate  | That field is a single concierge choice, including call and message, which are not automatic |
| Hide WhatsApp until a number exists             | A missing row hides that the channel exists                                                  |
| Store WhatsApp as off when no number is on file | Adding a number would look like it stayed blocked, or would silently undo an explicit off    |

### Chosen

Topics group the messages people can name. Email and WhatsApp are separate. High-stakes evening changes and offers confirm before both
channels go quiet. Defaults stay on.

## Implementation

- Column: `Users.notificationSettings` jsonb, null means every optional channel is on. Cleared on anonymize.
- Domain module: `src/server/domain/notificationSettings.ts`. Missing channel means on. An exhaustive purpose map returns `always` or a
  domain. Call-slot purposes and `BOOKING_REQUEST_CANCELED` email need `CUSTOMER` or `COOK`.
- GraphQL: `User.notificationSettings` (defaults filled in `toGqlUser`). `UserUpdate.notificationSettings` merges one or more domains and
  stores the full object via `userUpdate`.
- Send checks live in the lifecycle email and WhatsApp helpers, cook notify, offer-chat email, call-slot email and WhatsApp, the call-slot
  reminder job, and the testimonial reminder job. Auth OTP, email change, account deletion, gift card, support, cook approval, payment mail,
  and concierge WhatsApp replies are not gated.
- UI: `AccountNotificationSettings` on `AccountPage` (second person) and on the admin user general tab (`voice="operator"`). Immediate save.
  Admin saves go through `AdminMutation.userUpdate`. WhatsApp switches render off and disabled without a phone and do not write `false`.

See [account.md](./account.md), [outbound-email.md](../architecture/outbound-email.md), [whatsapp.md](../architecture/whatsapp.md).
