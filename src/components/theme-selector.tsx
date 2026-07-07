"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { THEMES, THEME_LABELS, type ThemeName } from "@/lib/themes";
import { setThemePreference } from "@/lib/actions/theme";

function applyTheme(theme: ThemeName) {
  const root = document.documentElement;

  if (theme === "system") {
    root.removeAttribute("data-theme");
    return;
  }

  if (theme === "day") {
    root.setAttribute("data-theme", "day");
    return;
  }

  if (theme === "night") {
    root.setAttribute("data-theme", "night");
    return;
  }

  root.setAttribute("data-theme", theme);
}

export function ThemeSelector() {
  const { setTheme, resolvedTheme } = useTheme();
  const { data: session } = useSession();
  const [current, setCurrent] = useState<ThemeName>("system");

  useEffect(() => {
    const stored = localStorage.getItem("supli-theme") as ThemeName | null;
    if (stored && THEMES.includes(stored)) {
      setCurrent(stored);
      applyTheme(stored);
      if (stored === "day") setTheme("light");
      else if (stored === "night") setTheme("dark");
      else if (stored === "system") setTheme("system");
      else setTheme("dark");
    }
  }, [setTheme]);

  async function selectTheme(theme: ThemeName) {
    setCurrent(theme);
    localStorage.setItem("supli-theme", theme);
    applyTheme(theme);

    if (theme === "day") setTheme("light");
    else if (theme === "night") setTheme("dark");
    else if (theme === "system") setTheme("system");
    else setTheme("dark");

    if (session?.user) {
      await setThemePreference(theme);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Select theme">
          <Palette className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEMES.map((theme) => (
          <DropdownMenuItem
            key={theme}
            onClick={() => selectTheme(theme)}
            className={
              current === theme ? "bg-accent text-accent-foreground" : ""
            }
          >
            {THEME_LABELS[theme]}
            {theme === "system" && resolvedTheme
              ? ` (${resolvedTheme})`
              : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
