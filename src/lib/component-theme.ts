/**
 * §8.3: Component theme — shared variant definitions for PIP-MLK.
 *
 * Centralized class strings for cards, buttons, and badges to ensure
 * consistent styling across all tabs and modules.
 *
 * Usage:
 *   import { componentTheme } from "@/lib/component-theme";
 *   <div className={componentTheme.card.glass}>...</div>
 *   <Button className={componentTheme.button.primary}>Click</Button>
 */

export const componentTheme = {
  // Card variants
  card: {
    default: "bg-card border border-border/40 rounded-xl shadow-sm",
    glass: "glass rounded-xl",
    premium: "card-mlk-pro rounded-xl bg-card",
    interactive: "card-mlk-pro rounded-xl bg-card cursor-pointer",
  },

  // Button variants (supplements shadcn Button)
  button: {
    primary: "bg-mlk text-white hover:bg-mlk/90 shadow-sm hover:shadow-md",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-muted/60 hover:text-foreground",
    outline: "border border-border/60 hover:bg-muted/40 hover:border-mlk/30",
    mlk: "bg-gradient-to-r from-mlk to-mlk-amber-dark text-white shadow-sm",
  },

  // Badge variants
  badge: {
    default: "bg-mlk/10 text-mlk border-mlk/20",
    success: "bg-green-500/10 text-green-600 border-green-500/20",
    warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    danger: "bg-red-500/10 text-red-600 border-red-500/20",
  },

  // Animation durations
  animation: {
    fast: "150ms",
    normal: "250ms",
    slow: "400ms",
  },
} as const;
