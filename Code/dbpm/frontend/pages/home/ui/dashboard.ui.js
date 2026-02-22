import { projectsAPI } from "../../../api/index.js";
import { createUI } from "../../../shared/utils/ui.js";
import { formatNumber } from "../../../shared/utils/number.js";
// In real usage: compute these from API.
const demo = {
  totals: {
    projects: 12,
    documents: 38,
    models: 64,
  },
  // Optional "small text" under the big totals (keep short; 1–2 lines)
  // If you don't want these, just set to [].
  subs: {
    projects: [], // e.g. ["active 10 · deleted 2"]
    documents: ["avg words: 131"], // optional; remove if you don't want averages
    models: ["avg selected words: 43"], // placeholder; you said you'll decide wording later
  },
  // Distribution as percentages; should sum to ~100.
  // You can provide either {label, pct} or raw counts and normalize yourself later.
  docsPerProject: [
    { label: "1", pct: 42 },
    { label: "2", pct: 31 },
    { label: "3", pct: 18 },
    { label: "4+", pct: 9 },
  ],
  modelsPerDoc: [
    { label: "1", pct: 56 },
    { label: "2", pct: 28 },
    { label: "3", pct: 12 },
    { label: "4+", pct: 4 },
  ],
};

// ---------- Render helpers ----------
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function renderSubLines(containerId, lines) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = "";
  (lines || []).slice(0, 2).forEach((line) => {
    const div = document.createElement("div");
    div.textContent = line;
    el.appendChild(div);
  });
  // Keep height stable even when empty
  if (!lines || lines.length === 0) {
    const div = document.createElement("div");
    div.innerHTML = "&nbsp;";
    el.appendChild(div);
  }
}

function clampPct(p) {
  if (Number.isNaN(p)) return 0;
  return Math.max(0, Math.min(100, p));
}

function renderBarList(containerId, items) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = "";

  // Find max pct to scale bars (optional).
  // If you prefer absolute %-width bars, set max = 100.
  const max = Math.max(...(items || []).map((i) => clampPct(i.pct)), 1);

  (items || []).forEach((item) => {
    const row = document.createElement("div");
    row.className = "barRow";

    const label = document.createElement("div");
    label.className = "barLabel";
    label.textContent = item.label;

    const track = document.createElement("div");
    track.className = "barTrack";

    const fill = document.createElement("div");
    fill.className = "barFill";

    // Scale relative to max to keep short charts readable.
    // If you want true %-width, use: const width = clampPct(item.pct);
    const width = (clampPct(item.pct) / max) * 100;
    fill.style.width = width.toFixed(2) + "%";

    track.appendChild(fill);

    const pct = document.createElement("div");
    pct.className = "barPct";
    pct.textContent = clampPct(item.pct).toFixed(0) + "%";

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(pct);

    el.appendChild(row);
  });
}

// ---------- Render dashboard ----------

renderBarList("chartDocsPerProject", demo.docsPerProject);
renderBarList("chartModelsPerDoc", demo.modelsPerDoc);

createUI({
  setup: async () => {
    const overview = await projectsAPI.overview();
    const { projects, documents, models } = overview;
    setText("projectsCount", formatNumber(projects.count));
    setText("documentsCount", formatNumber(documents.count));
    setText("modelsCount", formatNumber(models.count));

    renderSubLines("documentsSub", [
      `avg words: ${formatNumber(documents.averageWordsCount.toFixed(0))}`,
    ]);
    renderSubLines("modelsSub", [
      `avg selected words: ${formatNumber(models.averageSelectedWordsCount.toFixed(0))}`,
    ]);
  },
  bindListeners: () => {},
});
