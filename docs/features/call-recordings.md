# Call recordings and transcripts

Discovery calls on an offer can be audio-recorded for quality and support; only admins review playback and transcripts.

## Behavior

When a LiveKit discovery call starts on an open offer:

1. If object storage is configured, the app starts **audio-only** room recording to the shared Garage (S3-compatible) bucket.
2. Participants see a bilingual notice that the call is recorded for quality and support (admin-only access).
3. When the room ends, a background job waits for recording to finish, downloads the audio, and runs speech-to-text into structured segments
   stored for admin review.
4. Admins play audio and read the transcript on the offer **Call** tab. Audio streams through an admin-authenticated API route.

Customers and cooks do **not** see recordings or transcripts in v1.

Related: [booking-request-offer-calls.md](./booking-request-offer-calls.md), [booking.md](./booking.md).

## Decisions

### Alternatives considered

| Option                               | Notes                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| LiveKit Agents real-time STT         | Good for live captions; separate worker; no durable audio artifact                        |
| Video room composite                 | Deferred — transcript goal; audio enough for STT and disputes                             |
| MinIO on Coolify                     | Rejected — unmaintained upstream                                                          |
| Postgres bytea for audio             | Rejected — call audio exceeds inline upload posture; see shared file storage architecture |
| Global LiveKit webhooks for finalize | Rejected for multi-env; room-end enqueue + egress poll instead                            |

### Chosen

Audio-only egress → Garage → finalize job (poll egress → STT) → admin-only UI. Missing object storage env leaves calls working without
recording.

## Ideas

- AI summary from transcript text (admin action or job).
- Customer/cook transcript access.
- Stronger speaker diarization.

## Implementation

### Schema

- `BookingRequestOfferCallRecordings` (1:1 with room): egress id, object key, status, transcript JSON/text, errors

### Runtime

- `serverRuntime.objectStorage` — shared Garage/S3 client; call recordings first consumer
- `serverRuntime.livekit.egress()` — egress client
- Start: `bookingRequestOfferCallRecordingStart` from room create in token issue path
- End: finalize enqueue from end-if-empty room helper
- Job: `booking-request-offer-call-recording-finalize`
- Bucket browse: [admin-file-store.md](./admin-file-store.md)

### Env

`OBJECT_STORAGE_S3_BUCKET`, `OBJECT_STORAGE_S3_ENDPOINT`, `OBJECT_STORAGE_S3_REGION`, `OBJECT_STORAGE_S3_ACCESS_KEY_ID`,
`OBJECT_STORAGE_S3_SECRET_ACCESS_KEY`, optional `OBJECT_STORAGE_S3_FORCE_PATH_STYLE` (default true). Self-hosted LiveKit needs a separate
**Egress** worker. Garage S3 hostname must be reachable by that worker.

### Coolify setup (Garage)

1. Coolify: **Project → Create New Resource → Service → Garage** ([Coolify Garage docs](https://coolify.io/docs/services/garage)). Assign S3
   API domain, deploy. Older Coolify: Docker Compose Empty + official single-node compose from
   [garagehq.deuxfleurs.fr](https://garagehq.deuxfleurs.fr/).
2. Bootstrap Garage (layout, bucket, key, bucket allow). Stable `s3_region` (e.g. `garage`) matches app region env.
3. Dedicated key scoped to the bucket.
4. Set `OBJECT_STORAGE_S3_*` on peopleeat app(s). `OBJECT_STORAGE_S3_FORCE_PATH_STYLE=true` behind Traefik.
5. Confirm LiveKit Egress reaches Garage hostname.
6. Smoke-test: short offer call, leave, admin Call tab or file store list.

Do **not** use Coolify sidebar **S3 Storages** (backups only). Do **not** deploy archived community MinIO.

### Coolify setup (LiveKit Egress)

Self-hosted SFU does not record alone. Egress is a **separate** worker on the same Redis as LiveKit. peopleeat starts audio-only room
composite egress; missing worker → call works, recording row may fail (visible on admin Call tab).
[Self-hosting Egress](https://docs.livekit.io/transport/self-hosting/egress/).

**Typical prod** (`livekit.people-eat.com`): LiveKit + Redis + Egress; LiveKit and Redis `network_mode: host` with Redis on loopback. Egress
uses host network to reach Redis.

Example Egress compose: `livekit/egress:latest`, `network_mode: host`, `cap_add: SYS_ADMIN`, `shm_size: 1gb`, `EGRESS_CONFIG_BODY` with
matching api key/secret, `ws_url` to local SFU, Redis address, tuned `cpu_cost` for audio-only on small VPS.

#### CPU / resource constraints

Default admission assumes ~4 CPUs for full A/V composite; 2-core hosts log a capacity warning but can still serve **audio-only** egress
(lower cpu cost). Full A/V refused until capacity exists. If jobs fail with CPU exhaustion: check logs, lower audio cost cautiously, upsize
VPS or dedicated egress host, keep calls short.

Healthy boot: Redis connect → optional CPU warning → `service ready`.

See [architecture/file-storage.md](../architecture/file-storage.md), [architecture/booking.md](../architecture/booking.md).
