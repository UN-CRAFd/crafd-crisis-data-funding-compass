/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure all routes end with a trailing slash (consistent canonical URLs)
  trailingSlash: true,

  // Keep d3 and d3-org-chart on the server bundle — they use Node.js APIs
  // that break when bundled for the browser edge runtime
  serverExternalPackages: ["d3-org-chart", "d3"],

  // Remove the "X-Powered-By: Next.js" header to reduce fingerprinting
  poweredByHeader: false,

  async headers() {
    const securityHeaders = [
      // Allows the browser to pre-resolve DNS for linked domains (perf)
      { key: "X-DNS-Prefetch-Control", value: "on" },

      // Tells browsers to only connect over HTTPS for the next 2 years;
      // includeSubDomains + preload enables HSTS preload list eligibility.
      // Vercel already redirects HTTP→HTTPS, but this header reinforces it.
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },

      // Prevents browsers from MIME-sniffing a response away from its declared
      // Content-Type (guards against content injection attacks)
      { key: "X-Content-Type-Options", value: "nosniff" },

      // Explicitly disables browser APIs the app doesn't use
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      },
    ];

    return [
      {
        // Apply security headers to every route
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Cache logo images aggressively — they are content-hashed and never change
        source: "/logos/:path*",
        headers: [
          ...securityHeaders,
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
