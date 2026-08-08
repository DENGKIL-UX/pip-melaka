"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * HtmlLangSetter
 * Dynamically sets <html lang="en" | "ms"> based on the active locale.
 * Improves SEO + screen-reader accuracy (P3 i18n item).
 */
export function HtmlLangSetter() {
  const { locale } = useI18n();

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return null;
}
