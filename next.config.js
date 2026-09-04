/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow the backend origin during dev
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;