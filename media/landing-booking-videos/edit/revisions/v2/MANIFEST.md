<!-- cspell:ignore imovie -->

# Landing booking video manifest

**Revision 2, 2 November 2026, Europe/Berlin.** German booking-flow marketing assets for Anna’s birthday dinner in Munich, eight guests,
Signature, Italian and seasonal preferences. All reusable files stay here. Nothing was published or copied into `public/`.

## Current exports

| File                              | Duration | Format                  | Content                                                                                            |
| --------------------------------- | -------- | ----------------------- | -------------------------------------------------------------------------------------------------- |
| `exports/clip-a-anfrage.mp4`      | 34.3 s   | 1440×900, H.264, silent | Request wizard with numbered captions and reading holds after completed answers                    |
| `exports/clip-b-angebote.mp4`     | 16.0 s   | 1440×900, H.264, silent | Three offers, menu, courses, and clear total                                                       |
| `exports/clip-c-kennenlernen.mp4` | 16.0 s   | 1440×900, H.264, silent | Cook and concierge chat, then the confirmed discovery-call slot                                    |
| `exports/clip-d-bestaetigen.mp4`  | 16.0 s   | 1440×900, H.264, silent | Offer, acceptance dialog, closer view of card and invoice fields, no payment                       |
| `exports/film-60s.mp4`            | 60.0 s   | 1920×1080, H.264 + AAC  | Complete story with female German narration, burned captions, chapter transitions, and request CTA |

All exports use 30 fps, YUV 4:2:0, and fast-start metadata. Silent loops are about 8.3–9.1 MB each, with ten-frame start/end fades. WebP
posters A–D show the first fully visible frame at 0.4 s; the film poster shows the booking flow at 12 s.

## Editing changes

- A uses 1.2–1.7 second still holds on the completed occasion, guest count, address, date, price class, preferences, and message. Existing
  selection pauses add reading time. Guest-count clicks stay brisk; the other input actions run close to their captured speed.
- The bottom-left Chrome hover-status strip is removed from B–D by restoring the plain footer background from unaffected pixels in each
  frame. The film uses the same cleanup. The browser toolbar is cropped out throughout.
- D ends with a static close crop of the clean Stripe form. No developer badge, card entry, payment confirmation, or success charge appears.
- The 60-second film uses 6 seconds of the existing dinner video, 22 seconds for the request, 12 for offers, 9 for chat/call, 7 for
  confirmation/checkout, and a 4-second branded CTA. Chapters crossfade over ten frames; UI does not use decorative zooms.

## Narration

Provider: **Gemini API**. Model: **`gemini-3.8-flash-tts`**. Voice: **Kore**, female, German. The exact original script remains in
[voiceover/vo-60s-script.txt](./voiceover/vo-60s-script.txt). The user authorized Gemini for this revision.

The unedited synthesis is [voiceover/vo-source.wav](./voiceover/vo-source.wav), **22.44 seconds**. The mastered
[voiceover/vo-60s.mp3](./voiceover/vo-60s.mp3) and `vo-60s.wav` are 60 seconds, with deliberate gaps for reading the interface. Speech is
not stretched. Phrase positions and captions are editable in [edit/timeline.json](./edit/timeline.json); captions are also supplied as
[voiceover/vo-60s.srt](./voiceover/vo-60s.srt). The transcript review matches every spoken word to the script and reports German, female
presentation, and no clarity problems. The API key was entered through hidden prompts and is absent from project files.

Model settings and the exact key-free request are saved beside the audio.
[Google’s speech-generation documentation](https://ai.google.dev/gemini-api/docs/generate-content/speech-generation) describes this API. No
OpenAI speech model was used.

## Sources and limitations

Original lossless PNG-in-MOV takes remain unchanged: `raw-a-anfrage.mov` (31.063 s), `raw-b-angebote.mov` (19.698 s),
`raw-c-kennenlernen.mov` (14.340 s), `raw-d-bestaetigen.mov` (12.766 s), and `raw-d-checkout-clean.mov` (11.597 s). Together they are about
208 MB. D combines its dialog take with the clean checkout take. This revision re-edits those sources; it does not claim new native video
captures. Original take markers are under `edit/take-*.json`; the first edit’s cut list is retained under `edit/revisions/v1/`.

Chrome was German, zoom 100%, bookmarks hidden, **1559×944 including the 87 px toolbar**. Sources sample at approximately **5.6–10.8 fps**;
30 fps exports repeat those frames. The capture pointer highlight remains visible. No dietary step, sign-in code entry, English interface,
admin page, failed payment, or Stripe developer banner appears in the exports.

Source offer totals change from 720,78 € before acceptance to 719,11 € after travel-cost recalculation. The checkout close crop focuses on
fields, and source values are never altered. Acceptance was approved during the first recording; no payment was made. The user reset the DB
again before this revision. Before recording another acceptance flow, start from a fresh seed.

No native iMovie library is included. Full sources, cut lists, editable captions, and audio are available, with handoff notes in
[imovie/README.md](./imovie/README.md).

## Verification

[edit/verify.py](./edit/verify.py) checks decoding, dimensions, duration and frame count, loop silence, fast-start metadata, file sizes,
fades, the cleaned hover-status strip, and the film’s narration/caption agreement. Reports and hashes are in `edit/verification.json` and
`edit/film-verification.json`. Contact sheets and selected full frames are in `edit/qa/`.

All **390 test files and 1,705 tests pass**. Repository types, usage, and commit-message checks pass. `npm run check` still reports existing
formatting issues in `docs/styles/theme.md`, `scripts/demoLandingVideoSeed.ts`, and
`src/web/components/CustomerBookingRequestOfferCard.stories.tsx`, plus spelling issues in the seed, its brief, and generated demo manifest.
The revised media files pass spelling and formatting checks. `git diff --check` passes.
