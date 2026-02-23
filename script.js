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
const warnBar     = document.getElementById("warnBar");
const progressWrap= document.getElementById("progressWrap");
const historyList = document.getElementById("historyList");

const WARN_THRESHOLD = 3000;
const MAX_HISTORY = 5;

// ── INIT ────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  loadVoices();
  renderHistory();
  setupDragDrop();
});

// ── VOICE LOADING ────────────────────────────────────────
async function loadVoices() {
  const sel = document.getElementById("voiceSelect");
  try {
    const res = await fetch(`${API_BASE}/voices`);
    const voices = await res.json();
    sel.innerHTML = voices.map(v =>
      `<option value="${v.id}">${v.label} — ${v.tag}</option>`
    ).join("");
  } catch {
    sel.innerHTML = `<option value="en-GB-RyanNeural">Ryan — British · Male</option>`;
  }
}

// ── TEXTAREA ─────────────────────────────────────────────
function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 300) + "px";
}

function updateCount() {
  const len = textInput.value.length;
  charCount.textContent = len;
  charCount.classList.toggle("over", len > WARN_THRESHOLD);
  warnBar.classList.toggle("visible", len > WARN_THRESHOLD);
}

// ── FILE LOADING ─────────────────────────────────────────
function loadTextFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    textInput.value = e.target.result.trim();
    autoResize(textInput);
    updateCount();
    setStatus(`Loaded: ${file.name}`, "success");
  };
  reader.readAsText(file);
  event.target.value = "";
}

async function loadPdfFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  setStatus("Extracting PDF text...", "loading");
  const formData = new FormData();
  formData.append("file", file);
  try {
    const res = await fetch(`${API_BASE}/extract-pdf`, { method: "POST", body: formData });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    textInput.value = data.text;
    autoResize(textInput);
    updateCount();
    setStatus(`Loaded: ${file.name}`, "success");
  } catch (err) {
    setStatus(`PDF error: ${err.message}`, "error");
  }
  event.target.value = "";
}

// ── DROPDOWN ─────────────────────────────────────────────
function toggleDropdown() {
  document.getElementById("dropdown").classList.toggle("open");
}

function closeDropdown() {
  document.getElementById("dropdown").classList.remove("open");
}

document.addEventListener("click", e => {
  if (!e.target.closest(".dropdown-wrap")) closeDropdown();
});

// ── COPY ─────────────────────────────────────────────────
function copyText() {
  if (!textInput.value) return;
  navigator.clipboard.writeText(textInput.value).then(() => {
    setStatus("Copied to clipboard.", "success");
    setTimeout(() => setStatus(""), 2000);
  });
}

// ── THEME ─────────────────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute("data-theme") === "dark";
  html.setAttribute("data-theme", isDark ? "light" : "dark");
  document.getElementById("themeBtn").textContent = isDark ? "☀" : "☾";
  localStorage.setItem("theme", isDark ? "light" : "dark");
}

// Restore saved theme
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
  document.documentElement.setAttribute("data-theme", savedTheme);
  document.getElementById("themeBtn").textContent = savedTheme === "dark" ? "☾" : "☀";
}

// ── STATUS ───────────────────────────────────────────────
function setStatus(msg, state = "idle") {
  status.textContent = msg;
  dot.className = "dot";
  if (state !== "idle") dot.classList.add(state);
}

