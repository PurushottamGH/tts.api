from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import edge_tts
import os, io, re

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

OUTPUT_FILE = "/tmp/output.mp3"

VOICES = [
    {"id": "en-GB-RyanNeural",    "label": "Ryan",    "tag": "British · Male",     "version": "v2"},
    {"id": "en-GB-SoniaNeural",   "label": "Sonia",   "tag": "British · Female",   "version": "v2"},
    {"id": "en-US-GuyNeural",     "label": "Guy",     "tag": "American · Male",    "version": "v2"},
    {"id": "en-US-JennyNeural",   "label": "Jenny",   "tag": "American · Female",  "version": "v2"},
    {"id": "en-US-AriaNeural",    "label": "Aria",    "tag": "American · Female",  "version": "v2"},
    {"id": "en-US-DavisNeural",   "label": "Davis",   "tag": "American · Male",    "version": "v2"},
    {"id": "en-AU-WilliamNeural", "label": "William", "tag": "Australian · Male",  "version": "v2"},
    {"id": "en-AU-NatashaNeural", "label": "Natasha", "tag": "Australian · Female","version": "v2"},
    {"id": "en-IN-PrabhatNeural", "label": "Prabhat", "tag": "Indian · Male",      "version": "v2"},
    {"id": "en-IN-NeerjaNeural",  "label": "Neerja",  "tag": "Indian · Female",    "version": "v2"},
]

class TextRequest(BaseModel):
    text: str
    voice: str = "en-GB-RyanNeural"
    rate: str = "-10%"
    pitch: str = "-5Hz"
    quality: str = "v2"

def add_natural_pauses(text: str) -> str:
    """Add SSML-like natural breathing pauses between sentences."""
    # Add pauses after punctuation for more natural speech rhythm
    text = re.sub(r'\.(\s+)', r'. \1', text)
    text = re.sub(r',(\s+)', r', \1', text)
    text = re.sub(r';(\s+)', r'; \1', text)
    return text.strip()

def chunk_text(text: str, max_chars: int = 2500):
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    chunks, current = [], ""
    for s in sentences:
        if len(current) + len(s) + 1 <= max_chars:
            current += (" " if current else "") + s
        else:
            if current: chunks.append(current)
            current = s if len(s) <= max_chars else s
    if current: chunks.append(current)
    return chunks or [text]

@app.get("/voices")
def get_voices():
    return VOICES

@app.post("/convert")
async def convert_audio(request: TextRequest):
    processed = add_natural_pauses(request.text)
    chunks = chunk_text(processed)
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
    char_count = len(request.text)
    word_count = len(request.text.split())
    return {"status": "done", "chunks": len(chunks), "chars": char_count, "words": word_count}

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
    return {"error": "No audio file found."}

@app.get("/health")
async def health():
    return {"status": "ok"}
