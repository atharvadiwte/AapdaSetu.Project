/* ============================================================
   PRAHARI — starter logic
   This file is deliberately plain JS (no build step) so any
   beginner on the team can open it and follow along.
   ============================================================ */

// ---- 1. SAMPLE / DEMO DATA -----------------------------------
// These are realistic *example* points, NOT live data. They exist
// so the map has something to show while you wire up real sources.
// Replace this array's contents with real API results — see the
// "REAL DATA SOURCES" note at the bottom of this file.

const HAZARD_EVENTS = [
  {
    id: "demo-fire-1",
    type: "fire",
    lat: 21.146, lng: 79.088, // Nagpur region
    title: "Forest fire hotspot — Pench forest belt",
    severity: "moderate",
    updated: "Demo data",
    checklist: [
      "Avoid travel through the affected forest belt",
      "Keep windows shut if smoke/haze is visible nearby",
      "Report new hotspots to the local forest department"
    ]
  },
  {
    id: "demo-flood-1",
    type: "flood",
    lat: 19.076, lng: 72.877, // Mumbai
    title: "Heavy monsoon flooding — low-lying wards",
    severity: "high",
    updated: "Demo data",
    checklist: [
      "Avoid waterlogged roads and underpasses",
      "Move vehicles and valuables to higher floors",
      "Keep phone charged; save local disaster helpline numbers"
    ]
  },
  {
    id: "demo-cyclone-1",
    type: "cyclone",
    lat: 19.822, lng: 85.831, // Odisha coast
    title: "Cyclone approaching — coastal Odisha",
    severity: "high",
    updated: "Demo data",
    checklist: [
      "Follow evacuation orders from local authorities immediately",
      "Secure loose objects outdoors",
      "Stock drinking water and a charged power bank"
    ]
  },
  {
    id: "demo-landslide-1",
    type: "landslide",
    lat: 30.073, lng: 78.297, // near Rishikesh / hill belt
    title: "Landslide risk — hill road after heavy rain",
    severity: "moderate",
    updated: "Demo data",
    checklist: [
      "Avoid driving on hill roads until cleared by authorities",
      "Watch for cracks or tilting trees on slopes above you",
      "Keep an alternate route in mind"
    ]
  }
];

const SEVERITY_COLOR = { high: "#ef4444", moderate: "#f59e0b", low: "#22c55e" };
const HAZARD_COLORS = {
  fire: "#ff3b30",
  flood: "#0a84ff",
  cyclone: "#af52de",
  landslide: "#ff9f0a",
  community: "#8e8e93"
};
const TYPE_SEVERITY = {
  fire: "high",
  flood: "high",
  cyclone: "moderate",
  landslide: "moderate",
  report: "low"
};

Object.entries(HAZARD_COLORS).forEach(([key, value]) => {
  document.documentElement.style.setProperty(`--${key}`, value);
  document.documentElement.style.setProperty(`--${key === "community" ? "report" : key}`, value);
});

// ---- 2. MAP SETUP ----------------------------------------------
const map = L.map("map", { zoomControl: false }).setView([22.5, 79.5], 5);
L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 20
}).addTo(map);

const layerGroups = {
  fire: L.layerGroup().addTo(map),
  flood: L.layerGroup().addTo(map),
  cyclone: L.layerGroup().addTo(map),
  landslide: L.layerGroup().addTo(map),
  report: L.layerGroup().addTo(map)
};

const HAZARD_COLOR = {
  ...HAZARD_COLORS,
  report: HAZARD_COLORS.community
};

function markerFor(event, isReport) {
  const color = isReport ? HAZARD_COLOR.report : HAZARD_COLOR[event.type];
  const marker = L.circleMarker([event.lat, event.lng], {
    radius: 9,
    color: "#fff",
    weight: 2,
    fillColor: color,
    fillOpacity: 0.9,
    opacity: 1
  });

  marker.on("add", () => {
    const path = marker._path;
    if (!path) return;
    path.classList.add("hazard-marker");
    path.style.filter = "drop-shadow(0 0 10px rgba(47, 108, 246, 0.25))";
  });

  marker.on("mouseover", () => {
    if (!marker._path) return;
    marker.setRadius(11);
    marker._path.style.filter = "drop-shadow(0 0 12px rgba(15, 23, 42, 0.22))";
  });

  marker.on("mouseout", () => {
    if (!marker._path) return;
    marker.setRadius(9);
    marker._path.style.filter = "drop-shadow(0 0 10px rgba(47, 108, 246, 0.25))";
  });

  marker.bindPopup(`<b>${event.title}</b><br>${event.updated}`);
  marker.on("click", () => showDetail(event, isReport));
  return marker;
}

function renderHazardEvents() {
  HAZARD_EVENTS.forEach(ev => {
    markerFor(ev, false).addTo(layerGroups[ev.type]);
  });
}
renderHazardEvents();

function addLayerSeverityIndicators() {
  document.querySelectorAll("#legendList li").forEach(item => {
    const input = item.querySelector("input[data-layer]");
    if (!input) return;

    const type = input.dataset.layer;
    const dot = item.querySelector(".severity-dot") || document.createElement("span");
    dot.className = `severity-dot ${TYPE_SEVERITY[type] || "low"}`;

    if (!item.querySelector(".severity-dot")) {
      item.querySelector("label").appendChild(dot);
    }
  });
}

