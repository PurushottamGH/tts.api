// ── CONFIG ──────────────────────────────────────────────
// After deploying to Render, replace this with your Render URL
// e.g. "https://text-to-audio-api.onrender.com"
const API_BASE = "http://127.0.0.1:8000";
// ────────────────────────────────────────────────────────

const textInput   = document.getElementById("textInput");
const status      = document.getElementById("status");
const statusDot   = document.getElementById("statusDot");
const convertBtn  = document.getElementById("convertBtn");
const downloadBtn = document.getElementById("downloadBtn");
const playerWrap  = document.getElementById("playerWrap");
const audioPlayer = document.getElementById("audioPlayer");
const charCount   = document.getElementById("charCount");

// Live character count
textInput.addEventListener("input", () => {
  charCount.textContent = textInput.value.length;
});

function setStatus(msg, state = "idle") {
  status.textContent = msg;
  statusDot.className = "status-dot";
  if (state === "loading") statusDot.classList.add("loading");
  if (state === "success") statusDot.classList.add("success");
  if (state === "error")   statusDot.classList.add("error");
}

async function convertAudio() {
  const text = textInput.value.trim();
  if (!text) {
    setStatus("Please enter some text first.", "error");
    return;
  }

  convertBtn.disabled = true;
  downloadBtn.disabled = true;
  playerWrap.classList.remove("visible");
  setStatus("Generating audio...", "loading");

  try {
    const res = await fetch(`${API_BASE}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    // Load audio preview
    const audioUrl = `${API_BASE}/download?t=${Date.now()}`;
    audioPlayer.src = audioUrl;
    playerWrap.classList.add("visible");

    downloadBtn.disabled = false;
    setStatus("Audio ready.", "success");
  } catch (err) {
    setStatus(`Error: ${err.message}`, "error");
  } finally {
    convertBtn.disabled = false;
  }
}

function downloadAudio() {
  const a = document.createElement("a");
  a.href = `${API_BASE}/download`;
  a.download = "narration.mp3";
  a.click();
}
