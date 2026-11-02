# cspell:ignore ffconcat IHDR IIBBBBB IDAT IEND setpts STARTPTS lanczos setsar tpad fontfile shadowcolor shadowx libx minrate maxrate movflags faststart libwebp zoompan

import argparse
import json
import shutil
import struct
import subprocess
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
REPOSITORY = ROOT.parent.parent.parent
RAW_NAMES = {
    "a": "raw-a-anfrage.mov",
    "b": "raw-b-angebote.mov",
    "c": "raw-c-kennenlernen.mov",
    "d": "raw-d-bestaetigen.mov",
    "d-clean": "raw-d-checkout-clean.mov",
}


def execute(ffmpeg, arguments):
    result = subprocess.run(
        [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", *arguments],
        capture_output=True,
    )
    if result.returncode:
        raise RuntimeError(result.stderr.decode(errors="replace"))


def raw_create(ffmpeg, name):
    metadata_file = ROOT / "edit" / f"take-{name}.json"
    metadata = json.loads(metadata_file.read_text())
    output = ROOT / "raw" / RAW_NAMES[name]
    if "frames" not in metadata:
        if not output.exists():
            raise RuntimeError(f"Missing source: {output}")
        return
    frames = metadata["frames"]
    lines = ["ffconcat version 1.0"]
    for index, frame in enumerate(frames):
        end = frames[index + 1]["time"] if index + 1 < len(frames) else metadata["duration"]
        lines.extend(
            [f"file '{frame['file']}'", f"duration {max(0.001, end - frame['time']):.6f}"]
        )
    lines.append(f"file '{frames[-1]['file']}'")
    source_list = Path(metadata["directory"]) / "frames.ffconcat"
    source_list.write_text("\n".join(lines) + "\n")
    execute(
        ffmpeg,
        [
            "-f", "concat", "-safe", "0", "-i", str(source_list),
            "-an", "-c:v", "png", "-pred", "mixed", "-pix_fmt", "rgba",
            "-fps_mode", "vfr", "-video_track_timescale", "1000", str(output),
        ],
    )
    summary = {
        "name": name,
        "source": f"raw/{RAW_NAMES[name]}",
        "duration": metadata["duration"],
        "capturedFrames": len(frames),
        "captureFramesPerSecond": round(len(frames) / metadata["duration"], 2),
        "window": {"width": 1559, "height": 944},
        "markers": metadata["markers"],
    }
    metadata_file.write_text(json.dumps(summary, indent=4, ensure_ascii=False) + "\n")


def scrim_create():
    width, height = 2, 260
    rows = []
    for y in range(height):
        progress = y / (height - 1)
        alpha = round(220 * progress * progress * (3 - 2 * progress))
        rows.append(b"\x00" + bytes([12, 12, 12, alpha]) * width)

    def chunk(kind, data):
        return (
            struct.pack(">I", len(data)) + kind + data
            + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
        )

    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(b"".join(rows)))
        + chunk(b"IEND", b"")
    )
    output = ROOT / "edit" / "caption-scrim.png"
    output.write_bytes(png)
    return output


def shot_filters(index, shot, width, height, hide_browser_status=False):
    duration = shot["duration"]
    hold = shot.get("hold", 0)
    motion_duration = duration - hold
    if motion_duration <= 0:
        raise ValueError("A shot must have positive motion duration")
    multiplier = motion_duration / (shot["out"] - shot["in"])
    prefix = f"s{index}"
    filters = [
        f"[{index}:v]trim=start={shot['in']}:end={shot['out']},"
        f"setpts=(PTS-STARTPTS)*{multiplier:.9f},fps=30,"
        f"tpad=stop_mode=clone:stop_duration={hold + 0.1},"
        f"trim=duration={duration},setpts=PTS-STARTPTS[{prefix}source]"
    ]
    source = f"{prefix}source"
    if hide_browser_status:
        filters.extend([
            f"[{source}]format=rgba,split=4[{prefix}base][{prefix}left][{prefix}main][{prefix}corner]",
            f"[{prefix}left]crop=1:1:150:ih-30,scale=304:22:flags=neighbor[{prefix}left_fill]",
            f"[{prefix}main]crop=1:1:1100:ih-8,scale=336:22:flags=neighbor[{prefix}main_fill]",
            f"[{prefix}base][{prefix}left_fill]overlay=0:H-h:format=auto[{prefix}patched]",
            f"[{prefix}patched][{prefix}main_fill]overlay=304:H-h:format=auto[{prefix}footer]",
            f"[{prefix}corner]crop=1:1:1100:ih-8,scale=16:16:flags=neighbor[{prefix}corner_fill]",
            f"[{prefix}footer][{prefix}corner_fill]overlay=W-w:H-h:format=auto[{prefix}clean]",
        ])
        source = f"{prefix}clean"
    frame = shot.get("frame")
    if frame:
        crop = f"crop={frame['width']}:{frame['height']}:{frame['x']}:{frame['y']}"
    elif shot.get("kind") == "lifestyle":
        crop = "null"
    else:
        crop = "crop=iw:ih-87:0:87"
    output = f"v{index}" if not shot.get("zoom") else f"{prefix}fit"
    filters.append(
        f"[{source}]{crop},scale={width}:{height}:force_original_aspect_ratio=decrease:"
        "force_divisible_by=2:flags=lanczos,"
        f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=0xFDFCF9,setsar=1[{output}]"
    )
    if shot.get("zoom"):
        zoom = shot["zoom"]
        frames = max(1, round(duration * 30) - 1)
        progress = f"min(on/{frames},1)"
        amount = f"{zoom['from']}+({zoom['to']}-{zoom['from']})*({progress})*({progress})*(3-2*({progress}))"
        filters.append(
            f"[{output}]zoompan=z='{amount}':x='(iw-iw/zoom)*{zoom['x']}':"
            f"y='(ih-ih/zoom)*{zoom['y']}':d=1:s={width}x{height}:fps=30[v{index}]"
        )
    return filters


