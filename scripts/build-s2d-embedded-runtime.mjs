#!/usr/bin/env node

/**
 * Rebuild the embedded S2D Vite application from a sibling upstream checkout.
 *
 * The committed upstream source remains byte-identical for audit. The browser
 * runtime applies host-specific hardening transformations:
 *   1. remove optional SheetJS Excel export (xlsx@0.18.5 advisories), retaining
 *      CSV and print/PDF export;
 *   2. scope static asset URLs under /s2d-360/;
 *   3. bind the onOpenCredentials prop in S2DWorkspaceToolbar (upstream
 *      references it without declaring it, which throws ReferenceError and
 *      empties the engine root on first render).
 *
 * The build also regenerates:
 *   - public/s2d-360/index.html  (boot/error screen for direct loads)
 *   - src/lib/s2d-runtime-manifest.ts (kept in lockstep with the bundle)
 *
 * Usage:
 *   S2D_WORKSPACE_DIR=../S2D-workspace-code/s2d-360-intelligence-engine \
 *     npm run build:s2d-runtime
 */
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const upstream = path.resolve(root, process.env.S2D_WORKSPACE_DIR || "../S2D-workspace-code/s2d-360-intelligence-engine");
const upstreamSource = path.join(upstream, "src", "S2D360Engine.clean.jsx");
const upstreamToolbar = path.join(upstream, "src", "components", "S2DWorkspaceToolbar.jsx");
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

/**
 * Upstream S2DWorkspaceToolbar references onOpenCredentials (rendering the
 * ⚙️ Gear Settings button) but omits it from the component's prop
 * destructuring. In the browser that is an undeclared identifier and React
 * clears the entire engine root on first render. Bind the prop so the button
 * works and the component renders.
 */
function fixWorkspaceToolbar(source) {
  const missingProp = "  onOpenAdvanced,\n  palette,";
  if (!source.includes(missingProp)) {
    if (source.includes("  onOpenCredentials,")) {
      return source;
    }
    throw new Error(
      "Expected upstream toolbar prop list was not found; " +
      "review the runtime patch"
    );
  }
  return source.replace(
    missingProp,
    "  onOpenAdvanced,\n  onOpenCredentials,\n  palette,"
  );
}

/**
 * Post-build guard: if the minified output still contains the free-variable
 * reference (a future upstream without the source-level fix), patch the
 * minified toolbar destructuring directly so the bundle cannot ship broken.
 */
function fixToolbarInBundle(bundle) {
  if (!bundle.includes("onOpenCredentials&&")) return bundle;
  const match = bundle.match(/function JJe\(\{([^}]*)\}\)/);
  if (!match) {
    throw new Error(
      "Runtime still contains the broken onOpenCredentials reference and " +
      "the toolbar signature was not found; review the bundle patch"
    );
  }
  if (match[1].includes("onOpenCredentials")) {
    // Bound in the signature already — the use site is legitimate.
    return bundle;
  }
  return bundle.replace(match[0], match[0].replace(/\}$/, ",onOpenCredentials}"));
}

/**
 * Static index document (direct loads of /s2d-360/). Mirrors the document
 * served by the src/app/s2d-360/engine/route.ts App Router route so both
 * entry points show the same dark boot screen and startup error reporting.
 */
