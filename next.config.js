/** @type {import('next').NextConfig} */

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

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
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

module.exports = nextConfig;
