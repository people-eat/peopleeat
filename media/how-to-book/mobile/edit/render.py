# cspell:ignore fontfile setsar setpts STARTPTS tpad libx ultrafast maxrate movflags faststart libwebp lavfi settb xfade lanczos drawbox minrate

import argparse
import json
import shutil
import subprocess
import tempfile
import textwrap
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DESKTOP = ROOT.parent / "desktop"
REPOSITORY = ROOT.parent.parent.parent
FONT = REPOSITORY / "node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2"
WIDTH, HEIGHT, PAGE_HEIGHT = 1180, 2556, 2304


def execute(ffmpeg, arguments):
    result = subprocess.run(
        [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-filter_complex_threads", "2", *arguments],
        capture_output=True,
    )
    if result.returncode:
        raise RuntimeError(result.stderr.decode(errors="replace"))


def text_file(name, value, wrap=38):
    path = ROOT / "edit" / f"{name}.txt"
    path.write_text(textwrap.fill(value, width=wrap) + "\n")
    return path


def text_filter(path, size, y, enable=None, alpha=None):
    value = (
        f"drawtext=fontfile='{FONT}':textfile='{path}':fontcolor=white:fontsize={size}:"
        f"line_spacing=10:x=(w-tw)/2:y={y}"
    )
    if enable:
        value += f":enable='{enable}'"
    if alpha:
        value += f":alpha='{alpha}'"
    return value


def shots_create(ffmpeg, shots, path, tail=0):
    inputs, filters, labels = [], [], []
    for index, shot in enumerate(shots):
        span = shot["out"] - shot["in"]
        hold = shot.get("hold", 0)
        multiplier = (shot["duration"] - hold) / span
        inputs.extend(["-ss", str(shot["in"]), "-t", str(span), "-threads", "2", "-i", str(ROOT / shot["source"])])
        frame = shot.get("frame")
        crop = (
            f"format=rgba,crop={frame['width']}:{frame['height']}:{frame['x']}:{frame['y']},"
            if frame else ""
        )
        filters.append(
            f"[{index}:v]setpts=(PTS-STARTPTS)*{multiplier:.9f},fps=30,"
            f"tpad=stop_mode=clone:stop_duration={hold + .1},trim=duration={shot['duration']},"
            f"setpts=PTS-STARTPTS,{crop}scale={WIDTH}:{PAGE_HEIGHT}:force_original_aspect_ratio=decrease:"
            "force_divisible_by=2:flags=lanczos,"
            f"pad={WIDTH}:{HEIGHT}:(ow-iw)/2:0:color=0xFDFCF9,setsar=1,format=yuv420p[v{index}]"
        )
        labels.append(f"[v{index}]")
    duration = sum(shot["duration"] for shot in shots)
    filters.append(
        f"{''.join(labels)}concat=n={len(labels)}:v=1:a=0,"
        f"tpad=stop_mode=clone:stop_duration={tail + .1},trim=duration={duration + tail},"
        "setpts=PTS-STARTPTS[video]"
    )
    execute(ffmpeg, [*inputs, "-filter_complex", ";".join(filters), "-map", "[video]", "-an",
                     "-t", str(duration + tail), "-c:v", "libx264", "-threads", "2",
                     "-preset", "ultrafast", "-crf", "0", str(path)])
    return duration


def poster_create(ffmpeg, source, name):
    execute(ffmpeg, ["-ss", "0.4", "-i", str(source), "-frames:v", "1", "-c:v", "libwebp",
                     "-quality", "94", str(ROOT / "posters" / name)])


def clip_create(ffmpeg, clip, directory):
    source = directory / f"{clip['name']}.mkv"
    duration = shots_create(ffmpeg, clip["shots"], source)
    filters = [f"drawbox=x=0:y={PAGE_HEIGHT}:w={WIDTH}:h={HEIGHT-PAGE_HEIGHT}:color=0x20251F:t=fill"]
    if any(shot.get("label") for shot in clip["shots"]):
        position = 0
        for index, shot in enumerate(clip["shots"]):
            label = text_file(f"clip-{clip['name']}-label-{index}", shot["label"])
            filters.append(text_filter(label, 44, 2352, f"gte(t,{position})*lt(t,{position + shot['duration']})"))
            position += shot["duration"]
        caption = text_file(f"clip-{clip['name']}-caption", clip["caption"])
        filters.append(text_filter(caption, 30, 2460))
    else:
        caption = text_file(f"clip-{clip['name']}-caption", clip["caption"], 30)
        filters.append(text_filter(caption, 48, 2384))
    filters.extend(["fade=t=in:st=0:d=0.333333", f"fade=t=out:st={duration - 1/3}:d=0.333333"])
    output = ROOT / "exports" / clip["file"]
    bitrate = str(clip.get("bitrateKbps", 4200)) + "k"
    execute(ffmpeg, ["-i", str(source), "-vf", ",".join(filters), "-an", "-t", str(duration),
                     "-c:v", "libx264", "-threads", "2", "-preset", "medium", "-pix_fmt", "yuv420p",
                     "-b:v", bitrate, "-minrate", bitrate, "-maxrate", bitrate, "-bufsize", "8400k",
                     "-x264-params", "nal-hrd=cbr:force-cfr=1", "-movflags", "+faststart", str(output)])
    poster_create(ffmpeg, output, f"poster-{clip['name']}.webp")
    print(f"Loop {clip['name']}: {duration:.1f}s", flush=True)


def film_create(ffmpeg, film, directory):
    sources, durations = [], []
    transition = film["transitionFrames"] / 30
    for index, section in enumerate(film["sections"]):
        path = directory / f"film-{section['name']}.mkv"
        tail = transition if index + 1 < len(film["sections"]) else 0
        if section.get("kind") == "logo":
            duration = section["duration"]
            execute(ffmpeg, ["-f", "lavfi", "-i", f"color=c=0xfdfcf9:s={WIDTH}x{HEIGHT}:r=30",
                             "-loop", "1", "-i", str(REPOSITORY / "public/logo/peopleeat@4x.png"),
                             "-filter_complex", "[1:v]scale=620:-2[logo];[0:v][logo]overlay=(W-w)/2:(H-h)/2:shortest=1,format=yuv420p[v]",
                             "-map", "[v]", "-an", "-t", str(duration + tail), "-c:v", "libx264", "-threads", "2",
                             "-preset", "ultrafast", "-crf", "0", str(path)])
        else:
            duration = shots_create(ffmpeg, section["shots"], path, tail)
        sources.append(path)
        durations.append(duration)
        print(f"Film chapter: {section['name']}", flush=True)
    inputs, filters = [], []
    for index, source in enumerate(sources):
        inputs.extend(["-i", str(source)])
        filters.append(f"[{index}:v]fps=30,settb=1/30,setpts=PTS-STARTPTS[p{index}]")
    inputs.extend(["-i", str(DESKTOP / "voiceover/vo-60s.wav")])
    picture, position = "p0", durations[0]
    for index in range(1, len(sources)):
        output = f"transition{index}"
        filters.append(f"[{picture}][p{index}]xfade=transition=fade:duration={transition}:offset={position}[{output}]")
        picture = output
        position += durations[index]
    overlays = [f"drawbox=x=0:y={PAGE_HEIGHT}:w={WIDTH}:h={HEIGHT-PAGE_HEIGHT}:color=0x20251F:t=fill:enable='gte(t,3.5)*lt(t,55)'"]
    position = 0
    for section, duration in zip(film["sections"], durations):
        if section.get("title"):
            title = text_file(f"film-title-{section['name']}", section["title"])
            overlays.append(text_filter(title, 34, 2332, f"gte(t,{position})*lt(t,{position + 3})",
                                        f"min(1,max(0,({position + 3}-t)/0.3))"))
        position += duration
    for index, caption in enumerate(film["captions"]):
        if caption['in'] >= 3.5 and caption['out'] <= 55:
            path = text_file(f"film-caption-{index:02}", caption["text"])
            overlays.append(text_filter(path, 46, 2402, f"gte(t,{caption['in']})*lt(t,{caption['out']})"))
    overlays.extend(["fade=t=in:st=0:d=0.333333", "fade=t=out:st=59.666667:d=0.333333", "format=yuv420p"])
    filters.append(f"[{picture}]{','.join(overlays)}[video]")
    output = ROOT / "exports/film-60s.mp4"
    execute(ffmpeg, [*inputs, "-filter_complex", ";".join(filters), "-map", "[video]", "-map", f"{len(sources)}:a",
                     "-t", "60", "-c:v", "libx264", "-threads", "2", "-preset", "medium", "-crf", "18",
                     "-maxrate", "8000k", "-bufsize", "16000k", "-c:a", "aac", "-b:a", "192k",
                     "-ar", "48000", "-movflags", "+faststart", str(output)])
    poster_create(ffmpeg, output, "film-60s.webp")
    print("Portrait film exported: 60s", flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg"))
    parser.add_argument("--clips", nargs="*", default=["a", "b", "c", "d"])
    arguments = parser.parse_args()
    if not arguments.ffmpeg:
        parser.error("Pass --ffmpeg with the path to FFmpeg")
    timeline = json.loads((ROOT / "edit/timeline.json").read_text())
    with tempfile.TemporaryDirectory(prefix="peopleeat-iphone-") as temporary:
        directory = Path(temporary)
        for clip in timeline["clips"]:
            if clip["name"] in arguments.clips:
                clip_create(arguments.ffmpeg, clip, directory)
        film_create(arguments.ffmpeg, timeline["film"], directory)


if __name__ == "__main__":
    main()
