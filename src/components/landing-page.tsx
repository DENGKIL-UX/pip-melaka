"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ShieldCheck, Globe2, Vote, Users, TrendingUp, MapPin, Building2, Layers3, Activity, ShieldAlert } from "lucide-react";
import { PARLIAMENTS, TOTAL_DUN, TOTAL_VOTERS_P134 } from "@/lib/melaka-constants";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { cn } from "@/lib/utils";

/**
 * Premium parliament card — adapted from uploaded premium-design
 * ParliamentCard.tsx, rebranded to MLK amber accent.
 *
 * Features: completeness bar, verified/pending status dot, hover lift,
 * monospace data row, click-to-enter.
 */
function PremiumParliamentCard({
  code,
  name,
  district,
  dunCount,
  voters,
  verified,
  delay,
  onClick,
}: {
  code: string;
  name: string;
  district: string;
  dunCount: number;
  voters: number | null;
  verified: boolean;
  delay: number;
  onClick: () => void;
}) {
  const completeness = verified ? 100 : 0;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cn(
        "group relative w-full text-left cursor-pointer",
        "rounded-xl overflow-hidden",
        "bg-card border border-mlk/10",
        "hover:border-mlk/30",
        "transition-all duration-300",
        "shadow-sm hover:shadow-mlk",
        "p-5 focus-mlk"
      )}
      aria-label={`Enter dashboard — ${name} (P${code})`}
    >
      {/* Top gradient line — verified vs pending */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-px",
          verified
            ? "bg-gradient-to-r from-emerald-500/50 via-emerald-400/20 to-transparent"
            : "bg-gradient-to-r from-amber-500/50 via-amber-400/20 to-transparent"
        )}
        aria-hidden="true"
      />

      {/* Hover glow */}
      <div
        className="absolute -inset-px bg-gradient-to-r from-mlk/0 via-mlk/5 to-mlk/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-mlk bg-mlk/10 px-2 py-0.5 rounded">
                P{code}
              </span>
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  verified ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                )}
                aria-label={verified ? "Verified data" : "Pending data"}
              />
            </div>
            <h3 className="mt-2 text-base font-semibold group-hover:text-mlk transition-colors">
              {name}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" aria-hidden="true" />
              {district}
            </p>
          </div>
          <ChevronRight
            className="w-4 h-4 text-muted-foreground group-hover:text-mlk group-hover:translate-x-1 transition-all"
            aria-hidden="true"
          />
        </div>

        {/* Data completeness bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>Data completeness</span>
            <span className="font-mono">{completeness}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completeness}%` }}
              transition={{ duration: 1, delay: delay + 0.3, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full",
                verified
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                  : "bg-gradient-to-r from-amber-500 to-amber-400"
              )}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="font-mono text-sm">{dunCount}</span>
            <span className="text-[10px] text-muted-foreground">DUN</span>
          </div>
          <div className="w-px h-3 bg-border" aria-hidden="true" />
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            {voters ? (
              <span className="font-mono text-sm">{voters.toLocaleString()}</span>
            ) : (
              <span className="font-mono text-sm text-muted-foreground">—</span>
            )}
            <span className="text-[10px] text-muted-foreground">voters</span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

/**
 * BentoHero — asymmetric bento grid for the landing hero.
 *
 * Featured large tile (verified data map) + 4 summary tiles.
 * Adapted from uploaded premium-design BentoHero.tsx, rebranded MLK amber.
 */
function BentoHero({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {/* Large featured card — spans 2 cols × 2 rows */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="col-span-2 md:row-span-2 relative overflow-hidden rounded-2xl border border-mlk/20 bg-mlk-radial p-6 md:p-8 flex flex-col justify-between min-h-[280px]"
      >
        {/* Animated background blobs */}
        <div className="absolute inset-0 opacity-40 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 right-0 w-64 h-64 bg-mlk/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-mlk/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-mlk" aria-hidden="true" />
            <span className="text-xs font-medium text-mlk tracking-wider uppercase">
              Verified Data
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            DOSM kawasanku
            <span className="shimmer-text"> GeoJSON</span>
          </h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Real boundary data from Department of Statistics Malaysia.
            2026 redelineation verified against official gazette.
          </p>
        </div>

        <div className="relative z-10 flex items-end gap-4 md:gap-6 mt-6">
          <div>
            <div className="font-mono text-3xl md:text-4xl font-bold">
              <AnimatedCounter value={6} duration={1400} groupSeparator={false} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">Parliaments</div>
          </div>
          <div className="w-px h-10 bg-border" aria-hidden="true" />
          <div>
            <div className="font-mono text-3xl md:text-4xl font-bold">
              <AnimatedCounter value={TOTAL_DUN} duration={1600} groupSeparator={false} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">DUN Seats</div>
          </div>
          <div className="w-px h-10 bg-border" aria-hidden="true" />
          <div>
            <div className="font-mono text-3xl md:text-4xl font-bold">
              <AnimatedCounter value={3} duration={1800} groupSeparator={false} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">Elections</div>
          </div>
        </div>
      </motion.div>

      {/* Smaller summary tiles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-xl border border-mlk/10 bg-card p-4 md:p-5 hover:border-mlk/30 transition-colors hover-lift"
      >
        <div className="flex items-center gap-2 mb-2">
          <Layers3 className="w-4 h-4 text-mlk" aria-hidden="true" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">GeoJSON</span>
        </div>
        <div className="font-mono text-2xl font-bold">
          <AnimatedCounter value={28} groupSeparator={false} />+<AnimatedCounter value={6} groupSeparator={false} />
        </div>
        <div className="text-xs text-muted-foreground mt-1">DUN + parlimen layers</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="rounded-xl border border-mlk/10 bg-card p-4 md:p-5 hover:border-mlk/30 transition-colors hover-lift"
      >
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-mlk" aria-hidden="true" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Voters</span>
        </div>
        <div className="font-mono text-2xl font-bold">
          <AnimatedCounter value={TOTAL_VOTERS_P134} duration={2200} />
        </div>
        <div className="text-xs text-muted-foreground mt-1">P134 verified</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-xl border border-mlk/10 bg-card p-4 md:p-5 hover:border-mlk/30 transition-colors hover-lift"
      >
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-mlk" aria-hidden="true" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">S2D Loop</span>
        </div>
        <div className="font-mono text-2xl font-bold text-mlk">
          <AnimatedCounter value={9} groupSeparator={false} />
        </div>
        <div className="text-xs text-muted-foreground mt-1">phases · sensing→acting</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="rounded-xl border border-mlk/10 bg-card p-4 md:p-5 hover:border-mlk/30 transition-colors hover-lift"
      >
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="w-4 h-4 text-mlk" aria-hidden="true" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Provenance</span>
        </div>
        <div className="font-mono text-2xl font-bold">
          <AnimatedCounter value={8} groupSeparator={false} />/<AnimatedCounter value={9} groupSeparator={false} />
        </div>
        <div className="text-xs text-muted-foreground mt-1">gates closed</div>
      </motion.div>
    </div>
  );
}

export function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [showHero, setShowHero] = useState(false);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowHero(true);
  }, []);

  // Particle network background
  useEffect(() => {
    if (!particleCanvasRef.current) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;
    const canvas = particleCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => { canvas.width = canvas.offsetWidth * 2; canvas.height = canvas.offsetHeight * 2; };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 1,
    }));

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(199, 123, 44, 0.6)";
        ctx.fill();
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 180) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(199, 123, 44, ${0.15 * (1 - d / 180)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <canvas ref={particleCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-60" aria-hidden="true" />
      <div className="absolute inset-0 bg-mlk-radial pointer-events-none" aria-hidden="true" />
      <a href="#main" className="skip-link">Skip to main content</a>

      <main id="main" className="relative z-10 container mx-auto px-4 py-8 md:py-12 flex-1">
        {/* Hero */}
        <section className="text-center mb-10 md:mb-14">
          <AnimatePresence>
            {showHero && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <Badge variant="outline" className="mb-4 border-mlk/40 text-mlk bg-mlk/5">
                  <ShieldCheck className="h-3 w-3 me-1" aria-hidden="true" />
                  PIP-MLK · Political Intelligence Platform · Melaka
                </Badge>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-balance">
                  <span className="bg-mlk-gradient bg-clip-text text-transparent text-mlk-glow">Truth Above All.</span>
                </h1>
                <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
                  A public-facing political intelligence dashboard for Melaka state — 6 parliaments, 28 DUN, 3 elections. Real DOSM kawasanku GeoJSON boundaries. Build-time engine demographics. No PDPA-sensitive data ever shipped.
                </p>
                <div className="mt-8 flex flex-wrap gap-3 justify-center">
                  <Button size="lg" onClick={onEnter} className="bg-mlk text-white hover:bg-mlk-amber-dark text-base h-12 px-8" aria-label="Enter the PIP-MLK dashboard">
                    Enter Dashboard <ChevronRight className="h-4 w-4 ms-1" aria-hidden="true" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Bento hero grid */}
        <section className="mb-12 md:mb-16" aria-label="Headline statistics">
          <BentoHero onEnter={onEnter} />
        </section>

        {/* Parliament list */}
        <section className="mb-12 md:mb-16" aria-labelledby="parl-h">
          <div className="flex items-end justify-between mb-6 flex-wrap gap-2">
            <div>
              <h2 id="parl-h" className="text-2xl md:text-3xl font-semibold">6 parliaments · 3 districts</h2>
              <p className="text-sm text-muted-foreground mt-1">Verified against DOSM kawasanku GeoJSON (2026 redelineation).</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
              <span>1/6 verified</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {PARLIAMENTS.map((p, i) => (
              <PremiumParliamentCard
                key={p.code}
                code={p.code}
                name={p.name}
                district={p.district}
                dunCount={p.dunCount}
                voters={p.totalVoters > 0 ? p.totalVoters : null}
                verified={p.code === "134"}
                delay={i * 0.05}
                onClick={onEnter}
              />
            ))}
          </div>
        </section>
      </main>

      {/* Footer — sticky to bottom */}
      <footer className="relative z-10 text-center text-xs text-muted-foreground border-t border-mlk/20 py-6 mt-auto">
        <p className="mb-1"><strong className="text-mlk">PIP-MLK</strong> · Political Intelligence Platform · Melaka</p>
        <p>Real DOSM kawasanku GeoJSON · Leaflet 2D + Three.js 3D · PDPA Akta 709 compliant</p>
      </footer>
    </div>
  );
}
