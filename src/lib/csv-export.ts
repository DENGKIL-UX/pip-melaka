/**
 * CSV export utility — converts array of objects to CSV and triggers download.
 *
 * Usage:
 *   exportToCSV("election-results.csv", [
 *     { code: "N01", name: "Kuala Linggi", winner: "BN", votes: 3554 },
 *     { code: "N02", name: "Tanjung Bidara", winner: "BN", votes: 3559 },
 *   ]);
 */

export function exportToCSV(filename: string, data: Record<string, unknown>[]): void {
  if (!data.length) return;

  // Get headers from first object
  const headers = Object.keys(data[0]);

  // Build CSV rows
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma/quote/newline
          const str = String(value ?? "");
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(","),
    ),
  ];

  // Create blob and download
  const csv = csvRows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export DUN summary data to CSV.
 */
export function exportDunSummaryCSV(): void {
  // Lazy import to avoid circular dependency
  import("@/lib/dun-summary").then(({ DUN_SUMMARY }) => {
    const rows = DUN_SUMMARY.map((d) => ({
      DUN_Code: d.dunCodeLabel,
      DUN_Name: d.dunName,
      Parliament: d.parliamentName,
      District: d.district,
      PRN15_Winner: d.prn15.coalition,
      PRN15_Party: d.prn15.party,
      PRN15_Candidate: d.prn15.candidate,
      PRN15_Votes: d.prn15.votes,
      PRN15_VotePct: d.prn15.votesPct,
      PRN15_MarginPct: d.prn15.marginPct,
      GE14_Winner: d.ge14.coalition,
      GE14_Party: d.ge14.party,
      GE14_Candidate: d.ge14.candidate,
      GE14_Votes: d.ge14.votes,
      GE14_VotePct: d.ge14.votesPct,
      GE14_MarginPct: d.ge14.marginPct,
      Swing: d.swing ? `${d.ge14.coalition}→${d.prn15.coalition}` : "No",
      IsMarginal: d.isMarginal ? "Yes" : "No",
      IsSafe: d.isSafe ? "Yes" : "No",
    }));
    exportToCSV("melaka-dun-summary.csv", rows);
  });
}
