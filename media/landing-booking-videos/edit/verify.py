# cspell:ignore rawvideo nostats moov mdat silencedetect

import argparse
import hashlib
import json
import re
import shutil
import statistics
import subprocess
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


def frame_brightness(ffmpeg, path, time):
    result = subprocess.run(
        [
            ffmpeg, "-hide_banner", "-loglevel", "error", "-ss", str(time),
            "-i", str(path), "-vf", "scale=1:1,format=gray", "-frames:v", "1",
            "-f", "rawvideo", "-",
        ],
        check=True,
        capture_output=True,
    )
    return result.stdout[0]


def status_strip_verify(ffmpeg, path):
    result = subprocess.run(
        [
            ffmpeg, "-hide_banner", "-loglevel", "error", "-i", str(path),
            "-vf", "crop=256:16:16:774,format=gray", "-f", "rawvideo", "-",
        ],
        check=True,
        capture_output=True,
    )
    maximum = max(
        statistics.pstdev(result.stdout[index:index + 256])
        for index in range(0, len(result.stdout), 256)
    )
    assert maximum < 2.5, (path, "Browser status text remains", maximum)
    return round(maximum, 3)


def film_verify(ffmpeg, film):
    path = ROOT / "exports" / film["file"]
    result = subprocess.run(
        [ffmpeg, "-hide_banner", "-nostats", "-i", str(path), "-progress", "pipe:1", "-f", "null", "-"],
        check=True,
        capture_output=True,
        text=True,
    )
    header = result.stderr.split("Stream mapping:")[0]
    assert "1920x1080" in header and "30 fps" in header and "Video: h264" in header, header
    assert "Audio: aac" in header and "48000 Hz" in header and "stereo" in header, header
    frames = int(re.findall(r"^frame=(\d+)$", result.stdout, re.MULTILINE)[-1])
    assert frames == 1800, frames
    content = path.read_bytes()
    assert content.index(b"moov") < content.index(b"mdat"), path
    with wave.open(str(ROOT / "voiceover/vo-60s.wav")) as audio:
        assert audio.getnframes() / audio.getframerate() == 60
        assert audio.getnchannels() == 2 and audio.getframerate() == 48000
    silence = subprocess.run(
        [ffmpeg, "-hide_banner", "-i", str(ROOT / "voiceover/vo-60s.wav"),
         "-af", "silencedetect=noise=-38dB:d=0.35", "-f", "null", "-"],
        check=True, capture_output=True, text=True,
    )
    longest_pause = max(float(value) for value in re.findall(r"silence_duration: ([\d.]+)", silence.stderr))
    assert longest_pause <= 3, ("Narration pause exceeds three seconds", longest_pause)
    review = json.loads((ROOT / "voiceover/transcript-review.json").read_text())
    assert review["matchesScript"] and not review["clarityProblems"], review
    normalize = lambda value: "".join(character for character in value.casefold() if character.isalpha())
    captions = " ".join(caption["text"] for caption in film["captions"])
    assert normalize(captions) == normalize((ROOT / "voiceover/vo-60s-script.txt").read_text())
    report = {
        "file": f"exports/{path.name}", "durationSeconds": 60, "frames": frames,
        "width": 1920, "height": 1080, "framesPerSecond": 30, "audioStreams": 1,
        "audioCodec": "AAC", "audioSampleRate": 48000, "audioChannels": 2,
        "captionsMatchScript": True, "narrationMatchesScript": True,
        "maximumNarrationPauseSeconds": round(longest_pause, 3),
        "bytes": path.stat().st_size, "sha256": hashlib.sha256(content).hexdigest(),
    }
    (ROOT / "edit/film-verification.json").write_text(json.dumps(report, indent=4) + "\n")
    print("Verified film-60s.mp4: 1080p, 1800 frames, stereo narration and matching captions", flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg"))
    arguments = parser.parse_args()
    if not arguments.ffmpeg:
        parser.error("Pass --ffmpeg with the path to FFmpeg")
    timeline = json.loads((ROOT / "edit" / "timeline.json").read_text())
    report = []
    for clip in timeline["clips"]:
        path = ROOT / "exports" / clip["file"]
        expected_duration = sum(shot["duration"] for shot in clip["shots"])
        result = subprocess.run(
            [
                arguments.ffmpeg, "-hide_banner", "-nostats", "-i", str(path),
                "-progress", "pipe:1", "-f", "null", "-",
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        header = result.stderr.split("Stream mapping:")[0]
        assert "Video: h264 (High)" in header, header
        assert "yuv420p" in header and "1440x900" in header and "30 fps" in header, header
        assert "Audio:" not in header, header
        frames = int(re.findall(r"^frame=(\d+)$", result.stdout, re.MULTILINE)[-1])
        assert frames == round(expected_duration * 30), (path, frames, expected_duration)
        size = path.stat().st_size
        assert 5_000_000 <= size <= 10_000_000, (path, size)
        content = path.read_bytes()
        assert content.index(b"moov") < content.index(b"mdat"), path
        first = frame_brightness(arguments.ffmpeg, path, 0)
        last = frame_brightness(arguments.ffmpeg, path, expected_duration - 1 / 30)
        assert first < 6 and last < 35, (path, first, last)
        poster = ROOT / "posters" / f"poster-{clip['name']}.webp"
        assert poster.exists() and poster.stat().st_size > 1000, poster
        strip_variance = status_strip_verify(arguments.ffmpeg, path) if clip.get("hideBrowserStatus") else None
        report.append(
            {
                "file": f"exports/{path.name}",
                "durationSeconds": frames / 30,
                "frames": frames,
                "framesPerSecond": 30,
                "width": 1440,
                "height": 900,
                "codec": "H.264 High",
                "pixelFormat": "yuv420p",
                "audioStreams": 0,
                "fastStart": True,
                "bytes": size,
                "firstFrameBrightness": first,
                "lastFrameBrightness": last,
                "maximumStatusStripRowDeviation": strip_variance,
                "sha256": hashlib.sha256(content).hexdigest(),
            }
        )
        print(f"Verified {path.name}: {frames} frames, silent, clean fades", flush=True)
    (ROOT / "edit" / "verification.json").write_text(json.dumps(report, indent=4) + "\n")
    if timeline.get("film"):
        film_verify(arguments.ffmpeg, timeline["film"])


if __name__ == "__main__":
    main()
