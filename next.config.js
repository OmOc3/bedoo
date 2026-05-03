/** @type {import('next').NextConfig} */
const nextConfig = {
  // Native bindings cannot be bundled by webpack; keep on the Node server runtime.
  serverExternalPackages: ["@resvg/resvg-js"],
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb"
    },
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 1,
    webpackBuildWorker: false
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "api.ecopest.com",
        pathname: "/**"
      }
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        // CSP is handled per-request in middleware.ts using a cryptographic nonce.
        // Do not add a static CSP here - it would overwrite the middleware header.
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }
        ]
      }
    ];
  },
  webpack(config, { dev }) {
    if (!dev && process.platform === "win32") {
      config.cache = false;
    }

    return config;
  }
};

module.exports = nextConfig;
