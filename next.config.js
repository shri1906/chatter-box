/** @type {import('next').NextConfig} */
const nextConfig = {
  // We use a custom server (server.js), so we disable the default one
  // This tells Next.js not to conflict with our Socket.io path
  webpack: (config) => {
    config.externals.push({ bufferutil: 'bufferutil', 'utf-8-validate': 'utf-8-validate' });
    return config;
  },
};

module.exports = nextConfig;
