import { S2D_RUNTIME_BUNDLE } from "@/lib/s2d-runtime-manifest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * S2D-360 engine document.
 *
 * The upstream Vite application is committed as static assets under
 * /public/s2d-360/ and served by the Workers assets binding. Serving the
 * HTML document from a real App Router route (instead of relying on
 * Cloudflare's handling of /s2d-360/index.html) makes the iframe source
 * deterministic and lets us control the framing headers on the document
 * itself, plus surface startup failures instead of a silent blank panel.
 */
function engineDocument(): string {
  const bundle = JSON.stringify(S2D_RUNTIME_BUNDLE);
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
        const bundle = ${bundle};
        let failed = false;
        const fail = (reason) => {
          failed = true;
          let state = document.getElementById('s2d-boot-state');
          // Reconstruct the error UI if React already cleared the root.
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
          (event) =>
            fail(event.message || ('Unable to load ' + event.filename)),
          true
        );
        window.addEventListener(
          'unhandledrejection',
          (event) =>
            fail(
              event.reason?.message ||
              event.reason ||
              'Unhandled startup rejection'
            )
        );
        window.setTimeout(() => {
          if (
            !failed &&
            document.getElementById('s2d-boot-state')
          ) {
            fail(
              'Startup timed out. Reload once; if this persists, ' +
              'verify the bundle request in browser developer tools.'
            );
          }
        }, 15000);
      })();
    </script>
    <script type="module" crossorigin src=${bundle}></script>
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
</html>`;
}

export async function GET(): Promise<Response> {
  return new Response(engineDocument(), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      // Same-origin framing for the embedded engine document. Kept on the
      // response itself so the iframe policy does not depend on edge header
      // handling for route handlers.
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy":
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self' https:; " +
        "frame-ancestors 'self';",
    },
  });
}
