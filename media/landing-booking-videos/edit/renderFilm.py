# cspell:ignore fontfile setsar tpad setpts STARTPTS libx ultrafast loudnorm libmp settb xfade maxrate movflags faststart libwebp lavfi

import argparse
import json
import shutil
import subprocess
import tempfile
import wave
from pathlib import Path

from render import REPOSITORY, ROOT, execute, scrim_create, shot_filters


FONT = REPOSITORY / "node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2"


def text_file(name, text):
    path = ROOT / "edit" / f"{name}.txt"
    path.write_text(text + "\n")
    return path


def endcard_background_create():
    svg = ROOT / "edit" / "endcard.svg"
    png = ROOT / "edit" / "endcard.png"
    svg.write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">'
        '<rect width="1920" height="1080" fill="#fdfcf9"/>'
        '<rect x="780" y="610" width="360" height="84" rx="12" fill="#3c3e3b"/>'
        '</svg>\n'
    )
    subprocess.run(
        [
            "node", "--input-type=module", "-e",
            "import sharp from 'sharp'; await sharp(process.argv[1]).png().toFile(process.argv[2]);",
            str(svg), str(png),
        ],
        cwd=REPOSITORY,
        check=True,
        capture_output=True,
    )
    return png


def section_create(ffmpeg, section, directory, transition):
    path = directory / f"{section['name']}.mkv"
    duration = section.get("duration", sum(shot["duration"] for shot in section.get("shots", [])))
    if section.get("kind") == "logo":
        inputs = ["-f", "lavfi", "-i", "color=c=0xfdfcf9:s=1920x1080:r=30", "-loop", "1", "-i", str(REPOSITORY / "public/logo/peopleeat@4x.png")]
        filters = [
            "[1:v]scale=450:-2[logo]",
            "[0:v][logo]overlay=(W-w)/2:(H-h)/2:shortest=1,setsar=1,format=yuv444p[video]",
        ]
    elif section.get("kind") == "endcard":
        background = endcard_background_create()
        headline = text_file("film-endcard-headline", section["headline"])
        button = text_file("film-endcard-button", section["button"])
        inputs = ["-loop", "1", "-i", str(background), "-loop", "1", "-i", str(REPOSITORY / "public/logo/peopleeat@4x.png")]
        filters = [
            "[1:v]scale=350:-2[logo]",
            "[0:v][logo]overlay=(W-w)/2:300:shortest=1,"
            f"drawtext=fontfile='{FONT}':textfile='{headline}':fontcolor=0x272a26:fontsize=62:x=(w-tw)/2:y=460,"
            f"drawtext=fontfile='{FONT}':textfile='{button}':fontcolor=white:fontsize=34:x=(w-tw)/2:y=635,"
            "fps=30,setsar=1,format=yuv444p[video]",
        ]
    else:
        inputs = []
        filters = []
        labels = []
        lifestyle = section.get("kind") == "lifestyle"
        for index, shot in enumerate(section["shots"]):
            inputs.extend(["-i", str(ROOT / shot["source"])])
            hide_status = not lifestyle
            filters.extend(shot_filters(index, shot, 1920, 1080 if lifestyle else 940, hide_status))
            labels.append(f"[v{index}]")
        filters.append(
            f"{''.join(labels)}concat=n={len(labels)}:v=1:a=0,"
            "pad=1920:1080:0:0:color=0xFDFCF9,fps=30,"
            f"tpad=stop_mode=clone:stop_duration={transition + 0.2},trim=duration={duration + transition},"
            "setpts=PTS-STARTPTS,format=yuv444p[video]"
        )
    execute(
        ffmpeg,
        [
            *inputs, "-filter_complex", ";".join(filters), "-map", "[video]", "-an",
            "-t", str(duration + transition), "-r", "30", "-c:v", "libx264",
            "-preset", "ultrafast", "-crf", "0", "-pix_fmt", "yuv444p", str(path),
        ],
    )
    print(f"Film section: {section['name']}", flush=True)
    return path, duration


def narration_create(ffmpeg, film):
    with wave.open(str(ROOT / "voiceover/vo-source.wav")) as source:
        rate = source.getframerate()
        channels = source.getnchannels()
        width = source.getsampwidth()
        frames = source.readframes(source.getnframes())
    frame_bytes = channels * width
    timeline = bytearray(60 * rate * frame_bytes)
    for segment in film["voiceoverSegments"]:
        start = round(segment["in"] * rate) * frame_bytes
        end = round(segment["out"] * rate) * frame_bytes
        destination = round(segment["at"] * rate) * frame_bytes
        if destination + end - start > len(timeline):
            raise ValueError("Narration extends beyond the film")
        timeline[destination:destination + end - start] = frames[start:end]
    edited = ROOT / "voiceover/vo-edited.wav"
    with wave.open(str(edited), "wb") as output:
        output.setnchannels(channels)
        output.setsampwidth(width)
        output.setframerate(rate)
        output.writeframes(timeline)
    output = ROOT / "voiceover" / "vo-60s.wav"
    execute(
        ffmpeg,
        [
            "-i", str(edited), "-af", "loudnorm=I=-16:TP=-1.5:LRA=7",
            "-t", "60", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", str(output),
        ],
    )
    execute(
        ffmpeg,
        ["-i", str(output), "-c:a", "libmp3lame", "-b:a", "192k", str(ROOT / "voiceover/vo-60s.mp3")],
    )
    return output


