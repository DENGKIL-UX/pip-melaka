"use client";

/**
 * PremiumCard — reusable card wrapper with hover lift, glow, and variants.
 *
 * Variants:
 *   - default: standard card with border + shadow
 *   - glass: glassmorphism (translucent + blur)
 *   - gradient: subtle MLK amber gradient background
 *
 * Usage:
 *   <PremiumCard variant="glass" hover>...</PremiumCard>
 *   <PremiumCard variant="gradient" onClick={handleClick}>...</PremiumCard>
 */
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PremiumCardProps {
  children: React.ReactNode;
  variant?: "default" | "glass" | "gradient";
  hover?: boolean;
  onClick?: () => void;
  className?: string;
}

export function PremiumCard({
  children,
  variant = "default",
  hover = true,
  onClick,
  className,
}: PremiumCardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
      onClick={onClick}
      className={cn(
        "rounded-xl transition-all duration-200 card-glow",
        variant === "default" && "bg-card border border-border/40 shadow-sm",
        variant === "glass" && "glass",
        variant === "gradient" && "bg-gradient-to-br from-card to-mlk/5 border border-mlk/10",
        hover && "cursor-pointer hover:shadow-lg hover:border-mlk/20",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
