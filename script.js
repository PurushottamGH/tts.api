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
  { text: "Words are, of course, the most powerful drug used by mankind.", author: "Rudyard Kipling" },
  { text: "The pen is mightier than the sword.", author: "Edward Bulwer-Lytton" },
  { text: "All great literature is one of two stories — a man goes on a journey, or a stranger comes to town.", author: "Leo Tolstoy" },
  { text: "If you want to know what a man's like, take a good look at how he treats his inferiors.", author: "J.K. Rowling" },
  { text: "There is no friend as loyal as a book.", author: "Ernest Hemingway" },
  { text: "A word after a word after a word is power.", author: "Margaret Atwood" },
  { text: "Speak clearly, if you speak at all; carve every word before you let it fall.", author: "Oliver Holmes" },
  { text: "Kind words do not cost much. Yet they accomplish much.", author: "Blaise Pascal" },
  { text: "Your voice is your power. Use it well.", author: "Narrate" },
  { text: "Language is the road map of a culture. It tells you where its people come from.", author: "Rita Mae Brown" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
];

const MAX_HISTORY = 10;
const WARN_THRESHOLD = 3000;
let allVoices = [];
let currentQuality = "v2";
let analyticsData = { total: 0, chars: 0, words: 0, voiceUsage: {} };

// ── INIT ─────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  setGreeting();
  showQuote();
  loadVoices();
  renderHistory();
  loadAnalytics();
  setupDragDrop();
  restoreTheme();
  restoreName();
  document.getElementById("textInput").focus();
});

// ── GREETING ──────────────────────────────────────────────
function setGreeting() {
  const name = localStorage.getItem("userName") || "Purushottam";
  const hour = new Date().getHours();
  let greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 21 ? "Good evening" : "Good night";
  document.getElementById("workspaceGreet").textContent = `My Workspace · ${greet}, ${name}`;
}

function updateGreeting() {
  const name = document.getElementById("nameInput").value || "Purushottam";
  localStorage.setItem("userName", name);
  setGreeting();
}

function restoreName() {
  const name = localStorage.getItem("userName");
  if (name) document.getElementById("nameInput").value = name;
}

// ── QUOTE ─────────────────────────────────────────────────
function showQuote() {
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  document.getElementById("quoteText").textContent = q.text;
  document.getElementById("quoteAuthor").textContent = "— " + q.author.toUpperCase();
}

function toggleQuote(show) {
  document.getElementById("welcomeArea").style.display = show ? "" : "none";
}

// ── VOICES ────────────────────────────────────────────────
async function loadVoices() {
  const sel = document.getElementById("voiceSelect");
  try {
    const res = await fetch(`${API_BASE}/voices`);
    allVoices = await res.json();
  } catch {
    allVoices = [
      { id: "en-GB-RyanNeural",    label: "Ryan",    tag: "British · Male",    version: "v2" },
      { id: "en-GB-SoniaNeural",   label: "Sonia",   tag: "British · Female",  version: "v2" },
      { id: "en-US-GuyNeural",     label: "Guy",     tag: "American · Male",   version: "v2" },
      { id: "en-US-JennyNeural",   label: "Jenny",   tag: "American · Female", version: "v2" },
      { id: "en-US-AriaNeural",    label: "Aria",    tag: "American · Female", version: "v2" },
      { id: "en-US-DavisNeural",   label: "Davis",   tag: "American · Male",   version: "v2" },
      { id: "en-AU-WilliamNeural", label: "William", tag: "Australian · Male", version: "v2" },
      { id: "en-IN-NeerjaNeural",  label: "Neerja",  tag: "Indian · Female",   version: "v2" },
    ];
  }
  sel.innerHTML = allVoices.map(v => `<option value="${v.id}">${v.label} — ${v.tag}</option>`).join("");
  renderVoiceList();
}

function renderVoiceList() {
  const cur = document.getElementById("voiceSelect").value;
  document.getElementById("voiceList").innerHTML = allVoices.map(v => `
    <div class="voice-item ${v.id === cur ? 'active' : ''}" onclick="selectVoice('${v.id}')">
      <div class="vi-info">
        <div class="vi-name">${v.label}</div>
        <div class="vi-tag">${v.tag}</div>
      </div>
      <span class="vi-badge">${v.version || 'v2'}</span>
    </div>`).join("");
}

