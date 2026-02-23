from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import edge_tts
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

VOICE = "en-GB-RyanNeural"
OUTPUT_FILE = "/tmp/output.mp3"

class TextRequest(BaseModel):
    text: str

@app.post("/convert")
async def convert_audio(request: TextRequest):
    communicate = edge_tts.Communicate(
        text=request.text,
        voice=VOICE,
        rate="-15%",
        pitch="-22Hz"
    )
    await communicate.save(OUTPUT_FILE)
    return {"status": "done"}

@app.get("/download")
async def download_audio():
    if os.path.exists(OUTPUT_FILE):
        return FileResponse(OUTPUT_FILE, media_type="audio/mpeg", filename="narration.mp3")
    return {"error": "No audio file found. Please convert text first."}

@app.get("/health")
async def health():
    return {"status": "ok"}
