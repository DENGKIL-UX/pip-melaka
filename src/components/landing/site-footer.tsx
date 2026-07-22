"use client";

/**
 * SiteFooter — enterprise SaaS footer with brand, links, and legal sections.
 * §11.5 i18n-wired (EN/BM).
 */
import { ShieldCheck, Database, Globe2 } from "lucide-react";
import { LanguageToggle, useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="relative z-10 border-t border-border/40 bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-10 md:py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-7 h-7 text-mlk" aria-hidden="true" />
              <span className="font-bold text-lg">
                PIP<span className="text-mlk">-MLK</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              {t("footer.tagline")}
            </p>
            <div className="flex items-center gap-2 mt-4 text-[10px] text-muted-foreground">
              <span className="pulse-dot" aria-hidden="true" />
              <span>{t("footer.allSystemsOperational")}</span>
            </div>
            <div className="mt-3">
              <LanguageToggle />
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">
              {t("footer.product")}
            </h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-foreground/80 hover:text-mlk transition-colors">{t("footer.dashboard")}</a></li>
              <li><a href="#" className="text-foreground/80 hover:text-mlk transition-colors">{t("footer.map2d")}</a></li>
              <li><a href="#" className="text-foreground/80 hover:text-mlk transition-colors">{t("footer.map3d")}</a></li>
              <li><a href="#" className="text-foreground/80 hover:text-mlk transition-colors">{t("footer.s2dIntelligence")}</a></li>
            </ul>
          </div>

          {/* Data sources */}
          <div>
            <h4 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Database className="w-3 h-3" /> {t("footer.dataSources")}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://www.data.gov.my" target="_blank" rel="noopener noreferrer" className="text-foreground/80 hover:text-mlk transition-colors flex items-center gap-1">
                  <Globe2 className="w-3 h-3" /> DOSM kawasanku
                </a>
              </li>
              <li>
                <a href="https://electiondata.my" target="_blank" rel="noopener noreferrer" className="text-foreground/80 hover:text-mlk transition-colors flex items-center gap-1">
                  <Globe2 className="w-3 h-3" /> ElectionData.MY
                </a>
              </li>
              <li>
                <a href="https://www.spr.gov.my" target="_blank" rel="noopener noreferrer" className="text-foreground/80 hover:text-mlk transition-colors flex items-center gap-1">
                  <Globe2 className="w-3 h-3" /> SPR Malaysia
                </a>
              </li>
              <li>
                <a href="https://lake.electiondata.my" target="_blank" rel="noopener noreferrer" className="text-foreground/80 hover:text-mlk transition-colors flex items-center gap-1">
                  <Globe2 className="w-3 h-3" /> EDL Data Lake
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">
              {t("footer.legal")}
            </h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-foreground/80 hover:text-mlk transition-colors">{t("footer.privacyPolicy")}</a></li>
              <li><a href="#" className="text-foreground/80 hover:text-mlk transition-colors">{t("footer.pdpaAkta")}</a></li>
              <li><a href="#" className="text-foreground/80 hover:text-mlk transition-colors">{t("footer.dataGovernance")}</a></li>
              <li><a href="#" className="text-foreground/80 hover:text-mlk transition-colors">{t("footer.termsOfUse")}</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/40 text-center text-xs text-muted-foreground">
          <p className="mb-1">
            <strong className="text-mlk">PIP-MLK</strong> v1.0.0 — {t("footer.builtWith")}
          </p>
          <p>
            {t("footer.dataSourcedFrom")}
          </p>
        </div>
      </div>
    </footer>
  );
}