function selectVoice(id) {
  document.getElementById("voiceSelect").value = id;
  renderVoiceList();
}

// ── QUALITY VERSION ───────────────────────────────────────
function setQuality(q) {
  currentQuality = q;
  document.getElementById("v1btn").classList.toggle("active", q === "v1");
  document.getElementById("v2btn").classList.toggle("active", q === "v2");
  // v1: more robotic defaults, v2: more natural
  if (q === "v1") {
    document.getElementById("rateSlider").value = 0;
    document.getElementById("pitchSlider").value = 0;
    document.getElementById("rateVal").textContent = "0%";
    document.getElementById("pitchVal").textContent = "0Hz";
  } else {
    document.getElementById("rateSlider").value = -10;
    document.getElementById("pitchSlider").value = -5;
    document.getElementById("rateVal").textContent = "-10%";
    document.getElementById("pitchVal").textContent = "-5Hz";
  }
}

// ── SIDEBAR ───────────────────────────────────────────────
const isMobile = () => window.innerWidth <= 768;

function openSidebar() {
  if (isMobile()) {
    document.getElementById("sidebar").classList.add("mobile-open");
    document.getElementById("sidebarOverlay").classList.add("visible");
  } else {
    document.getElementById("sidebar").classList.remove("collapsed");
  }
}

function closeSidebar() {
  if (isMobile()) {
    document.getElementById("sidebar").classList.remove("mobile-open");
    document.getElementById("sidebarOverlay").classList.remove("visible");
  } else {
    document.getElementById("sidebar").classList.add("collapsed");
  }
}

function switchTab(name) {
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("active", p.id === "tab-" + name));
  if (name === "voices") renderVoiceList();
  if (name === "analytics") renderAnalytics();
  if (isMobile()) closeSidebar();
}

// ── THEME ─────────────────────────────────────────────────
function setTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("theme", t);
  document.getElementById("darkBtn").classList.toggle("active", t === "dark");
  document.getElementById("lightBtn").classList.toggle("active", t === "light");
}

function restoreTheme() {
  setTheme(localStorage.getItem("theme") || "dark");
}

// ── TEXTAREA ──────────────────────────────────────────────
function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 180) + "px";
}

function updateCount() {
  const len = document.getElementById("textInput").value.length;
  const el = document.getElementById("charCount");
  el.textContent = len;
  el.classList.toggle("over", len > WARN_THRESHOLD);
  document.getElementById("warnBar").classList.toggle("visible", len > WARN_THRESHOLD);
}

function clearText() {
  const t = document.getElementById("textInput");
  t.value = ""; autoResize(t); updateCount(); t.focus();
}

// ── FILE LOADING ──────────────────────────────────────────
function loadTextFile(e) {
  const file = e.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = ev => {
    const t = document.getElementById("textInput");
    t.value = ev.target.result.trim(); autoResize(t); updateCount();
    setStatus(`Loaded: ${file.name}`, "success");
  };
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
  } catch (err) { setStatus(`Error: ${err.message}`, "error"); }
  e.target.value = "";
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    const t = document.getElementById("textInput");
    t.value = text.trim(); autoResize(t); updateCount();
    setStatus("Pasted.", "success");
  } catch { setStatus("Clipboard denied.", "error"); }
}

// ── DROPDOWN ──────────────────────────────────────────────
function toggleDropdown() { document.getElementById("dropdown").classList.toggle("open"); }
function closeDropdown() { document.getElementById("dropdown").classList.remove("open"); }
document.addEventListener("click", e => { if (!e.target.closest(".dropdown-wrap")) closeDropdown(); });

// ── COPY ──────────────────────────────────────────────────
function copyText() {
  const v = document.getElementById("textInput").value;
  if (!v) return;
  navigator.clipboard.writeText(v).then(() => showToast("✓ Copied to clipboard"));
}

// ── STATUS ────────────────────────────────────────────────
function setStatus(msg, state = "idle") {
  document.getElementById("chipText").textContent = msg;
  const dot = document.getElementById("chipDot");
  dot.className = "chip-dot";
  if (state !== "idle") dot.classList.add(state);
  if (state === "success") setTimeout(() => setStatus("Ready"), 3000);
}

