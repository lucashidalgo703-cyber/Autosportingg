/** @type {import('next').NextConfig} */

function resolveBackendPort(port) {
    if (port === undefined || port === null || port === '') return 3001;
    const num = Number.parseInt(String(port), 10);
    if (Number.isInteger(num) && num >= 1024 && num <= 65535) {
        return num;
    }
    return null;
}

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
        // Enrutamiento local de /api/* restringido estrictamente a la demostración local
        // Desactivado por defecto. Prohibido en Vercel y entornos fuera de la demo.
        const isDemo = process.env.AUTOSPORTING_SECURITY_DEMO === '1';
        const isVercel = Boolean(process.env.VERCEL);

        if (isDemo && !isVercel) {
            const validPort = resolveBackendPort(process.env.BACKEND_PORT);
            if (validPort) {
                return {
                    // Fallback: solo reescribe si Next.js no tiene una ruta App Router propia
                    // (preserva /api/admin/infracciones, /api/admin/pedidos, /api/admin/telefonos, /api/test-sales)
                    fallback: [
                        {
                            source: '/api/:path*',
                            destination: `http://127.0.0.1:${validPort}/api/:path*`,
                        },
                    ],
                };
            }
        }

        // Comportamiento normal fuera de la demostración: sin rewrites locales
        return [];
    },
    async redirects() {
        return [
            // Redirect /admin if someone hits the root without slash? No need, handled by Next router.
            // Good place for future 301 redirects
        ];
    },
};

export default nextConfig;
