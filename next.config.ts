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
        "vntk": "commonjs vntk",
        "crfsuite": "commonjs crfsuite",
        "node-pre-gyp": "commonjs node-pre-gyp",
        "fast-password-entropy": "commonjs fast-password-entropy",
      });
    }

    // Handle canvas dependency for pdf-parse
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };

    // Ignore HTML files in node_modules that webpack tries to parse
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.html$/,
      include: /node_modules/,
      use: 'ignore-loader',
    });

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
      'aws-sdk': false, // Prevent aws-sdk from being bundled for client-side
      'node-pre-gyp': false, // Prevent node-pre-gyp from being bundled
    };

    // Additional externals for server-side only dependencies  
    if (isServer) {
      config.externals.push({
        'sharp': 'commonjs sharp',
        'pdf2pic': 'commonjs pdf2pic',
        'aws-sdk': 'commonjs aws-sdk', // Handle node-pre-gyp dependency
      });
    }

    return config;
  },

  // Enable experimental features for better compatibility
  serverExternalPackages: ["pdf-parse", "pdf2pic", "sharp", "vntk", "crfsuite", "node-pre-gyp", "fast-password-entropy"],
  
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