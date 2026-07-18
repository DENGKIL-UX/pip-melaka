# PIP-VOTER-INTELLIGENCE Engine Archive

> Truth Above All. This directory contains the extracted source code from the
> 162MB engine zip (pipML-app1.zip + .z01/.z02/.z03).

## Source

- **Archive SHA-256**: `65623e788d1de0c2678e0f964fbbb35fcad762440000fd2f17573b68da64c69b`
- **Original release**: https://github.com/DENGKIL-UX/pip-melaka-blueprint/releases/tag/v1.0.0-engine
- **Files extracted**: 7,525 (full archive) → 146 (useful files only, bloat excluded)

## Directory structure

```
engine-archive/
├── dashboard-src/          # 144 JS/JSX modules (App.jsx is 3MB — the full original dashboard)
│   ├── App.jsx             # Main dashboard application (94,727 lines)
│   ├── pip-360-*.js        # S2D 360 Command Centre modules (12 files)
│   ├── pip-public-communication-*.js  # Public communication workflow (18 files)
│   ├── pip-operational-*.js           # Operational alerts (4 files)
│   ├── pip-incident-*.js              # Incident casebook (4 files)
│   ├── pip-scenario-*.js              # Scenario management (5 files)
│   ├── pip-auth-*.js                  # Authentication (7 files)
│   ├── pip-production-*.js            # Production/deployment (24 files)
│   └── ...                           # Other modules
├── engine-scripts/         # 3 engine pipeline scripts
│   ├── pip-voter-data-profiler-v1.1.py        # 124 KB, v1.1.0
│   ├── pip-voter-data-cleanser-v1.1.py        # 134 KB, v1.1.0
│   └── pip-voter-intelligence-transformer-v1.0.js  # 28 KB, v1.0.0
├── contracts/              # Source contracts
│   └── pip-voter-source-contract-p134-v1.0.json  # 55 KB
├── data/
│   ├── transform/P134-full/   # Pre-generated P134 intelligence (PDPA-safe aggregates only)
│   │   ├── dashboard-overview.json
│   │   ├── dun-intelligence.jsonl          # 5 DUNs
│   │   ├── dm-intelligence.jsonl           # 30 DMs
│   │   ├── locality-intelligence.jsonl     # 368 localities (376 KB)
│   │   ├── parliament-intelligence.jsonl
│   │   ├── state-intelligence.jsonl
│   │   └── transformation-manifest.json
│   └── validation/p999/       # Synthetic test fixtures
├── server-data/           # Server registry data (11 JSON files)
├── pip-data/              # Runtime state data
└── vscode-settings/       # VS Code workspace settings
```

## What was excluded (bloat)

- `.venv/` — Python virtualenv (6,338 files, 147 MB) — regenerable
- `dashboard/node_modules/` — npm dependencies (431 files, 62 MB) — regenerable
- `App(N).jsx` — 41 old snapshots of App.jsx (~120 MB) — superseded by App.jsx
- `screenshots/` — 17 PNG screenshots — not source code
- `data/clean/P134-full/voter-cleaned.*` — PDPA-sensitive per-voter data (284 MB)
- `data/transform/P134-full/voter-intelligence.jsonl` — PDPA-sensitive (75 MB)
- `data/clean/P134-full/cleansing-audit.json` — PDPA-sensitive (94 MB)

## PDPA compliance

NO per-voter data is included in this archive. All PDPA-sensitive files
(voter-intelligence.jsonl, voter-cleaned.*, cleansing-audit.json) were
excluded. Only aggregate intelligence JSONLs (5 per parliament) are included.

## Usage

The source code in `dashboard-src/` is the original Vite 8 + React 19 SPA
from the engine. PIP-MLK does NOT use this directly — it's a Next.js 16
App Router project. The source is included for reference and to port
S2D/signal/sentiment/narrative modules.

To port a module:
1. Read the contract file (e.g., `pip-360-command-centre-contract.js`)
2. Port the enums/interfaces to TypeScript in `src/lib/s2d-contracts.ts`
3. Build a Next.js tab component in `src/components/tabs/`
4. Wire into `src/components/dashboard.tsx`