// ── CONVERT ──────────────────────────────────────────────
async function convertAudio() {
  const text = textInput.value.trim();
  if (!text) { setStatus("Please enter some text first.", "error"); return; }

  const voice = document.getElementById("voiceSelect").value;
  const rate  = document.getElementById("rateSlider").value + "%";
  const pitch = document.getElementById("pitchSlider").value + "Hz";

  convertBtn.disabled = true;
  downloadBtn.disabled = true;
  playerWrap.classList.remove("visible");
  progressWrap.classList.add("visible");
  setStatus("Generating audio...", "loading");

  try {
    const res = await fetch(`${API_BASE}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, rate, pitch })
    });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();

    audioPlayer.src = `${API_BASE}/download?t=${Date.now()}`;
    playerWrap.classList.add("visible");
    downloadBtn.disabled = false;

    const chunks = data.chunks > 1 ? ` (${data.chunks} chunks)` : "";
    setStatus(`Audio ready${chunks}`, "success");

    // Save to history
    saveHistory({
      text: text.slice(0, 80) + (text.length > 80 ? "…" : ""),
      fullText: text,
      voice: document.getElementById("voiceSelect").options[document.getElementById("voiceSelect").selectedIndex]?.text || voice,
      rate, pitch,
      time: Date.now()
    });
    renderHistory();

  } catch (err) {
    setStatus(`Error: ${err.message}`, "error");
  } finally {
    convertBtn.disabled = false;
    progressWrap.classList.remove("visible");
  }
}

// ── DOWNLOAD ─────────────────────────────────────────────
function downloadAudio() {
  const a = document.createElement("a");
  a.href = `${API_BASE}/download`;
  a.download = "narration.mp3";
  a.click();
}

// ── HISTORY ──────────────────────────────────────────────
function saveHistory(entry) {
  let history = getHistory();
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  localStorage.setItem("tts_history", JSON.stringify(history));
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem("tts_history") || "[]"); }
  catch { return []; }
}

function renderHistory() {
  const history = getHistory();
  if (history.length === 0) {
    historyList.innerHTML = `<div class="history-empty">No conversions yet</div>`;
    return;
  }
  historyList.innerHTML = history.map((h, i) => `
    <div class="history-item">
      <span class="history-thumb">${h.text}</span>
      <span class="history-voice">${h.voice?.split("—")[0]?.trim() || ""}</span>
      <button class="history-load" onclick="loadFromHistory(${i})">Load</button>
    </div>
  `).join("");
}

function loadFromHistory(index) {
  const history = getHistory();
  const h = history[index];
  if (!h) return;
  textInput.value = h.fullText;
  autoResize(textInput);
  updateCount();

  // Restore sliders if saved
  if (h.rate)  document.getElementById("rateSlider").value  = parseInt(h.rate);
  if (h.pitch) document.getElementById("pitchSlider").value = parseInt(h.pitch);
  document.getElementById("rateVal").textContent  = h.rate  || "-15%";
  document.getElementById("pitchVal").textContent = h.pitch || "-22Hz";

  setStatus("Loaded from history.", "success");
  setTimeout(() => setStatus(""), 2000);
}

function toggleHistory() {
  historyList.classList.toggle("open");
  document.getElementById("historyChevron").classList.toggle("open");
}

// ── DRAG & DROP ──────────────────────────────────────────
function setupDragDrop() {
  const overlay = document.getElementById("dragOverlay");

  document.addEventListener("dragover", e => {
    e.preventDefault();
    overlay.classList.add("visible");
  });

  document.addEventListener("dragleave", e => {
    if (!e.relatedTarget) overlay.classList.remove("visible");
  });

  document.addEventListener("drop", async e => {
    e.preventDefault();
    overlay.classList.remove("visible");
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (file.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = ev => {
        textInput.value = ev.target.result.trim();
        autoResize(textInput);
        updateCount();
        setStatus(`Loaded: ${file.name}`, "success");
      };
      reader.readAsText(file);
    } else if (file.name.endsWith(".pdf")) {
      setStatus("Extracting PDF text...", "loading");
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch(`${API_BASE}/extract-pdf`, { method: "POST", body: formData });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        textInput.value = data.text;
        autoResize(textInput);
        updateCount();
        setStatus(`Loaded: ${file.name}`, "success");
      } catch (err) {
        setStatus(`PDF error: ${err.message}`, "error");
      }
    } else {
      setStatus("Only .txt and .pdf files supported.", "error");
    }
  });
}
