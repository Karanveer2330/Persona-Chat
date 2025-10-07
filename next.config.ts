module.exports = {
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    // Optimize chunk splitting for better loading
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        three: {
          test: /[\\/]node_modules[\\/](three|@pixiv|kalidokit)[\\/]/,
          name: 'three',
          chunks: 'all',
          priority: 10,
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 5,
        },
      },
    };
    
    // Increase chunk size limit for large components
    config.performance = {
      maxAssetSize: 1000000,
      maxEntrypointSize: 1000000,
    };
    
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/messages/:path*',
        destination: 'https://localhost:3443/api/messages/:path*',
      },
    ];
  },
  // Allow cross-origin requests for development
  experimental: {
    allowedDevOrigins: [
      'https://localhost:3000',
      'https://localhost:3443',
      'https://192.168.1.8:3000',
      'https://192.168.1.8:3443',
    ]
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(self), display-capture=(self)'
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none'
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          }
        ]
      },
      {
        source: '/video-call',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(self), display-capture=(self)'
          }
        ]
      }
    ];
  }
};