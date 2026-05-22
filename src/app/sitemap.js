export default async function sitemap() {
    const baseUrl = 'https://autosportingg.com';

    // Rutas estáticas principales
    const staticRoutes = [
        '',
        '/catalogo',
        '/nosotros',
        '/contacto',
        '/financiacion',
        '/favoritos'
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date().toISOString(),
        changeFrequency: route === '/catalogo' ? 'daily' : 'weekly',
        priority: route === '' ? 1 : 0.8,
    }));

    // Rutas dinámicas para cada vehículo
    let carRoutes = [];
    try {
        let API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
            API_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
        } else if (process.env.VERCEL_URL) {
            API_URL = `https://${process.env.VERCEL_URL}`;
        }

        const res = await fetch(`${API_URL}/api/cars`, { next: { revalidate: 3600 } });
        if (res.ok) {
            const cars = await res.json();
            carRoutes = cars.map((car) => ({
                url: `${baseUrl}/auto/${car._id}`,
                lastModified: car.updatedAt || new Date().toISOString(),
                changeFrequency: 'weekly',
                priority: 0.9,
            }));
        }
    } catch (error) {
        console.error("Sitemap generation error:", error);
    }

    return [...staticRoutes, ...carRoutes];
}
