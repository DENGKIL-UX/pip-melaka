// PIP-MLK Natural Language Query API route.
//
// Takes a natural language question, uses CF Workers AI (Llama 3.1 8B) to
// generate a SQL query, then executes it using a lightweight in-memory
// SQL-like engine (no native dependencies — pure JavaScript).
//
// Flow: NL question → CF AI generates SQL → in-memory executor → JSON results

import { NextRequest, NextResponse } from "next/server";
import { cfChatCompletion, CF_MODELS, type CFChatMessage } from "@/lib/cloudflare-ai";
import { withCORS } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCHEMA_PROMPT = `You are a SQL query generator for a Melaka election database. Generate ONLY a valid SQL query (no explanation, no markdown, no backticks).

Available tables:

1. elections (3 rows — GE14, PRN15, GE15)
   Columns: id (TEXT), name (TEXT), date (TEXT), headline (TEXT), parl_bn (INT), parl_ph (INT), parl_pn (INT), parl_total (INT), dun_bn (INT), dun_ph (INT), dun_pn (INT), dun_total (INT)

2. parliament_results (12 rows — 6 seats x 2 elections with parliament data)
   Columns: election_id (TEXT), election_date (TEXT), parliament_code (TEXT), parliament_name (TEXT), winner_coalition (TEXT), winner_party (TEXT), winner_candidate (TEXT), winner_votes (INT), votes_pct (REAL), runner_up_coalition (TEXT), runner_up_party (TEXT), runner_up_candidate (TEXT), runner_up_votes (INT), margin_pct (REAL)

3. dun_results (56 rows — 28 DUN seats x 2 elections with DUN data)
   Columns: election_id (TEXT), election_date (TEXT), parliament_code (TEXT), dun_code (TEXT), dun_name (TEXT), winner_coalition (TEXT), winner_party (TEXT), winner_candidate (TEXT), winner_votes (INT), bn_pct (REAL), ph_pct (REAL), pn_pct (REAL)

4. party_breakdown (15 rows — party seats per election)
   Columns: election_id (TEXT), party (TEXT), seats_won (INT)
   Note: party contains component party names (UMNO, MCA, MIC, DAP, PKR, AMANAH, PAS, BERSATU), NOT coalition names.
   BN parties: UMNO, MCA, MIC. PH parties: DAP, PKR, AMANAH. PN parties: PAS, BERSATU.
   To count BN seats: SELECT SUM(seats_won) FROM party_breakdown WHERE party IN ('UMNO', 'MCA', 'MIC')

Rules:
- Output ONLY the SQL query, nothing else — no markdown, no backticks, no explanation
- Use standard SQLite-compatible SQL
- Table and column names are case-sensitive — use exactly as shown above
- Winner coalitions are: 'BN', 'PH', 'PN'
- Election IDs are: 'GE14', 'PRN15', 'GE15'
- Parliament codes are: '134', '135', '136', '137', '138', '139'
- DUN codes are: '01' through '28'
- If the question cannot be answered from these tables, return: SELECT 'Cannot answer from available data' AS error
- Limit results to 50 rows max (add LIMIT 50)
- Use single quotes for string literals
- Do NOT use window functions, CTEs, or advanced features — keep it simple SELECT/FROM/WHERE/GROUP BY/ORDER BY/LIMIT`;

let cachedTables: Record<string, Array<Record<string, unknown>>> | null = null;

async function loadTables(req: NextRequest): Promise<Record<string, Array<Record<string, unknown>>>> {
  if (cachedTables) return cachedTables;
  // Use fetch with absolute URL — works on both local dev and Cloudflare Workers.
  // On CF Workers, static assets are served via the ASSETS binding.
  const baseUrl = new URL(req.url).origin;
  const res = await fetch(`${baseUrl}/data/elections/query-tables.json`);
  if (!res.ok) {
    throw new Error(`Failed to load query tables: HTTP ${res.status}`);
  }
  cachedTables = await res.json() as Record<string, Array<Record<string, unknown>>>;
  return cachedTables!;
}

function extractSql(response: string): string {
  let sql = response.trim();
  // Strip markdown code fences
  sql = sql.replace(/^```(?:sql)?\s*/i, "").replace(/\s*```$/i, "");
  // Remove trailing semicolon
  sql = sql.trim().replace(/;$/, "");
  return sql.trim();
}

