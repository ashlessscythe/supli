export const SITE_TIMEZONE_KEY = "SITE_TIMEZONE";
export const DEFAULT_SITE_TIMEZONE = "UTC";

export const SITE_TIMEZONE_DESCRIPTION =
  "IANA timezone used when displaying dates and times across the app";

/** Common IANA zones for the settings picker (full validation still accepts any valid zone). */
export const COMMON_TIME_ZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Warsaw",
  "Asia/Dubai",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
] as const;

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function resolveTimeZone(timeZone: string | null | undefined): string {
  if (timeZone && isValidTimeZone(timeZone)) return timeZone;
  return DEFAULT_SITE_TIMEZONE;
}

export function timeZoneOptionsForValue(current: string): string[] {
  const options = new Set<string>(COMMON_TIME_ZONES);
  if (current) options.add(current);
  return Array.from(options).sort((a, b) => a.localeCompare(b));
}
