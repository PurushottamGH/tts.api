const API_BASE = "https://voice-ai-bf1v.onrender.com";

const QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The voice carries what words alone cannot.", author: "Narrate" },
  { text: "Every word spoken well is a world created.", author: "Narrate" },
];

const MAX_HISTORY = 8;
const WARN_THRESHOLD = 3000;

let allVoices = [];

window.addEventListener("DOMContentLoaded", () => {
  showQuote();
  loadVoices();
  renderHistory();
  setupDragDrop();
  restoreTheme();
  document.getElementById("textInput").focus();
});

// ── QUOTE ────────────────────────────────────────────────
function showQuote() {
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  document.getElementById("quoteText").textContent = q.text;
  document.getElementById("quoteAuthor").textContent = "— " + q.author;
}

function toggleQuote(show) {
  document.getElementById("welcomeArea").style.display = show ? "" : "none";
}

// ── VOICES ───────────────────────────────────────────────
async function loadVoices() {
  const sel = document.getElementById("voiceSelect");
  try {
    const res = await fetch(`${API_BASE}/voices`);
    allVoices = await res.json();
    sel.innerHTML = allVoices.map(v =>
      `<option value="${v.id}">${v.label} — ${v.tag}</option>`
    ).join("");
  } catch {
    allVoices = [{ id: "en-GB-RyanNeural", label: "Ryan", tag: "British · Male" }];
    sel.innerHTML = `<option value="en-GB-RyanNeural">Ryan — British · Male</option>`;
  }
  renderVoiceList();
}

function renderVoiceList() {
  const cur = document.getElementById("voiceSelect").value;
  document.getElementById("voiceList").innerHTML = allVoices.length
    ? allVoices.map(v => `
      <div class="voice-item ${v.id === cur ? 'active' : ''}" onclick="selectVoice('${v.id}')">
        <div><div class="vi-name">${v.label}</div><div class="vi-tag">${v.tag}</div></div>
        ${v.id === cur ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </div>`).join("")
    : `<div class="empty-state"><p>Loading...</p></div>`;
}

function selectVoice(id) {
  document.getElementById("voiceSelect").value = id;
  renderVoiceList();
}

// ── TABS ────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll(".stab").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("active", p.id === "tab-" + name));
  if (name === "voices") renderVoiceList();
}

// ── THEME ────────────────────────────────────────────────
function setTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("theme", t);
  document.getElementById("darkBtn").classList.toggle("active", t === "dark");
  document.getElementById("lightBtn").classList.toggle("active", t === "light");
}

function restoreTheme() {
  setTheme(localStorage.getItem("theme") || "dark");
}

// ── TEXTAREA ─────────────────────────────────────────────
function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 160) + "px";
}

function updateCount() {
  const len = document.getElementById("textInput").value.length;
  const badge = document.getElementById("charCount");
  badge.textContent = len;
  badge.classList.toggle("over", len > WARN_THRESHOLD);
  document.getElementById("warnBar").classList.toggle("visible", len > WARN_THRESHOLD);
}

function clearText() {
  const t = document.getElementById("textInput");
  t.value = ""; autoResize(t); updateCount(); t.focus();
}

// ── FILE LOADING ─────────────────────────────────────────
function loadTextFile(e) {
  const file = e.target.files[0]; if (!file) return;
  new FileReader().onload = ev => {
    const t = document.getElementById("textInput");
    t.value = ev.target.result.trim(); autoResize(t); updateCount();
    setStatus(`Loaded: ${file.name}`, "success");
  }, new FileReader().readAsText(file);
  const r = new FileReader();
  r.onload = ev => { const t = document.getElementById("textInput"); t.value = ev.target.result.trim(); autoResize(t); updateCount(); setStatus(`Loaded: ${file.name}`, "success"); };
  r.readAsText(file); e.target.value = "";
}

async function loadPdfFile(e) {
  const file = e.target.files[0]; if (!file) return;
  setStatus("Extracting PDF...", "loading");
  const fd = new FormData(); fd.append("file", file);
  try {
    const res = await fetch(`${API_BASE}/extract-pdf`, { method: "POST", body: fd });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const t = document.getElementById("textInput");
    t.value = data.text; autoResize(t); updateCount();
    setStatus(`Loaded: ${file.name}`, "success");
  } catch (err) { setStatus(`PDF error: ${err.message}`, "error"); }
  e.target.value = "";
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    const t = document.getElementById("textInput");
    t.value = text.trim(); autoResize(t); updateCount();
    setStatus("Pasted from clipboard.", "success");
  } catch { setStatus("Clipboard access denied.", "error"); }
}

// ── DROPDOWN ─────────────────────────────────────────────
function toggleDropdown() { document.getElementById("dropdown").classList.toggle("open"); }
function closeDropdown()  { document.getElementById("dropdown").classList.remove("open"); }
document.addEventListener("click", e => { if (!e.target.closest(".dropdown-wrap")) closeDropdown(); });

// ── COPY ────────────────────────────────────────────────
function copyText() {
  const val = document.getElementById("textInput").value;
  if (!val) return;
  navigator.clipboard.writeText(val).then(() => showToast("✓ Copied to clipboard"));
}

// ── STATUS ───────────────────────────────────────────────
function setStatus(msg, state = "idle") {
  document.getElementById("chipText").textContent = msg;
  const dot = document.getElementById("chipDot");
  dot.className = "chip-dot";
  if (state !== "idle") dot.classList.add(state);
  if (state === "success") setTimeout(() => setStatus("Ready"), 3000);
}

