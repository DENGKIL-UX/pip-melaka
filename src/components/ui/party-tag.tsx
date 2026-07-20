"use client";

/**
 * Party-color Tag system — coalition/party tags with consistent colors,
 * checkable filter variant, and status variants.
 *
 * Inspired by Ant Design's Tag component (CheckableTag, status tags,
 * colorful preset tags). Built on shadcn/ui Badge with extended variants.
 *
 * Components:
 *   <PartyTag coalition="PH" />         — colored coalition tag
 *   <PartyTag party="UMNO" />           — colored party tag
 *   <CheckableTag checked onChange />   — toggle-able filter tag
 *   <StatusTag status="success" />      — status indicator tag
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PARTY_COLORS, partyColor } from "@/lib/party-colors";
import { PARTIES, COALITIONS, type PartyCode, type CoalitionCode } from "@/lib/party-metadata";

// ---------------------------------------------------------------------------
// PartyTag — displays a coalition or party name with its brand color
// ---------------------------------------------------------------------------

interface PartyTagProps {
  coalition?: CoalitionCode;
  party?: PartyCode;
  size?: "xs" | "sm" | "md";
  showLogo?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function PartyTag({ coalition, party, size = "sm", showLogo = false, className, children }: PartyTagProps) {
  let color: string;
  let label: string;

  if (party) {
    const meta = PARTIES[party];
    color = meta?.color ?? "#6B7280";
    label = meta?.name ?? party;
  } else if (coalition) {
    const meta = COALITIONS[coalition];
    color = meta?.color ?? PARTY_COLORS.BN;
    label = meta?.name ?? coalition;
  } else {
    color = "#6B7280";
    label = "—";
  }

  const sizeClasses = {
    xs: "text-[8px] px-1.5 py-0.5",
    sm: "text-[9px] px-2 py-0.5",
    md: "text-[10px] px-2.5 py-1",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold text-white",
        sizeClasses[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {children ?? label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// CheckableTag — toggle-able filter tag (clickable, shows checked state)
// ---------------------------------------------------------------------------

interface CheckableTagProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  color?: string;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export function CheckableTag({ checked, onChange, color, className, children, disabled }: CheckableTagProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all duration-200 focus-mlk",
        checked
          ? "text-white shadow-sm"
          : "text-muted-foreground border border-border/60 bg-muted/30 hover:bg-muted/60 hover:text-foreground",
        disabled && "opacity-40 cursor-not-allowed",
        className,
      )}
      style={checked ? { backgroundColor: color ?? "var(--color-mlk, #C77B2C)" } : undefined}
      aria-pressed={checked}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// StatusTag — status indicator with icon-like dot
// ---------------------------------------------------------------------------

type StatusType = "success" | "warning" | "error" | "info" | "processing" | "default";

const STATUS_CONFIG: Record<StatusType, { color: string; bg: string; border: string; text: string; dot: string }> = {
  success: { color: "#16a34a", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  warning: { color: "#d97706", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  error: { color: "#dc2626", bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-600 dark:text-red-300", dot: "bg-red-500" },
  info: { color: "#0ea5e9", bg: "bg-sky-500/10", border: "border-sky-500/30", text: "text-sky-700 dark:text-sky-300", dot: "bg-sky-500" },
  processing: { color: "#C77B2C", bg: "bg-mlk/10", border: "border-mlk/30", text: "text-mlk", dot: "bg-mlk" },
  default: { color: "#71717a", bg: "bg-muted", border: "border-border", text: "text-muted-foreground", dot: "bg-muted-foreground" },
};

interface StatusTagProps {
  status: StatusType;
  label?: string;
  pulse?: boolean;
  size?: "xs" | "sm";
  className?: string;
}

export function StatusTag({ status, label, pulse = false, size = "xs", className }: StatusTagProps) {
  const config = STATUS_CONFIG[status];
  const sizeClasses = size === "xs" ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-1";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        config.bg,
        config.border,
        config.text,
        sizeClasses,
        className,
      )}
    >
      <span
        className={cn("w-1.5 h-1.5 rounded-full", config.dot, pulse && "animate-pulse")}
        aria-hidden="true"
      />
      {label ?? status.toUpperCase()}
    </span>
  );
}

// ---------------------------------------------------------------------------
// CoalitionFilterBar — row of CheckableTags for filtering by coalition/party
// ---------------------------------------------------------------------------

interface CoalitionFilterBarProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

export function CoalitionFilterBar({ selected, onChange, className }: CoalitionFilterBarProps) {
  const coalitions: Array<{ code: CoalitionCode; label: string; color: string }> = [
    { code: "BN", label: "BN", color: PARTY_COLORS.BN },
    { code: "PH", label: "PH", color: PARTY_COLORS.PH },
    { code: "PN", label: "PN", color: PARTY_COLORS.PN },
  ];

  const toggle = (code: string) => {
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      <span className="text-[9px] text-muted-foreground uppercase tracking-wide me-1">Filter:</span>
      {coalitions.map((coal) => (
        <CheckableTag
          key={coal.code}
          checked={selected.includes(coal.code)}
          onChange={() => toggle(coal.code)}
          color={coal.color}
        >
          {coal.label}
        </CheckableTag>
      ))}
    </div>
  );
}
