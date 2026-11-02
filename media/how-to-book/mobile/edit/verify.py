# cspell:ignore nostats moov mdat silencedetect rawvideo

import argparse
import hashlib
import json
import re
import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DESKTOP = ROOT.parent / "desktop"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg"))
    arguments = parser.parse_args()
    if not arguments.ffmpeg:
        parser.error("Pass --ffmpeg with the path to FFmpeg")
    timeline = json.loads((ROOT / "edit/timeline.json").read_text())
    expected = [(clip["file"], sum(shot["duration"] for shot in clip["shots"]), False, f"poster-{clip['name']}.webp")
                for clip in timeline["clips"]]
    expected.append(("film-60s.mp4", 60, True, "film-60s.webp"))
    reports = []
    for name, duration, narrated, poster in expected:
        path = ROOT / "exports" / name
        result = subprocess.run(
            [arguments.ffmpeg, "-hide_banner", "-nostats", "-i", str(path),
             "-progress", "pipe:1", "-f", "null", "-"], check=True, capture_output=True, text=True,
        )
        header = result.stderr.split("Stream mapping:")[0]
        assert "1180x2556" in header and "30 fps" in header and "Video: h264 (High)" in header, header
        assert "yuv420p" in header, header
        assert ("Audio:" in header) == narrated, header
        if narrated:
            assert "Audio: aac" in header and "48000 Hz" in header and "stereo" in header, header
        frames = int(re.findall(r"^frame=(\d+)$", result.stdout, re.MULTILINE)[-1])
        assert frames == round(duration * 30), (name, frames, duration)
        content = path.read_bytes()
        assert content.index(b"moov") < content.index(b"mdat"), name
        assert (ROOT / "posters" / poster).stat().st_size > 1000, poster
        if not narrated:
            assert 5_000_000 <= len(content) <= 10_000_000, (name, len(content))
        # A middle viewport patch must contain the bright UI, not an unused black capture canvas.
        frame = subprocess.run(
            [arguments.ffmpeg, "-v", "error", "-ss", "9" if narrated else "1", "-i", str(path),
             "-vf", "crop=600:600:290:700,scale=1:1,format=gray", "-frames:v", "1", "-f", "rawvideo", "-"],
            check=True, capture_output=True,
        )
        assert frame.stdout[0] > 80, (name, "Unexpected black capture canvas")
        reports.append({"file": f"exports/{name}", "durationSeconds": round(duration, 3), "frames": frames,
                        "width": 1180, "height": 2556, "framesPerSecond": 30, "audioStreams": int(narrated),
                        "fastStart": True, "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()})
        print(f"Verified {name}: {frames} portrait frames", flush=True)
    audio = subprocess.run(
        [arguments.ffmpeg, "-hide_banner", "-i", str(DESKTOP / "voiceover/vo-60s.wav"),
         "-af", "silencedetect=noise=-38dB:d=0.35", "-f", "null", "-"],
        check=True, capture_output=True, text=True,
    )
    longest_pause = max(float(value) for value in re.findall(r"silence_duration: ([\d.]+)", audio.stderr))
    assert longest_pause <= 3, longest_pause
    normalize = lambda value: "".join(character for character in value.casefold() if character.isalpha())
    captions = " ".join(caption["text"] for caption in timeline["film"]["captions"])
    assert normalize(captions) == normalize((DESKTOP / "voiceover/vo-60s-script.txt").read_text())
    report = {"device": timeline["device"], "maximumNarrationPauseSeconds": round(longest_pause, 3),
              "captionsMatchScript": True, "files": reports}
    (ROOT / "edit/verification.json").write_text(json.dumps(report, ensure_ascii=False, indent=4) + "\n")


if __name__ == "__main__":
    main()
