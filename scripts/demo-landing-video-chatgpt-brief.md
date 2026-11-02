# ChatGPT App brief: peopleeat landing booking videos (German only)

Hand this file to the ChatGPT app that can control **Chrome** and **iMovie**, and that can generate speech with an **OpenAI female voice**.

Goal: produce landing-page marketing assets that show **how booking works** (not the dinner lifestyle footage already on the site).

## Deliverables (store inside this git repo)

**Root folder (required):**  
`/Users/I517754/GitHub/peopleeat/media/landing-booking-videos/`

Do **not** save finals to Desktop, Downloads, or iCloud-only folders. Everything reusable must land in this project tree so humans can edit,
diff, and commit it.

Create subfolders if missing (`raw/`, `exports/`, `voiceover/`, `posters/`, `imovie/`). See that folder’s `README.md`.

| Path                                      | Purpose                                                  | Length  | Sound                          |
| ----------------------------------------- | -------------------------------------------------------- | ------- | ------------------------------ |
| `raw/raw-a-anfrage.mov`                   | Untouched screen capture A                               | —       | Silent                         |
| `raw/raw-b-angebote.mov`                  | Untouched screen capture B                               | —       | Silent                         |
| `raw/raw-c-kennenlernen.mov`              | Untouched screen capture C                               | —       | Silent                         |
| `raw/raw-d-bestaetigen.mov`               | Untouched screen capture D                               | —       | Silent                         |
| `exports/clip-a-anfrage.mp4`              | Loop: send a request                                     | 10–14 s | Silent                         |
| `exports/clip-b-angebote.mp4`             | Loop: compare offers                                     | 10–14 s | Silent                         |
| `exports/clip-c-kennenlernen.mp4`         | Loop: chat + call                                        | 12–15 s | Silent                         |
| `exports/clip-d-bestaetigen.mp4`          | Loop: accept (optional pay)                              | 10–14 s | Silent                         |
| `exports/film-60s.mp4`                    | Optional continuous film                                 | ~60 s   | Female DE voiceover + captions |
| `voiceover/vo-60s.mp3`                    | Voiceover audio only                                     | ~55 s   | OpenAI female DE               |
| `voiceover/vo-60s-script.txt`             | Exact TTS script used (UTF-8)                            | —       | —                              |
| `posters/poster-a.webp` … `poster-d.webp` | First-frame stills for each loop                         | —       | —                              |
| `imovie/`                                 | Copy of the iMovie project / library export if available | —       | —                              |

Also write a short `media/landing-booking-videos/MANIFEST.md` when finished: date, Chrome window size, which takes were used, OpenAI voice
model/name, and any notes (e.g. Clip C ended on call slot, Clip D stopped at checkout).

**Do not** copy unfinished work into `public/` yet. Shipping on the landing page is a later human step
(`public/home/booking-how-it-works/`).

## Story (one dinner, German UI)

**Anna Müller** plant ihren **40. Geburtstag** in **München**, **8 Gäste**, Preisklasse **Signature**, Prefs **Italienisch** + **Saisonal**.

Hero cook: **Marco Rossi** (Italian menu “Abend in der Toskana”). Also on the board: **Lena Hartmann**, **Sophie Berger**.

**Do not show** the dietary-restrictions / allergies wizard step. It is disabled in the seeded DB.

## Preconditions (human already did these)

1. Local app is running: `http://localhost:3000`
2. Demo data was seeded with `npm run demo:landing-video-seed`
3. Manifest exists at `peopleeat/scripts/demo-landing-video-manifest.json` (read it; URLs and cookie are there)

If pages look empty or you are logged out, ask the human to re-run:

```bash
cd /Users/I517754/GitHub/peopleeat && npm run demo:landing-video-seed
```

## Step 0: Log Anna into Chrome (required)

Session cookie is **HttpOnly**. You cannot set it with `document.cookie`. Use one of:

### Preferred: Chrome DevTools → Application → Cookies

1. Open Chrome to `http://localhost:3000`
2. Open DevTools → **Application** → **Cookies** → `http://localhost:3000`
3. Add / set:

| Name                         | Value                  |
| ---------------------------- | ---------------------- |
| `people-eat-session-id-test` | `dmLvAnnaSession00001` |
| `locale`                     | `de`                   |

4. Reload. You should appear signed in as **Anna** (profile chrome, not cook).
5. Dismiss the cookie banner if it still appears (seeded cookie settings usually prevent it).

### Alternative: CDP / automation cookie API

