"use client";

/**
 * SiteFooter — enterprise SaaS footer with brand, links, and legal sections.
 */
import { ShieldCheck, Database, Globe2 } from "lucide-react";

export function SiteFooter() {
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
              Political Intelligence Platform for Melaka State. Truth Above All.
            </p>
            <div className="flex items-center gap-2 mt-4 text-[10px] text-muted-foreground">
              <span className="pulse-dot" aria-hidden="true" />
              <span>All systems operational</span>
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-foreground/80 hover:text-mlk transition-colors">Dashboard</a></li>
              <li><a href="#" className="text-foreground/80 hover:text-mlk transition-colors">2D Map</a></li>
              <li><a href="#" className="text-foreground/80 hover:text-mlk transition-colors">3D Map</a></li>
              <li><a href="#" className="text-foreground/80 hover:text-mlk transition-colors">S2D Intelligence</a></li>
            </ul>
          </div>

          {/* Data sources */}
          <div>
            <h4 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Database className="w-3 h-3" /> Data Sources
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
            <h4 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-foreground/80 hover:text-mlk transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-foreground/80 hover:text-mlk transition-colors">PDPA Akta 709</a></li>
              <li><a href="#" className="text-foreground/80 hover:text-mlk transition-colors">Data Governance</a></li>
              <li><a href="#" className="text-foreground/80 hover:text-mlk transition-colors">Terms of Use</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/40 text-center text-xs text-muted-foreground">
          <p className="mb-1">
            <strong className="text-mlk">PIP-MLK</strong> v1.0.0 — Built with Next.js 16 + Cloudflare Workers + Three.js + Leaflet.
          </p>
          <p>
            Data sourced from DOSM kawasanku (2026 redelineation) · ElectionData.MY (CC0) · Real DOSM kawasanku GeoJSON · PDPA Akta 709 compliant
          </p>
        </div>
      </div>
    </footer>
  );
}