def clip_create(ffmpeg, clip, scrim):
    inputs = []
    filters = []
    labels = []
    for index, shot in enumerate(clip["shots"]):
        inputs.extend(["-i", str(ROOT / shot["source"])])
        filters.extend(shot_filters(index, shot, 1440, 792, clip.get("hideBrowserStatus", False)))
        labels.append(f"[v{index}]")
    inputs.extend(["-loop", "1", "-i", str(scrim)])
    filters.append(
        f"{''.join(labels)}concat=n={len(labels)}:v=1:a=0,"
        "pad=1440:900:0:0:color=0xFDFCF9,setsar=1[page]"
    )
    filters.append(f"[{len(labels)}:v]scale=1440:260[scrim]")
    duration = sum(shot["duration"] for shot in clip["shots"])
    font = REPOSITORY / "node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2"
    caption = ROOT / "edit" / f"caption-{clip['name']}.txt"
    caption.write_text(clip["caption"] + "\n")
    caption_filters = []
    if any(shot.get("label") for shot in clip["shots"]):
        position = 0
        for index, shot in enumerate(clip["shots"]):
            label_file = ROOT / "edit" / f"caption-{clip['name']}-{index + 1:02}.txt"
            label_file.write_text(shot.get("label", clip["caption"]) + "\n")
            caption_filters.append(
                f"drawtext=fontfile='{font}':textfile='{label_file}':fontcolor=white:"
                f"fontsize=36:x=(w-tw)/2:y=802:enable='gte(t,{position})*lt(t,{position + shot['duration']})'"
            )
            position += shot["duration"]
        caption_filters.append(
            f"drawtext=fontfile='{font}':textfile='{caption}':fontcolor=white@0.78:fontsize=20:x=(w-tw)/2:y=854"
        )
    else:
        caption_filters.append(
            f"drawtext=fontfile='{font}':textfile='{caption}':fontcolor=white:fontsize=36:x=(w-tw)/2:y=820"
        )
    filters.append(
        "[page][scrim]overlay=0:640:shortest=1,"
        f"fps=30,tpad=stop_mode=clone:stop_duration=1,trim=duration={duration},setpts=PTS-STARTPTS,"
        f"{','.join(caption_filters)},"
        f"fade=t=in:st=0:d=0.333333,fade=t=out:st={duration-0.333333:.6f}:d=0.333333,"
        "format=yuv420p[final]"
    )
    output = ROOT / "exports" / clip["file"]
    execute(
        ffmpeg,
        [
            *inputs, "-filter_complex", ";".join(filters), "-map", "[final]",
            "-an", "-t", str(duration), "-r", "30", "-c:v", "libx264",
            "-preset", "medium", "-b:v", f"{clip.get('bitrateKbps', 4200)}k",
            "-minrate", f"{clip.get('bitrateKbps', 4200)}k",
            "-maxrate", f"{clip.get('bitrateKbps', 4200)}k", "-bufsize", "8400k",
            "-x264-params", "nal-hrd=cbr:force-cfr=1", "-movflags", "+faststart",
            "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
            str(output),
        ],
    )
    execute(
        ffmpeg,
        [
            "-ss", "0.4", "-i", str(output), "-frames:v", "1",
            "-c:v", "libwebp", "-quality", "94",
            str(ROOT / "posters" / f"poster-{clip['name']}.webp"),
        ],
    )
    print(f"{output.name}: {duration:.2f}s, {output.stat().st_size / 1_000_000:.2f} MB", flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg"))
    parser.add_argument("--clips", nargs="*", default=["a", "b", "c", "d"])
    arguments = parser.parse_args()
    if not arguments.ffmpeg:
        parser.error("Pass --ffmpeg with the path to an FFmpeg build with H.264 and WebP support")
    for name in RAW_NAMES:
        raw_create(arguments.ffmpeg, name)
    timeline = json.loads((ROOT / "edit" / "timeline.json").read_text())
    scrim = scrim_create()
    for clip in timeline["clips"]:
        if clip["name"] in arguments.clips:
            clip_create(arguments.ffmpeg, clip, scrim)


if __name__ == "__main__":
    main()