// Simple SQL parser — supports SELECT ... FROM ... [WHERE ...] [GROUP BY ...] [ORDER BY ...] [LIMIT ...]
// This is a minimal implementation that handles the most common query patterns.
interface ParsedQuery {
  select: string[];
  from: string;
  where?: string;
  groupBy?: string[];
  orderBy?: { col: string; dir: "ASC" | "DESC" };
  limit?: number;
  aggregates?: Array<{ func: string; col: string; alias: string }>;
}

function parseSql(sql: string): ParsedQuery | null {
  try {
    const upper = sql.toUpperCase().trim();
    if (!upper.startsWith("SELECT")) return null;

    // Extract LIMIT
    let limit: number | undefined;
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) limit = parseInt(limitMatch[1]);

    // Extract ORDER BY
    let orderBy: { col: string; dir: "ASC" | "DESC" } | undefined;
    const orderMatch = sql.match(/ORDER\s+BY\s+(\S+)(?:\s+(ASC|DESC))?/i);
    if (orderMatch) {
      orderBy = { col: orderMatch[1].replace(/,/g, ""), dir: (orderMatch[2] || "ASC").toUpperCase() as "ASC" | "DESC" };
    }

    // Extract GROUP BY
    let groupBy: string[] | undefined;
    const groupMatch = sql.match(/GROUP\s+BY\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (groupMatch) {
      groupBy = groupMatch[1].split(",").map((s) => s.trim());
    }

    // Extract FROM
    const fromMatch = sql.match(/FROM\s+(\S+)/i);
    if (!fromMatch) return null;
    const from = fromMatch[1].replace(/;/g, "");

    // Extract SELECT columns (between SELECT and FROM)
    const selectPart = sql.match(/SELECT\s+(.+?)\s+FROM/i);
    if (!selectPart) return null;
    const selectRaw = selectPart[1].trim();

    // Parse SELECT — handle * and aggregate functions
    const select: string[] = [];
    const aggregates: Array<{ func: string; col: string; alias: string }> = [];

    if (selectRaw === "*") {
      select.push("*");
    } else {
      const parts = selectRaw.split(",").map((s) => s.trim());
      for (const part of parts) {
        // Check for aggregate function: COUNT(*), SUM(col), AVG(col), MAX(col), MIN(col)
        const aggMatch = part.match(/(COUNT|SUM|AVG|MAX|MIN)\s*\(\s*(\*|\w+)\s*\)/i);
        if (aggMatch) {
          const func = aggMatch[1].toUpperCase();
          const col = aggMatch[2];
          // Check for alias
          const aliasMatch = part.match(/AS\s+(\w+)/i);
          const alias = aliasMatch ? aliasMatch[1] : `${func.toLowerCase()}_${col}`;
          aggregates.push({ func, col, alias });
          select.push(alias);
        } else {
          // Check for alias
          const aliasMatch = part.match(/AS\s+(\w+)/i);
          select.push(aliasMatch ? part.split(/\s+AS\s+/i)[0].trim() : part);
        }
      }
    }

    // Extract WHERE (between WHERE and GROUP BY/ORDER BY/LIMIT/end)
    let where: string | undefined;
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (whereMatch) where = whereMatch[1].trim();

    return { select, from, where, groupBy, orderBy, limit, aggregates };
  } catch {
    return null;
  }
}

function evalCondition(row: Record<string, unknown>, condition: string): boolean {
  // Simple condition evaluator — handles AND, OR, =, !=, <, >, <=, >=, LIKE
  // Split by AND first
  const andParts = condition.split(/\s+AND\s+/i);
  for (const andPart of andParts) {
    if (!evalOrCondition(row, andPart.trim())) return false;
  }
  return true;
}

function evalOrCondition(row: Record<string, unknown>, condition: string): boolean {
  const orParts = condition.split(/\s+OR\s+/i);
  for (const orPart of orParts) {
    if (evalSimpleCondition(row, orPart.trim())) return true;
  }
  return false;
}

