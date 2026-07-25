"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, CheckCircle2, AlertCircle, FileText, Eye } from "lucide-react";
import { RESPONSE_RECOMMENDATIONS, CASE_TYPES, CASE_STATUSES, PLATFORMS } from "@/lib/s2d-contracts";
import { SEED_COMM_CASES } from "@/lib/s2d-seed-data";
import { useI18n } from "@/lib/i18n";

const REC_COLORS: Record<string, string> = {
  MONITOR: "text-blue-600 border-blue-500/40",
  CLARIFY: "text-amber-600 border-amber-500/40",
  CORRECT_WITH_EVIDENCE: "text-red-600 border-red-500/40",
  PROVIDE_SERVICE_UPDATE: "text-purple-600 border-purple-500/40",
  AMPLIFY_VERIFIED_INFORMATION: "text-emerald-600 border-emerald-500/40",
  ESCALATE_FOR_REVIEW: "text-orange-600 border-orange-500/40",
  NO_RESPONSE_REQUIRED: "text-muted-foreground border-border",
};

const STATUS_COLORS: Record<string, string> = {
  ELIGIBLE_FOR_HUMAN_REVIEW: "bg-blue-500/15 text-blue-600",
  REVIEW_REQUIRED: "bg-amber-500/15 text-amber-600",
  BLOCKED_INSUFFICIENT_EVIDENCE: "bg-red-500/15 text-red-600",
  NO_CASE_REQUIRED: "bg-emerald-500/15 text-emerald-600",
  RESOLVED: "bg-muted/30 text-muted-foreground",
};

const PLATFORM_ICONS: Record<string, string> = { TIKTOK: "🎵", FACEBOOK: "📘", INSTAGRAM: "📷", THREADS: "🧵", NEWS: "📰", OTHER: "🔗" };

export function PublicCommunicationTab() {
  const { t } = useI18n();
  const reviewCount = SEED_COMM_CASES.filter(c => c.status === CASE_STATUSES.REVIEW_REQUIRED).length;
  const eligibleCount = SEED_COMM_CASES.filter(c => c.status === CASE_STATUSES.ELIGIBLE_FOR_HUMAN_REVIEW).length;
  const resolvedCount = SEED_COMM_CASES.filter(c => c.status === CASE_STATUSES.NO_CASE_REQUIRED).length;

  const templates = [
    { nameKey: "pubcomm.templ1Name", catKey: "pubcomm.templ1Cat", audience: "N05 Taboh Naning", template: "Kami prihatin dengan isu kesihatan warga emas di kawasan ini. Program kesihatan komuniti akan diperluas..." },
    { nameKey: "pubcomm.templ2Name", catKey: "pubcomm.templ2Cat", audience: "P138 Kota Melaka", template: "Inisiatif ekonomi belia baharu dilancarkan untuk membina peluang pekerjaan dalam sektor digital..." },
    { nameKey: "pubcomm.templ3Name", catKey: "pubcomm.templ3Cat", audience: "N01 Kuala Linggi", template: "Kami mengambil serius maklum balas komuniti. Sesi dialog terbuka akan diadakan pada minggu hadapan..." },
    { nameKey: "pubcomm.templ4Name", catKey: "pubcomm.templ4Cat", audience: "P136 Tangga Batu", template: "Kemajuan projek infrastruktur di kawasan ini mengikut jadual. Tarikh siap dijangka Q3 2026..." },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-mlk/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-mlk" />
            <div>
              <CardTitle className="text-base">{t("pubcomm.title")}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{t("pubcomm.desc")}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* KPI strip */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-amber-600">{reviewCount}</div><div className="text-[10px] text-muted-foreground">{t("pubcomm.kpiReviewRequired")}</div></div>
            <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-blue-600">{eligibleCount}</div><div className="text-[10px] text-muted-foreground">{t("pubcomm.kpiEligibleReview")}</div></div>
            <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-emerald-600">{resolvedCount}</div><div className="text-[10px] text-muted-foreground">{t("pubcomm.kpiNoCaseRequired")}</div></div>
            <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-mlk">{SEED_COMM_CASES.length}</div><div className="text-[10px] text-muted-foreground">{t("pubcomm.kpiTotalCases")}</div></div>
          </div>

          {/* Response cases */}
          <div className="space-y-2">
            {SEED_COMM_CASES.map((c) => (
              <div key={c.id} className="rounded-md border border-border/50 p-3 hover:border-mlk/30">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[9px] text-mlk border-mlk/30">{t(`pubcomm.caseType.${c.type}`, c.type.replace(/_/g, " "))}</Badge>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] || ""}`}>{t(`pubcomm.caseStatus.${c.status}`, c.status.replace(/_/g, " "))}</span>
                      <span className="text-[9px] text-muted-foreground">{c.platforms.map(p => PLATFORM_ICONS[p] || p).join(" ")}</span>
                    </div>
                    <div className="text-sm font-medium">{c.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{c.description}</div>
                  </div>
                  <div className="flex-shrink-0 text-end">
                    <Badge variant="outline" className={`text-[9px] ${REC_COLORS[c.recommendation] || ""}`}>{t(`pubcomm.recommendation.${c.recommendation}`, c.recommendation.replace(/_/g, " "))}</Badge>
                    <div className="text-[9px] text-muted-foreground mt-1">{t("pubcomm.evidenceCount").replace("{count}", String(c.evidence_count)).replace("{date}", new Date(c.created_at).toLocaleDateString())}</div>
                  </div>
                </div>
                <div className="flex gap-1 mt-2 pt-2 border-t border-border/30">
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]"><Eye className="h-3 w-3 me-1" /> {t("pubcomm.viewEvidence")}</Button>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]"><FileText className="h-3 w-3 me-1" /> {t("pubcomm.draftResponse")}</Button>
                  {c.status === CASE_STATUSES.REVIEW_REQUIRED && <Button variant="ghost" size="sm" className="h-6 text-[10px] text-mlk"><CheckCircle2 className="h-3 w-3 me-1" /> {t("pubcomm.approve")}</Button>}
                </div>
              </div>
            ))}
          </div>

          {/* Note */}
          <div className="mt-4 rounded-md border border-mlk/20 bg-mlk/5 p-3 text-xs text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 inline me-1 text-mlk" />
            {t("pubcomm.note")}
          </div>
        </CardContent>
      </Card>

      {/* §7.10: Template Library — reusable message templates */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4 text-mlk" /> {t("pubcomm.templateLibraryTitle")}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map((tmpl, i) => (
              <div key={i} className="rounded-lg border border-border/60 p-3 hover:border-mlk/30 hover:shadow-sm transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold">{t(tmpl.nameKey)}</span>
                  <Badge variant="outline" className="text-[8px]">{t(tmpl.catKey)}</Badge>
                </div>
                <div className="text-[9px] text-muted-foreground mb-2">{t("pubcomm.target").replace("{audience}", tmpl.audience)}</div>
                <div className="text-[10px] text-muted-foreground line-clamp-2 bg-muted/30 rounded p-2">{tmpl.template}</div>
              </div>
            ))}
          </div>
          <div className="text-[9px] text-muted-foreground mt-2">
            {t("pubcomm.templatesNote")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
