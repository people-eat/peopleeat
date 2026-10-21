# Assistant sidebar

Floating assistant rail on admin and profile shells: compose a chat, browse past chats, and keep the composer pinned while the transcript
scrolls. For a true full-viewport transcript, open the dedicated owner chat page (`/admin/assistant` or `/profile/assistant`).

## Behavior

One rail, three presentation modes (not three products):

| Mode             | Body                                              | Footer             | Header                                            |
| ---------------- | ------------------------------------------------- | ------------------ | ------------------------------------------------- |
| Compose (empty)  | Role blurb + suggestion chips (DE/EN per surface) | Composer pinned    | “Assistent / Assistant”                           |
| Compose (active) | Transcript only                                   | Composer pinned    | Chat title when set; else “Neuer Chat / New chat” |
| List             | Past chats (title + relative last activity)       | “New chat” primary | “Alle Chats / All chats” + back                   |

**Compose header actions** (left → right): title (tap to rename when active) · **New chat** (active only) · **All chats** · **Open full
screen** · close. Every icon-only control has a tooltip matching its `aria-label`.

**List header actions**: back · title · close. Each row has a ⋮ menu: rename · soft-delete.

**Full-screen page** — Compose header links to `/admin/assistant` or `/profile/assistant` (with `$chatId` when a chat is active). The shell
closes the rail on navigate. Those routes render `AssistantChatWorkspace` (nav sidebar toggle + chat title; no back arrow) and hide the
floating rail so the transcript can use the full inset. Distinct from admin inspect at `/admin/assistant-chats/$chatId` (read-only).

**Mobile sheet + in-chat navigation** — On narrow viewports the rail is a full-screen sheet. When a transcript card (booking request, user,
meal, …) or other in-rail link changes the route, the sheet closes so the main inset destination is visible. Desktop keeps the rail open
beside the inset.

**Drag-resize** — Desktop left-edge handle on the open rail; width persists in `localStorage` (18 rem–50% of viewport, default 22). SSR and
the first client paint always use the default; the stored width is applied after mount so hydration stays matched.

**Suggestion chips** — Tap fills the composer and sends immediately. Static DE/EN starters per surface, with one optional **page-aware**
chip prepended from the current path ([`assistantSidebarSuggestions.ts`](../../src/web/chat/assistantSidebarSuggestions.ts)). Empty state
sits in the transcript row so the composer does not jump.

**Continue last** — On empty compose, if the surface has a recent chat, show “Continue last chat: {title}” above the chips. The
`UserAssistantChats` lookup (`take: 1`) runs only while the rail is open. A button-sized skeleton stands in until the result arrives; if
there is no prior chat, keep the same slot with “Noch keine Chats. / No chats yet.” so the chips do not jump. List browsing still loads only
when the user opens **All chats**.

**List rows** — Open compose for that chat. Switching compose ↔ list must not wipe the draft for the current or unbound new chat. **New
chat** clears the draft and active id; if a turn is still `QUEUED`/`RUNNING`, confirm before leaving. Initial list load uses skeleton rows.

**Rename** — Owner sets a non-empty title (max 60). Locks the auto-titler ([chat-titles.md](./chat-titles.md)).

**Soft-delete** — `chatDelete` stamps `Chats.deletedAt`. Hidden from owner list/restore; admin inspect still shows a “Deleted” badge.
Continuing a deleted chat via `chatMessageCreate` fails as not found.

**Surface** — Each chat belongs to admin, customer, or cook at create time. Profile rails pass `cook` or `customer`; admin always uses
admin. Profile customer / cook rails (trigger button + floating sidebar + `/profile/assistant`) stay hidden until the matching feature
toggle is on (`ASSISTANT_CUSTOMER` / `ASSISTANT_COOK`). See [admin-feature-toggles.md](./admin-feature-toggles.md). Admin assistant is
always available.

**Resume** — Active chat is local per surface (browser session storage), not account-wide. Reopen restores the saved id only if that chat
still exists; otherwise start fresh. “Continue last” covers the no-stored-id case. Full-screen routes write the same session key when a chat
id is in the URL.

**Titles (live)** — Auto-titler and rename/delete publish `userUpdates`. The sidebar (and full-screen page) subscribe to a lightweight ping
and refetch the active chat title + list.

### Empty-state copy (static per surface)

Suggestion chip labels are the text sent on tap. Source of truth: [`assistantSidebarCopy.ts`](../../src/web/chat/assistantSidebarCopy.ts).

**Admin**

- Blurb DE: „Ich helfe dir bei Admin-Aufgaben — Nutzer, Freigaben und Support-Kontext.“
- Blurb EN: “I help with admin work — users, approvals, and support context.”
- Chips DE: „Offene Koch-Freigaben zeigen“ · „Nutzer per E-Mail finden“ · „Was kannst du?“
- Chips EN: “Show pending cook approvals” · “Find a user by email” · “What can you do?”

**Customer**

