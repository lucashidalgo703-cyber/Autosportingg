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
    async redirects() {
        return [
            // Redirect /admin if someone hits the root without slash? No need, handled by Next router.
            // Good place for future 301 redirects
        ];
    },
};

export default nextConfig;
