"use client";

/**
 * EmptyState — enterprise-grade empty/error state component.
 *
 * Usage:
 *   <EmptyState icon={MapPin} title="No data available" description="..." />
 *   <EmptyState icon={AlertTriangle} title="Failed to load" description="..." action={{ label: "Retry", onClick: handleRetry }} />
 */
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  variant?: "default" | "error" | "warning";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "default",
}: EmptyStateProps) {
  const iconColor = variant === "error" ? "text-red-500" : variant === "warning" ? "text-amber-500" : "text-mlk";
  const bgTint = variant === "error" ? "bg-red-500/10" : variant === "warning" ? "bg-amber-500/10" : "bg-mlk/10";

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className={`w-16 h-16 rounded-2xl ${bgTint} flex items-center justify-center mb-4`}>
        <Icon className={`w-8 h-8 ${iconColor}`} />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
