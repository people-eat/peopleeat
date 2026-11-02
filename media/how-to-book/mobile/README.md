<!-- cspell:ignore imovie xcrun swiftc -->

# iPhone 16 booking videos

Portrait versions of the four German booking loops and the narrated 60-second film. These are new continuous recordings of the actual mobile
layout, using Chrome’s iPhone 16 device preset at **393 × 852 CSS pixels**, rather than crops of the desktop videos.

| File                                                         | Duration | Sound                            |
| ------------------------------------------------------------ | -------- | -------------------------------- |
| [clip-a-anfrage.mp4](./exports/clip-a-anfrage.mp4)           | 34.3 s   | Silent                           |
| [clip-b-angebote.mp4](./exports/clip-b-angebote.mp4)         | 16 s     | Silent                           |
| [clip-c-kennenlernen.mp4](./exports/clip-c-kennenlernen.mp4) | 16 s     | Silent                           |
| [clip-d-bestaetigen.mp4](./exports/clip-d-bestaetigen.mp4)   | 16 s     | Silent                           |
| [film-60s.mp4](./exports/film-60s.mp4)                       | 60 s     | Approved German Gemini narration |

All exports are portrait **1180 × 2556**, 30 fps, H.264 High, YUV 4:2:0, with fast-start metadata. The one extra horizontal pixel relative
to the [iPhone 16 display’s 1179 × 2556 resolution](https://www.apple.com/iphone-16/specs/) keeps H.264 dimensions even for broad playback
support. Captions have a dedicated footer below the complete mobile viewport, so they do not cover sticky action buttons. Posters are in
`posters/`; raw MOV sources, metadata, action markers, and editable cuts are included.

The film uses the same chapter timing, clean logo bookends, three-second chapter labels, and narration as the desktop version. Caption lines
wrap for portrait viewing. The approved audio and full SRT remain in [../desktop/voiceover/](../desktop/voiceover/). Its longest measured
narration gap is 2.528 seconds. Mobile checkout is shown in its real stacked layout, with scrolling from the summary to card and billing
fields.

## Capture

Chrome device mode: iPhone 16, 393 × 852 CSS pixels, portrait, 125% preview, no throttling, German UI. This is Chrome emulation, not a
physical Safari recording. ScreenCaptureKit captured only the phone viewport at window rectangle `1082,154,491.25,1065`; no browser toolbar,
DevTools, hover URL, cursor, or desktop is included in the finished videos.

The approved local demo request was submitted. Marco’s seeded offer was accepted, stopping at Stripe test checkout. No payment details were
entered and no payment was submitted. All offer/chat takes were captured before acceptance. Re-seed before any further acceptance retake.

`raw/raw-a-iphone16.mov` contains a 491 × 1065 viewport at its upper left inside a larger black capture canvas. The explicit `frame` in the
cut list removes that unused canvas before scaling. The recorder was then configured to scale its cropped viewport into the output for
`raw/raw-bcd-iphone16.mov`. Both untouched takes are retained. They derive from the visible 125% preview and are scaled for delivery; they
do not claim a native-resolution physical iPhone capture.

The shared recorder is [../desktop/edit/captureWindow.swift](../desktop/edit/captureWindow.swift). Its optional crop arguments are
`x y width height` after the output and stop-file paths. It saves a sibling `.mov.json` with frame count, duration, and the first-frame
timestamp. The complete action markers are in `edit/take-a.json` and `edit/take-bcd.json`.

## Rebuild

From the repository root:

```bash
python3 media/how-to-book/mobile/edit/render.py --ffmpeg /absolute/path/to/ffmpeg
python3 media/how-to-book/mobile/edit/verify.py --ffmpeg /absolute/path/to/ffmpeg
```

Edit `edit/timeline.json` to change cuts or holds. The renderer uses the shared DM Sans font, logo, narration, and caption script. It
rebuilds only these portrait assets and leaves desktop exports in place. Native iMovie assembly can import these raw MOVs and the shared
narration; save any library under `../desktop/imovie/`. Portrait exports stay here for review and are not copied into `public/` by this
task.

Verification reports and SHA-256 hashes are in `edit/verification.json`; contact sheets and representative frames are in `edit/qa/`.

All media verification checks pass. Repository validation: `npm run check` passes, and all 390 test files / 1,705 tests pass.
