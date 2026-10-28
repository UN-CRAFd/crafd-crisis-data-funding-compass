"use client";

import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Avoid hydration mismatch – render a placeholder with same dimensions
    return (
      <Button
        variant="ghost"
        size="sm"
        className="rounded-md bg-transparent px-4 py-4 text-xs text-slate-700 sm:text-sm dark:text-slate-300"
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-md bg-transparent px-4 py-4 text-xs text-slate-700 transition hover:text-[var(--brand-primary)] focus:text-[var(--brand-primary)] sm:text-sm dark:text-slate-300 dark:hover:text-[var(--brand-primary)]"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
