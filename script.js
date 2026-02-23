// ── CONFIG ──────────────────────────────────────────────
const API_BASE = "https://voice-ai-bf1v.onrender.com";
// ────────────────────────────────────────────────────────

const QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Your limitation — it's only your imagination.", author: "Unknown" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Dream it. Wish it. Do it.", author: "Unknown" },
  { text: "The voice carries what words alone cannot.", author: "Narrate" },
  { text: "Every word spoken well is a world created.", author: "Narrate" },
];

const MAX_HISTORY = 8;
const WARN_THRESHOLD = 3000;

// ── DOM refs ─────────────────────────────────────────────
const textInput    = document.getElementById("textInput");
const chipDot      = document.getElementById("chipDot");
const chipText     = document.getElementById("chipText");
const convertBtn   = document.getElementById("convertBtn");
const audioPlayer  = document.getElementById("audioPlayer");
const charCount    = document.getElementById("charCount");
const warnBar      = document.getElementById("warnBar");
const progressWrap = document.getElementById("progressWrap");
const outputCard   = document.getElementById("outputCard");
const historyList  = document.getElementById("historyList");
const voiceList    = document.getElementById("voiceList");

// ── INIT ─────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  showWelcomeQuote();
  loadVoices();
  renderHistory();
  setupDragDrop();
  restoreTheme();
  textInput.focus();
});

// ── WELCOME QUOTE ─────────────────────────────────────────
function showWelcomeQuote() {
  const showQuote = document.getElementById("quoteToggle")?.checked !== false;
  const area = document.getElementById("welcomeArea");
  if (!area) return;
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  document.getElementById("quoteText").textContent = q.text;
  document.getElementById("quoteAuthor").textContent = "— " + q.author;

  document.getElementById("quoteToggle")?.addEventListener("change", e => {
    area.style.display = e.target.checked ? "block" : "none";
  });
}

// ── VOICE LOADING ─────────────────────────────────────────
let allVoices = [];

async function loadVoices() {
  const sel = document.getElementById("voiceSelect");
  try {
    const res = await fetch(`${API_BASE}/voices`);
    allVoices = await res.json();
    sel.innerHTML = allVoices.map(v =>
      `<option value="${v.id}">${v.label} — ${v.tag}</option>`
    ).join("");
    renderVoiceList();
  } catch {
    sel.innerHTML = `<option value="en-GB-RyanNeural">Ryan — British · Male</option>`;
    allVoices = [{ id: "en-GB-RyanNeural", label: "Ryan", tag: "British · Male" }];
    renderVoiceList();
  }
}

function renderVoiceList() {
  const currentVoice = document.getElementById("voiceSelect").value;
  voiceList.innerHTML = allVoices.map(v => `
    <div class="voice-item ${v.id === currentVoice ? 'selected' : ''}"
         onclick="selectVoice('${v.id}')">
      <div>
        <div class="voice-name">${v.label}</div>
        <div class="voice-tag">${v.tag}</div>
      </div>
      ${v.id === currentVoice ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
    </div>
  `).join("");
}

function selectVoice(id) {
  document.getElementById("voiceSelect").value = id;
  renderVoiceList();
}

// ── SIDEBAR ───────────────────────────────────────────────
let sidebarOpen = false;

function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  document.getElementById("sidebar").classList.toggle("open", sidebarOpen);
  document.getElementById("sidebarBackdrop").classList.toggle("visible", sidebarOpen);
}

function switchTab(name) {
  document.querySelectorAll(".stab").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("active", p.id === "tab-" + name));
  if (name === "voices") renderVoiceList();
}

// ── THEME ─────────────────────────────────────────────────
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  document.getElementById("darkBtn").classList.toggle("active", theme === "dark");
  document.getElementById("lightBtn").classList.toggle("active", theme === "light");
}

function restoreTheme() {
  const t = localStorage.getItem("theme") || "dark";
  setTheme(t);
}

// ── TEXTAREA ──────────────────────────────────────────────
function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 220) + "px";
}

function updateCount() {
  const len = textInput.value.length;
  charCount.textContent = len;
  charCount.classList.toggle("over", len > WARN_THRESHOLD);
  warnBar.classList.toggle("visible", len > WARN_THRESHOLD);
}

function clearText() {
  textInput.value = "";
  autoResize(textInput);
  updateCount();
  textInput.focus();
}

// ── FILE LOADING ──────────────────────────────────────────
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
  setStatus("Extracting PDF...", "loading");
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

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    textInput.value = text.trim();
    autoResize(textInput);
    updateCount();
    setStatus("Pasted from clipboard.", "success");
  } catch {
    setStatus("Clipboard access denied.", "error");
  }
}

// ── DROPDOWN ──────────────────────────────────────────────
function toggleDropdown() {
  document.getElementById("dropdown").classList.toggle("open");
}
function closeDropdown() {
  document.getElementById("dropdown").classList.remove("open");
}
document.addEventListener("click", e => {
  if (!e.target.closest(".dropdown-wrap")) closeDropdown();
});

// ── COPY ──────────────────────────────────────────────────
function copyText() {
  if (!textInput.value) return;
  navigator.clipboard.writeText(textInput.value).then(() => {
    showToast("✓ Copied to clipboard");
  });
}

// ── STATUS ────────────────────────────────────────────────
function setStatus(msg, state = "idle") {
  chipText.textContent = msg;
  chipDot.className = "chip-dot";
  if (state !== "idle") chipDot.classList.add(state);
  if (state === "success") setTimeout(() => setStatus("Ready"), 3000);
}

