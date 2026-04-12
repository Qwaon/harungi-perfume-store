/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/harungi-perfume-store',
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
