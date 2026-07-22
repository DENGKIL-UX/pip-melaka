// ponytail: MLK — DUN list + metadata API.
import { NextResponse } from "next/server";
import { PARLIAMENTS, getDunName } from "@/lib/melaka-constants";
import { allRenamedDUNs } from "@/lib/dun-redelineation-map";

export const dynamic = "force-static";

export async function GET() {
  const renamed = allRenamedDUNs();
  const renamedByCode = new Map(renamed.map((r) => [r.code, r]));
  const duns = PARLIAMENTS.flatMap((p) =>
    p.dunCodes.map((code) => {
      // FIX: Parliament interface has no `dunNames` property — DUN names are
      // looked up via getDunName(parlCode, dunCode) from the DUN_NAMES Record.
      // Previously used `p.dunNames[idx]` which was `undefined[idx]` →
      // "Cannot read properties of undefined (reading '0')" at build time.
      const dunName = getDunName(p.code, code);
      const dunCode = `N${code}`;
      const re = renamedByCode.get(dunCode);
      return {
        parliament_code: p.code,
        parliament_name: p.name,
        dun_code: code,
        dun_name: dunName,
        dun_name_2018: re?.name2018 ?? dunName,
        renamed_in_2023: !!re,
        formerly: re?.name2018 ?? null,
        district: p.district,
      };
    })
  );
  return NextResponse.json(
    { state: "Melaka", state_code: "04", total: duns.length, duns },
    { headers: { "Cache-Control": "public, s-maxage=86400" } }
  );
}
