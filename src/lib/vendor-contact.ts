const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isVendorEmail(contact: string | null | undefined): boolean {
  if (!contact) return false;
  return EMAIL_PATTERN.test(contact.trim());
}

export function normalizeWebsiteUrl(website: string): string {
  const trimmed = website.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
