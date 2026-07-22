// ponytail: MLK — DUN list + metadata API.
import { NextResponse } from "next/server";
import { PARLIAMENTS } from "@/lib/melaka-constants";
import { allRenamedDUNs } from "@/lib/dun-redelineation-map";

export const dynamic = "force-static";

export async function GET() {
  const renamed = allRenamedDUNs();
  const renamedByCode = new Map(renamed.map((r) => [r.code, r]));
  const duns = PARLIAMENTS.flatMap((p) =>
    p.dunCodes.map((code, idx) => {
      const dunCode = `N${code}`;
      const re = renamedByCode.get(dunCode);
      return {
        parliament_code: p.code,
        parliament_name: p.name,
        dun_code: code,
        dun_name: p.dunNames[idx],
        dun_name_2018: re?.name2018 ?? p.dunNames[idx],
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
