// PIP-MLK intelligence brief exporter.
//
// Generates a structured snapshot of the dashboard state at the moment of
// export — useful for sharing an intelligence brief, audit trail, or pasting
// into a downstream system. Runs entirely client-side; no PDPA-sensitive
// data is included (only aggregate metrics + public election data).
//
// Supports three output modes:
//   - JSON   (machine-readable, via downloadBrief)
//   - Markdown (human-readable, via briefToMarkdown / copyBriefMarkdown)
//   - Print   (opens a print-optimized window, via printBrief)

import type { DashboardTab } from "@/stores/dashboard-store";

export interface BriefSnapshot {
  schema: "pip-mlk.brief.v1";
  exported_at: string; // ISO 8601
  exported_at_unix_ms: number;
  platform: {
    name: "PIP-MLK";
    version: string;
    geography: "Melaka";
    evidence_tier: "Proxy" | "Verified";
    provenance_gates_closed: number;
    provenance_gates_total: number;
  };
  active_tab: DashboardTab;
  ge15_summary: {
    parliament_split: { PN: number; PH: number; BN: number; total: number };
    winners: Array<{ code: string; name: string; winner: "PN" | "PH" | "BN" }>;
    source: string;
  };
  metrics: {
    total_voters_p134: number;
    dun_count: number;
    parliaments: number;
    s2d_signals: number;
  };
  notes: string[];
}

const GE15_WINNERS: Array<{ code: string; name: string; winner: "PN" | "PH" | "BN" }> = [
  { code: "P134", name: "Masjid Tanah", winner: "PN" },
  { code: "P135", name: "Alor Gajah", winner: "PH" },
  { code: "P136", name: "Tangga Batu", winner: "PN" },
  { code: "P137", name: "Hang Tuah Jaya", winner: "PH" },
  { code: "P138", name: "Kota Melaka", winner: "PH" },
  { code: "P139", name: "Jasin", winner: "PN" },
];

/**
 * Build the brief snapshot. Caller passes in the dynamic bits (active tab,
 * S2D signal count, etc.) so this stays pure + testable.
 */
export function buildBrief(opts: {
  activeTab: DashboardTab;
  totalVoters: number;
  dunCount: number;
  s2dSignals: number;
  provenanceClosed?: number;
  provenanceTotal?: number;
  notes?: string[];
}): BriefSnapshot {
  const now = new Date();
  return {
    schema: "pip-mlk.brief.v1",
    exported_at: now.toISOString(),
    exported_at_unix_ms: now.getTime(),
    platform: {
      name: "PIP-MLK",
      version: "1.0.0",
      geography: "Melaka",
      evidence_tier: "Proxy",
      provenance_gates_closed: opts.provenanceClosed ?? 8,
      provenance_gates_total: opts.provenanceTotal ?? 9,
    },
    active_tab: opts.activeTab,
    ge15_summary: {
      parliament_split: { PN: 3, PH: 3, BN: 0, total: 6 },
      winners: GE15_WINNERS,
      source: "ElectionData.my (community-maintained, sourced from SPR gazettes)",
    },
    metrics: {
      total_voters_p134: opts.totalVoters,
      dun_count: opts.dunCount,
      parliaments: 6,
      s2d_signals: opts.s2dSignals,
    },
    notes: opts.notes ?? [
      "PDPA Akta 709 compliant — no per-voter data shipped.",
      "Demographics from P134 transformer run (71,415 verified voters).",
      "Gate 9 (raw SPR voter xlsx) remains open — see Governance tab.",
    ],
  };
}

/**
 * Trigger a client-side JSON download of the brief snapshot.
 */
