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
    async rewrites() {
        // En Vercel o builds estándar de producción, se conserva el enrutamiento existente
        // de la plataforma (vercel.json) sin emitir destinos a localhost.
        // El proxy de Next solo se habilita mediante configuración explícita para montaje local desacoplado.
        const isVercel = Boolean(process.env.VERCEL);
        const enableLocalProxy = (process.env.ENABLE_LOCAL_PROXY === 'true' || process.env.LOCAL_DECOUPLED_PROXY === 'true') && !isVercel;

        if (!enableLocalProxy) {
            return [];
        }

        const backendUrl = process.env.LOCAL_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        return [
            {
                source: '/api/:path*',
                destination: `${backendUrl}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;