Set the same cookie for `localhost` / `http://localhost:3000` with `httpOnly: true`, `path: /`, `sameSite: Lax`.

### Verify login

Open:

`http://localhost:3000/profile/booking-requests/dmLvBookingRequest01`

You must see the request with **three offers**. If 404 / sign-in wall, stop and ask the human to re-seed.

## Recording setup (every clip)

- Browser: Chrome, **German** UI only (`locale=de`, no `/en/` paths)
- Window: **1440×900** content area (or 1512×982). Hide bookmarks bar. Full window, no other apps visible.
- Cursor: normal arrow, slow deliberate moves, short hover pauses so text is readable
- Scroll: gentle; never fling
- Zoom: 100%
- Do **not** show: Cursor IDE, terminal, admin UI, other tabs, notifications, password managers
- After Clip D (if you accept/pay), ask human to re-seed before re-recording B–D

Burned-in text overlays (bottom third, white text + soft dark scrim, no em dash):

| Clip | Overlay                          |
| ---- | -------------------------------- |
| A    | `Anfrage in 2 Minuten`           |
| B    | `Echte Menüs. Ein klarer Preis.` |
| C    | `Vorher kennenlernen`            |
| D    | `Zusage. Zahlung. Fertig.`       |

Export loops as H.264 mp4, 30 fps, silent, ~5–10 MB each. Soft 8–12 frame fade at start/end so they loop cleanly.

---

## Clip A — Anfrage senden (~12 s)

**Start URL:** `http://localhost:3000`

**Shot list**

1. Landing hero visible; move to header CTA **Anfrage senden**; click
2. Occasion: choose / enter **Geburtstag**; Next
3. Persons: set adults to **8**; Next
4. Where: type / pick **Leopoldstraße 50, München** (or similar München address from Combobox); Next
5. When: pick a date **about 4 weeks out** (success banner about early booking may appear); time ~**19:00**; Next
6. Price class: choose **Signature** (or the MEDIUM / Signature card); Next
7. Preferences: select **Italienisch** and **Saisonal** (or type them); Next
8. **Skip / do not visit** any restrictions / allergies step if it somehow appears; if it does appear, stop and tell the human the
   restrictions toggle is on
9. Message: short text `Offene Küche ist okay. Wir freuen uns auf einen entspannten Abend.`; click **Anfrage senden**
10. Hold 1 s on the submitted / “so geht es weiter” page

**Notes**

- You are already signed in; do **not** film OTP / email code entry.
- This creates a **new** request. That is fine. Clips B–D use the **seeded** Geburtstag request, not this new one.

---

## Clip B — Angebote vergleichen (~12 s)

**Start URL:**  
`http://localhost:3000/profile/booking-requests/dmLvBookingRequest01`

**Shot list**

1. Show request detail: status + **Angebote** section with info banner and **3 offer cards**
2. Slow hover across cards so cook names / city / tags / prices read
3. Click **Marco Rossi** offer card
4. On offer page (Offer tab): scroll gently through menu cards → courses → cook block → cost breakdown
5. Pause on the transparent total; Accept footer visible but **do not click yet**

**Notes**

- Meal photos may be missing (icon fallback). Do not linger on empty image grids; focus titles and price.

---

## Clip C — Kennenlernen (~14 s)

**Start URL:**  
`http://localhost:3000/profile/booking-requests/dmLvBookingRequest01/offers/dmLvOfferMarco000001?tab=chat`

**Shot list**

1. Chat tab: presence shows cook + Concierge Juliana; scroll the German chat (birthday / pasta / call request)
2. Switch to **Anruf** / Call tab (`?tab=call` also works):  
   `http://localhost:3000/profile/booking-requests/dmLvBookingRequest01/offers/dmLvOfferMarco000001?tab=call`
3. Show the **confirmed** discovery-call appointment
4. Optional (only if clean): click join / start for under 4 s of in-call UI, then leave. If LiveKit fails or looks broken, **end on the
   confirmed slot** and do not retry more than once

**Do not show:** admin call transcripts, recording review pages, phone-number block errors.

---

## Clip D — Bestätigen und bezahlen (~12 s)

**Start URL:**  
`http://localhost:3000/profile/booking-requests/dmLvBookingRequest01/offers/dmLvOfferMarco000001`

**Preferred ending (safer):** stop after Accept confirm dialog opens / is confirmed and checkout page loads. Do **not** require a successful
Stripe charge for the muted loop.

**Shot list**

