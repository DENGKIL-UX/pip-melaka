// ponytail: MLK — Melaka constants.
// 6 parliaments (P134–P139), 28 DUN (N01–N28), 3 districts.
// Parliament names verified against DOSM kawasanku GeoJSON (2026 redelineation).

export interface Parliament {
  code: string;
  name: string;
  district: string;
  dunCount: number;
  totalVoters: number;
  ge14Winner: "PH" | "BN" | "PN";
  ge15Winner: "PH" | "BN" | "PN";
  dunCodes: string[];
}

export const PARLIAMENTS: Parliament[] = [
  { code: "134", name: "Masjid Tanah", district: "Alor Gajah", dunCount: 5, totalVoters: 71415, ge14Winner: "PH", ge15Winner: "PN", dunCodes: ["01", "02", "03", "04", "05"] },
  { code: "135", name: "Alor Gajah", district: "Alor Gajah", dunCount: 5, totalVoters: 0, ge14Winner: "PH", ge15Winner: "PN", dunCodes: ["06", "07", "08", "09", "10"] },
  { code: "136", name: "Tangga Batu", district: "Melaka Tengah", dunCount: 4, totalVoters: 0, ge14Winner: "PH", ge15Winner: "PN", dunCodes: ["11", "12", "13", "14"] },
  { code: "137", name: "Hang Tuah Jaya", district: "Melaka Tengah", dunCount: 4, totalVoters: 0, ge14Winner: "PH", ge15Winner: "PH", dunCodes: ["15", "16", "17", "18"] },
  { code: "138", name: "Kota Melaka", district: "Melaka Tengah", dunCount: 5, totalVoters: 0, ge14Winner: "PH", ge15Winner: "PH", dunCodes: ["19", "20", "21", "22", "23"] },
  { code: "139", name: "Jasin", district: "Jasin", dunCount: 5, totalVoters: 0, ge14Winner: "PH", ge15Winner: "PN", dunCodes: ["24", "25", "26", "27", "28"] },
];

export const TOTAL_DUN = 28;
export const TOTAL_VOTERS_P134 = 71415;
export const DISTRICTS = ["Melaka Tengah", "Alor Gajah", "Jasin"] as const;
export const STATE_CODE_DOSM = "04";

// DUN names from DOSM kawasanku GeoJSON (2026 verified)
export const DUN_NAMES: Record<string, string> = {
  "134-01": "Kuala Linggi", "134-02": "Tanjung Bidara", "134-03": "Ayer Limau", "134-04": "Lendu", "134-05": "Taboh Naning",
  "135-06": "Rembia", "135-07": "Gadek", "135-08": "Machap Jaya", "135-09": "Durian Tunggal", "135-10": "Asahan",
  "136-11": "Sungai Udang", "136-12": "Pantai Kundor", "136-13": "Paya Rumput", "136-14": "Kelebang",
  "137-15": "Pengkalan Batu", "137-16": "Ayer Keroh", "137-17": "Bukit Katil", "137-18": "Ayer Molek",
  "138-19": "Kesidang", "138-20": "Kota Laksamana", "138-21": "Duyong", "138-22": "Bandar Hilir", "138-23": "Telok Mas",
  "139-24": "Bemban", "139-25": "Rim", "139-26": "Serkam", "139-27": "Merlimau", "139-28": "Sungai Rambai",
};

export function getDunName(parlCode: string, dunCode: string): string {
  return DUN_NAMES[`${parlCode}-${dunCode}`] ?? `N${dunCode}`;
}

// Melaka map center (from DOSM kawasanku GeoJSON centroid)
export const MLK_CENTER: [number, number] = [2.190, 102.251];
export const MLK_DEFAULT_ZOOM = 10;
