"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ShieldCheck, Globe2, Vote, Users, TrendingUp } from "lucide-react";
import { PARLIAMENTS, TOTAL_DUN, TOTAL_VOTERS_P134 } from "@/lib/melaka-constants";

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
    <div className="min-h-screen bg-background relative overflow-hidden">
      <canvas ref={particleCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-60" aria-hidden="true" />
      <div className="absolute inset-0 bg-mlk-radial pointer-events-none" aria-hidden="true" />
      <a href="#main" className="skip-link">Skip to main content</a>

      <main id="main" className="relative z-10 container mx-auto px-4 py-8 md:py-16">
        {/* Hero */}
        <section className="text-center mb-12 md:mb-20">
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

        {/* KPI strip */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12 md:mb-20" aria-label="Headline statistics">
          {[
            { label: "Parliaments", value: "6", icon: Globe2, hint: "P134–P139" },
            { label: "DUN seats", value: String(TOTAL_DUN), icon: Vote, hint: "N01–N28" },
            { label: "Total voters", value: TOTAL_VOTERS_P134.toLocaleString(), icon: Users, hint: "P134 verified" },
            { label: "Real GeoJSON", value: "28+6", icon: TrendingUp, hint: "DUN + parlimen" },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 + i * 0.08 }}>
              <Card className="border-mlk/20 hover:border-mlk/40 transition-colors hover-lift">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-md bg-mlk/10 text-mlk" aria-hidden="true"><kpi.icon className="h-5 w-5" /></div>
                  <div>
                    <div className="text-2xl font-bold leading-tight shimmer-text">{kpi.value}</div>
                    <div className="text-xs text-muted-foreground">{kpi.label}</div>
                    <div className="text-[10px] text-muted-foreground/70">{kpi.hint}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section>

        {/* Parliament list */}
        <section className="mb-12 md:mb-20" aria-labelledby="parl-h">
          <h2 id="parl-h" className="text-2xl md:text-3xl font-semibold mb-2 text-center">6 parliaments · 3 districts</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">Verified against DOSM kawasanku GeoJSON (2026 redelineation).</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {PARLIAMENTS.map((p) => (
              <Card key={p.code} className="border-mlk/10 hover-lift">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-mlk">P{p.code}</span>
                    <Badge variant="outline" className="text-[10px]">{p.district}</Badge>
                  </div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{p.dunCount} DUN · {p.totalVoters > 0 ? p.totalVoters.toLocaleString() + " voters" : "pending data"}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground border-t border-mlk/20 pt-6">
          <p className="mb-1"><strong className="text-mlk">PIP-MLK</strong> · Political Intelligence Platform · Melaka</p>
          <p>Real DOSM kawasanku GeoJSON · Leaflet 2D + Three.js 3D · PDPA Akta 709 compliant</p>
        </footer>
      </main>
    </div>
  );
}
