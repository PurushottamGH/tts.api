// ── CONFIG ──────────────────────────────────────────────
const API_BASE = "https://voice-ai-bf1v.onrender.com";
// ────────────────────────────────────────────────────────

const textInput   = document.getElementById("textInput");
const status      = document.getElementById("status");
const dot         = document.getElementById("dot");
const convertBtn  = document.getElementById("convertBtn");
const downloadBtn = document.getElementById("downloadBtn");
const playerWrap  = document.getElementById("playerWrap");
const audioPlayer = document.getElementById("audioPlayer");
const charCount   = document.getElementById("charCount");

function autoResize(el) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

function updateCount() {
  const len = textInput.value.length;
  charCount.textContent = len > 0 ? `${len} chars` : "";
}

function setStatus(msg, state = "idle") {
  status.textContent = msg;
  dot.className = "dot";
  if (state === "loading") dot.classList.add("loading");
  if (state === "success") dot.classList.add("success");
  if (state === "error")   dot.classList.add("error");
}

async function convertAudio() {
  const text = textInput.value.trim();
  if (!text) { setStatus("Please enter some text first.", "error"); return; }

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

    audioPlayer.src = `${API_BASE}/download?t=${Date.now()}`;
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
