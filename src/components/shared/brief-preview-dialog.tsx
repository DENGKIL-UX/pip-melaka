"use client";

/**
 * BriefPreviewDialog — a modal that previews the PIP-MLK intelligence brief
 * in Markdown before exporting, with Copy / Print / Download (JSON + MD) actions.
 *
 * Surfaced from the dashboard header "Export" button. Keeps the export fully
 * client-side (no PDPA-sensitive data leaves the browser).
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Printer, FileJson, FileText, Check, Loader2 } from "lucide-react";
import {
  briefToMarkdown,
  copyBriefMarkdown,
  downloadBrief,
  downloadBriefMarkdown,
  printBrief,
  type BriefSnapshot,
} from "@/lib/export-brief";
import { useI18n } from "@/lib/i18n";

interface Props {
  brief: BriefSnapshot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BriefPreviewDialog({ brief, open, onOpenChange }: Props) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleCopy = async () => {
    if (!brief) return;
    setBusy(true);
    setCopied(false);
    const ok = await copyBriefMarkdown(brief);
    setBusy(false);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-mlk/15 bg-mlk-radial">
          <DialogTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-mlk" />
            {t("brief.title", "Intelligence Brief")}
            {brief && (
              <Badge variant="outline" className="text-[9px] ms-1 border-mlk/40 text-mlk">
                {brief.platform.evidence_tier} · {brief.platform.provenance_gates_closed}/{brief.platform.provenance_gates_total}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("brief.description", "Preview the intelligence snapshot. Export as Markdown, JSON, or print to PDF — all client-side, PDPA-compliant.")}
          </DialogDescription>
        </DialogHeader>

        {/* Action toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 border-b border-border/60 bg-muted/20">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleCopy} disabled={!brief || busy}>
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? t("brief.copied", "Copied!") : t("brief.copyMd", "Copy Markdown")}
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => brief && printBrief(brief)} disabled={!brief}>
            <Printer className="h-3.5 w-3.5" />
            {t("brief.print", "Print / PDF")}
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => brief && downloadBriefMarkdown(brief)} disabled={!brief}>
            <FileText className="h-3.5 w-3.5" />
            {t("brief.downloadMd", "Download .md")}
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => brief && downloadBrief(brief)} disabled={!brief}>
            <FileJson className="h-3.5 w-3.5" />
            {t("brief.downloadJson", "Download .json")}
          </Button>
        </div>

        {/* Markdown preview */}
        <div className="flex-1 overflow-auto scrollbar-mlk px-5 py-4">
          {brief ? (
            <pre className="text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-words text-foreground/90">
              {briefToMarkdown(brief)}
            </pre>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">{t("brief.noData", "No brief data.")}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