- Blurb DE: „Ich helfe dir bei Buchungen, Köchen und deinem Profil.“
- Blurb EN: “I help with bookings, chefs, and your profile.”
- Chips DE: „Koch in meiner Stadt finden“ · „Buchungsanfrage starten“ · „Was kannst du?“
- Chips EN: “Find a chef in my city” · “Start a booking request” · “What can you do?”

**Cook**

- Blurb DE: „Ich helfe dir bei Profil, Menüs, Angeboten und Anfragen.“
- Blurb EN: “I help with your profile, menus, offers, and requests.”
- Chips DE: „Mein Profil verbessern“ · „Offene Anfragen zeigen“ · „Was kannst du?“
- Chips EN: “Improve my profile” · “Show open requests” · “What can you do?”

**Admin user detail** — Customer tab lists that user’s assistant chats (including soft-deleted); selecting a row opens the global transcript
page.

Presentation bar: [`styles/chat.md`](../styles/chat.md). Agents: [`assistants.md`](./assistants.md). Titles:
[`chat-titles.md`](./chat-titles.md).

## Decisions

### Alternatives considered

| Option                               | Notes                                                                               |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| `Users.activeChatId` in the database | Rejected — one column cannot serve multiple surfaces; cross-device last-write-wins. |
| Client-local active chat per surface | **Chosen** — session storage keys per surface; validate on open.                    |
| Server-driven suggestion chips       | Rejected for v1 — static + path-aware client copy.                                  |
| Expand via Dialog remount            | Rejected — would drop scroll position and remount the turn subscription.            |
| Desktop expand in place              | Rejected after drag-resize — not true full screen; replaced by dedicated page.      |
| Dedicated full-screen owner page     | **Chosen** — `/admin/assistant` and `/profile/assistant` (+ `$chatId`).             |
| Drag-resize + localStorage width     | **Chosen** — 18 rem–50% viewport on the floating rail.                              |
| Hard delete chats                    | Rejected — soft-delete keeps admin audit; owner lists filter `deletedAt IS NULL`.   |
| Dedicated title subscription channel | Rejected — `userUpdates` ping + refetch matches meals/menus.                        |

### Chosen

Client-local resume per surface; static + page-aware empty states; compose/list spine shared by admin and profile rails
(`AssistantSidebarShell`); full-screen owner pages via `AssistantChatWorkspace`; soft-delete + rename + live title via `userUpdates`; admin
inspects any user’s chats via dedicated admin pages ([admin-assistant-chats.md](./admin-assistant-chats.md)).

## Next steps

- Grow customer / booking-request agent tools ([assistants.md](./assistants.md)).
- Optional retitle after topic drift ([chat-titles.md](./chat-titles.md)).

## Implementation

### Components

- Shared shell: [`AssistantSidebarShell`](../../src/web/components/AssistantSidebarShell.tsx)
- Full-screen workspace: [`AssistantChatWorkspace`](../../src/web/components/AssistantChatWorkspace.tsx)
- Thin wrappers: [`AdminAssistantSidebar`](../../src/web/components/AdminAssistantSidebar.tsx),
  [`ProfileAssistantSidebar`](../../src/web/components/ProfileAssistantSidebar.tsx)
- Routes: `src/routes/{-$locale}/admin/assistant*.tsx`, `src/routes/{-$locale}/profile/assistant*.tsx`
- Copy / resume / suggestions / routes: `src/web/chat/assistantSidebarCopy.ts`, `assistantActiveChatStorage.ts`,
  `assistantSidebarSuggestions.ts`, `assistantChatTitle.ts`, `assistantChatRoutes.ts`
- Live ping: `useAssistantSidebarUserUpdates.ts`
- Width: `assistantSidebarWidth.ts` — providers paint `ASSISTANT_SIDEBAR_WIDTH_DEFAULT_REM`; `AssistantSidebarShell` reads `localStorage` in
  `useEffect` and sets `--sidebar-width` on the wrapper
- Transcript: `ChatTranscriptShell`; composer via `ChatComposer` (controlled draft + `submitText` for chips) / `MessageComposer`
  ([styles/chat.md](../styles/chat.md))

### GraphQL

| Field / mutation                  | Who      | Use                                       |
| --------------------------------- | -------- | ----------------------------------------- |
| `User.assistantChat(chatId)`      | Own user | Compose-active / restore (not deleted)    |
| `User.assistantChats(criterion)`  | Own user | List + continue-last (not deleted)        |
| `UserMutation.chatTitleUpdate`    | Own user | Rename                                    |
| `UserMutation.chatDelete`         | Own user | Soft-delete                               |
| `Admin.assistantChat(chatId)`     | Admin    | Global + user-detail detail               |
| `Admin.assistantChats(criterion)` | Admin    | Global list + user-detail (incl. deleted) |

Client ops: `src/web/chat/Chat.graphql`, `src/web/pages/admin/AdminAssistantChat*`.

### Admin user detail

Tab `assistant-chats` on `AdminUserPage`, lazy `@include`. List uses `Admin.assistantChats` with `userIds: [userId]`; row →
`/admin/assistant-chats/<chatId>`. Soft-deleted rows show a badge.

Gate and admin namespace: [authorization-admin.md](../architecture/authorization-admin.md).
