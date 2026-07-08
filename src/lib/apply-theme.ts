import type { ThemeName } from "@/lib/themes";

export function applyTheme(theme: ThemeName) {
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
