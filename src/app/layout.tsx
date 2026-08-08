import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/lib/i18n";
import { HtmlLangSetter } from "./html-lang-setter";

// Geist font via next/font/google requires network fetch to fonts.googleapis.com.
// In offline CI / Cloudflare Workers build, the fetch can fail. Use a local fallback
// that provides the same CSS variables without network. The original Geist import is
// preserved in comments for reference:
// import { Geist, Geist_Mono } from "next/font/google";
// const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
// const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const geistSans = { variable: "font-geist-sans" } as const;
const geistMono = { variable: "font-geist-mono" } as const;

export const metadata: Metadata = {
  title: "PIP-MLK · Political Intelligence Platform · Melaka",
  description: "Truth Above All. A public-facing political intelligence dashboard for Melaka state — 6 parliaments, 28 DUN, 3 elections, real DOSM kawasanku GeoJSON.",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Polyfill: __name is an esbuild helper used by next-themes' inline
            anti-FOUC script. On CF Workers/OpenNext, the helper isn't available
            in the inline HTML script context, causing "ReferenceError: __name
            is not defined" which breaks the entire page. This no-op polyfill
            runs before the theme script and prevents the crash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: 'if(typeof window!=="undefined"&&typeof window.__name==="undefined"){window.__name=function(f){return f;};}',
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider>
            <HtmlLangSetter />
            {children}
            <Toaster />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