// ── CONVERT ──────────────────────────────────────────────
async function convertAudio() {
  const text = document.getElementById("textInput").value.trim();
  if (!text) { setStatus("Enter text first.", "error"); return; }

  const voice = document.getElementById("voiceSelect").value;
  const rate  = document.getElementById("rateSlider").value + "%";
  const pitch = document.getElementById("pitchSlider").value + "Hz";

  document.getElementById("convertBtn").disabled = true;
  document.getElementById("outputCard").classList.remove("visible");
  document.getElementById("progressWrap").classList.add("visible");
  setStatus("Generating...", "loading");

  const welcome = document.getElementById("welcomeArea");
  if (welcome) welcome.style.opacity = "0.25";

  try {
    const res = await fetch(`${API_BASE}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, rate, pitch })
    });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();

    document.getElementById("audioPlayer").src = `${API_BASE}/download?t=${Date.now()}`;
    document.getElementById("outputCard").classList.add("visible");
    document.getElementById("convertBtn").disabled = false;

    const voiceLabel = document.getElementById("voiceSelect").selectedOptions[0]?.text.split("—")[0].trim() || voice;
    document.getElementById("audioMeta").innerHTML =
      `<span>${voiceLabel}</span><span>Speed ${rate}</span><span>Pitch ${pitch}</span>` +
      (data.chunks > 1 ? `<span>${data.chunks} chunks merged</span>` : "");

    if (document.getElementById("autoPlayToggle")?.checked) {
      document.getElementById("audioPlayer").play().catch(() => {});
    }

    setStatus("Audio ready", "success");
    if (welcome) welcome.style.opacity = "0";

    saveHistory({ text: text.slice(0, 80), fullText: text, voice, voiceLabel, rate, pitch, time: Date.now() });
    renderHistory();

  } catch (err) {
    setStatus(`Error: ${err.message}`, "error");
    if (welcome) welcome.style.opacity = "1";
  } finally {
    document.getElementById("convertBtn").disabled = false;
    document.getElementById("progressWrap").classList.remove("visible");
  }
}

// ── DOWNLOAD / SHARE ─────────────────────────────────────
function downloadAudio() {
  const a = document.createElement("a");
  a.href = `${API_BASE}/download`; a.download = "narration.mp3"; a.click();
}

function shareAudio() {
  const url = `${API_BASE}/download`;
  if (navigator.share) navigator.share({ title: "Narrate Audio", url }).catch(() => {});
  else navigator.clipboard.writeText(url).then(() => showToast("✓ Link copied to clipboard"));
}

// ── HISTORY ──────────────────────────────────────────────
function saveHistory(entry) {
  let h = getHistory();
  h.unshift(entry);
  if (h.length > MAX_HISTORY) h = h.slice(0, MAX_HISTORY);
  localStorage.setItem("tts_history", JSON.stringify(h));
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem("tts_history") || "[]"); } catch { return []; }
}

function clearHistory() {
  localStorage.removeItem("tts_history");
  renderHistory();
  showToast("History cleared");
}

function renderHistory() {
  const h = getHistory();
  document.getElementById("historyList").innerHTML = h.length
    ? h.map((item, i) => `
      <div class="history-item" onclick="loadFromHistory(${i})">
        <div class="hi-text">${item.text}</div>
        <div class="hi-meta">
          <span>${item.voiceLabel || "Ryan"}</span>
          <span>${new Date(item.time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span>
        </div>
      </div>`).join("")
    : `<div class="empty-state"><div class="empty-icon">◎</div><p>No conversions yet.<br>Convert text to get started.</p></div>`;
}

function loadFromHistory(i) {
  const h = getHistory()[i]; if (!h) return;
  const t = document.getElementById("textInput");
  t.value = h.fullText || h.text; autoResize(t); updateCount();
  if (h.voice) document.getElementById("voiceSelect").value = h.voice;
  if (h.rate)  { document.getElementById("rateSlider").value = parseInt(h.rate); document.getElementById("rateVal").textContent = h.rate; }
  if (h.pitch) { document.getElementById("pitchSlider").value = parseInt(h.pitch); document.getElementById("pitchVal").textContent = h.pitch; }
  setStatus("Loaded from history.", "success");
}

// ── DRAG & DROP ───────────────────────────────────────────
function setupDragDrop() {
  const overlay = document.getElementById("dragOverlay");
  document.addEventListener("dragover", e => { e.preventDefault(); overlay.classList.add("visible"); });
  document.addEventListener("dragleave", e => { if (!e.relatedTarget) overlay.classList.remove("visible"); });
  document.addEventListener("drop", async e => {
    e.preventDefault(); overlay.classList.remove("visible");
    const file = e.dataTransfer.files[0]; if (!file) return;
    if (file.name.endsWith(".txt")) {
      const r = new FileReader();
      r.onload = ev => { const t = document.getElementById("textInput"); t.value = ev.target.result.trim(); autoResize(t); updateCount(); setStatus(`Loaded: ${file.name}`, "success"); };
      r.readAsText(file);
    } else if (file.name.endsWith(".pdf")) {
      setStatus("Extracting PDF...", "loading");
      const fd = new FormData(); fd.append("file", file);
      try {
        const res = await fetch(`${API_BASE}/extract-pdf`, { method: "POST", body: fd });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const t = document.getElementById("textInput"); t.value = data.text; autoResize(t); updateCount();
        setStatus(`Loaded: ${file.name}`, "success");
      } catch (err) { setStatus(`PDF error: ${err.message}`, "error"); }
    } else { showToast("Only .txt and .pdf supported"); }
  });
}

// ── TOAST ────────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg; toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}
