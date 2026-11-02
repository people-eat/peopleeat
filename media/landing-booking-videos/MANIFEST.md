<!-- cspell:ignore imovie -->

# Landing booking video manifest

**Revision 3, 2 November 2026, Europe/Berlin.** German marketing assets following Anna’s birthday dinner in Munich: eight guests, Signature,
Italian and seasonal preferences. Reusable files stay in this folder. Nothing has been published or copied into `public/`.

## Current exports

| File                              | Duration | Format                  | Content                                                                                                   |
| --------------------------------- | -------- | ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `exports/clip-a-anfrage.mp4`      | 34.3 s   | 1440×900, H.264, silent | Continuous captures of the request steps, with completed-answer reading pauses                            |
| `exports/clip-b-angebote.mp4`     | 16.0 s   | 1440×900, H.264, silent | Three offers, Marco’s courses, and transparent pricing                                                    |
| `exports/clip-c-kennenlernen.mp4` | 16.0 s   | 1440×900, H.264, silent | Platform chat with cook and concierge, followed by the confirmed video-call slot                          |
| `exports/clip-d-bestaetigen.mp4`  | 16.0 s   | 1440×900, H.264, silent | Real accept-button press, dialog opening, confirmation, and the full checkout layout                      |
| `exports/film-60s.mp4`            | 60.0 s   | 1920×1080, H.264 + AAC  | Narrated booking journey with clean logo bookends, brief chapter titles, UI captions, and selective zooms |

Exports use 30 fps, YUV 4:2:0, and fast-start metadata. Silent loops are about 8.3–8.7 MB each and have ten-frame start/end fades. WebP
posters A–D show the first fully visible frame at 0.4 s; the film poster shows the request at 12 s.

## Revision 3 changes

- Replaced sampled screenshots with new continuous ScreenCaptureKit window recordings. Real button feedback, dialog animations, scrolling,
  and page transitions are captured. The cursor is hidden during capture to remove automated pointer jumps.
- A retains its 34.3-second pace and reading pauses. The film condenses the wizard while explaining occasion, guests, venue, date, menu
  framework, preferences, and personal wishes.
- The film starts and ends with only the peopleeat logo on a plain warm background. The dinner footage and invented slogan are removed.
- Chapter labels use `1. Anfrage senden` style, appear for three seconds, then fade away. The UI remains visible beneath them.
- Gentle zooms, up to 1.16×, focus on menu/pricing and concierge support. Checkout retains both columns and its full viewport context.
- The accept sequence includes the real button press and animated dialog opening. Card fields expand on the actual checkout page.
- Chrome’s toolbar, hover URL strip, and rounded-window corner artifacts are removed. No Stripe developer widget is visible.

## Film timeline

| Time     | Picture                                   |
| -------- | ----------------------------------------- |
| 0–3.5 s  | Clean logo                                |
| 3.5–22 s | Request steps and submission              |
| 22–31 s  | Three offers, menu, and total price       |
| 31–38 s  | Chat and confirmed video-call appointment |
| 38–44 s  | Concierge presence and platform support   |
| 44–55 s  | Accept button, dialog, and full checkout  |
| 55–60 s  | Clean logo under the warm closing wish    |

## Narration and captions

Provider: **Gemini API**, model **`gemini-3.8-flash-tts`**, voice **Kore**, female, German. The revised 118-word script is saved in
[voiceover/vo-60s-script.txt](./voiceover/vo-60s-script.txt). It explains the individual steps, chat and video calls directly on the
platform, team support, a direct request invitation, and a warm wish for unforgettable private-chef experiences.

[voiceover/vo-source.wav](./voiceover/vo-source.wav) is the untouched **46.52-second** synthesis. `vo-edited.wav` places its phrases on the
60-second timeline without changing speech speed. `vo-60s.wav` and [vo-60s.mp3](./voiceover/vo-60s.mp3) are mastered 60-second tracks. The
measured longest pause is **2.528 seconds**, below the requested three-second limit. Independent transcript review matches the exact script
and reports female German speech with no clarity problems.

German captions are burned over UI chapters. Logo bookends remain visually clean; complete captions, including opening and closing words,
are supplied in [voiceover/vo-60s.srt](./voiceover/vo-60s.srt). Timing, phrase placement, and zoom focus are editable in
[edit/timeline.json](./edit/timeline.json). Model settings and the key-free synthesis request are saved beside the audio. The API key is
absent from project files.

## Capture sources

The user approved continuous recording and enabled macOS recording access. New untouched, silent H.264 window captures:

| Source                       | Duration  | Frames | Mean capture rate |
| ---------------------------- | --------- | ------ | ----------------- |
| `raw/raw-a-continuous.mov`   | 264.490 s | 11,832 | 44.73 fps         |
| `raw/raw-bcd-continuous.mov` | 145.467 s | 8,240  | 56.64 fps         |

Capture requested 60 fps; ScreenCaptureKit delivered variable frame timing. Chrome was German at 100% zoom with bookmarks hidden, **1554×944
captured pixels including the 87 px toolbar**. Long idle portions include tool coordination and approvals; editable cuts remove those
intervals. Markers and capture metadata are in `edit/take-a-continuous.json` and `edit/take-bcd-continuous.json`.

`edit/captureWindow.swift` is the reusable Chrome-window recorder. It captures no other windows or audio and stops when its stop-file
exists. The older PNG-in-MOV takes remain unchanged for history. Revision 2’s full film, narration, renderer, and cut list are preserved
under `edit/revisions/v2/`; revision 1’s cut list remains under `edit/revisions/v1/`.

Anna’s new demo request was submitted with explicit approval. Marco’s seeded offer was accepted under the prior approval and stopped at
Stripe test checkout. No card details were entered and no payment was submitted. The source price changes from 720,78 € to 719,11 € after
travel-cost recalculation; the complete checkout honestly shows its recalculated total. Before recording another acceptance flow, re-seed.

No dietary wizard step, sign-in code entry, admin screen, failed payment, or English interface appears. The video-call chapter ends on its
confirmed appointment; no live participant call was placed. No native iMovie library is included; see
[imovie/README.md](./imovie/README.md).

## Verification

[edit/verify.py](./edit/verify.py) checks full decoding, dimensions, duration/frame count, loop silence, fast-start metadata, loop sizes,
fades, hover-strip cleanup, narration/caption agreement, and the maximum three-second narration pause. Reports and hashes are in
`edit/verification.json` and `edit/film-verification.json`. Current contact sheets and selected full frames are in `edit/qa/`.

All **390 test files and 1,705 tests pass**. Media verification, media spelling/formatting, and `git diff --check` pass. Repository types,
usage, and commit-message checks pass. The full repository check still reports existing formatting issues in `docs/styles/theme.md`,
`scripts/demoLandingVideoSeed.ts`, and `src/web/components/CustomerBookingRequestOfferCard.stories.tsx`, plus seed-related spelling issues.
