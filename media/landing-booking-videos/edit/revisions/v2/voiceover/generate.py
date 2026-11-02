import argparse
import base64
import getpass
import io
import json
import re
import sys
import urllib.error
import urllib.request
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--credential-stdin", action="store_true")
    arguments = parser.parse_args()
    if arguments.credential_stdin:
        credential = sys.stdin.readline().strip()
    else:
        credential = getpass.getpass("Gemini API key: ")
    if not credential:
        parser.error("A Gemini API key is required")

    configuration = json.loads((ROOT / "synthesis-config.json").read_text())
    transcript = (ROOT / "vo-60s-script.txt").read_text().strip()
    payload = {
        "contents": [{
            "role": "user",
            "parts": [{
                "text": transcript,
                "speech_metadata": {"style": configuration["direction"]},
            }],
        }],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"voice": configuration["voice"]}},
        },
    }
    (ROOT / "synthesis-request.json").write_text(
        json.dumps({"model": configuration["model"], **payload}, ensure_ascii=False, indent=4) + "\n"
    )
    request = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{configuration['model']}:generateContent",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": credential},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        message = json.loads(error.read()).get("error", {}).get("message", "Synthesis failed")
        raise RuntimeError(str(message).replace(credential, "[redacted]")) from None
    parts = result.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    audio = next((part["inlineData"] for part in parts if "inlineData" in part), None)
    if audio is None:
        raise RuntimeError("Gemini returned no audio")
    data = base64.b64decode(audio["data"])
    if not data.startswith(b"RIFF"):
        sample_rate = re.search(r"rate=(\d+)", audio.get("mimeType", ""))
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as output:
            output.setnchannels(1)
            output.setsampwidth(2)
            output.setframerate(int(sample_rate[1]) if sample_rate else 24000)
            output.writeframes(data)
        data = buffer.getvalue()
    destination = ROOT / "vo-source.wav"
    destination.write_bytes(data)
    with wave.open(str(destination)) as audio_file:
        duration = audio_file.getnframes() / audio_file.getframerate()
        sample_rate = audio_file.getframerate()
    metadata = {
        "provider": "Gemini API",
        "model": configuration["model"],
        "voice": configuration["voice"],
        "language": "de-DE",
        "source": destination.name,
        "durationSeconds": duration,
        "sampleRate": sample_rate,
        "usage": result.get("usageMetadata"),
    }
    (ROOT / "synthesis.json").write_text(json.dumps(metadata, indent=4) + "\n")
    print(json.dumps({"file": str(destination), "durationSeconds": duration, "voice": configuration["voice"]}))


if __name__ == "__main__":
    main()
