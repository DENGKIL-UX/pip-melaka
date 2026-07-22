"use client";

/**
 * MetricsStrip — horizontal animated metrics strip for the landing page.
 *
 * Shows 7 key metrics with scroll-triggered animations.
 * §11.5 i18n-wired (EN/BM).
 */
import { motion } from "framer-motion";
import { MapPin, Building2, Vote, Users, Layers3, Activity, ShieldCheck } from "lucide-react";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { TOTAL_VOTERS_P134, TOTAL_DUN } from "@/lib/melaka-constants";
import { useI18n } from "@/lib/i18n";

type MetricKey =
  | "metrics.parliaments"
  | "metrics.dunSeats"
  | "metrics.elections"
  | "metrics.verifiedVoters"
  | "metrics.geojsonLayers"
  | "metrics.s2dPhases"
  | "metrics.gatesClosed";

const METRICS: ReadonlyArray<{
  icon: React.ComponentType<{ className?: string }>;
  labelKey: MetricKey;
  value: number;
  suffix: string;
  format?: boolean;
}> = [
  { icon: MapPin, labelKey: "metrics.parliaments", value: 6, suffix: "" },
  { icon: Building2, labelKey: "metrics.dunSeats", value: TOTAL_DUN, suffix: "" },
  { icon: Vote, labelKey: "metrics.elections", value: 3, suffix: "" },
  { icon: Users, labelKey: "metrics.verifiedVoters", value: TOTAL_VOTERS_P134, suffix: "", format: true },
  { icon: Layers3, labelKey: "metrics.geojsonLayers", value: 34, suffix: "" },
  { icon: Activity, labelKey: "metrics.s2dPhases", value: 9, suffix: "" },
  { icon: ShieldCheck, labelKey: "metrics.gatesClosed", value: 8, suffix: "/9" },
];

export function MetricsStrip() {
  const { t } = useI18n();

  return (
    <section className="py-10 md:py-14" aria-label="Key metrics">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
        {METRICS.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.labelKey}
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
              <div className="text-xs text-muted-foreground mt-1">{t(m.labelKey)}</div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
