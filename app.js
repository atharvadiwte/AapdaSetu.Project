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

const dataStatusEl = document.getElementById("dataStatus");
const sourceErrorBannerEl = document.getElementById("sourceErrorBanner");

function setDataStatusDemo() {
  if (!dataStatusEl) return;
  dataStatusEl.innerHTML = '<span class="status-dot status-dot-demo"></span><span class="status-copy">Showing demo data</span>';
}

function setDataStatusLive() {
  if (!dataStatusEl) return;
  dataStatusEl.innerHTML = '<span class="status-dot"></span><span class="status-copy">Last updated: recently</span>';
}

const liveSourceStates = { gdacs: "pending", firms: "pending", usgs: "pending" };
const sourceErrorMessages = {
  gdacs: "Flood/cyclone data temporarily unavailable — showing sample data",
  firms: "Fire data temporarily unavailable — showing sample data",
  usgs: "Landslide data temporarily unavailable — showing sample data"
};
const sourceErrors = { gdacs: "", firms: "", usgs: "" };

function setSourceError(source, message) {
  if (!(source in sourceErrors)) return;
  sourceErrors[source] = message;
  updateSourceErrorBanner();
}

function clearSourceError(source) {
  sourceErrors[source] = "";
  updateSourceErrorBanner();
}

function updateSourceErrorBanner() {
  if (!sourceErrorBannerEl) return;
  const activeMessages = Object.values(sourceErrors).filter(Boolean);

  if (!activeMessages.length) {
    sourceErrorBannerEl.hidden = true;
    sourceErrorBannerEl.innerHTML = "";
    return;
  }

  sourceErrorBannerEl.hidden = false;
  sourceErrorBannerEl.innerHTML = activeMessages.map((message) => `<span>${message}</span>`).join("");
}

function resolveLiveSource(source, outcome) {
  if (!(source in liveSourceStates)) return;
  liveSourceStates[source] = outcome;
}

function scheduleSourceTimeout(source, fallbackMessage) {
  setTimeout(() => {
    if (liveSourceStates[source] === "pending") {
      resolveLiveSource(source, "failed");
      setSourceError(source, fallbackMessage);
      setDataStatusDemo();
    }
  }, 10000);
}

function updateLegendCounts() {
  const counts = {
    fire: layerGroups.fire ? layerGroups.fire.getLayers().length : 0,
    flood: layerGroups.flood ? layerGroups.flood.getLayers().length : 0,
    cyclone: layerGroups.cyclone ? layerGroups.cyclone.getLayers().length : 0,
    landslide: layerGroups.landslide ? layerGroups.landslide.getLayers().length : 0,
    report: layerGroups.report ? layerGroups.report.getLayers().length : 0
  };

  document.querySelectorAll(".legend-count[data-count-for]").forEach((el) => {
    const key = el.dataset.countFor;
    const count = counts[key] ?? 0;
    el.textContent = `(${count})`;
  });
}

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

function xmlTagText(node, candidateNames) {
  if (!node) return "";

  const elements = [node, ...Array.from(node.getElementsByTagName("*"))];
  for (const element of elements) {
    const tagName = (element.tagName || "").toLowerCase();
    const localName = tagName.includes(":") ? tagName.split(":").pop() : tagName;
    if (candidateNames.some((name) => name.toLowerCase() === tagName || name.toLowerCase() === localName)) {
      return (element.textContent || "").trim();
    }
  }

  return "";
}

function severityFromAlertLevel(alertLevel) {
  const level = (alertLevel || "").toLowerCase();

  if (["red", "extreme", "catastrophic", "high"].includes(level)) return "high";
  if (["orange", "yellow", "moderate", "warning"].includes(level)) return "moderate";
  return "low";
}

function checklistForHazard(type) {
  if (type === "flood") {
    return [
      "Avoid waterlogged roads and underpasses",
      "Move vehicles and valuables to higher floors",
      "Keep phone charged; save local disaster helpline numbers"
    ];
  }

  if (type === "cyclone") {
    return [
      "Follow evacuation orders from local authorities immediately",
      "Secure loose objects outdoors",
      "Stock drinking water and a charged power bank"
    ];
  }

  return [
    "Follow local advisories and stay alert",
    "Keep emergency supplies ready",
    "Avoid unsafe or unstable areas"
  ];
}

function gdacsItemToHazardEvent(item) {
  const eventType = xmlTagText(item, ["gdacs:eventtype", "eventtype"]).toUpperCase();
  const type = eventType === "FL" ? "flood" : eventType === "TC" ? "cyclone" : null;

  if (!type) return null;

  const latText = xmlTagText(item, ["geo:lat", "lat"]);
  const lngText = xmlTagText(item, ["geo:long", "geo:lon", "long", "lon"]);
  const lat = Number.parseFloat(latText);
  const lng = Number.parseFloat(lngText);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  const eventId = xmlTagText(item, ["gdacs:eventid", "eventid"]) || `${Date.now()}-${Math.random()}`;
  const alertLevel = xmlTagText(item, ["gdacs:alertlevel", "alertlevel"]) || "Green";
  const title = xmlTagText(item, ["title"]) || `${type.charAt(0).toUpperCase() + type.slice(1)} alert`;
  const updated = xmlTagText(item, ["gdacs:datemodified", "datemodified", "pubDate"]) || "Live GDACS feed";

  return {
    id: `gdacs-${type}-${eventId}`,
    type,
    lat,
    lng,
    title,
    severity: severityFromAlertLevel(alertLevel),
    updated: `GDACS • ${updated}`,
    checklist: checklistForHazard(type)
  };
}