// ── WAVEFORM ──────────────────────────────────────────────
function drawWaveform() {
  const canvas = document.getElementById("waveCanvas");
  const ctx = canvas.getContext("2d");
  canvas.width = canvas.offsetWidth * window.devicePixelRatio;
  canvas.height = 48 * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  const w = canvas.offsetWidth, h = 48;
  ctx.clearRect(0, 0, w, h);
  const bars = Math.floor(w / 5);
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < bars; i++) {
    const barH = 4 + Math.random() * (h - 8);
    const x = i * 5;
    const y = (h - barH) / 2;
    ctx.beginPath();
    ctx.roundRect(x, y, 3, barH, 1.5);
    ctx.fill();
  }
}

// ── CONVERT ───────────────────────────────────────────────
async function convertAudio() {
  const text = document.getElementById("textInput").value.trim();
  if (!text) { setStatus("Enter text first.", "error"); return; }

  const voice = document.getElementById("voiceSelect").value;
  const rate  = document.getElementById("rateSlider").value + "%";
  const pitch = document.getElementById("pitchSlider").value + "Hz";

  document.getElementById("convertBtn").disabled = true;
  document.getElementById("outputCard").classList.remove("visible");
  document.getElementById("progressWrap").classList.add("visible");
  setStatus("Generating audio...", "loading");

  const welcome = document.getElementById("welcomeArea");
  if (welcome) welcome.style.opacity = "0.2";

  try {
    const res = await fetch(`${API_BASE}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, rate, pitch, quality: currentQuality })
    });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();

    document.getElementById("audioPlayer").src = `${API_BASE}/download?t=${Date.now()}`;
    document.getElementById("outputCard").classList.add("visible");

    const voiceLabel = document.getElementById("voiceSelect").selectedOptions[0]?.text.split("—")[0].trim() || voice;
    document.getElementById("audioMeta").innerHTML =
      `<span>${voiceLabel}</span><span>Speed ${rate}</span><span>Pitch ${pitch}</span>` +
      (data.chunks > 1 ? `<span>${data.chunks} chunks</span>` : "") +
      (data.words ? `<span>${data.words} words</span>` : "");

    document.getElementById("versionBadge").textContent = currentQuality === "v2" ? "v2 Neural HD" : "v1 Standard";

    // Draw waveform
    setTimeout(drawWaveform, 100);

    // Show download/share buttons
    document.getElementById("dlBtn").style.display = "flex";
    document.getElementById("shareBtn").style.display = "flex";

    if (document.getElementById("autoPlayToggle")?.checked) {
      document.getElementById("audioPlayer").play().catch(() => {});
    }

    const chunksMsg = data.chunks > 1 ? ` · ${data.chunks} chunks` : "";
    setStatus(`Ready${chunksMsg}`, "success");
    if (welcome) welcome.style.opacity = "0";

    // Track analytics
    updateAnalytics(voiceLabel, data.chars || text.length, data.words || text.split(" ").length);

    saveHistory({ text: text.slice(0, 80), fullText: text, voice, voiceLabel, rate, pitch, quality: currentQuality, time: Date.now() });
    renderHistory();

  } catch (err) {
    setStatus(`Error: ${err.message}`, "error");
    if (welcome) welcome.style.opacity = "1";
  } finally {
    document.getElementById("convertBtn").disabled = false;
    document.getElementById("progressWrap").classList.remove("visible");
  }
}

// ── DOWNLOAD / SHARE ──────────────────────────────────────
function downloadAudio() {
  const a = document.createElement("a");
  a.href = `${API_BASE}/download`; a.download = "narration.mp3"; a.click();
}

function shareAudio() {
  const url = `${API_BASE}/download`;
  if (navigator.share) navigator.share({ title: "Narrate Audio", url }).catch(() => {});
  else navigator.clipboard.writeText(url).then(() => showToast("✓ Link copied"));
}

// ── ANALYTICS ─────────────────────────────────────────────
function loadAnalytics() {
  try { analyticsData = JSON.parse(localStorage.getItem("tts_analytics") || "{}"); }
  catch { analyticsData = {}; }
  analyticsData.total = analyticsData.total || 0;
  analyticsData.chars = analyticsData.chars || 0;
  analyticsData.words = analyticsData.words || 0;
  analyticsData.voiceUsage = analyticsData.voiceUsage || {};
  analyticsData.history = analyticsData.history || [];
}

function updateAnalytics(voiceLabel, chars, words) {
  analyticsData.total++;
  analyticsData.chars += chars;
  analyticsData.words += words;
  analyticsData.voiceUsage[voiceLabel] = (analyticsData.voiceUsage[voiceLabel] || 0) + 1;
  analyticsData.history.push({ chars, time: Date.now() });
  if (analyticsData.history.length > 20) analyticsData.history = analyticsData.history.slice(-20);
  localStorage.setItem("tts_analytics", JSON.stringify(analyticsData));
}

function renderAnalytics() {
  loadAnalytics();
  const vUsage = analyticsData.voiceUsage;
  const totalVoiceUse = Object.values(vUsage).reduce((a, b) => a + b, 0) || 1;
  const sortedVoices = Object.entries(vUsage).sort((a, b) => b[1] - a[1]);

  const voiceBars = sortedVoices.slice(0, 5).map(([name, count]) => `
    <div class="vu-row">
      <span class="vu-name">${name.slice(0,8)}</span>
      <div class="vu-bar-bg"><div class="vu-bar" style="width:${Math.round(count/totalVoiceUse*100)}%"></div></div>
      <span class="vu-pct">${Math.round(count/totalVoiceUse*100)}%</span>
    </div>`).join("") || `<div style="font-size:11px;color:var(--text2);padding:6px 0;">No data yet.</div>`;

  // Mini sparkline
  const sparkData = analyticsData.history.map(h => h.chars);
  const sparkMax = Math.max(...sparkData, 1);
  const svgW = 200, svgH = 36;
  let sparkPath = "";
  if (sparkData.length > 1) {
    sparkPath = sparkData.map((v, i) => {
      const x = (i / (sparkData.length - 1)) * svgW;
      const y = svgH - (v / sparkMax) * (svgH - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }

  document.getElementById("analyticsBody").innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total Conversions</div>
      <div class="stat-value">${analyticsData.total}</div>
      <div class="stat-sub">${analyticsData.words.toLocaleString()} words · ${analyticsData.chars.toLocaleString()} chars</div>
    </div>

    <div class="stat-card">
      <div class="stat-label">Character Usage Trend</div>
      <svg class="wave-chart" viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="none">
        ${sparkPath ? `
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path d="${sparkPath} L${svgW},${svgH} L0,${svgH} Z" fill="url(#sparkGrad)"/>
          <path d="${sparkPath}" fill="none" stroke="var(--accent)" stroke-width="1.5"/>
        ` : `<text x="50%" y="55%" text-anchor="middle" font-size="10" fill="var(--text2)">No data yet</text>`}
      </svg>
    </div>

    <div class="stat-card">
      <div class="stat-label">Voice Usage</div>
      <div class="voice-usage-list">${voiceBars}</div>
    </div>
  `;
}

// ── HISTORY ───────────────────────────────────────────────
function saveHistory(entry) {
  let h = getHistory();
  h.unshift(entry);
  if (h.length > MAX_HISTORY) h = h.slice(0, MAX_HISTORY);
  localStorage.setItem("tts_history", JSON.stringify(h));
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
  const h = getHistory();
  document.getElementById("historyList").innerHTML = h.length
    ? h.map((item, i) => `
        <div class="history-item" onclick="loadFromHistory(${i})">
          <div class="hi-text">${item.text}</div>
          <div class="hi-meta">
            <span>${item.voiceLabel || "Ryan"} · ${item.quality || "v2"}</span>
            <span>${new Date(item.time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span>
          </div>
        </div>`).join("")
    : `<div class="empty-state"><div class="empty-icon">◎</div><p>No conversions yet.<br>Convert text to get started.</p></div>`;
}

function loadFromHistory(i) {
  const item = getHistory()[i]; if (!item) return;
  const t = document.getElementById("textInput");
  t.value = item.fullText || item.text; autoResize(t); updateCount();
  if (item.voice) document.getElementById("voiceSelect").value = item.voice;
  if (item.rate)  { document.getElementById("rateSlider").value = parseInt(item.rate); document.getElementById("rateVal").textContent = item.rate; }
  if (item.pitch) { document.getElementById("pitchSlider").value = parseInt(item.pitch); document.getElementById("pitchVal").textContent = item.pitch; }
  if (item.quality) setQuality(item.quality);
  setStatus("Loaded from history.", "success");
  if (isMobile()) closeSidebar();
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
      } catch (err) { setStatus(`Error: ${err.message}`, "error"); }
    } else { showToast("Only .txt and .pdf supported"); }
  });
}

// ── TOAST ─────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}
