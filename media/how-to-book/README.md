<!-- cspell:ignore imovie -->

# How to book

German marketing videos explaining the peopleeat booking journey, organized by device format.

| Format  | Deliverables                                                                                                    | Production notes                                                         |
| ------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Desktop | [Narrated film](./desktop/exports/film-60s.mp4), four silent loops, posters, and raw recordings                 | [Desktop README](./desktop/README.md), [manifest](./desktop/MANIFEST.md) |
| Mobile  | [Narrated film](./mobile/exports/film-60s.mp4), four silent loops, posters, and raw iPhone 16 layout recordings | [Mobile README](./mobile/README.md)                                      |

```text
how-to-book/
├── desktop/
│   ├── exports/
│   ├── raw/
│   ├── posters/
│   ├── edit/
│   ├── voiceover/
│   └── imovie/
└── mobile/
    ├── exports/
    ├── raw/
    ├── posters/
    └── edit/
```

Both films use the approved German narration in `desktop/voiceover/`; the mobile renderer refers to that shared source. The reusable window
recorder is `desktop/edit/captureWindow.swift`. Each variant has its own timeline, renderer, and verification reports.

Run these checks from the repository root:

```bash
python3 media/how-to-book/desktop/edit/verify.py --ffmpeg /absolute/path/to/ffmpeg
python3 media/how-to-book/mobile/edit/verify.py --ffmpeg /absolute/path/to/ffmpeg
```

Shipped home-page copies: desktop under `public/home/booking-how-it-works/`, mobile under `public/home/booking-how-it-works/mobile/`.
Production masters and future edits belong here.
