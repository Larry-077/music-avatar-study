/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack configuration (empty for now, can be extended if needed)
  turbopack: {},

  // Keep webpack config for fallback (if explicitly using --webpack flag)
  webpack: (config) => {
    // Support for gif.js workers
    config.module.rules.push({
      test: /\.worker\.js$/,
      use: { loader: 'worker-loader' },
    });
    return config;
  },
};

export default nextConfig;
