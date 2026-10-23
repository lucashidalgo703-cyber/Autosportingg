/** @type {import('next').NextConfig} */
const nextConfig = {
    trailingSlash: false,
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            }
        ],
    },
    async rewrites() {
        const backendPort = process.env.BACKEND_PORT || '3001';
        return [
            {
                source: '/api/:path*',
                destination: `http://127.0.0.1:${backendPort}/api/:path*`,
            },
        ];
    },
    async redirects() {
        return [
            // Redirect /admin if someone hits the root without slash? No need, handled by Next router.
            // Good place for future 301 redirects
        ];
    },
};

export default nextConfig;