def timestamp(seconds):
    milliseconds = round(seconds * 1000)
    return f"{milliseconds // 3600000:02}:{milliseconds // 60000 % 60:02}:{milliseconds // 1000 % 60:02},{milliseconds % 1000:03}"


def film_create(ffmpeg):
    film = json.loads((ROOT / "edit/timeline.json").read_text())["film"]
    transition = film["transitionFrames"] / 30
    directory = Path(tempfile.mkdtemp(prefix="peopleeat-film-"))
    sections = [
        section_create(ffmpeg, section, directory, transition if index + 1 < len(film["sections"]) else 0)
        for index, section in enumerate(film["sections"])
    ]
    audio = narration_create(ffmpeg, film)
    inputs = []
    for section, _ in sections:
        inputs.extend(["-i", str(section)])
    scrim_index = len(sections)
    audio_index = scrim_index + 1
    inputs.extend(["-loop", "1", "-i", str(scrim_create()), "-i", str(audio)])
    filters = []
    for index in range(len(sections)):
        filters.append(f"[{index}:v]fps=30,settb=1/30,setpts=PTS-STARTPTS[p{index}]")
    picture = "p0"
    position = sections[0][1]
    for index in range(1, len(sections)):
        output = f"transition{index}"
        filters.append(
            f"[{picture}][p{index}]xfade=transition=fade:duration={transition}:offset={position}[{output}]"
        )
        picture = output
        position += sections[index][1]
    filters.append(f"[{scrim_index}:v]scale=1920:340[scrim]")
    captions = []
    position = 0
    for section, (_, duration) in zip(film["sections"], sections):
        if section.get("title"):
            path = text_file(f"film-title-{section['name']}", section["title"])
            captions.append(
                f"drawtext=fontfile='{FONT}':textfile='{path}':fontcolor=white@0.74:fontsize=24:"
                f"x=(w-tw)/2:y=944:alpha='min(1,max(0,({position + 3}-t)/0.3))':"
                f"enable='gte(t,{position})*lt(t,{position + min(3, duration)})'"
            )
        position += duration
    subtitles = []
    for index, caption in enumerate(film["captions"]):
        path = text_file(f"film-caption-{index + 1:02}", caption["text"])
        if caption['in'] >= 3.5 and caption['out'] <= 55:
            captions.append(
                f"drawtext=fontfile='{FONT}':textfile='{path}':fontcolor=white:fontsize=42:"
                f"x=(w-tw)/2:y=990:enable='gte(t,{caption['in']})*lt(t,{caption['out']})'"
            )
        subtitles.append(f"{index + 1}\n{timestamp(caption['in'])} --> {timestamp(caption['out'])}\n{caption['text']}\n")
    (ROOT / "voiceover/vo-60s.srt").write_text("\n".join(subtitles))
    filters.append(
        f"[{picture}][scrim]overlay=0:740:shortest=1:enable='gte(t,3.5)*lt(t,55)',fps=30,"
        "tpad=stop_mode=clone:stop_duration=1,trim=duration=60,setpts=PTS-STARTPTS,"
        f"{','.join(captions)},fade=t=in:st=0:d={transition},"
        f"fade=t=out:st={60 - transition}:d={transition},format=yuv420p[video]"
    )
    output = ROOT / "exports" / film["file"]
    execute(
        ffmpeg,
        [
            *inputs, "-filter_complex", ";".join(filters), "-map", "[video]", "-map", f"{audio_index}:a",
            "-t", "60", "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
            "-maxrate", "8000k", "-bufsize", "16000k", "-c:a", "aac", "-b:a", "192k",
            "-ar", "48000", "-movflags", "+faststart", "-color_primaries", "bt709",
            "-color_trc", "bt709", "-colorspace", "bt709", str(output),
        ],
    )
    execute(
        ffmpeg,
        [
            "-ss", "12", "-i", str(output), "-frames:v", "1", "-c:v", "libwebp", "-quality", "94",
            str(ROOT / "posters/film-60s.webp"),
        ],
    )
    shutil.rmtree(directory)
    print(f"Film exported: {output}", flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg"))
    arguments = parser.parse_args()
    if not arguments.ffmpeg:
        parser.error("Pass --ffmpeg with the path to FFmpeg")
    film_create(arguments.ffmpeg)


if __name__ == "__main__":
    main()
