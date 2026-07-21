"use client";

/**
 * TrustSection — "Enterprise Data Governance" section for the landing page.
 *
 * Three trust cards: PDPA Compliance, 3-Source Verification, Fully Auditable.
 */
import { motion } from "framer-motion";
import { ShieldCheck, Database, Globe2, BadgeCheck } from "lucide-react";

function TrustCard({
  icon: Icon,
  title,
  description,
  badge,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="glass rounded-xl p-6 card-glow"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-mlk/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-mlk" />
        </div>
        <span className="data-badge flex items-center gap-1">
          <BadgeCheck className="w-3 h-3" />
          {badge}
        </span>
      </div>
      <h3 className="text-base font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
}

export function TrustSection() {
  return (
    <section className="py-16 md:py-20" aria-label="Data governance and trust">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <div className="divider-label mb-4">
          <span>Enterprise Data Governance</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold">
          <span className="bg-mlk-gradient bg-clip-text text-transparent">Truth Above All.</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl mx-auto">
          Every data point is traceable, every transformation logged, every boundary verified against official gazettes.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        <TrustCard
          icon={ShieldCheck}
          title="PDPA Akta 709 Compliant"
          description="Zero individual voter data shipped. All analytics are aggregate-level only. The platform never exposes personal voter records."
          badge="Certified"
          delay={0.1}
        />
        <TrustCard
          icon={Database}
          title="3-Source Verification"
          description="DOSM kawasanku GeoJSON + SPR voter rolls + ElectionData.MY API — cross-referenced and verified at build time."
          badge="Verified"
          delay={0.2}
        />
        <TrustCard
          icon={Globe2}
          title="Fully Auditable"
          description="Complete build-time engine with open-source pipeline. Every transformation logged with provenance gates (8 of 9 closed)."
          badge="Public"
          delay={0.3}
        />
      </div>
    </section>
  );
}
