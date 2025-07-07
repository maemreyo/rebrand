import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    // Handle pdf-parse library issues
    if (isServer) {
      config.externals = config.externals || [];

      // Don't bundle pdf-parse for server-side
      config.externals.push({
        "pdf-parse": "commonjs pdf-parse",
      });
    }

    // Handle canvas dependency for pdf-parse
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };

    // Handle fs dependency
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    return config;
  },

  // Enable experimental features for better compatibility
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
