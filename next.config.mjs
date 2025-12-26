/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  serverExternalPackages: ['d3-org-chart', 'd3'],
};

export default nextConfig;
