// ponytail: MLK — Role check API (POST-only). Used by S2D Action Console.
import { NextRequest, NextResponse } from "next/server";

const VALID_ROLES = new Set(["analyst", "strategist", "operator", "admin"]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const role = String(body?.role || "").toLowerCase();
    if (!VALID_ROLES.has(role)) {
      return NextResponse.json({ valid: false, error: `Unknown role: ${role}` }, { status: 400 });
    }
    const perms = {
      analyst: ["view", "export"],
      strategist: ["view", "export", "comment"],
      operator: ["view", "export", "act"],
      admin: ["view", "export", "comment", "act", "admin"],
    } as const;
    return NextResponse.json({ valid: true, role, permissions: perms[role as keyof typeof perms] });
  } catch (err) {
    return NextResponse.json({ valid: false, error: String(err) }, { status: 400 });
  }
}
