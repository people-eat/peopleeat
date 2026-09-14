# Admin scheduled jobs

Admins see every pending background job across the platform, with due times and deep links into related entities.

## Behavior

At `/admin/jobs`:

- List all pending pg-boss jobs (`created` | `retry`) from every queued job definition, sorted by due time (`startAfter`).
- Filter by job type (tabs derived from the live result set; horizontal scroll when tabs overflow). Pinned bottom pagination pages the
  filtered client snapshot (`page` / `pageSize`; default 25); the API still returns the full pending set.
- See bilingual job labels, a short description of what the job does, state badges (Scheduled / Retry), due time, and payload detail when
  useful (e.g. testimonial kind, chat audience).
- Jump to related booking request / offer, gift card, support case, assistant chat, or user when the payload (or a short DB resolve)
  provides ids.
- Cancel a pending job (confirm dialog). Cancelled jobs drop off the list and will not run.

Empty state when nothing is pending. Recurring cron jobs are not listed until they fire a row; entity-scoped views on booking request /
offer pages remain for per-booking ops.

Non-admins cannot access the admin jobs API.

## Decisions

### Alternatives considered

| Topic   | Options                                        | Choice                                                          |
| ------- | ---------------------------------------------- | --------------------------------------------------------------- |
| Scope   | Static definition catalog vs live pending rows | Live pending rows — answers “what runs when” for scheduled work |
| Surface | Booking-only vs global admin list              | Global list; booking pages keep entity-scoped `queuedJobs`      |
| Data    | Persist next-run column vs pg-boss as source   | pg-boss `findJobs` via existing `jobs.findByData`               |
| Cancel  | Ops-only via DB / Slack vs admin mutation      | Admin `queuedJobCancel` restricted to known queued definitions  |

### Chosen

One admin page backed by `Admin.queuedJobs`, reusing `AdminQueuedJob` and enriching deep-link ids from offer / slot / room rows when the
payload omits them. Cancel goes through `AdminMutation.queuedJobCancel` → `serverRuntime.jobs.cancel` after verifying the queue name is a
registered queued definition and the job is still pending.

## Implementation

| Piece    | Location                                                         |
| -------- | ---------------------------------------------------------------- |
| Query    | `adminQueuedJobsFindMany` → `Admin.queuedJobs`                   |
| Mutation | `adminQueuedJobCancel` → `AdminMutation.queuedJobCancel`         |
| Mapper   | `toGqlAdminQueuedJob` (payload deep-link ids)                    |
| UI       | `AdminJobsPage`, route `/{-$locale}/admin/jobs`                  |
| Labels   | `adminQueuedJobLabels.ts` (shared with `AdminQueuedJobsSection`) |
| Nav      | `adminCatalog` slug `jobs` (`CalendarClockIcon`)                 |

See [jobs.md](../architecture/jobs.md), [admin-shell.md](./admin-shell.md).
