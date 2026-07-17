"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * PIP-MLK theme toggle — cycles dark → light → system.
 * Renders a stable placeholder until mounted to avoid hydration mismatch.
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground"
        aria-label="Toggle theme"
        disabled
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const cycle = () => {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("system");
    else setTheme("dark");
  };

  const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";
  const label = theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light";
  const Icon = theme === "system" ? Monitor : isDark ? Moon : Sun;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      className="h-8 w-8 text-muted-foreground hover:text-mlk hover:bg-mlk/10"
      aria-label={`Toggle theme — currently ${label}`}
      title={`Theme: ${label} (click to cycle)`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
