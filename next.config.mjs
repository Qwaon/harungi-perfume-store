/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/harungi-perfume-store',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
