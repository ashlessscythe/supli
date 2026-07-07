export const THEMES = ["system", "day", "night", "corporate", "cyberpunk"] as const;
export type ThemeName = (typeof THEMES)[number];

export const THEME_LABELS: Record<ThemeName, string> = {
  system: "System",
  day: "Day",
  night: "Night",
  corporate: "Corporate",
  cyberpunk: "Cyberpunk",
};

export function isValidTheme(value: string): value is ThemeName {
  return THEMES.includes(value as ThemeName);
}
