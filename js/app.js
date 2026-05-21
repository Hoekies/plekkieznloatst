// ── Plekkie z'n Loatst ──────────────────────────────────────────────────────
const STORAGE_KEY = "plekkie-loatst-v1";

// ── State ────────────────────────────────────────────────────────────────────
let state = load();
let addMode = false;
let editingId = null;
let mapBeheer = null;
let mapSpelen = null;
let beheerMarkers = [];
let spelenMarkers = [];
let gpsWatchId = null;
let gpsPos = null;
let prevGpsPos = null;
let timerInterval = null;
let timerSeconds = 0;
let totalMeters = 0;
let routeActief = false;
let gpsPlayerMarker = null;
let spelPuntIndex = 0;
let correcteAntwoorden = 0;
let vragenGesteld = 0;

// ── Opslag ───────────────────────────────────────────────────────────────────
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { waypoints: [] };
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createId() {
  return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ── Haversine afstand (meters) ────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Kaart initialiseren ───────────────────────────────────────────────────────
function initMaps() {
  const defaultView = [52.3676, 4.9041]; // Amsterdam als fallback

  mapBeheer = L.map("map").setView(defaultView, 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
    maxZoom: 19,
  }).addTo(mapBeheer);

  mapSpelen = L.map("map-spelen").setView(defaultView, 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
    maxZoom: 19,
  }).addTo(mapSpelen);

  // Klik op kaart = nieuw waypoint (als addMode aan)
  mapBeheer.on("click", (e) => {
    if (!addMode) return;
    const wp = {
      id: createId(),
      label: `Punt ${state.waypoints.length + 1}`,
      lat: e.latlng.lat,
      lng: e.latlng.lng,
      radius: 50,
      type: "waypoint",
      question: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      reached: false,
      answeredCorrectly: null,
    };
    state.waypoints.push(wp);
    save();
    renderBeheer();
    openBewerk(wp.id);
  });
}

