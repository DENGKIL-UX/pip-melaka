"use client";

/**
 * §11.8: OnboardingTour — step-by-step guided tour for new users.
 *
 * Shows a floating spotlight overlay with step instructions.
 * Steps: Welcome → Map → Elections → Marginal Seats → S2D → Done
 *
 * Usage:
 *   <OnboardingTour onComplete={() => localStorage.setItem("onboarded", "1")} />
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft, CheckCircle2, MapPin, Vote, AlertTriangle, Brain } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const STEP_KEYS = [
  { icon: CheckCircle2, titleKey: "onboarding.welcome.title", descKey: "onboarding.welcome.desc", color: "#C77B2C" },
  { icon: MapPin, titleKey: "onboarding.maps.title", descKey: "onboarding.maps.desc", color: "#0ea5e9" },
  { icon: Vote, titleKey: "onboarding.elections.title", descKey: "onboarding.elections.desc", color: "#10B981" },
  { icon: AlertTriangle, titleKey: "onboarding.marginal.title", descKey: "onboarding.marginal.desc", color: "#EF4444" },
  { icon: Brain, titleKey: "onboarding.s2d.title", descKey: "onboarding.s2d.desc", color: "#8B5CF6" },
];

export function OnboardingTour({ onComplete }: { onComplete: () => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if not already onboarded
    if (typeof window === "undefined") return;
    const onboarded = localStorage.getItem("pip-mlk-onboarded");
    if (!onboarded) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (step < STEP_KEYS.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleComplete = () => {
    setVisible(false);
    localStorage.setItem("pip-mlk-onboarded", "1");
    onComplete();
  };

  const handleSkip = () => {
    setVisible(false);
    localStorage.setItem("pip-mlk-onboarded", "1");
    onComplete();
  };

  if (!visible) return null;

  const current = STEP_KEYS[step];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={handleSkip}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="glass rounded-2xl p-6 max-w-md w-[90vw] shadow-2xl"
        >
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-mlk hover:bg-mlk/10 transition-colors"
            aria-label="Skip tour"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Step icon */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: `${current.color}15` }}
          >
            <Icon className="w-8 h-8" style={{ color: current.color }} />
          </div>

          {/* Step content */}
          <h3 className="text-xl font-bold mb-2">{t(current.titleKey)}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            {t(current.descKey)}
          </p>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 mb-4">
            {STEP_KEYS.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === step ? "24px" : "8px",
                  backgroundColor: i === step ? current.color : "var(--muted-foreground)",
                  opacity: i <= step ? 1 : 0.3,
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Step {step + 1} of {STEP_KEYS.length}
            </span>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button variant="ghost" size="sm" onClick={handlePrev} className="text-xs">
                  <ChevronLeft className="h-3.5 w-3.5 me-1" />
                  Back
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleNext}
                className="bg-mlk text-white hover:bg-mlk/90 text-xs"
              >
                {step === STEP_KEYS.length - 1 ? t("common.getStarted", "Get Started") : t("common.next", "Next")}
                {step < STEP_KEYS.length - 1 && <ChevronRight className="h-3.5 w-3.5 ms-1" />}
              </Button>
            </div>
          </div>

          {/* Skip link */}
          <button
            onClick={handleSkip}
            className="w-full text-center text-[10px] text-muted-foreground hover:text-mlk mt-4 transition-colors"
          >
            Skip tour
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
