"use client";

/**
 * TrustSection — "Enterprise Data Governance" section for the landing page.
 *
 * Three trust cards: PDPA Compliance, 3-Source Verification, Fully Auditable.
 * §11.5 i18n-wired (EN/BM).
 */
import { motion } from "framer-motion";
import { ShieldCheck, Database, Globe2, BadgeCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();

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
          <span>{t("landing.trustTitle")}</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold">
          <span className="bg-mlk-gradient bg-clip-text text-transparent">{t("landing.hero")}</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl mx-auto">
          {t("landing.trustSubtitle")}
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        <TrustCard
          icon={ShieldCheck}
          title={t("landing.pdpaTitle")}
          description={t("landing.pdpaDesc")}
          badge={t("trust.certified")}
          delay={0.1}
        />
        <TrustCard
          icon={Database}
          title={t("landing.verifiedTitle")}
          description={t("landing.verifiedDesc")}
          badge={t("trust.verified")}
          delay={0.2}
        />
        <TrustCard
          icon={Globe2}
          title={t("landing.auditableTitle")}
          description={t("landing.auditableDesc")}
          badge={t("trust.public")}
          delay={0.3}
        />
      </div>
    </section>
  );
}
