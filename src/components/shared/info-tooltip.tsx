"use client";

/**
 * InfoTooltip — small help icon with rich tooltip content.
 *
 * Addresses VLM audit finding: "S2D Loop" and "Provenance gates" are cryptic
 * to users without context. This component wraps any jargon term with a
 * hover/focus tooltip that explains it.
 *
 * Uses shadcn Tooltip (Radix UI) for accessibility:
 * - Keyboard focusable (Tab to focus, tooltip appears)
 * - Screen reader announces content via aria-describedby
 * - Dismissible on Escape (Radix default)
 */

import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: React.ReactNode;
  label?: string; // sr-only label for the trigger
  className?: string;
  iconClassName?: string;
  side?: "top" | "bottom" | "left" | "right";
}

export function InfoTooltip({
  content,
  label = "More information",
  className,
  iconClassName,
  side = "top",
}: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-full p-0.5",
            "text-muted-foreground hover:text-mlk transition-colors",
            "focus-mlk",
            className
          )}
          aria-label={label}
        >
          <HelpCircle className={cn("h-3.5 w-3.5", iconClassName)} aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={6}
        className="max-w-xs bg-popover text-popover-foreground border border-mlk/20 shadow-lg rounded-lg p-3 text-xs leading-relaxed"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