function parseGdacsXml(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "application/xml");

  const parseError = xmlDoc.querySelector("parsererror");
  if (parseError) {
    throw new Error("GDACS XML could not be parsed");
  }

  const items = Array.from(xmlDoc.querySelectorAll("item"));
  return items
    .map(gdacsItemToHazardEvent)
    .filter(Boolean)
    .filter((event, index, allEvents) => allEvents.findIndex((other) => other.id === event.id) === index);
}

async function loadGdacsLiveHazards() {
  scheduleSourceTimeout("gdacs", sourceErrorMessages.gdacs);

  try {
    const response = await fetch("/api/gdacs");

    if (!response.ok) {
      throw new Error(`GDACS proxy request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const gdacsEvents = Array.isArray(payload.data) ? payload.data : [];

    if (!gdacsEvents.length) {
      resolveLiveSource("gdacs", "success");
      clearSourceError("gdacs");
      console.warn("GDACS feed loaded, but no flood/cyclone events were found within India’s bounds.");
      return;
    }

    const existingNonLiveEvents = HAZARD_EVENTS.filter((event) => event.type !== "flood" && event.type !== "cyclone");
    HAZARD_EVENTS.splice(0, HAZARD_EVENTS.length, ...existingNonLiveEvents, ...gdacsEvents);
    renderHazardEvents();
    resolveLiveSource("gdacs", "success");
    clearSourceError("gdacs");
    setDataStatusLive();
    console.log("Loaded GDACS flood/cyclone events:", gdacsEvents);
  } catch (error) {
    resolveLiveSource("gdacs", "failed");
    setSourceError("gdacs", sourceErrorMessages.gdacs);
    setDataStatusDemo();
    console.warn("Falling back to the demo flood and cyclone points because the GDACS feed failed:", error);
  }
}

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
const map = L.map("map", {
  zoomControl: false,
  maxBounds: [[-90, -180], [90, 180]],
  maxBoundsViscosity: 1.0,
  worldCopyJump: false
}).setView([22.5, 79.5], 5);
L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 20,
  noWrap: true
}).addTo(map);

const placeSearchForm = document.getElementById("placeSearchForm");
const placeSearchInput = document.getElementById("placeSearchInput");
const placeSearchButton = placeSearchForm.querySelector("button");
const placeSearchStatus = document.getElementById("placeSearchStatus");
let placeSearchMarker;

placeSearchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = placeSearchInput.value.trim();
  if (!query) {
    placeSearchInput.focus();
    return;
  }

  placeSearchStatus.hidden = false;
  placeSearchStatus.removeAttribute("aria-invalid");
  placeSearchStatus.textContent = "Searching...";
  placeSearchButton.disabled = true;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("q", query);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Place search failed with status ${response.status}`);
    }

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      placeSearchStatus.textContent = "No places found. Try another search.";
      placeSearchStatus.setAttribute("aria-invalid", "true");
      return;
    }

    const place = results[0];
    const lat = Number(place.lat);
    const lng = Number(place.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error("Place search returned invalid coordinates");
    }

    const location = [lat, lng];
    const placeName = place.display_name || query;
    map.flyTo(location, 12);
    if (placeSearchMarker) map.removeLayer(placeSearchMarker);
    placeSearchMarker = L.marker(location).addTo(map);
    placeSearchMarker.bindPopup("").getPopup().setContent(
      document.createTextNode(placeName)
    );
    placeSearchMarker.openPopup();
    placeSearchStatus.textContent = `Found: ${placeName}`;
  } catch (error) {
    placeSearchStatus.textContent = "Place search is unavailable. Please try again.";
    placeSearchStatus.setAttribute("aria-invalid", "true");
    console.error("Place search failed:", error);
  } finally {
    placeSearchButton.disabled = false;
  }
});

map.invalidateSize();
setTimeout(() => map.invalidateSize(), 200);

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
  Object.values(layerGroups).forEach(group => group.clearLayers());

  HAZARD_EVENTS.forEach(ev => {
    markerFor(ev, false).addTo(layerGroups[ev.type]);
  });

  updateLegendCounts();
}

