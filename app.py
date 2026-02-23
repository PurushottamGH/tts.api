from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import edge_tts
import os
import io
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_FILE = "/tmp/output.mp3"

VOICES = [
    {"id": "en-GB-RyanNeural",     "label": "Ryan",    "tag": "British · Male"},
    {"id": "en-GB-SoniaNeural",    "label": "Sonia",   "tag": "British · Female"},
    {"id": "en-US-GuyNeural",      "label": "Guy",     "tag": "American · Male"},
    {"id": "en-US-JennyNeural",    "label": "Jenny",   "tag": "American · Female"},
    {"id": "en-AU-WilliamNeural",  "label": "William", "tag": "Australian · Male"},
    {"id": "en-AU-NatashaNeural",  "label": "Natasha", "tag": "Australian · Female"},
    {"id": "en-IN-PrabhatNeural",  "label": "Prabhat", "tag": "Indian · Male"},
    {"id": "en-IN-NeerjaNeural",   "label": "Neerja",  "tag": "Indian · Female"},
]


class TextRequest(BaseModel):
    text: str
    voice: str = "en-GB-RyanNeural"
    rate: str = "-15%"
    pitch: str = "-22Hz"


def chunk_text(text: str, max_chars: int = 2000):
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    chunks = []
    current = ""
    for sentence in sentences:
        if len(current) + len(sentence) + 1 <= max_chars:
            current += (" " if current else "") + sentence
        else:
            if current:
                chunks.append(current)
            if len(sentence) > max_chars:
                parts = sentence.split(", ")
                current = ""
                for part in parts:
                    if len(current) + len(part) + 2 <= max_chars:
                        current += (", " if current else "") + part
                    else:
                        if current:
                            chunks.append(current)
                        current = part
            else:
                current = sentence
    if current:
        chunks.append(current)
    return chunks if chunks else [text]


@app.get("/voices")
def get_voices():
    return VOICES


@app.post("/convert")
async def convert_audio(request: TextRequest):
    chunks = chunk_text(request.text)
    all_audio = bytearray()

    for chunk in chunks:
        communicate = edge_tts.Communicate(
            text=chunk,
            voice=request.voice,
            rate=request.rate,
            pitch=request.pitch,
        )
        async for part in communicate.stream():
            if part["type"] == "audio":
                all_audio.extend(part["data"])

    with open(OUTPUT_FILE, "wb") as f:
        f.write(all_audio)

    return {"status": "done", "chunks": len(chunks)}


@app.post("/extract-pdf")
async def extract_pdf(file: UploadFile = File(...)):
    try:
        import pypdf
        content = await file.read()
        reader = pypdf.PdfReader(io.BytesIO(content))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        return {"text": text.strip()}
    except Exception as e:
        return {"error": str(e)}


@app.get("/download")
async def download_audio():
    if os.path.exists(OUTPUT_FILE):
        return FileResponse(OUTPUT_FILE, media_type="audio/mpeg", filename="narration.mp3")
    return {"error": "No audio file found. Please convert first."}


@app.get("/health")
async def health():
    return {"status": "ok"}
