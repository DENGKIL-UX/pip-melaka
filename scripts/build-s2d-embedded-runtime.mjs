#!/usr/bin/env node

/**
 * Rebuild the embedded S2D Vite application from a sibling upstream checkout.
 *
 * The committed upstream source remains byte-identical for audit. The browser
 * runtime applies two host-specific hardening transformations:
 *   1. remove optional SheetJS Excel export (xlsx@0.18.5 advisories), retaining
 *      CSV and print/PDF export;
 *   2. scope static asset URLs under /s2d-360/.
 *
 * Usage:
 *   S2D_WORKSPACE_DIR=../S2D-workspace-code/s2d-360-intelligence-engine \
 *     npm run build:s2d-runtime
 */
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const upstream = path.resolve(root, process.env.S2D_WORKSPACE_DIR || "../S2D-workspace-code/s2d-360-intelligence-engine");
const upstreamSource = path.join(upstream, "src", "S2D360Engine.clean.jsx");
const original = readFileSync(upstreamSource, "utf8");

function hardenRuntimeSource(source) {
  let next = source;
  const importLine = "import * as XLSX from 'xlsx'\n";
  if (!next.includes(importLine)) throw new Error("Expected upstream SheetJS import was not found; review the build patch");
  next = next.replace(importLine, "");

  const xlsxStart = next.indexOf("function buildXLSXBlob(");
  const escapeStart = next.indexOf("function escapeHtml(", xlsxStart);
  if (xlsxStart < 0 || escapeStart < 0) throw new Error("Expected upstream XLSX export function was not found");
  next = next.slice(0, xlsxStart) + next.slice(escapeStart);

  const xlsxBranch = "  else if (format === 'xlsx') downloadBlob(buildXLSXBlob(rows, cols, baseName), name + '.xlsx')\n  else exportPDF(rows, cols, baseName)";
  if (!next.includes(xlsxBranch)) throw new Error("Expected upstream XLSX export branch was not found");
  next = next.replace(xlsxBranch, "  else exportPDF(rows, cols, baseName)");

  const excelButton = "      <Btn ghost accent={T.teal} disabled={off} onClick={() => exportData('xlsx', rows, cols, baseName)}>Excel</Btn>\n";
  if (!next.includes(excelButton)) throw new Error("Expected upstream Excel button was not found");
  return next.replace(excelButton, "");
}

const vendorDir = path.join(root, "vendor", "s2d-360");
const publicDir = path.join(root, "public", "s2d-360");
const publicAssets = path.join(publicDir, "assets");
mkdirSync(vendorDir, { recursive: true });
mkdirSync(publicAssets, { recursive: true });
writeFileSync(path.join(vendorDir, "S2D360Engine.clean.jsx"), original);
writeFileSync(path.join(publicDir, "S2D360Engine.clean.jsx"), original);

try {
  writeFileSync(upstreamSource, hardenRuntimeSource(original));
  const result = spawnSync("npx", ["vite", "build", "--base=/s2d-360/"], { cwd: upstream, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Upstream Vite build failed with status ${result.status ?? "unknown"}`);
} finally {
  // Restore even after a failed build so the sibling checkout is never left dirty.
  writeFileSync(upstreamSource, original);
}

for (const file of readdirSync(publicAssets)) {
  if (/^index-.*\.js$/.test(file)) rmSync(path.join(publicAssets, file));
}
cpSync(path.join(upstream, "dist", "index.html"), path.join(publicDir, "index.html"));
const bundleName = readdirSync(path.join(upstream, "dist", "assets")).find((file) => /^index-.*\.js$/.test(file));
if (!bundleName) throw new Error("Vite output bundle was not found");
cpSync(path.join(upstream, "dist", "assets", bundleName), path.join(publicAssets, bundleName));

const bundlePath = path.join(publicAssets, bundleName);
let bundle = readFileSync(bundlePath, "utf8");
bundle = bundle.replace(/(?<!s2d-360)\/assets\//g, "/s2d-360/assets/");
if (bundle.includes("SheetJS") || bundle.includes("XLSX")) throw new Error("Hardened runtime still contains SheetJS");
if (/(?<!s2d-360)\/assets\//.test(bundle)) throw new Error("Runtime still contains unscoped root asset paths");
writeFileSync(bundlePath, bundle);
console.log(`Embedded S2D runtime rebuilt: ${bundleName} (${Buffer.byteLength(bundle)} bytes)`);
