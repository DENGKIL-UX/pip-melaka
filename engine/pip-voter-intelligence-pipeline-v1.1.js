#!/usr/bin/env node
// ponytail: MLK — orchestrator for the engine pipeline (Phase 1.5 / provenance gate 8).
// Chains profiler → cleanser → transformer per parliament. Pure Node built-ins only.
// See ENGINE-INTEGRATION.md §7. ~150 lines.

import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_DIR = __dirname;
const REPO_ROOT = resolve(ENGINE_DIR, "..");

const SCRIPT_VERSIONS = {
  profiler: "1.1.0",
  cleanser: "1.1.0",
  transformer: "1.0.0",
  orchestrator: "1.1.0",
};

const EXPOSED_SALT = "9fad3e8f6d4b9da8844a95c15363541f71b95268688b3370f4a36b941b4c7b87";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

function sha256String(s) {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

function fileSizeBytes(filePath) {
  return statSync(filePath).size;
}

function runStage(cmd, args, cwd, label) {
  return new Promise((resolve, reject) => {
    process.stdout.write(`\n[${label}] $ ${cmd} ${args.join(" ")}\n`);
    const child = spawn(cmd, args, { cwd, stdio: "inherit", env: process.env });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} exited with code ${code}`));
    });
    child.on("error", (err) => reject(err));
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const parliament = args.parliament;
  const xlsxPath = args.xlsx;
  const contractPath = args.contract;
  const outputDir = args["output-dir"];
  const mode = args.mode || "standard";
  const strictContract = args["strict-contract"] === true;
  const selfCheck = args["self-check"] === true;

  if (!parliament || !xlsxPath || !contractPath || !outputDir) {
    console.error("Usage: node pip-voter-intelligence-pipeline-v1.1.js --parliament p134 --xlsx <path> --contract <path> --output-dir <path> [--mode standard] [--strict-contract] [--self-check]");
    process.exit(2);
  }

  // Gate 5: Validate salt is set and rotated
  const salt = process.env.PIP_VOTER_HASH_SALT;
  if (!salt) {
    console.error("ERROR: PIP_VOTER_HASH_SALT env var is not set. Generate one with: openssl rand -hex 32");
    process.exit(2);
  }
  if (salt === EXPOSED_SALT) {
    console.error("ERROR: PIP_VOTER_HASH_SALT matches the exposed salt (9fad3e8f...). Rotate it before any pipeline run.");
    process.exit(2);
  }
  const saltSha256 = sha256String(salt);

  // Validate inputs
  if (!existsSync(xlsxPath)) {
    console.error(`ERROR: xlsx not found: ${xlsxPath}`);
    process.exit(2);
  }
  if (!existsSync(contractPath)) {
    console.error(`ERROR: contract not found: ${contractPath}`);
    process.exit(2);
  }

  mkdirSync(outputDir, { recursive: true });
  mkdirSync(join(outputDir, "profile"), { recursive: true });
  mkdirSync(join(outputDir, "clean"), { recursive: true });
  mkdirSync(join(outputDir, "transform"), { recursive: true });

  const startedAt = new Date().toISOString();
  const xlsxSha256 = await sha256File(xlsxPath);
  const contractSha256 = await sha256File(contractPath);

  console.log(`\n=== PIP-MLK Engine Pipeline v${SCRIPT_VERSIONS.orchestrator} ===`);
  console.log(`Parliament:     ${parliament}`);
  console.log(`Input xlsx:     ${xlsxPath} (sha256: ${xlsxSha256.slice(0, 16)}...)`);
  console.log(`Contract:       ${contractPath} (sha256: ${contractSha256.slice(0, 16)}...)`);
  console.log(`Output dir:     ${outputDir}`);
  console.log(`Mode:           ${mode}`);
  console.log(`Strict contract: ${strictContract}`);
  console.log(`Self-check:     ${selfCheck}`);
  console.log(`Salt sha256:    ${saltSha256.slice(0, 16)}... (rotated, never exposed)`);
  console.log(`Started:        ${startedAt}`);

  const profilerScript = join(ENGINE_DIR, "pip-voter-data-profiler-v1.1.py");
  const cleanserScript = join(ENGINE_DIR, "pip-voter-data-cleanser-v1.1.py");
  const transformerScript = join(ENGINE_DIR, "pip-voter-intelligence-transformer-v1.0.js");

  for (const s of [profilerScript, cleanserScript, transformerScript]) {
    if (!existsSync(s)) {
      console.error(`ERROR: engine script not found: ${s}`);
      process.exit(2);
    }
  }

  // Stage 1: Profile
  const profilerArgs = [
    profilerScript,
    xlsxPath,
    "--ontology", contractPath,
    "--output-dir", join(outputDir, "profile"),
  ];
  if (strictContract) profilerArgs.push("--strict-contract");
  await runStage("python", profilerArgs, ENGINE_DIR, "1. PROFILE");

  // Stage 2: Cleanse
  const cleanserArgs = [
    cleanserScript,
    xlsxPath,
    "--ontology", contractPath,
    "--output-dir", join(outputDir, "clean"),
    "--mode", mode,
  ];
  if (strictContract) cleanserArgs.push("--strict-contract");
  await runStage("python", cleanserArgs, ENGINE_DIR, "2. CLEANSE");

  // Stage 3: Transform
  const transformerArgs = [
    transformerScript,
    "--input", join(outputDir, "clean", "voter-cleaned.jsonl"),
    "--contract", contractPath,
    "--output-dir", join(outputDir, "transform"),
  ];
  if (selfCheck) transformerArgs.push("--self-check");
  await runStage("node", transformerArgs, ENGINE_DIR, "3. TRANSFORM");

  const finishedAt = new Date().toISOString();
  console.log(`\nFinished: ${finishedAt}`);

  // Write pipeline-summary.json (build log, not a shipped artefact)
  const transformDir = join(outputDir, "transform");
  const aggregateFiles = [
    "state-intelligence.jsonl",
    "parliament-intelligence.jsonl",
    "dun-intelligence.jsonl",
    "dm-intelligence.jsonl",
    "locality-intelligence.jsonl",
    "dashboard-overview.json",
    "transformation-manifest.json",
  ];
  const outputSizes = {};
  for (const f of aggregateFiles) {
    const p = join(transformDir, f);
    if (existsSync(p)) outputSizes[f] = fileSizeBytes(p);
  }

  const summary = {
    pipeline_version: SCRIPT_VERSIONS.orchestrator,
    parliament,
    mode,
    strict_contract: strictContract,
    self_check: selfCheck,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_seconds: ((new Date(finishedAt).getTime()) - (new Date(startedAt).getTime())) / 1000,
    script_versions: SCRIPT_VERSIONS,
    inputs: {
      xlsx_path: xlsxPath,
      xlsx_sha256: xlsxSha256,
      contract_path: contractPath,
      contract_sha256: contractSha256,
    },
    salt: {
      rotated: true,
      salt_sha256: saltSha256,
      exposed_salt_dead: true,
    },
    outputs: outputSizes,
    runtime: {
      node: process.versions.node,
      python: "3.x (invoked via spawn)",
      pandas: "2.x (assumed installed)",
      openpyxl: "3.x (assumed installed)",
    },
    entry_points: [
      `python ${profilerScript} ${profilerArgs.slice(2).join(" ")}`,
      `python ${cleanserScript} ${cleanserArgs.slice(2).join(" ")}`,
      `node ${transformerScript} ${transformerArgs.slice(2).join(" ")}`,
    ],
  };

  writeFileSync(join(outputDir, "pipeline-summary.json"), JSON.stringify(summary, null, 2));
  console.log(`\nWrote pipeline-summary.json to ${outputDir}/`);
  console.log(`\n=== Pipeline complete. Aggregate JSONLs in ${transformDir}/ ===\n`);
}

main().catch((err) => {
  console.error("\nPIPELINE FAILED:", err.message);
  process.exit(1);
});
