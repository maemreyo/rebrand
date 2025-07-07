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
        "pdf2pic": "commonjs pdf2pic",
        "sharp": "commonjs sharp",
      });
    }

    // Handle canvas dependency for pdf-parse
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };

    // Handle fs dependency and other Node.js specific modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      stream: false,
      util: false,
      buffer: false,
      events: false,
      string_decoder: false,
    };

    // Handle sharp and pdf2pic dependencies
    if (isServer) {
      config.externals.push({
        'sharp': 'commonjs sharp',
        'pdf2pic': 'commonjs pdf2pic'
      });
    }

    return config;
  },

  // Enable experimental features for better compatibility
  serverExternalPackages: ["pdf-parse", "pdf2pic", "sharp"],
  
  // Handle image domains for processing
  images: {
    // Data URLs (base64 images) don't require remotePatterns configuration
    // They are handled directly by Next.js Image component with unoptimized prop
    remotePatterns: [
      // Add any external image domains here if needed
      // Example:
      // {
      //   protocol: 'https',
      //   hostname: 'example.com',
      //   port: '',
      //   pathname: '/**',
      // },
    ],
  },
};

export default nextConfig;