import type { Metadata } from "next";

export const siteConfig = {
  name: "Supli Mart",
  title: "Supli Mart — Supplies Inventory Management",
  description:
    "Track supplies, approve requests, and run floor kiosk checkout. Vendor lead times, MOQ, and stock levels in one place.",
  shortDescription: "Track supplies, vendors, and stock levels",
  ogImage: "/landing/dashboard.png",
  ogImageAlt: "Supli Mart admin dashboard with supply stats and low-stock alerts",
  keywords: [
    "supplies inventory management",
    "supply request workflow",
    "vendor lead time",
    "MOQ tracking",
    "barcode kiosk",
    "stock level tracking",
    "inventory management software",
    "warehouse supplies",
  ],
} as const;

export function getSiteUrl(): string {
  const url = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return url.replace(/\/$/, "");
}

export const defaultMetadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.ogImage,
        alt: siteConfig.ogImageAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const homeMetadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: "/",
  },
};

export const homeJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: siteConfig.name,
      url: getSiteUrl(),
      description: siteConfig.description,
    },
    {
      "@type": "SoftwareApplication",
      name: siteConfig.name,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: siteConfig.description,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
  ],
};