function evalSimpleCondition(row: Record<string, unknown>, condition: string): boolean {
  // Match column operator value
  // e.g., winner_coalition = 'BN', margin_pct > 10, election_id = 'GE15'
  const match = condition.match(/^(\w+)\s*(=|!=|<>|<=|>=|<|>|LIKE)\s*(.+)$/i);
  if (!match) return true; // Can't parse — allow the row

  const [, col, op, valStr] = match;
  const rowVal = row[col];
  let val = valStr.trim();

  // Remove quotes from string values
  if (val.startsWith("'") && val.endsWith("'")) {
    val = val.slice(1, -1);
  } else if (val.startsWith('"') && val.endsWith('"')) {
    val = val.slice(1, -1);
  }

  // Numeric comparison
  const numVal = parseFloat(val);
  const rowNum = typeof rowVal === "number" ? rowVal : parseFloat(String(rowVal));

  switch (op.toUpperCase()) {
    case "=":
      if (!isNaN(numVal) && !isNaN(rowNum)) return rowNum === numVal;
      return String(rowVal) === val;
    case "!=":
    case "<>":
      if (!isNaN(numVal) && !isNaN(rowNum)) return rowNum !== numVal;
      return String(rowVal) !== val;
    case "<":
      if (!isNaN(numVal) && !isNaN(rowNum)) return rowNum < numVal;
      return String(rowVal) < val;
    case ">":
      if (!isNaN(numVal) && !isNaN(rowNum)) return rowNum > numVal;
      return String(rowVal) > val;
    case "<=":
      if (!isNaN(numVal) && !isNaN(rowNum)) return rowNum <= numVal;
      return String(rowVal) <= val;
    case ">=":
      if (!isNaN(numVal) && !isNaN(rowNum)) return rowNum >= numVal;
      return String(rowVal) >= val;
    case "LIKE":
      // Convert SQL LIKE to regex
      const regex = new RegExp(val.replace(/%/g, ".*").replace(/_/g, "."), "i");
      return regex.test(String(rowVal));
    default:
      return true;
  }
}

