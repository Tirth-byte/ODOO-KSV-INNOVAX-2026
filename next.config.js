const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /node_modules\/@protobufjs\/inquire/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ];
    return config;
  },
}
module.exports = nextConfig