// ── Marker icoon ─────────────────────────────────────────────────────────────
function maakIcoon(nummer, type, reached) {
  const bg = reached ? "#10B981" : type === "finish" ? "#F59E0B" : "#1E40AF";
  const tekst = type === "finish" ? "🏁" : nummer;
  return L.divIcon({
    html: `<div style="width:32px;height:32px;border-radius:50%;background:${bg};color:#fff;
      display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;
      border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${tekst}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    className: "",
  });
}

// ── Beheer renderen ───────────────────────────────────────────────────────────
function renderBeheer() {
  // Markers opruimen
  beheerMarkers.forEach((m) => m.remove());
  beheerMarkers = [];

  const wps = state.waypoints;
  wps.forEach((wp, i) => {
    const m = L.marker([wp.lat, wp.lng], { icon: maakIcoon(i + 1, wp.type, false) })
      .addTo(mapBeheer)
      .on("click", () => openBewerk(wp.id));
    beheerMarkers.push(m);
  });

  // Lijst
  const lijst = document.getElementById("waypoint-list");
  if (wps.length === 0) {
    lijst.innerHTML = `<div class="empty-state"><div class="icon">🗺️</div>
      Klik op "Punt plaatsen" en tik daarna op de kaart om een waypoint toe te voegen.</div>`;
    return;
  }

  lijst.innerHTML = wps.map((wp, i) => `
    <div class="waypoint-card ${wp.type === "finish" ? "is-finish" : ""}" data-id="${wp.id}">
      <div class="wp-number ${wp.type === "finish" ? "finish" : ""}">${wp.type === "finish" ? "🏁" : i + 1}</div>
      <div class="wp-info">
        <div class="wp-label">${escHtml(wp.label)}</div>
        <div class="wp-meta">
          ${wp.type === "finish" ? "Eindpunt" : "Waypoint"} · ${wp.radius}m radius
          ${wp.question ? " · 🎯 Vraag ingesteld" : ""}
        </div>
      </div>
      <div class="wp-actions">
        <button class="wp-action edit" onclick="openBewerk('${wp.id}')" title="Bewerken">✏️</button>
        <button class="wp-action delete" onclick="verwijderWp('${wp.id}')" title="Verwijderen">🗑️</button>
      </div>
    </div>
  `).join("");
}

// ── Bewerk-sheet ─────────────────────────────────────────────────────────────
function openBewerk(id) {
  const wp = state.waypoints.find((w) => w.id === id);
  if (!wp) return;
  editingId = id;

  document.getElementById("bewerk-titel").textContent = "Punt bewerken";
  document.getElementById("bewerk-naam").value = wp.label;
  document.getElementById("bewerk-type").value = wp.type;
  document.getElementById("bewerk-radius").value = wp.radius;
  document.getElementById("bewerk-vraag").value = wp.question || "";

  const container = document.getElementById("antwoord-inputs");
  container.innerHTML = [0, 1, 2, 3].map((i) => `
    <div class="antwoord-row">
      <input type="radio" name="correct" class="correct-radio" value="${i}" ${wp.correctIndex === i ? "checked" : ""} />
      <input type="text" placeholder="Antwoord ${i + 1}" value="${escHtml(wp.options[i] || "")}" data-antw="${i}" />
    </div>
  `).join("");

  document.getElementById("bewerk-overlay").classList.add("open");
}

function sluitBewerk() {
  document.getElementById("bewerk-overlay").classList.remove("open");
  editingId = null;
}

function opslaanBewerk() {
  if (!editingId) return;
  const wp = state.waypoints.find((w) => w.id === editingId);
  if (!wp) return;

  wp.label = document.getElementById("bewerk-naam").value.trim() || wp.label;
  wp.type = document.getElementById("bewerk-type").value;
  wp.radius = parseInt(document.getElementById("bewerk-radius").value) || 50;
  wp.question = document.getElementById("bewerk-vraag").value.trim();

  const optInputs = document.querySelectorAll("#antwoord-inputs [data-antw]");
  optInputs.forEach((inp) => {
    wp.options[parseInt(inp.dataset.antw)] = inp.value.trim();
  });
  const correctRadio = document.querySelector("#antwoord-inputs input[name=correct]:checked");
  wp.correctIndex = correctRadio ? parseInt(correctRadio.value) : 0;

  save();
  sluitBewerk();
  renderBeheer();
}

function verwijderWp(id) {
  state.waypoints = state.waypoints.filter((w) => w.id !== id);
  save();
  renderBeheer();
}

// ── Spelen ───────────────────────────────────────────────────────────────────
function renderSpelenLijst() {
  const container = document.getElementById("punten-spelen");
  const wps = state.waypoints;
  if (wps.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="icon">🗺️</div>
      Voeg eerst waypoints toe via het Beheer-tabblad.</div>`;
    return;
  }
  container.innerHTML = wps.map((wp, i) => {
    const isCurrent = routeActief && i === spelPuntIndex && !wp.reached;
    return `<div class="punt-spelen-item ${wp.reached ? "done" : ""} ${isCurrent ? "current" : ""}">
      <span>${wp.reached ? "✅" : isCurrent ? "➡️" : "⬜"}</span>
      <span>${escHtml(wp.label)}</span>
      ${wp.reached && wp.answeredCorrectly === true ? "<span style='margin-left:auto;color:#10B981'>✓</span>" : ""}
      ${wp.reached && wp.answeredCorrectly === false ? "<span style='margin-left:auto;color:#EF4444'>✗</span>" : ""}
    </div>`;
  }).join("");
}

function updateSpelenMarkers() {
  spelenMarkers.forEach((m) => m.remove());
  spelenMarkers = [];
  state.waypoints.forEach((wp, i) => {
    const m = L.marker([wp.lat, wp.lng], { icon: maakIcoon(i + 1, wp.type, wp.reached) })
      .addTo(mapSpelen);
    spelenMarkers.push(m);
  });
}

function startRoute() {
  // Reset vorige run
  state.waypoints.forEach((wp) => { wp.reached = false; wp.answeredCorrectly = null; });
  save();
  spelPuntIndex = 0;
  correcteAntwoorden = 0;
  vragenGesteld = 0;
  totalMeters = 0;
  timerSeconds = 0;
  prevGpsPos = null;

  document.getElementById("stat-km").textContent = "0.0";
  document.getElementById("stat-score").textContent = "0/0";
  document.getElementById("stat-tijd").textContent = "00:00";
  document.getElementById("voortgang-wrap").style.display = "flex";
  updateVoortgang();

  routeActief = true;
  document.getElementById("btn-start").disabled = true;
  document.getElementById("btn-stop").disabled = false;

  timerInterval = setInterval(() => {
    timerSeconds++;
    document.getElementById("stat-tijd").textContent = formatTijd(timerSeconds);
  }, 1000);

  startGps();
  updateSpelenMarkers();
  renderSpelenLijst();
  updateVolgendeLabel();
}

function stopRoute() {
  routeActief = false;
  clearInterval(timerInterval);
  stopGps();
  document.getElementById("btn-start").disabled = false;
  document.getElementById("btn-stop").disabled = true;
  renderSpelenLijst();
}

function updateVoortgang() {
  const total = state.waypoints.length;
  const bereikt = state.waypoints.filter((w) => w.reached).length;
  document.getElementById("voortgang-label").textContent = `${bereikt} van ${total} punten bereikt`;
  document.getElementById("voortgang-bar").style.width = total ? `${(bereikt / total) * 100}%` : "0%";
}

function updateVolgendeLabel() {
  const next = state.waypoints[spelPuntIndex];
  document.getElementById("stat-volgend").textContent = next ? (spelPuntIndex + 1).toString() : "—";
}

// ── GPS ───────────────────────────────────────────────────────────────────────
function startGps() {
  if (!navigator.geolocation) return;
  document.getElementById("gps-dot").classList.add("active");
  document.getElementById("gps-label").textContent = "GPS zoeken...";

  gpsWatchId = navigator.geolocation.watchPosition(
    (pos) => onGpsUpdate(pos),
    (err) => { document.getElementById("gps-label").textContent = `GPS fout: ${err.message}`; },
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
  );
}

function stopGps() {
  if (gpsWatchId !== null) navigator.geolocation.clearWatch(gpsWatchId);
  document.getElementById("gps-dot").classList.remove("active");
  document.getElementById("gps-label").textContent = "GPS niet actief";
}

function onGpsUpdate(pos) {
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  document.getElementById("gps-label").textContent = `GPS actief · ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  // Spelermarker
  if (!gpsPlayerMarker) {
    const playerIcon = L.divIcon({
      html: `<div style="width:16px;height:16px;border-radius:50%;background:#06B6D4;
        border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
      iconSize: [16, 16], iconAnchor: [8, 8], className: "",
    });
    gpsPlayerMarker = L.marker([lat, lng], { icon: playerIcon }).addTo(mapSpelen);
  } else {
    gpsPlayerMarker.setLatLng([lat, lng]);
  }
  mapSpelen.setView([lat, lng], mapSpelen.getZoom());

  // Afstand bijhouden
  if (prevGpsPos) {
    const d = haversine(prevGpsPos.lat, prevGpsPos.lng, lat, lng);
    if (d > 2) { // alleen bijhouden als je >2m bewogen hebt (ruisfilter)
      totalMeters += d;
      document.getElementById("stat-km").textContent = (totalMeters / 1000).toFixed(2);
    }
  }
  prevGpsPos = { lat, lng };

  if (!routeActief) return;

  // Controleer huidig punt
  const wp = state.waypoints[spelPuntIndex];
  if (!wp || wp.reached) return;
  const dist = haversine(lat, lng, wp.lat, wp.lng);
  if (dist <= wp.radius) {
    wp.reached = true;
    save();
    updateSpelenMarkers();
    updateVoortgang();

    if (wp.type === "finish") {
      stopRoute();
      toonEindscherm();
      return;
    }

    if (wp.question && wp.options.some((o) => o)) {
      toonVraagModal(wp);
    } else {
      spelPuntIndex++;
      updateVolgendeLabel();
      renderSpelenLijst();
    }
  }
}

