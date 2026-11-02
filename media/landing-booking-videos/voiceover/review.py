import base64
import getpass
import json
import re
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent
credential = getpass.getpass("Gemini API key: ")
payload = {
    "model": "gemini-3.8-flash",
    "input": [
        {
            "type": "text",
            "text": (
                "Review this short German narration. Transcribe every spoken word verbatim, including the brand. "
                "Return only JSON with keys transcript (string), perceivedVoiceGender (string), "
                "languages (array), clarityProblems (array), and sentences (array of objects with start, end, text). "
                "Sentence timestamps are seconds from the beginning of the audio. Do not paraphrase."
            ),
        },
        {
            "type": "audio",
            "data": base64.b64encode((ROOT / "vo-source.wav").read_bytes()).decode(),
            "mime_type": "audio/wav",
        },
    ],
}
request = urllib.request.Request(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json", "x-goog-api-key": credential},
    method="POST",
)
try:
    with urllib.request.urlopen(request, timeout=120) as response:
        result = json.load(response)
except urllib.error.HTTPError as error:
    message = json.loads(error.read()).get("error", {}).get("message", "Review failed")
    raise RuntimeError(str(message).replace(credential, "[redacted]")) from None
text = "".join(
    content.get("text", "")
    for step in result.get("steps", [])
    if step.get("type") == "model_output"
    for content in step.get("content", [])
    if content.get("type") == "text"
)
text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
review = json.loads(text)
normalize = lambda value: "".join(character for character in value.casefold() if character.isalpha())
review["matchesScript"] = normalize(review["transcript"]) == normalize((ROOT / "vo-60s-script.txt").read_text())
(ROOT / "transcript-review.json").write_text(json.dumps(review, ensure_ascii=False, indent=4) + "\n")
print(json.dumps(review, ensure_ascii=False))
