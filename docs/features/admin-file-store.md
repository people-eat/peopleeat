# Admin file store

Admins browse the shared object store bucket for ops visibility — keys, sizes, and timestamps — without using it as a recordings player.

## Behavior

At `/admin/file-store`:

- See whether object storage is configured and which bucket name applies.
- Filter by object key prefix (URL `prefix`, debounced).
- Browse keys, sizes, and last-modified in pages of 25 (continuation token in URL `cursor`; next / first page).
- Bilingual empty and not-configured states. No download or delete in v1.

Call recording playback and transcripts stay on the booking offer **Call** tab — this page is bucket insight, not a second recordings UI.

## Decisions

### Alternatives considered

| Topic      | Options                                    | Choice                                                                                    |
| ---------- | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Scope      | Call-only list vs whole bucket             | Shared object storage — call audio is first consumer; more prefixes will share the bucket |
| Pagination | Offset vs object-store continuation tokens | Continuation tokens in URL `cursor`                                                       |
| Env naming | Recording-only prefix vs shared            | Shared `OBJECT_STORAGE_S3_*` vars                                                         |

### Chosen

Shared Garage (S3 API) browse for admins; pagination matches list-objects semantics; env vars name the shared store, not one feature.

## Implementation

| Piece   | Location                                                          |
| ------- | ----------------------------------------------------------------- |
| Runtime | `serverRuntime.objectStorage` (`objectStorageCreate`)             |
| Query   | `adminObjectStorageObjectFindMany` → `Admin.objectStorageObjects` |
| UI      | `AdminFileStorePage`, route `/{-$locale}/admin/file-store`        |
| Nav     | `adminCatalog` slug `file-store` (`HardDriveIcon`)                |

See [file-storage.md](../architecture/file-storage.md), [call-recordings.md](./call-recordings.md).