// ── Vraag modal ───────────────────────────────────────────────────────────────
function toonVraagModal(wp) {
  vragenGesteld++;
  document.getElementById("modal-wp-naam").textContent = wp.label;
  document.getElementById("modal-vraag").textContent = wp.question;
  document.getElementById("modal-feedback").textContent = "";
  document.getElementById("modal-verder").classList.remove("show");

  const container = document.getElementById("antwoord-opties");
  container.innerHTML = wp.options
    .map((opt, i) => opt ? `<button class="antwoord-btn" data-idx="${i}">${escHtml(opt)}</button>` : "")
    .join("");

  container.querySelectorAll(".antwoord-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const gekozen = parseInt(btn.dataset.idx);
      const juist = gekozen === wp.correctIndex;
      wp.answeredCorrectly = juist;
      save();

      container.querySelectorAll(".antwoord-btn").forEach((b) => b.disabled = true);

      if (juist) {
        btn.classList.add("correct");
        correcteAntwoorden++;
        document.getElementById("modal-feedback").textContent = "✅ Goed!";
        document.getElementById("modal-feedback").style.color = "#10B981";
      } else {
        btn.classList.add("wrong");
        const juistBtn = container.querySelector(`[data-idx="${wp.correctIndex}"]`);
        if (juistBtn) juistBtn.classList.add("correct");
        document.getElementById("modal-feedback").textContent = "❌ Helaas, dat was niet goed.";
        document.getElementById("modal-feedback").style.color = "#EF4444";
      }

      document.getElementById("stat-score").textContent = `${correcteAntwoorden}/${vragenGesteld}`;
      document.getElementById("modal-verder").classList.add("show");
    });
  });

  document.getElementById("vraag-modal").classList.add("open");
}

