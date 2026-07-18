#!/usr/bin/env bash
# ponytail: MLK — PDPA file verification guard.
# Ensures no per-voter data is shipped to the Worker bundle or git.
# Run before every deploy: npm run verify:no-pdpa-files

set -euo pipefail

echo "=== PDPA File Verification ==="

VIOLATIONS=0

# Check for PDPA-sensitive files in public/
for pattern in "voter-intelligence.jsonl" "voter-cleaned.jsonl" "voter-cleaned.json" "voter-cleaned.csv" "voter-cleaned.xlsx" "cleansing-audit.json"; do
  found=$(find public/ -name "$pattern" 2>/dev/null || true)
  if [ -n "$found" ]; then
    echo "❌ VIOLATION: $found"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

# Check for raw xlsx files in public/ or src/
raw_xlsx=$(find public/ src/ -name "*.xlsx" 2>/dev/null || true)
if [ -n "$raw_xlsx" ]; then
  echo "❌ VIOLATION: Raw xlsx found: $raw_xlsx"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Check for .secrets directory tracked by git
if git ls-files --error-unmatch .secrets/* 2>/dev/null; then
  echo "❌ VIOLATION: .secrets/ directory is tracked by git"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Check for .env tracked by git
if git ls-files --error-unmatch .env 2>/dev/null; then
  echo "❌ VIOLATION: .env is tracked by git"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Check for /api/engine route (must NOT exist)
if [ -f "src/app/api/engine/route.ts" ]; then
  echo "❌ VIOLATION: /api/engine route exists (engine is build-time only)"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

if [ "$VIOLATIONS" -gt 0 ]; then
  echo ""
  echo "❌ PDPA verification FAILED: $VIOLATIONS violation(s) found."
  echo "   Fix these before deploying."
  exit 1
else
  echo "✅ PDPA verification PASSED: No sensitive files found."
  echo "   - No voter-intelligence.jsonl in public/"
  echo "   - No voter-cleaned.* in public/"
  echo "   - No cleansing-audit.json in public/"
  echo "   - No raw xlsx in public/ or src/"
  echo "   - No .secrets/ tracked by git"
  echo "   - No .env tracked by git"
  echo "   - No /api/engine route"
  exit 0
fi
