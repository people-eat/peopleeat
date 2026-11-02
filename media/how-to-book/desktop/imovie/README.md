<!-- cspell:ignore imovie -->

# iMovie handoff

The current four silent loops and narrated 60-second film use continuous H.264 Chrome-window recordings. Import
`../raw/raw-a-continuous.mov`, `../raw/raw-bcd-continuous.mov`, and `../voiceover/vo-60s.wav`. Both sources are silent and have no captions;
the capture cursor is hidden. No native iMovie library is included. The edit is reproducible with `../edit/timeline.json`, `render.py`, and
`renderFilm.py`.

| Film time | Picture                                                        |
| --------- | -------------------------------------------------------------- |
| 0–3.5 s   | Clean peopleeat logo on warm plain background                  |
| 3.5–22 s  | Request steps, personal wishes, and submission                 |
| 22–31 s   | Offers, menu, and price                                        |
| 31–38 s   | Platform chat and confirmed video-call slot                    |
| 38–44 s   | Concierge and team support                                     |
| 44–55 s   | Accept click, animated dialog, confirmation, and full checkout |
| 55–60 s   | Clean logo under the closing wish                              |

The 46.52-second Gemini source narration is preserved in `../voiceover/vo-source.wav`. The mastered WAV/MP3 tracks align from time zero.
`vo-60s.srt` contains every spoken caption. Current exports burn captions over UI chapters while leaving logo bookends clean. Chapter labels
appear for only three seconds. The longest measured narration pause is 2.528 seconds.

Use ten-frame chapter crossfades. Zooms are explicit in the cut list, limited to menu/pricing and concierge content. Keep checkout in its
full viewport context. Clip A’s `hold` values provide reading pauses; the film uses continuous moving footage around each interaction.

The older raw takes and revision 2 film/audio remain available for comparison. Do not import the dinner footage into this revision. Save any
native library here and revised exports into `../exports/`.