document.getElementById("modal-verder").addEventListener("click", () => {
  document.getElementById("vraag-modal").classList.remove("open");
  spelPuntIndex++;
  updateVolgendeLabel();
  renderSpelenLijst();
});

// ── Eindscherm ────────────────────────────────────────────────────────────────
function toonEindscherm() {
  document.getElementById("eind-tijd").textContent = formatTijd(timerSeconds);
  document.getElementById("eind-km").textContent = (totalMeters / 1000).toFixed(2);
  document.getElementById("eind-score").textContent = `${correcteAntwoorden}/${vragenGesteld}`;
  document.getElementById("eindscherm").classList.add("open");
}

document.getElementById("btn-opnieuw").addEventListener("click", () => {
  document.getElementById("eindscherm").classList.remove("open");
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTijd(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function escHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Event listeners ───────────────────────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");

    if (btn.dataset.tab === "spelen") {
      setTimeout(() => mapSpelen.invalidateSize(), 100);
      renderSpelenLijst();
      updateSpelenMarkers();
    } else {
      setTimeout(() => mapBeheer.invalidateSize(), 100);
    }
  });
});

document.getElementById("btn-add-mode").addEventListener("click", () => {
  addMode = !addMode;
  const btn = document.getElementById("btn-add-mode");
  btn.textContent = addMode ? "✅ Klik op kaart..." : "📍 Punt plaatsen";
  btn.classList.toggle("btn-cyan", addMode);
  btn.classList.toggle("btn-primary", !addMode);
  mapBeheer.getContainer().style.cursor = addMode ? "crosshair" : "";
});

document.getElementById("btn-clear-route").addEventListener("click", () => {
  if (state.waypoints.length === 0) return;
  if (!confirm("Weet je zeker dat je alle punten wilt verwijderen?")) return;
  state.waypoints = [];
  save();
  renderBeheer();
});

document.getElementById("bewerk-annuleer").addEventListener("click", sluitBewerk);
document.getElementById("bewerk-opslaan").addEventListener("click", opslaanBewerk);
document.getElementById("btn-start").addEventListener("click", startRoute);
document.getElementById("btn-stop").addEventListener("click", stopRoute);

// Sluit sheet als je buiten klikt
document.getElementById("bewerk-overlay").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) sluitBewerk();
});

// ── Init ──────────────────────────────────────────────────────────────────────
initMaps();
renderBeheer();
renderSpelenLijst();
