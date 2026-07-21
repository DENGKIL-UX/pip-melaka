"use client";

/**
 * §11.5: Lightweight i18n — client-side translation system.
 *
 * Uses React Context (no routing changes, no middleware, no new packages).
 * Safe on Cloudflare Workers + OpenNext.
 *
 * Languages: English (en), Bahasa Malaysia (ms)
 * Usage:
 *   const { t, locale, setLocale } = useI18n();
 *   <h1>{t("landing.hero")}</h1>
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

type Locale = "en" | "ms";

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// ─── Translation dictionaries ─────────────────────────────────────────────

const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Landing
    "landing.badge": "PIP-MLK · Political Intelligence Platform · Melaka",
    "landing.hero": "Truth Above All.",
    "landing.subtitle": "A public-facing political intelligence dashboard for Melaka state — 6 parliaments, 28 DUN, 3 elections. Real DOSM kawasanku GeoJSON boundaries. Build-time engine demographics. No PDPA-sensitive data ever shipped.",
    "landing.enterDashboard": "Enter Dashboard",
    "landing.verifiedData": "Verified Data",
    "landing.systemsOperational": "Systems Operational",
    "landing.updated": "Updated",
    "landing.source": "DOSM kawasanku 2026",
    "landing.marginalSeats": "Marginal Seats Watchlist",
    "landing.marginalDesc": "DUN seats with <5pp victory margin — most likely to flip in PRN16",
    "landing.trustTitle": "Enterprise Data Governance",
    "landing.trustSubtitle": "Every data point is traceable, every transformation logged, every boundary verified against official gazettes.",
    "landing.pdpaTitle": "PDPA Akta 709 Compliant",
    "landing.pdpaDesc": "Zero individual voter data shipped. All analytics are aggregate-level only. The platform never exposes personal voter records.",
    "landing.verifiedTitle": "3-Source Verification",
    "landing.verifiedDesc": "DOSM kawasanku GeoJSON + SPR voter rolls + ElectionData.MY API — cross-referenced and verified at build time.",
    "landing.auditableTitle": "Fully Auditable",
    "landing.auditableDesc": "Complete build-time engine with open-source pipeline. Every transformation logged with provenance gates (8 of 9 closed).",

    // Dashboard tabs
    "tab.overview": "Overview",
    "tab.map2d": "2D Map",
    "tab.map3d": "3D Map",
    "tab.elections": "Elections",
    "tab.demographics": "Demographics",
    "tab.analysis": "DPT Analysis",
    "tab.risk": "Risk + Socio",
    "tab.compare": "Compare",
    "tab.s2d": "S2D Console",
    "tab.s2d360": "S2D 360",
    "tab.scraper": "Scraper",
    "tab.publicComm": "Public Comm",
    "tab.incidents": "Incidents",
    "tab.scenarios": "Scenarios",
    "tab.predictive": "Predictive",
    "tab.insights": "Insights",
    "tab.alerts": "Alerts",
    "tab.dualLayer": "Dual-Layer",
    "tab.governance": "Governance",

    // Map
    "map.hoverResults": "Hover any boundary for results · Click to select",
    "map.searchPlaceholder": "Search DUN or Parliament…",
    "map.coalition": "Coalition",
    "map.winner": "Winner",

    // Common
    "common.loading": "Loading…",
    "common.export": "Export",
    "common.exportCsv": "Export CSV",
    "common.search": "Search",
    "common.filter": "Filter",
    "common.refresh": "Refresh",
    "common.reset": "Reset",
    "common.close": "Close",
    "common.skip": "Skip tour",
    "common.next": "Next",
    "common.back": "Back",
    "common.getStarted": "Get Started",

    // Onboarding
    "onboarding.welcome.title": "Welcome to PIP-MLK",
    "onboarding.welcome.desc": "Political Intelligence Platform for Melaka state. Truth Above All — 6 parliaments, 28 DUN, 3 elections with real DOSM kawasanku GeoJSON boundaries.",
    "onboarding.maps.title": "Interactive 2D & 3D Maps",
    "onboarding.maps.desc": "Explore Melaka's 28 DUN and 6 parlimen boundaries on the 2D Leaflet map or the 3D Three.js extruded map. Hover for election results, click for detailed analytics.",
    "onboarding.elections.title": "Real Election Data",
    "onboarding.elections.desc": "GE14 (2018), PRN15 (2021), and GE15 (2022) results from ElectionData.MY. See winners, margins, vote shares, and swing analysis for every seat.",
    "onboarding.marginal.title": "Marginal Seats Watchlist",
    "onboarding.marginal.desc": "6 DUN seats with <5pp victory margin — the most competitive seats most likely to flip in PRN16. Sorted by tightest margin with risk scores.",
    "onboarding.s2d.title": "S2D Intelligence Engine",
    "onboarding.s2d.desc": "9-phase Sensing→Deciding→Acting loop with 56-page intelligence engine. Real-time signal feeds, scenario simulations, and predictive analytics.",
  },

  ms: {
    // Landing
    "landing.badge": "PIP-MLK · Platform Kecerdasan Politik · Melaka",
    "landing.hero": "Kebenaran Di Atas Segalanya.",
    "landing.subtitle": "Papan pemuka kecerdasan politik untuk negeri Melaka — 6 parlimen, 28 DUN, 3 pilihan raya. Sempadan GeoJSON DOSM kawasanku sebenar. Demografi enjin masa binaan. Tiada data sensitif PDPA dihantar.",
    "landing.enterDashboard": "Masuk Papan Pemuka",
    "landing.verifiedData": "Data Tersahkan",
    "landing.systemsOperational": "Sistem Beroperasi",
    "landing.updated": "Dikemas kini",
    "landing.source": "DOSM kawasanku 2026",
    "landing.marginalSeats": "Senarai Pantau Kerusi Marginal",
    "landing.marginalDesc": "Kerusi DUN dengan margin kemenangan <5pp — paling berkemungkinan bertukar tangan dalam PRN16",
    "landing.trustTitle": "Tadbir Urus Data Perusahaan",
    "landing.trustSubtitle": "Setiap titik data boleh dikesan, setiap transformasi direkodkan, setiap sempadan disahkan terhadap warta rasmi.",
    "landing.pdpaTitle": "Mematuhi PDPA Akta 709",
    "landing.pdpaDesc": "Tiada data pengundi individu dihantar. Semua analisis adalah peringkat agregat sahaja. Platform tidak mendedahkan rekod pengundi peribadi.",
    "landing.verifiedTitle": "Pengesahan 3 Sumber",
    "landing.verifiedDesc": "GeoJSON DOSM kawasanku + daftar pengundi SPR + API ElectionData.MY — rujukan silang dan disahkan pada masa binaan.",
    "landing.auditableTitle": "Boleh Diaudit Sepenuhnya",
    "landing.auditableDesc": "Enjin masa binaan lengkap dengan saluran sumber terbuka. Setiap transformasi direkodkan dengan pintu provenans (8 daripada 9 ditutup).",

    // Dashboard tabs
    "tab.overview": "Gambaran Keseluruhan",
    "tab.map2d": "Peta 2D",
    "tab.map3d": "Peta 3D",
    "tab.elections": "Pilihan Raya",
    "tab.demographics": "Demografi",
    "tab.analysis": "Analisis DPT",
    "tab.risk": "Risiko + Sosio",
    "tab.compare": "Banding",
    "tab.s2d": "Konsol S2D",
    "tab.s2d360": "S2D 360",
    "tab.scraper": "Pengikis",
    "tab.publicComm": "Komunikasi Awam",
    "tab.incidents": "Insiden",
    "tab.scenarios": "Senario",
    "tab.predictive": "Ramalan",
    "tab.insights": "Wawasan",
    "tab.alerts": "Amaran",
    "tab.dualLayer": "Lapisan Dual",
    "tab.governance": "Tadbir Urus",

    // Map
    "map.hoverResults": "Tahan pada sempadan untuk keputusan · Klik untuk pilih",
    "map.searchPlaceholder": "Cari DUN atau Parlimen…",
    "map.coalition": "Gabungan",
    "map.winner": "Pemenang",

    // Common
    "common.loading": "Memuatkan…",
    "common.export": "Eksport",
    "common.exportCsv": "Eksport CSV",
    "common.search": "Cari",
    "common.filter": "Tapis",
    "common.refresh": "Segarkan",
    "common.reset": "Set Semula",
    "common.close": "Tutup",
    "common.skip": "Langkau lawatan",
    "common.next": "Seterusnya",
    "common.back": "Kembali",
    "common.getStarted": "Mula",

    // Onboarding
    "onboarding.welcome.title": "Selamat Datang ke PIP-MLK",
    "onboarding.welcome.desc": "Platform Kecerdasan Politik untuk negeri Melaka. Kebenaran Di Atas Segalanya — 6 parlimen, 28 DUN, 3 pilihan raya dengan sempadan GeoJSON DOSM kawasanku sebenar.",
    "onboarding.maps.title": "Peta Interaktif 2D & 3D",
    "onboarding.maps.desc": "Terokai 28 sempadan DUN dan 6 parlimen Melaka pada peta 2D Leaflet atau peta 3D Three.js. Tahan untuk keputusan pilihan raya, klik untuk analisis terperinci.",
    "onboarding.elections.title": "Data Pilihan Raya Sebenar",
    "onboarding.elections.desc": "Keputusan GE14 (2018), PRN15 (2021), dan GE15 (2022) dari ElectionData.MY. Lihat pemenang, margin, perkongsian undi, dan analisis swing untuk setiap kerusi.",
    "onboarding.marginal.title": "Senarai Pantau Kerusi Marginal",
    "onboarding.marginal.desc": "6 kerusi DUN dengan margin kemenangan <5pp — kerusi paling kompetitif yang berkemungkinan bertukar tangan dalam PRN16. Disusun mengikut margin paling nipis dengan skor risiko.",
    "onboarding.s2d.title": "Enjin Kecerdasan S2D",
    "onboarding.s2d.desc": "Gelung 9-fasa Merasakan→Membuat Keputusan→Bertindak dengan enjin kecerdasan 56-halaman. Suapan isyarat masa nyata, simulasi senario, dan analitik ramalan.",
  },
};

// ─── Provider ──────────────────────────────────────────────────────────────

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Load saved locale from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("pip-mlk-locale") as Locale | null;
    if (saved === "en" || saved === "ms") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("pip-mlk-locale", l);
  };

  const t = (key: string, fallback?: string): string => {
    const dict = translations[locale];
    return dict[key] ?? fallback ?? translations.en[key] ?? key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback if used outside provider — return English
    return {
      locale: "en",
      setLocale: () => {},
      t: (key: string) => translations.en[key] ?? key,
    };
  }
  return ctx;
}

// ─── Language Toggle Component ─────────────────────────────────────────────

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <div className={`flex items-center gap-0.5 p-0.5 rounded-md bg-muted/40 border border-border/60 ${className ?? ""}`}>
      <button
        onClick={() => setLocale("en")}
        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
          locale === "en" ? "bg-mlk text-white" : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        onClick={() => setLocale("ms")}
        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
          locale === "ms" ? "bg-mlk text-white" : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Tukar ke Bahasa Malaysia"
      >
        BM
      </button>
    </div>
  );
}
