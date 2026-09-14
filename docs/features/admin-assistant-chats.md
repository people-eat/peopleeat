# Admin assistant chats

Admins browse and read assistant chats across all users — same hub / list / detail rhythm as sessions, without creating chats from admin.

## Behavior

### Overview — `/admin/assistant-chats`

- Counts by surface (total, admin, customer, cook) and a chat-creation bar chart.
- Date range in the URL (`from` / `to`, default previous calendar month start through current month end); daily buckets zero-filled.
- Section card links to the list (also in the sidebar). Distribution cards deep-link into the list with `surface` preselected (Total clears
  the filter).

### List — `/admin/assistant-chats/list`

- Breadcrumbs and document title carry context (no page headline).
- Search by title, chat id, or owner email / name (debounced URL `q`).
- Filter by surface via tabs (URL `surface`: admin / customer / cook; omit for all).
- Pinned bottom pagination bar with per-page size (`page` / `pageSize` in the URL; default 25); default sort last modified descending.
- Columns: owner (link to user), title (untitled fallback), surface badge, last modified.
- Row or chevron → detail `/admin/assistant-chats/<chatId>`. User links in-cell do not trigger row navigation.

### Detail — `/admin/assistant-chats/<chatId>`

- Full-width main pane: owner link, surface, title, timestamps, read-only transcript.

### Related

- User detail tab `assistant-chats` lists that owner’s chats; rows link to the same global detail page.

Non-admins never see these screens; admin layout gates on admin access.

## Decisions

### Alternatives considered

| Option                                                     | Pros                               | Cons                                  |
| ---------------------------------------------------------- | ---------------------------------- | ------------------------------------- |
| Assistant chats only on user detail                        | Already useful there               | No cross-user ops view                |
| Top-level admin assistant chat API + user-detail migration | Reuses list criteria patterns      | Migrates user tab                     |
| Return public chat type from admin                         | Fewer types                        | No nested owner on list               |
| Dedicated admin assistant chat type with nested user       | Matches sessions / booking list UX | Parallel GraphQL type                 |
| Inline transcript on user detail                           | Fewer clicks                       | Diverges from link-out detail pattern |
| Link user tab rows to global detail                        | One detail URL                     | Leaves user page                      |
| Hub + list without admin create                            | Matches sessions                   | Extra route                           |

### Chosen

Dedicated admin assistant chat type under the admin namespace, with searchable/paginated list, counts, creation time series, and single-row
detail. Hierarchy: overview → list → detail; sidebar sub-link for list. User-detail tab reuses the same list criterion with one user id.

## Implementation

| Piece    | Location                                                                                                                   |
| -------- | -------------------------------------------------------------------------------------------------------------------------- |
| Overview | `AdminAssistantChatsOverviewPage` (+ `.graphql`), `AdminOverviewNavCard`, `AdminOverviewStatCard`, `AdminOverviewBarChart` |
| List     | `AdminAssistantChatsPage`, columns / `AdminDataTable`                                                                      |
| Detail   | `AdminAssistantChatPage` (+ `.graphql`), read-only `ChatTranscriptShell`                                                   |
| Queries  | `adminAssistantChatFindMany` / `FindOne`, `adminAssistantChatsCounts`, `adminAssistantChatCreationsFindMany`               |
| Utils    | `adminAssistantChatCriterionWhere`; creations via `adminTimeBucketsFindMany('"Chats"', …)`                                 |
| Mapper   | `toGqlAdminAssistantChat`                                                                                                  |
| Nav      | `adminAssistantChats.ts`, `assistantChatsSubs` in `AdminSidebar`; catalog slug `assistant-chats`                           |
| Routes   | `assistant-chats.tsx`, `assistant-chats_.list.tsx`, `assistant-chats_.$chatId.tsx`                                         |

GraphQL (admin only): `assistantChats(criterion)` with optional `searchText`, `userIds`, `surface`, pagination; only rows with owner +
surface. `assistantChatsCounts(criteria)` positional ints. `assistantChatCreations(range, granularity)` capped span. `assistantChat(chatId)`
detail or null.

Gate: [authorization-admin.md](../architecture/authorization-admin.md). Rails: [assistant-sidebar.md](./assistant-sidebar.md).
