"use client";

/**
 * Segmented control — iOS-style segmented toggle with sliding indicator.
 *
 * Inspired by Ant Design's Segmented component. Provides a clean, modern
 * alternative to radio buttons or tab toggles. The active segment has a
 * sliding pill background that animates between options.
 *
 * Usage:
 *   <Segmented
 *     value={view}
 *     onChange={setView}
 *     options={[
 *       { value: "parliament", label: "Parliament", icon: Building2 },
 *       { value: "dun", label: "DUN" },
 *     ]}
 *   />
 */

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  size?: "sm" | "md";
  variant?: "default" | "mlk";
  className?: string;
  fullWidth?: boolean;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "sm",
  variant = "mlk",
  className,
  fullWidth = false,
}: SegmentedProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  // Calculate the sliding indicator position based on the active option
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const buttons = container.querySelectorAll<HTMLButtonElement>("[data-segment-btn]");
    const activeIdx = options.findIndex((opt) => opt.value === value);
    if (activeIdx === -1 || !buttons[activeIdx]) return;
    const activeBtn = buttons[activeIdx];
    setIndicatorStyle({
      left: activeBtn.offsetLeft,
      width: activeBtn.offsetWidth,
    });
  }, [value, options]);

  const sizeClasses = size === "sm" ? "text-xs h-8" : "text-sm h-10";
  const paddingClasses = size === "sm" ? "px-3 py-1.5" : "px-4 py-2";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative inline-flex items-center rounded-lg bg-muted/50 border border-border/60 p-0.5",
        fullWidth && "w-full flex",
        sizeClasses,
        className,
      )}
      role="tablist"
    >
      {/* Sliding indicator */}
      <div
        className="absolute rounded-md transition-all duration-300 ease-out"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
          top: 2,
          bottom: 2,
          backgroundColor: variant === "mlk" ? "var(--color-mlk, #C77B2C)" : "var(--background)",
          boxShadow: variant === "mlk"
            ? "0 1px 3px rgba(199, 123, 44, 0.3)"
            : "0 1px 2px rgba(0, 0, 0, 0.08)",
        }}
        aria-hidden="true"
      />
      {/* Options */}
      {options.map((opt) => {
        const isActive = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            data-segment-btn
            role="tab"
            aria-selected={isActive}
            disabled={opt.disabled}
            onClick={() => !opt.disabled && onChange(opt.value)}
            className={cn(
              "relative z-10 flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors duration-200",
              paddingClasses,
              fullWidth && "flex-1",
              isActive
                ? variant === "mlk"
                  ? "text-white"
                  : "text-foreground"
                : "text-muted-foreground hover:text-foreground",
              opt.disabled && "opacity-40 cursor-not-allowed",
              "focus-mlk",
            )}
          >
            {Icon && <Icon className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