1. Offer tab; click pinned **Annehmen** / Accept
2. Confirm dialog **Angebot akzeptieren**; confirm
3. Land on checkout; show invoice fields + Stripe Payment Element briefly
4. Hold on checkout (or success if payment is easy)

**Optional full pay (only if Stripe works quickly)**

- Card: `4242 4242 4242 4242`, any future expiry, any CVC, any name/PLZ
- If Elements is slow, flaky, or shows errors: keep the Accept → checkout hold and move on

**After a successful accept/pay:** ask the human to run `npm run demo:landing-video-seed` again before any re-take of B–D.

---

## Optional 60-second film

Assemble in **iMovie** from the four loops + existing lifestyle hero if available at:

`/Users/I517754/GitHub/peopleeat/public/assets/dinner.mp4`

### Edit order

| Timecode | Picture                                                     |
| -------- | ----------------------------------------------------------- |
| 0–5 s    | `dinner.mp4` lifestyle hero (or first frame of landing)     |
| 5–18 s   | Clip A condensed                                            |
| 18–30 s  | Clip B condensed                                            |
| 30–42 s  | Clip C condensed                                            |
| 42–52 s  | Clip D condensed                                            |
| 52–60 s  | Back to lifestyle / landing CTA **Anfrage senden** end card |

Crossfades 8–12 frames. No bounce zooms. Keep UI readable (avoid heavy Ken Burns on text screens).

### Voiceover (German, female OpenAI voice)

Generate with OpenAI TTS. Prefer a natural German female voice (e.g. `alloy` / `nova` / `shimmer` if available for DE; if a dedicated German
voice exists in the account, use that). Speed ~0.95–1.0. Save as
`/Users/I517754/GitHub/peopleeat/media/landing-booking-videos/voiceover/vo-60s.mp3` and save the exact script text beside it as
`vo-60s-script.txt`.

**Script (read exactly):**

> Dein Anlass. Deine Küche. Ein Privatkoch, der zu dir kommt. In zwei Minuten beschreibst du dein Dinner. Köche in deiner Nähe schicken dir
> individuelle Menüs mit einem klaren Preis. Du schreibst, du rufst an, du entscheidest in Ruhe. Dann bestätigst du und bezahlst sicher.
> peopleeat. Privatkochen, einfach gebucht.

Lay `vo-60s.mp3` under the timeline. Duck any ambient UI sound to silence (loops are silent anyway).

### Captions

Burn German captions matching the voiceover, one short line at a time, bottom third, high contrast. No em dashes. Captions on by default in
the export.

---

## iMovie assembly checklist

1. New project, 1920×1080 (or 1440×900 matching capture; export 1080p)
2. Import from `media/landing-booking-videos/raw/` plus `/Users/I517754/GitHub/peopleeat/public/assets/dinner.mp4` and
   `media/landing-booking-videos/voiceover/vo-60s.mp3`
3. Build four silent loops first; export each into `media/landing-booking-videos/exports/`
4. Build `exports/film-60s.mp4` second
5. Export posters into `media/landing-booking-videos/posters/`
6. If iMovie can export/copy the project, put it under `media/landing-booking-videos/imovie/`
7. Write `media/landing-booking-videos/MANIFEST.md`
8. Do **not** upload to YouTube/Vimeo; do **not** leave masters only on Desktop
9. Tell the human the absolute paths under `media/landing-booking-videos/` when done so they can commit

---

## Quality bar / reject takes that show

- English UI
- Restrictions / allergy step
- OTP / magic-code typing
- Admin pages, analytics, call recordings/transcripts
- Failed Stripe red errors filling the frame
- Empty “Noch keine Angebote”
- Desktop notifications, Spotlight, other windows
- Fast chaotic cursor or unreadably fast scrolling

## If something is broken

| Symptom                     | Action                                                              |
| --------------------------- | ------------------------------------------------------------------- |
| Signed out / 404 on request | Ask human: re-run seed; reset cookie                                |
| Restrictions step appears   | Ask human: confirm `BOOKING_REQUEST_RESTRICTIONS` is false; re-seed |
| Only 0–1 offers             | Re-seed                                                             |
| LiveKit call fails          | End Clip C on confirmed slot; skip live room                        |
| Stripe checkout fails       | End Clip D on Accept → checkout hold                                |

## Done when

- All listed files exist under `/Users/I517754/GitHub/peopleeat/media/landing-booking-videos/` (not Desktop)
- Four silent loops restart cleanly
- Posters exist
- Optional: 60s film with female DE voice + captions
- `MANIFEST.md` filled in
- Absolute paths reported back to the human for git commit
