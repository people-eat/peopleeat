# Image delivery

## Context

User and content images live in Postgres `FileUploads` and are served as the original bytes through `GET /api/file-uploads/:fileUploadId`
(see [file-storage.md](./file-storage.md)). Marketing photos under `public/` are static Vite assets. There is no Next.js-style on-demand
image optimizer: no automatic resize, format negotiation, or responsive `srcset` for upload URLs. Without deliberate limits, meal grids and
heroes pull full stored files through Node + Postgres, which feels slow under cold cache.

## Decision

**Optimize at write time and in the browser; keep delivery as a single URL per upload.**

1. **Client crop + compress** — `ImageCropDialog` / `imageCropCompress` encode WebP with a quality ladder before `POST /api/file-uploads`.
   Presets (edge px / soft byte ceiling): avatar 512 / ~200 KB, logo 960 / ~250 KB, meal and content 960 / ~350 KB, contentWide 1280 / ~450
   KB. See [profile-pictures.md](../features/profile-pictures.md).
2. **`AppImage`** — shared `<img>` defaults (`loading="lazy"`, `decoding="async"`; `priority` for LCP / above-the-fold). Not a transform
   pipeline.
3. **Static marketing** — heavy `public/` photos are checked in as sized WebP. Regenerate with `npm run images:optimize-public`
   ([`scripts/optimizePublicImages.ts`](../../scripts/optimizePublicImages.ts)). Logos, favicons, and small known-from marks stay PNG.
   Portrait / reusable faces (e.g. concierge Juliana, comparison chef Max) keep a long edge near the original (~1280 cap) so later larger
   UI uses stay sharp; do not crush them to current display size.

Bytes still flow through the authenticated download route with `Cache-Control` max-age. GraphQL never carries image bytes.

## Alternatives considered

| Alternative                               | Why not chosen for v1                                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| On-demand sharp resize on every GET       | Extra Node CPU on the hot path; needs a disk/memory cache story before it pays off             |
| CDN / object-store delivery day one       | Conflicts with single-container Postgres `bytea` posture; deferred until read volume dominates |
| Third-party image CDN (Cloudinary, imgix) | Second vendor + auth surface for media that already has app-level access rules                 |

## Consequences

- New uploads are smaller and WebP by default; **existing** `FileUploads` rows keep whatever was stored at upload time until a backfill
  runs.
- Cards and detail dialogs share one meal/content size until variants exist — presets are a compromise, not card-optimal.
- `AppImage` improves scheduling, not payload size for already-uploaded media.

## Follow-ups (recommended order)

### 1. Preferred next: upload-time variants + one-time migration

Generate a small set of sizes at write time with `sharp` (e.g. thumb / card / hero), store them as related `FileUploads` or a variants table
keyed by `fileUploadId` + role, and teach URL helpers / GraphQL to expose them. UI uses `srcset` / `sizes` via `AppImage` (or a thin
wrapper).

Ship a **one-time migration script** (tsx, like other `scripts/`) that walks existing image rows, writes variants, and leaves the original
as the largest (or replaces it). After backfill, **only transform on write** — no per-request resize. Fits Coolify single-container and
keeps auth on `fileUploadId`.

### 2. On-demand transform route (only if variants are too rigid)

`GET /api/file-uploads/:id?w=640&f=webp` with `sharp` + long-lived cache. Familiar DX, but burns CPU unless the reverse proxy caches
aggressively. Prefer (1) unless many ad-hoc sizes appear.

### 3. Garage / R2 + CDN when public reads dominate

Already the exit ramp in [file-storage.md](./file-storage.md): swap `bytes` for `objectKey`, serve public media from Garage (already used
for call audio) behind a CDN or edge image resizing. Keep `fileUploadId` as the public identifier so consumers stay unchanged.

## Key files

| Role               | Path                                            |
| ------------------ | ----------------------------------------------- |
| Client presets     | `src/web/utils/imageCropCompress.ts`            |
| Crop UI            | `src/web/components/ImageCropDialog.tsx`        |
| Shared img         | `src/web/components/AppImage.tsx`               |
| Download route     | `src/routes/api/file-uploads_.$fileUploadId.ts` |
| Public WebP script | `scripts/optimizePublicImages.ts`               |