export function downloadBrief(brief: BriefSnapshot): void {
  const json = JSON.stringify(brief, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  triggerBlobDownload(blob, `pip-mlk-brief-${stamp(brief)}.json`);
}

/**
 * Trigger a client-side Markdown download of the brief snapshot.
 */
export function downloadBriefMarkdown(brief: BriefSnapshot): void {
  const md = briefToMarkdown(brief);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  triggerBlobDownload(blob, `pip-mlk-brief-${stamp(brief)}.md`);
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function stamp(brief: BriefSnapshot): string {
  return new Date(brief.exported_at_unix_ms)
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
}

/**
 * Render the brief as a human-readable Markdown document.
 * Grouped into: header, key metrics, GE15 results, provenance, notes.
 */
export function briefToMarkdown(brief: BriefSnapshot): string {
  const L: string[] = [];
  const date = new Date(brief.exported_at_unix_ms);
  L.push(`# PIP-MLK Intelligence Brief — Melaka`);
  L.push("");
  L.push(`> **Truth Above All.** Generated ${date.toLocaleString()}`);
  L.push("");
  L.push(`| Field | Value |`);
  L.push(`| --- | --- |`);
  L.push(`| Platform | ${brief.platform.name} v${brief.platform.version} · ${brief.platform.geography} |`);
  L.push(`| Evidence tier | **${brief.platform.evidence_tier}** |`);
  L.push(`| Provenance gates | ${brief.platform.provenance_gates_closed}/${brief.platform.provenance_gates_total} closed |`);
  L.push(`| Active view | \`${brief.active_tab}\` |`);
  L.push("");
  L.push(`## Key metrics`);
  L.push("");
  L.push(`- **${brief.metrics.total_voters_p134.toLocaleString()}** verified voters (P134)`);
  L.push(`- **${brief.metrics.dun_count}** DUN constituencies across **${brief.metrics.parliaments}** parliaments`);
  L.push(`- **${brief.metrics.s2d_signals}** active S2D signals`);
  L.push("");
  L.push(`## GE15 parliament results`);
  L.push("");
  const s = brief.ge15_summary.parliament_split;
  L.push(`Split: **PN ${s.PN}** · **PH ${s.PH}** · **BN ${s.BN}** (of ${s.total})`);
  L.push("");
  L.push("| Parliament | Winner |");
  L.push("| --- | --- |");
  for (const w of brief.ge15_summary.winners) {
    L.push(`| ${w.code} ${w.name} | **${w.winner}** |`);
  }
  L.push("");
  L.push(`*Source: ${brief.ge15_summary.source}*`);
  L.push("");
  if (brief.notes.length > 0) {
    L.push(`## Notes`);
    L.push("");
    for (const n of brief.notes) L.push(`- ${n}`);
    L.push("");
  }
  L.push(`---`);
  L.push(`*Schema: \`${brief.schema}\` · Exported at ${brief.exported_at}*`);
  return L.join("\n");
}

/**
 * Copy the Markdown brief to the clipboard. Resolves to true on success.
 */
export async function copyBriefMarkdown(brief: BriefSnapshot): Promise<boolean> {
  try {
    const md = briefToMarkdown(brief);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(md);
      return true;
    }
    // Legacy fallback
    const ta = document.createElement("textarea");
    ta.value = md;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Open a print-optimized window with the rendered Markdown brief.
 * Lets the user save as PDF via the browser's print dialog.
 */
export function printBrief(brief: BriefSnapshot): void {
  const md = briefToMarkdown(brief);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>PIP-MLK Intelligence Brief — Melaka</title>
<style>
  :root { color-scheme: light; }
  body { font: 14px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; max-width: 760px; margin: 40px auto; padding: 0 24px; }
  h1 { color: #C77B2C; border-bottom: 3px solid #C77B2C; padding-bottom: 8px; letter-spacing: -0.02em; }
  h2 { color: #844816; margin-top: 28px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 13px; }
  th { background: #FEF7EE; color: #844816; }
  tr:nth-child(even) td { background: #fafafa; }
  blockquote { border-left: 4px solid #C77B2C; margin: 12px 0; padding: 6px 16px; color: #555; background: #FEF7EE; }
  code { background: #f4f4f5; padding: 1px 5px; border-radius: 4px; font-size: 12px; }
  hr { border: none; border-top: 1px solid #eee; margin: 24px 0; }
  ul { padding-left: 22px; }
  @media print { body { margin: 0; max-width: none; } h1 { page-break-after: avoid; } }
</style></head><body>${renderMarkdownBasic(md)}</body></html>`;
  const w = window.open("", "_blank", "noopener,noreferrer,width=820,height=900");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  // Give the new document a tick to lay out before invoking print.
  w.onload = () => setTimeout(() => w.print(), 250);
}

/**
 * Minimal, safe Markdown→HTML renderer for the brief subset
 * (headings, tables, blockquotes, lists, inline code, bold, hr, paragraphs).
 * Intentionally small to avoid adding a markdown dependency.
 */
function renderMarkdownBasic(md: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    escape(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");

  const lines = md.split("\n");
  let html = "";
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^#\s+/.test(line)) { html += `<h1>${inline(line.replace(/^#\s+/, ""))}</h1>`; i++; continue; }
    if (/^##\s+/.test(line)) { html += `<h2>${inline(line.replace(/^##\s+/, ""))}</h2>`; i++; continue; }
    if (/^>\s+/.test(line)) { html += `<blockquote>${inline(line.replace(/^>\s+/, ""))}</blockquote>`; i++; continue; }
    if (/^---\s*$/.test(line)) { html += "<hr/>"; i++; continue; }
    // Table
    if (/^\|.+\|\s*$/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const headers = line.split("|").slice(1, -1).map((c) => c.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\|.+\|\s*$/.test(lines[i])) {
        rows.push(lines[i].split("|").slice(1, -1).map((c) => c.trim()));
        i++;
      }
      html += "<table><thead><tr>" + headers.map((h) => `<th>${inline(h)}</th>`).join("") + "</tr></thead><tbody>";
      for (const r of rows) html += "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>";
      html += "</tbody></table>";
      continue;
    }
    // List
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^[-*]\s+/, "")); i++; }
      html += "<ul>" + items.map((it) => `<li>${inline(it)}</li>`).join("") + "</ul>";
      continue;
    }
    if (line.trim() === "") { i++; continue; }
    html += `<p>${inline(line)}</p>`;
    i++;
  }
  return html;
}
