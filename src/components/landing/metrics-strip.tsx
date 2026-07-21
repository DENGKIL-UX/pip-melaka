"use client";

/**
 * MetricsStrip — horizontal animated metrics strip for the landing page.
 *
 * Shows 7 key metrics with scroll-triggered animations.
 * Replaces the current bento grid tiles with a cleaner, more scannable layout.
 */
import { motion } from "framer-motion";
import { MapPin, Building2, Vote, Users, Layers3, Activity, ShieldCheck } from "lucide-react";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { TOTAL_VOTERS_P134, TOTAL_DUN } from "@/lib/melaka-constants";

const METRICS = [
  { icon: MapPin, label: "Parliaments", value: 6, suffix: "" },
  { icon: Building2, label: "DUN Seats", value: TOTAL_DUN, suffix: "" },
  { icon: Vote, label: "Elections", value: 3, suffix: "" },
  { icon: Users, label: "Verified Voters", value: TOTAL_VOTERS_P134, suffix: "", format: true },
  { icon: Layers3, label: "GeoJSON Layers", value: 34, suffix: "" },
  { icon: Activity, label: "S2D Phases", value: 9, suffix: "" },
  { icon: ShieldCheck, label: "Gates Closed", value: 8, suffix: "/9" },
] as const;

export function MetricsStrip() {
  return (
    <section className="py-10 md:py-14" aria-label="Key metrics">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
        {METRICS.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="glass rounded-xl p-4 text-center card-glow"
            >
              <Icon className="w-5 h-5 text-mlk mx-auto mb-2" aria-hidden="true" />
              <div className="text-2xl font-bold tabular">
                <AnimatedCounter
                  value={m.value}
                  duration={1500 + i * 100}
                  groupSeparator={m.format ?? true}
                />
                {m.suffix}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
