/** @type {import('next').NextConfig} */
const { spawnSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const withSerwistInit = require("@serwist/next").default;

function serverActionAllowedOrigins() {
  const origins = new Set();

  for (const value of [process.env.AUTH_URL, process.env.NEXTAUTH_URL]) {
    if (!value) continue;
    try {
      origins.add(new URL(value).hostname);
    } catch {
      // ignore invalid URL at build time
    }
  }

  for (const origin of (process.env.SERVER_ACTIONS_ALLOWED_ORIGINS ?? "").split(
    ","
  )) {
    const trimmed = origin.trim();
    if (trimmed) origins.add(trimmed);
  }

  return [...origins];
}

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  disable: process.env.NODE_ENV === "development",
});

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // camera=self enables optional in-app barcode scanning on supported devices
    value: "camera=(self), microphone=(), geolocation=()",
  },
];

const nextConfig = {
  experimental: {
    serverActions: {
      // Cloudflare/Koyeb proxy: browser Origin is the public domain while
      // x-forwarded-host is the Koyeb app hostname.
      allowedOrigins: serverActionAllowedOrigins(),
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = withSerwist(nextConfig);
