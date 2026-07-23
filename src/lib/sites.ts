/** Default site created by migration / seed for existing single-tenant data. */
export const MAIN_SITE_SLUG = "main";
export const MAIN_SITE_NAME = "Main";

/** Cookie holding the site a SUPERADMIN is currently operating in. */
export const ACTIVE_SITE_COOKIE = "supli_active_site_id";

/** Cookie holding the site id for an authenticated kiosk session. */
export const KIOSK_SITE_COOKIE = "supli_kiosk_site_id";

export function kioskUsernameForSlug(slug: string): string {
  return `kiosk-${slug}`;
}

export function isKioskUsername(username: string): boolean {
  return username.startsWith("kiosk-");
}