addLayerSeverityIndicators();

// ---- 3. DETAIL PANEL --------------------------------------------
const detailPanel = document.getElementById("detailPanel");

function attachPanelCollapseHandlers() {
  document.querySelectorAll(".panel-collapsible").forEach((panel) => {
    const toggle = panel.querySelector(".panel-toggle");
    if (!toggle || toggle.dataset.bound === "true") return;

    toggle.dataset.bound = "true";
    toggle.addEventListener("click", () => {
      const isCollapsed = panel.classList.toggle("collapsed");
      toggle.setAttribute("aria-expanded", String(!isCollapsed));
      toggle.innerHTML = isCollapsed
        ? '<i class="fa-solid fa-chevron-down"></i>'
        : '<i class="fa-solid fa-chevron-up"></i>';
    });
  });
}

function renderEmptyState() {
  detailPanel.innerHTML = `
    <div class="panel-header">
      <h2>Selected event</h2>
      <button class="panel-toggle" type="button" aria-label="Collapse Selected event" aria-expanded="true">
        <i class="fa-solid fa-chevron-up"></i>
      </button>
    </div>
    <div class="panel-body">
      <div class="empty-state detail-panel-shell">
        <div class="empty-pin"><i class="fa-solid fa-location-dot"></i></div>
        <p>Tap a marker on the map to view hazard details and action guidance.</p>
      </div>
    </div>
  `;
  attachPanelCollapseHandlers();
}

renderEmptyState();
attachPanelCollapseHandlers();

function showDetail(event, isReport) {
  const color = isReport ? HAZARD_COLOR.report : SEVERITY_COLOR[event.severity] || HAZARD_COLOR[event.type];
  detailPanel.innerHTML = `
    <div class="panel-header">
      <h2>Selected event</h2>
      <button class="panel-toggle" type="button" aria-label="Collapse Selected event" aria-expanded="true">
        <i class="fa-solid fa-chevron-up"></i>
      </button>
    </div>
    <div class="panel-body">
      <div class="detail-panel-shell">
        <p class="detail-title">${event.title}</p>
        <p class="detail-meta">${event.updated}</p>
        <span class="detail-badge" style="background:${color}22;color:${color}">
          ${isReport ? "Community report" : (event.severity + " severity")}
        </span>
        ${event.checklist ? `<ul class="checklist">${event.checklist.map(c => `<li>${c}</li>`).join("")}</ul>` : `<p class="muted">${event.note || ""}</p>`}
      </div>
    </div>
  `;
  attachPanelCollapseHandlers();
}

// ---- 4. LAYER TOGGLES ---------------------------------------------
function fadeLayerGroup(group, visible) {
  group.eachLayer(layer => {
    const path = layer._path;
    if (!path) return;
    path.style.transition = "opacity 250ms ease, transform 250ms ease";
    path.style.opacity = visible ? "1" : "0";
    path.style.transform = visible ? "scale(1)" : "scale(0.8)";
  });
}

document.querySelectorAll("input[data-layer]").forEach(box => {
  box.addEventListener("change", () => {
    const type = box.dataset.layer;
    const group = layerGroups[type];

    if (box.checked) {
      if (!map.hasLayer(group)) {
        map.addLayer(group);
        requestAnimationFrame(() => fadeLayerGroup(group, true));
      }
    } else {
      fadeLayerGroup(group, false);
      setTimeout(() => {
        if (map.hasLayer(group)) map.removeLayer(group);
      }, 260);
    }
  });
});

// ---- 5. COMMUNITY REPORTING (saved in this browser via localStorage) ----
const reportBtn = document.getElementById("reportBtn");
const reportHint = document.getElementById("reportHint");
const modalBackdrop = document.getElementById("modalBackdrop");
const reportForm = document.getElementById("reportForm");
const cancelReport = document.getElementById("cancelReport");

let reportMode = false;
let pendingLatLng = null;

reportBtn.addEventListener("click", () => {
  reportMode = true;
  reportHint.hidden = false;
  reportBtn.textContent = "Click the map to place your pin…";
});

map.on("click", (e) => {
  if (!reportMode) return;
  pendingLatLng = e.latlng;
  modalBackdrop.hidden = false;
  reportMode = false;
  reportHint.hidden = true;
  reportBtn.textContent = "Drop a report pin";
});

cancelReport.addEventListener("click", () => {
  modalBackdrop.hidden = true;
  reportForm.reset();
});

reportForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const type = document.getElementById("reportType").value;
  const note = document.getElementById("reportNote").value.trim();
  if (!pendingLatLng || !note) return;

  const report = {
    id: "report-" + Date.now(),
    type,
    lat: pendingLatLng.lat,
    lng: pendingLatLng.lng,
    title: "Community report — " + type,
    updated: "Just now",
    note
  };

  try {
    saveReport(report);
  } catch (err) {
    console.warn("Couldn't save report to local storage:", err);
  }
  markerFor(report, true).addTo(layerGroups.report);
  showDetail(report, true);

  modalBackdrop.hidden = true;
  reportForm.reset();
  pendingLatLng = null;
});

function loadReports() {
  try {
    const raw = localStorage.getItem("prahari_reports");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveReport(report) {
  const all = loadReports();
  all.push(report);
  localStorage.setItem("prahari_reports", JSON.stringify(all));
}

loadReports().forEach(r => markerFor(r, true).addTo(layerGroups.report));