function executeQuery(
  sql: string,
  tables: Record<string, Array<Record<string, unknown>>>
): { rows: Array<Record<string, unknown>>; columns: string[]; error?: string } {
  try {
    const parsed = parseSql(sql);
    if (!parsed) {
      return { rows: [], columns: [], error: "Failed to parse SQL query" };
    }

    const tableData = tables[parsed.from];
    if (!tableData) {
      return { rows: [], columns: [], error: `Table '${parsed.from}' not found` };
    }

    // Apply WHERE filter
    let filtered = parsed.where
      ? tableData.filter((row) => evalCondition(row, parsed.where!))
      : [...tableData];

    // Apply GROUP BY + aggregates
    if (parsed.groupBy && parsed.aggregates && parsed.aggregates.length > 0) {
      const groups: Record<string, Array<Record<string, unknown>>> = {};
      for (const row of filtered) {
        const key = parsed.groupBy.map((col) => String(row[col])).join("|");
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      }

      const grouped: Array<Record<string, unknown>> = [];
      for (const [key, groupRows] of Object.entries(groups)) {
        const result: Record<string, unknown> = {};
        // Add group by columns
        parsed.groupBy.forEach((col, i) => {
          result[col] = key.split("|")[i];
        });
        // Add aggregates
        for (const agg of parsed.aggregates) {
          if (agg.func === "COUNT") {
            result[agg.alias] = agg.col === "*" ? groupRows.length : groupRows.filter((r) => r[agg.col] != null).length;
          } else if (agg.func === "SUM") {
            result[agg.alias] = groupRows.reduce((s, r) => s + (Number(r[agg.col]) || 0), 0);
          } else if (agg.func === "AVG") {
            const vals = groupRows.map((r) => Number(r[agg.col])).filter((v) => !isNaN(v));
            result[agg.alias] = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : 0;
          } else if (agg.func === "MAX") {
            result[agg.alias] = Math.max(...groupRows.map((r) => Number(r[agg.col])).filter((v) => !isNaN(v)));
          } else if (agg.func === "MIN") {
            result[agg.alias] = Math.min(...groupRows.map((r) => Number(r[agg.col])).filter((v) => !isNaN(v)));
          }
        }
        grouped.push(result);
      }
      filtered = grouped;
    } else if (parsed.aggregates && parsed.aggregates.length > 0 && !parsed.groupBy) {
      // Aggregate without GROUP BY — single row
      const result: Record<string, unknown> = {};
      for (const agg of parsed.aggregates) {
        if (agg.func === "COUNT") {
          result[agg.alias] = agg.col === "*" ? filtered.length : filtered.filter((r) => r[agg.col] != null).length;
        } else if (agg.func === "SUM") {
          result[agg.alias] = filtered.reduce((s, r) => s + (Number(r[agg.col]) || 0), 0);
        } else if (agg.func === "AVG") {
          const vals = filtered.map((r) => Number(r[agg.col])).filter((v) => !isNaN(v));
          result[agg.alias] = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : 0;
        } else if (agg.func === "MAX") {
          const vals = filtered.map((r) => Number(r[agg.col])).filter((v) => !isNaN(v));
          result[agg.alias] = vals.length > 0 ? Math.max(...vals) : 0;
        } else if (agg.func === "MIN") {
          const vals = filtered.map((r) => Number(r[agg.col])).filter((v) => !isNaN(v));
          result[agg.alias] = vals.length > 0 ? Math.min(...vals) : 0;
        }
      }
      filtered = [result];
    }

    // Apply ORDER BY
    if (parsed.orderBy) {
      const { col, dir } = parsed.orderBy;
      filtered.sort((a, b) => {
        const aVal = a[col];
        const bVal = b[col];
        if (typeof aVal === "number" && typeof bVal === "number") {
          return dir === "ASC" ? aVal - bVal : bVal - aVal;
        }
        return dir === "ASC"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }

    // Apply LIMIT
    if (parsed.limit) {
      filtered = filtered.slice(0, parsed.limit);
    }

    // Determine columns
    let columns: string[];
    if (parsed.select.includes("*")) {
      columns = filtered.length > 0 ? Object.keys(filtered[0]) : Object.keys(tableData[0] || {});
    } else {
      columns = parsed.select;
    }

    return { rows: filtered, columns };
  } catch (err) {
    return { rows: [], columns: [], error: err instanceof Error ? err.message : String(err) };
  }
}

async function handlePost(req: NextRequest): Promise<NextResponse> {
  let question: string;
  try {
    const body = (await req.json()) as { question?: string };
    if (!body.question || typeof body.question !== "string" || body.question.length > 500) {
      return NextResponse.json({ error: "question required (max 500 chars)" }, { status: 400 });
    }
    question = body.question;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  // Step 1: Generate SQL via CF Workers AI
  const messages: CFChatMessage[] = [
    { role: "system", content: SCHEMA_PROMPT },
    { role: "user", content: `Generate a SQL query for this question: "${question}"` },
  ];

  let generatedSql: string;
  try {
    const result = await cfChatCompletion(messages, CF_MODELS[0].id);
    generatedSql = extractSql(result.response);
  } catch (err) {
    return NextResponse.json({
      error: "SQL generation failed",
      detail: err instanceof Error ? err.message : String(err),
      question,
    }, { status: 502 });
  }

  // Safety: only allow SELECT
  const sqlLower = generatedSql.toLowerCase().trim();
  if (!sqlLower.startsWith("select")) {
    return NextResponse.json({
      error: "Only SELECT queries are allowed",
      generated_sql: generatedSql,
      question,
    }, { status: 403 });
  }

  // Step 2: Execute SQL
  let tables: Record<string, Array<Record<string, unknown>>>;
  try {
    tables = await loadTables(req);
  } catch {
    return NextResponse.json({
      error: "Failed to load election data tables",
      generated_sql: generatedSql,
      question,
    }, { status: 500 });
  }

  const result = executeQuery(generatedSql, tables);

  return NextResponse.json({
    question,
    generated_sql: generatedSql,
    rows: result.rows,
    columns: result.columns,
    row_count: result.rows.length,
    error: result.error,
  });
}

export const POST = withCORS(handlePost);

export const GET = withCORS(async () => {
  return NextResponse.json({
    endpoint: "/api/query",
    description: "Natural language to SQL to in-memory election data query",
    tables: ["elections", "parliament_results", "dun_results", "party_breakdown"],
    usage: 'POST {"question": "How many DUN seats did BN win in PRN15?"}',
  });
});