async function loadNasaFirmsFireData() {
  scheduleSourceTimeout("firms", sourceErrorMessages.firms);

  try {
    const response = await fetch('/api/firms');

    if (!response.ok) {
      throw new Error(`NASA FIRMS proxy request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const fireEvents = Array.isArray(payload.data) ? payload.data : [];

    if (!fireEvents.length) {
      resolveLiveSource("firms", "success");
      clearSourceError("firms");
      console.warn('NASA FIRMS feed loaded, but no active fire detections were returned.');
      return;
    }

    const existingNonLiveEvents = HAZARD_EVENTS.filter((event) => event.type !== 'fire');
    HAZARD_EVENTS.splice(0, HAZARD_EVENTS.length, ...existingNonLiveEvents, ...fireEvents);
    renderHazardEvents();
    resolveLiveSource("firms", "success");
    clearSourceError("firms");
    setDataStatusLive();
    console.log('Loaded NASA FIRMS fire events:', fireEvents);
  } catch (error) {
    resolveLiveSource("firms", "failed");
    setSourceError("firms", sourceErrorMessages.firms);
    setDataStatusDemo();
    console.warn('Falling back to the demo fire point because the NASA FIRMS feed failed:', error);
  }
}

async function loadUsgsLandslideRiskData() {
  scheduleSourceTimeout("usgs", sourceErrorMessages.usgs);

  try {
    const response = await fetch('/api/landslide-risk');

    if (!response.ok) {
      throw new Error(`USGS proxy request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const landslideRiskEvents = Array.isArray(payload.data) ? payload.data : [];

    if (!landslideRiskEvents.length) {
      resolveLiveSource("usgs", "success");
      clearSourceError("usgs");
      console.warn('USGS earthquake feed loaded, but no landslide-risk indicators were returned.');
      return;
    }

    const existingNonLiveEvents = HAZARD_EVENTS.filter((event) => event.type !== 'landslide');
    HAZARD_EVENTS.splice(0, HAZARD_EVENTS.length, ...existingNonLiveEvents, ...landslideRiskEvents);
    renderHazardEvents();
    resolveLiveSource("usgs", "success");
    clearSourceError("usgs");
    setDataStatusLive();
    console.log('Loaded USGS landslide-risk indicator events:', landslideRiskEvents);
  } catch (error) {
    resolveLiveSource("usgs", "failed");
    setSourceError("usgs", sourceErrorMessages.usgs);
    setDataStatusDemo();
    console.warn('Falling back to the demo landslide point because the USGS risk feed failed:', error);
  }
}

renderHazardEvents();
loadGdacsLiveHazards();
loadNasaFirmsFireData();
loadUsgsLandslideRiskData();

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

const dataSourceBtn = document.getElementById("dataSourceBtn");
const dataSourceModal = document.getElementById("dataSourceModal");
const closeDataSourceModalBtn = document.getElementById("closeDataSourceModal");

function openDataSourceModal() {
  if (!dataSourceModal) return;
  dataSourceModal.hidden = false;
}

function closeDataSourceModal() {
  if (!dataSourceModal) return;
  dataSourceModal.hidden = true;
}

if (dataSourceBtn) {
  dataSourceBtn.addEventListener("click", openDataSourceModal);
}

if (closeDataSourceModalBtn) {
  closeDataSourceModalBtn.addEventListener("click", closeDataSourceModal);
}

if (dataSourceModal) {
  dataSourceModal.addEventListener("click", (event) => {
    if (event.target === dataSourceModal) {
      closeDataSourceModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && dataSourceModal && !dataSourceModal.hidden) {
    closeDataSourceModal();
  }
});

// ---- 5. COMMUNITY REPORTING (saved in Firestore and synced live) ----
const reportBtn = document.getElementById("reportBtn");
const reportHint = document.getElementById("reportHint");
const modalBackdrop = document.getElementById("modalBackdrop");
const reportForm = document.getElementById("reportForm");
const cancelReport = document.getElementById("cancelReport");

const db = firebase.firestore();
const reportsCollection = db.collection("reports");

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

reportForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const type = document.getElementById("reportType").value;
  const note = document.getElementById("reportNote").value.trim();
  if (!pendingLatLng || !note) return;

  const report = {
    type,
    lat: pendingLatLng.lat,
    lng: pendingLatLng.lng,
    title: "Community report — " + type,
    updated: "Just now",
    note,
    severity: "low",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    const docRef = await reportsCollection.add(report);
    const savedReport = { id: docRef.id, ...report };
    showDetail(savedReport, true);
  } catch (err) {
    console.warn("Couldn't save report to Firestore:", err);
  }

  modalBackdrop.hidden = true;
  reportForm.reset();
  pendingLatLng = null;
});

function renderCommunityReports(snapshot) {
  layerGroups.report.clearLayers();

  snapshot.forEach((doc) => {
    const data = doc.data();
    const report = {
      id: doc.id,
      type: data.type,
      lat: data.lat,
      lng: data.lng,
      title: data.title || "Community report",
      severity: data.severity || "low",
      updated: data.updated || "Community report",
      note: data.note || "",
      checklist: data.checklist || [
        "Avoid the reported area if it is unsafe",
        "Share this with nearby residents if needed",
        "Report to the local authorities if conditions worsen"
      ]
    };

    markerFor(report, true).addTo(layerGroups.report);
  });

  updateLegendCounts();
}

reportsCollection.onSnapshot((snapshot) => {
  renderCommunityReports(snapshot);
});