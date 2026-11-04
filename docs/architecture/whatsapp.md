# WhatsApp

## Context

Customers and cooks receive booking updates alongside email. Meta requires approved templates outside the customer-service window. The admin
inbox must show what was actually sent, and template categorization must not silently introduce Marketing charges.

## Decision

1. **Provider boundary.** `serverRuntime.whatsapp` orchestrates sends and audit persistence. `whatsappCreate()` owns Meta Cloud API calls
   (Graph API v22.0). `WHATSAPP_TRANSPORT=console` provides local output without phone delivery. Meta transport requires the existing access
   token, phone number, business account, app secret, and webhook verification token.
2. **One versioned catalog.** `src/server/domain/whatsappTemplates.ts` owns approved-intent copy, DE/EN headers, body parameter order,
   review samples, and button labels. Names follow `{entity}_{event}_{recipient}_v{revision}`, for example `menu_offer_updated_customer_v1`.
   The recipient is `customer`, `cook`, or `participant` for shared call notices. Versions advance per key when copy changes; languages
   share a key. `whatsappTemplateNameByPurpose` maps stable application purposes to catalog names.
3. **Utility-only delivery.** Every new variant is submitted with `category: UTILITY`. Before each Meta send, read the registered variant
   and require `APPROVED`, `UTILITY`, and the catalog header, body, and button label. A URL button must use https path
   `/api/whatsapp/links/{{1}}`. The host is whatever was approved on the shared account, so demo can send a template registered for
   production. Pending, rejected, reclassified, or drifted variants fail closed; never fall back to Marketing or an unrelated template. A
   blocked send names the status, category, or field that failed. The token must permit reading templates for this WABA. This adds a
   management request per send. A rejected read is logged with Meta's message, code, and subcode. HTTP 400 code 100 on that read means
   `WHATSAPP_BUSINESS_ACCOUNT_ID` is not the WhatsApp Business Account (`asset_id` in the WhatsApp Manager URL; `business_id` there is the
   portfolio, and the phone number id is a third node), or the token lacks template-read access. Meta remains the approval/category
   authority; requested category alone does not mean approval.
4. **Exact language and snapshots.** Send the recipient locale, never silently substitute German for English. Render the transcript from the
   same definition and normalized parameter values used for the send. Persist an immutable `templateSnapshot` on both
   `OutboundWhatsAppMessages` and `WhatsAppMessages`, including effective language, header, rendered body, parameters, and rendered buttons.
   Later catalog changes cannot rewrite history. Audit `bodySnapshot` and transcript `body` retain the complete text projection. After the
   provider succeeds, conversation/transcript/audit persistence is transactional. Provider failures leave a failed audit, not a fictitious
   sent message. An audit/transcript persistence failure after provider acceptance retains acceptance evidence when possible and needs
   operational reconciliation before retrying; an admin refresh failure does not mark delivery failed.
5. **Historical uncertainty.** Old template rows without a verified snapshot display an explicit unverified-wording marker. Preserve their
   raw stored bodies in the database, but do not present abbreviated summaries as the actual sent text or reconstruct names/dates from
   today's mutable booking records. Only original send parameters and the corresponding historical template revision can establish an exact
   historical rendering. Inbound and free-form text remain verbatim.
6. **One-suffix deep links.** Every new URL button uses `{WEB_PAGE_URL}/api/whatsapp/links/{{1}}`. Its only dynamic suffix is the send's
   random 20-character outbound audit id. Store the allowlisted relative destination in `OutboundWhatsAppMessages.linkPath`. No reversible
   hash, encryption secret, embedded personal data, or new link table is needed. Destinations include locale, the correct customer's offer
   or cook's offer, and `?tab=chat`, `?tab=call`, or `?tab=testimonial`. New-request notices open the request or cook pool entry.
7. **Redirect and analytics.** The HTTP route looks up a sent audit, validates the stored relative path, and returns a non-cacheable 302. It
   grants no login or booking access: existing profile authentication, safe `returnTo`, and ownership guards still apply. Eligible GET
   requests stamp first-write-wins `linkClickedAt` on audit and transcript in one transaction. HEAD, known bots, and declared prefetches do
   not count. Tracking/publish failure must not prevent navigation. This measures a link request, not a verified person's click: unknown
   scanners, forwarded links, and missing user agents limit attribution. Clicks are independent of Meta delivery/read receipts. Admin chat
   exposes the timestamp separately.
8. **Send policy.** Email remains available independently. Existing payment and selected closure purposes remain email-only (`null` names).
   The explicit post-payment addition is testimonial memory/morning/evening reminders for both parties, with the same paid/accepted/
   canceled/already-reviewed gates as email. Phone delivery requires valid E.164 and ignores preferred-communication preference. Optional
   templates also respect `Users.notificationSettings` (missing means on). Payment and concierge replies are not gated. See
   [notification-settings.md](../features/notification-settings.md). A skipped send is an info log that names the reason: the phone is
   missing or not E.164, or the purpose is email-only because no template is mapped. An accepted send is not logged;
   `OutboundWhatsAppMessages` is the record. Call requests, confirmations, declines, cancellations, and reminders have distinct event
   semantics. Duplicate legacy menu-update variants and the obsolete account-plus-booking welcome copy converge on one current use case
   each; Meta's `hello_world` is not a business use case.
9. **Webhook/inbox.** `GET`/`POST /api/webhooks/whatsapp` retain challenge handling and app-secret signature checks. Conversation phone
   matching tolerates Meta digits-only values while users store E.164. Inbound media enters `FileUploads`; reactions overlay messages.
   Inbound messages refresh the 24h reply window and notify Slack. Current DE/EN feedback labels and historical reply labels are recognized.
   Admin free-form replies stay text-only and limited to the customer-service window; business reactions target inbound messages.

## Registration and rollout

`node --import tsx scripts/whatsappTemplatesSync.ts --base-url https://people-eat.com --offline --manifest /tmp/templates.json` exports the
exact registration payloads. Without `--offline`, pass `--account-id` matching `WHATSAPP_BUSINESS_ACCOUNT_ID` to inspect the account. Add
`--apply` to create missing variants and `--report /tmp/status.json` to save observed status. Existing mismatched copy is never overwritten;
create a new version. No messages are sent by this script. Credentials are read through the environment configuration module and never
printed. Signed-in WhatsApp Manager is also a supported registration path, using exactly the catalog content.

Generate/apply the additive migration and deploy the redirect route before using the new buttons. Submit both languages, verify exact copy
and Utility approval, and leave older template definitions available for historical records until migration is reviewed. The first dry
request-confirmation drafts (`booking_request_received_customer_v1`) were superseded by personality-preserving `_v2` variants; only `_v2` is
mapped for sends. The obsolete English-language feature toggle is removed: per-variant approval now controls readiness.

## Alternatives considered

| Alternative                                         | Why rejected                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| Caller-written transcript summaries                 | They differ from the actual approved message                        |
| Reconstruct old messages from current entity values | Dates, names, and copy may have changed                             |
| A reversible URL hash                               | Unnecessary; the audit already stores the destination               |
| Arbitrary destination query parameters              | Open-redirect risk and incompatible with the single suffix contract |
| German fallback for English recipients              | Makes rendered history and recipient language inconsistent          |
| Marketing fallback while approval is pending        | Changes pricing and violates the intended send policy               |

See [features/whatsapp.md](../features/whatsapp.md), [testimonials.md](./testimonials.md), and [infrastructure.md](../infrastructure.md).
