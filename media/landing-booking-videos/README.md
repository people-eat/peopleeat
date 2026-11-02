<!-- cspell:ignore imovie xcrun swiftc -->

# Landing booking videos (German)

Four silent booking-flow loops and a narrated 60-second film, with sources, posters, and reproducible edits. See
[MANIFEST.md](./MANIFEST.md) for durations, takes, narration settings, and capture limitations.

| Subfolder    | Contents                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------- |
| `raw/`       | Continuous H.264 window recordings and original lossless takes                                 |
| `exports/`   | Current silent loops and narrated 1080p film                                                   |
| `voiceover/` | Gemini source audio, mastered 60-second tracks, exact script, captions, and synthesis settings |
| `posters/`   | WebP posters for the loops and film                                                            |
| `edit/`      | Cut lists, renderers, take markers, verification reports, and visual QA                        |
| `imovie/`    | Import and assembly notes                                                                      |

## Rebuild

From the repository root, with Python 3, Node, npm dependencies installed, and FFmpeg supporting H.264, AAC, MP3, PNG, FreeType, and WebP:

```bash
python3 media/landing-booking-videos/edit/render.py --ffmpeg /absolute/path/to/ffmpeg
python3 media/landing-booking-videos/edit/renderFilm.py --ffmpeg /absolute/path/to/ffmpeg
python3 media/landing-booking-videos/edit/verify.py --ffmpeg /absolute/path/to/ffmpeg
```

Edit [edit/timeline.json](./edit/timeline.json) to change shots, holds, close crops, chapter timing, narration positions, or captions.
`duration` includes the shot’s optional `hold`; only the preceding motion portion changes speed. Captions use the project’s DM Sans font.
Pass `--clips a` to the loop renderer to rebuild only A. Raw captures remain unchanged.

The film renderer rebuilds the timed audio from `voiceover/vo-source.wav`. To synthesize a new source, adjust the exact script or
`synthesis-config.json`, then run `python3 media/landing-booking-videos/voiceover/generate.py`. Its API-key prompt is hidden. Do not put a
key in a command argument or project file. `voiceover/review.py` provides the same hidden prompt for a transcript and voice-quality check.

After re-synthesis, review the source duration and update narration positions and caption times before rebuilding the film.

Source speech is 46.52 seconds. Phrase placement leaves no pause longer than three seconds; the longest measured gap is 2.528 seconds.
Speech speed is unchanged. The film has clean logo bookends, brief chapter labels, captions over UI, and selective zooms. Continuous
captures retain real animations and hide the automated cursor. Both original synthesis and mastered WAV/MP3 tracks are retained for editing.

Shipped home-page copies live under `public/home/booking-how-it-works/` (`SectionBookingHowItWorks`). After rebuilding exports, copy the
updated loops, film, and posters there. Do not put unfinished takes under `public/`.

Original recording brief: [`scripts/demo-landing-video-chatgpt-brief.md`](../../scripts/demo-landing-video-chatgpt-brief.md). Seed:
`npm run demo:landing-video-seed`.

## Continuous recording

The user approved ScreenCaptureKit recording, and macOS screen-recording access must be enabled for the host app. Build the reusable helper
and record only the Chrome window:

```bash
xcrun swiftc -parse-as-library media/landing-booking-videos/edit/captureWindow.swift -o /private/tmp/peopleeat-capture-window
/private/tmp/peopleeat-capture-window /absolute/path/to/new-take.mov /private/tmp/peopleeat-new-take.stop
```

Create the named stop-file to finish the take. Use a new output filename and an absent stop-file for each take. Record clicks through the
normal computer-use controls. Save reusable raw takes here, then add their cut points and markers to `edit/`.