function indexDocument(bundlePath) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark" />
    <title>S2D-360 Intelligence Engine</title>
    <style>
      html,body,#root {
        min-height:100%;
        margin:0;
        background:#071018;
        color:#e6edf5;
      }
      body {
        font-family:Inter,system-ui,sans-serif;
      }
      #s2d-boot-state {
        display:grid;
        min-height:100vh;
        place-items:center;
        padding:24px;
        box-sizing:border-box;
      }
      #s2d-boot-card {
        max-width:680px;
        border:1px solid #243043;
        border-radius:12px;
        background:#0f1620;
        padding:20px;
        line-height:1.55;
      }
      #s2d-boot-title {
        font-weight:800;
        color:#f59e0b;
        margin-bottom:6px;
      }
      #s2d-boot-detail {
        font-size:13px;
        color:#9fb0c3;
        white-space:pre-wrap;
        overflow-wrap:anywhere;
      }
    </style>
    <script>
      (() => {
        const bundle = ${JSON.stringify(bundlePath)};
        let failed = false;
        const fail = (reason) => {
          failed = true;
          let state = document.getElementById('s2d-boot-state');
          if (!state) {
            const root = document.getElementById('root');
            if (!root) return;
            root.replaceChildren();
            state = document.createElement('div');
            state.id = 's2d-boot-state';
            const card = document.createElement('div');
            card.id = 's2d-boot-card';
            const title = document.createElement('div');
            title.id = 's2d-boot-title';
            const detail = document.createElement('div');
            detail.id = 's2d-boot-detail';
            card.append(title, detail);
            state.append(card);
            root.append(state);
          }
          document.getElementById('s2d-boot-title').textContent =
            'S2D-360 failed to start';
          document.getElementById('s2d-boot-detail').textContent =
            String(reason || 'Unknown startup error') +
            '\\nBundle: ' +
            bundle;
        };
        window.addEventListener(
          'error',
          (event) => {
            // Ignore element-targeted resource-load errors (blocked stylesheet,
            // missing image, etc.). Those carry no message/filename and are not
            // fatal — the engine bundle is a module script that runs regardless.
            // Only a genuine window-level script exception (script.onerror) is
            // treated as a startup failure here.
            const msg = event.message;
            const file = event.filename;
            if (!msg && !file) return;
            fail(msg || `Unable to load \${file}`);
          },
          true
        );
        window.addEventListener(
          'unhandledrejection',
          (event) => {
            // Only fatal during the boot window: if the boot-state card is still
            // visible the engine has not rendered yet, so any unhandled rejection
            // is a startup failure. Once React has mounted and replaced the card,
            // post-render rejections (optional network calls, etc.) are ignored.
            if (document.getElementById('s2d-boot-state')) {
              fail(
                event.reason?.message ||
                  event.reason ||
                  'Unhandled startup rejection'
              );
            }
          }
        );
        window.setTimeout(() => {
          if (!failed && document.getElementById('s2d-boot-state')) {
            fail(
              'Startup timed out. Reload once; if this persists, ' +
              'verify the bundle request in browser developer tools.'
            );
          }
        }, 15000);
      })();
    </script>
    <script type="module" crossorigin src=${JSON.stringify(bundlePath)}></script>
  </head>
  <body>
    <div id="root">
      <div id="s2d-boot-state">
        <div id="s2d-boot-card">
          <div id="s2d-boot-title">Loading S2D-360…</div>
          <div id="s2d-boot-detail">
            Starting the embedded intelligence workspace.
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
`;
}

const vendorDir = path.join(root, "vendor", "s2d-360");
const publicDir = path.join(root, "public", "s2d-360");
const publicAssets = path.join(publicDir, "assets");
mkdirSync(vendorDir, { recursive: true });
mkdirSync(publicAssets, { recursive: true });
writeFileSync(path.join(vendorDir, "S2D360Engine.clean.jsx"), original);
writeFileSync(path.join(publicDir, "S2D360Engine.clean.jsx"), original);

const toolbarOriginal = existsSync(upstreamToolbar) ? readFileSync(upstreamToolbar, "utf8") : null;
if (!toolbarOriginal) {
  console.warn("WARN: upstream S2DWorkspaceToolbar.jsx not found; relying on the post-build bundle guard only");
}

try {
  writeFileSync(upstreamSource, hardenRuntimeSource(original));
  if (toolbarOriginal) {
    writeFileSync(upstreamToolbar, fixWorkspaceToolbar(toolbarOriginal));
  }
  const result = spawnSync("npx", ["vite", "build", "--base=/s2d-360/"], { cwd: upstream, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Upstream Vite build failed with status ${result.status ?? "unknown"}`);
} finally {
  // Restore even after a failed build so the sibling checkout is never left dirty.
  writeFileSync(upstreamSource, original);
  if (toolbarOriginal) {
    writeFileSync(upstreamToolbar, toolbarOriginal);
  }
}

for (const file of readdirSync(publicAssets)) {
  if (/^index-.*\.js$/.test(file)) rmSync(path.join(publicAssets, file));
}
const bundleName = readdirSync(path.join(upstream, "dist", "assets")).find((file) => /^index-.*\.js$/.test(file));
if (!bundleName) throw new Error("Vite output bundle was not found");
cpSync(path.join(upstream, "dist", "assets", bundleName), path.join(publicAssets, bundleName));
// Preserve the committed logo asset when the upstream build emits it.
const upstreamLogo = path.join(upstream, "dist", "assets", "ritz-analytics-logo.png");
if (existsSync(upstreamLogo)) {
  cpSync(upstreamLogo, path.join(publicAssets, "ritz-analytics-logo.png"));
}

const publicBundlePath = `/s2d-360/assets/${bundleName}`;
const bundlePath = path.join(publicAssets, bundleName);
let bundle = readFileSync(bundlePath, "utf8");
bundle = bundle.replace(/(?<!s2d-360)\/assets\//g, "/s2d-360/assets/");
bundle = fixToolbarInBundle(bundle);
if (bundle.includes("SheetJS") || bundle.includes("XLSX")) throw new Error("Hardened runtime still contains SheetJS");
if (/(?<!s2d-360)\/assets\//.test(bundle)) throw new Error("Runtime still contains unscoped root asset paths");
writeFileSync(bundlePath, bundle);

writeFileSync(path.join(publicDir, "index.html"), indexDocument(publicBundlePath));

writeFileSync(
  path.join(root, "src", "lib", "s2d-runtime-manifest.ts"),
  [
    "// Generated by scripts/build-s2d-embedded-runtime.mjs.",
    "// Keep the engine document route and committed Vite asset in lockstep.",
    `export const S2D_RUNTIME_BUNDLE = ${JSON.stringify(publicBundlePath)};`,
    "",
  ].join("\n")
);

console.log(`Embedded S2D runtime rebuilt: ${bundleName} (${Buffer.byteLength(bundle)} bytes)`);