// ── CONVERT ───────────────────────────────────────────────
async function convertAudio() {
  const text = textInput.value.trim();
  if (!text) { setStatus("Enter some text first.", "error"); return; }

  const voice = document.getElementById("voiceSelect").value;
  const rate  = document.getElementById("rateSlider").value + "%";
  const pitch = document.getElementById("pitchSlider").value + "Hz";

  convertBtn.disabled = true;
  outputCard.classList.remove("visible");
  progressWrap.classList.add("visible");
  setStatus("Generating audio...", "loading");

  // Hide welcome on first convert
  const welcome = document.getElementById("welcomeArea");
  if (welcome) welcome.style.opacity = "0.3";

  try {
    const res = await fetch(`${API_BASE}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, rate, pitch })
    });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();

    const audioUrl = `${API_BASE}/download?t=${Date.now()}`;
    audioPlayer.src = audioUrl;
    outputCard.classList.add("visible");

    // Audio meta info
    const voiceLabel = document.getElementById("voiceSelect").options[document.getElementById("voiceSelect").selectedIndex]?.text || voice;
    document.getElementById("audioMeta").innerHTML =
      `<span>Voice: ${voiceLabel.split("—")[0].trim()}</span>` +
      `<span>Speed: ${rate}</span>` +
      `<span>Pitch: ${pitch}</span>` +
      (data.chunks > 1 ? `<span>${data.chunks} chunks merged</span>` : "");

    // Autoplay if enabled
    if (document.getElementById("autoPlayToggle")?.checked) {
      audioPlayer.play().catch(() => {});
    }

    const chunksNote = data.chunks > 1 ? ` · ${data.chunks} chunks` : "";
    setStatus(`Audio ready${chunksNote}`, "success");

    saveHistory({ text, fullText: text, voice, voiceLabel: voiceLabel.split("—")[0].trim(), rate, pitch, time: Date.now() });
    renderHistory();

    if (welcome) welcome.style.opacity = "0";

  } catch (err) {
    setStatus(`Error: ${err.message}`, "error");
    if (welcome) welcome.style.opacity = "1";
  } finally {
    convertBtn.disabled = false;
    progressWrap.classList.remove("visible");
  }
}

// ── DOWNLOAD ──────────────────────────────────────────────
function downloadAudio() {
  const a = document.createElement("a");
  a.href = `${API_BASE}/download`;
  a.download = "narration.mp3";
  a.click();
}

// ── SHARE ─────────────────────────────────────────────────
function shareAudio() {
  const url = `${API_BASE}/download`;
  if (navigator.share) {
    navigator.share({ title: "Narrate Audio", url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url).then(() => {
      showToast("✓ Audio link copied to clipboard");
    });
  }
}

// ── HISTORY ───────────────────────────────────────────────
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

function clearHistory() {
  localStorage.removeItem("tts_history");
  renderHistory();
  showToast("History cleared");
}

function renderHistory() {
  const history = getHistory();
  if (history.length === 0) {
    historyList.innerHTML = `<div class="empty-state"><div class="empty-icon">◎</div><p>No conversions yet.<br>Convert some text to get started.</p></div>`;
    return;
  }
  historyList.innerHTML = history.map((h, i) => {
    const date = new Date(h.time);
    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `
      <div class="history-item" onclick="loadFromHistory(${i})">
        <div class="history-item-text">${h.text.slice(0, 60)}${h.text.length > 60 ? "…" : ""}</div>
        <div class="history-item-meta">
          <span>${h.voiceLabel || "Ryan"}</span>
          <span>${timeStr}</span>
        </div>
      </div>
    `;
  }).join("");
}

function loadFromHistory(index) {
  const history = getHistory();
  const h = history[index];
  if (!h) return;
  textInput.value = h.fullText || h.text;
  autoResize(textInput);
  updateCount();
  if (h.voice) document.getElementById("voiceSelect").value = h.voice;
  if (h.rate)  { document.getElementById("rateSlider").value = parseInt(h.rate); document.getElementById("rateVal").textContent = h.rate; }
  if (h.pitch) { document.getElementById("pitchSlider").value = parseInt(h.pitch); document.getElementById("pitchVal").textContent = h.pitch; }
  setStatus("Loaded from history.", "success");
  toggleSidebar();
  textInput.focus();
}

// ── DRAG & DROP ───────────────────────────────────────────
function setupDragDrop() {
  const overlay = document.getElementById("dragOverlay");

  document.addEventListener("dragover", e => { e.preventDefault(); overlay.classList.add("visible"); });
  document.addEventListener("dragleave", e => { if (!e.relatedTarget) overlay.classList.remove("visible"); });
  document.addEventListener("drop", async e => {
    e.preventDefault();
    overlay.classList.remove("visible");
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (file.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = ev => { textInput.value = ev.target.result.trim(); autoResize(textInput); updateCount(); setStatus(`Loaded: ${file.name}`, "success"); };
      reader.readAsText(file);
    } else if (file.name.endsWith(".pdf")) {
      setStatus("Extracting PDF...", "loading");
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch(`${API_BASE}/extract-pdf`, { method: "POST", body: formData });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        textInput.value = data.text; autoResize(textInput); updateCount();
        setStatus(`Loaded: ${file.name}`, "success");
      } catch (err) { setStatus(`PDF error: ${err.message}`, "error"); }
    } else {
      showToast("Only .txt and .pdf supported");
    }
  });
}

// ── TOAST ─────────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}
