import CarDetail from '../../../views/CarDetail';

export async function generateMetadata({ params }) {
    const { id } = await params;
    try {
        let API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
            API_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
        } else if (process.env.VERCEL_URL) {
            API_URL = `https://${process.env.VERCEL_URL}`;
        }

        // Config fetch for SSR
        const res = await fetch(`${API_URL}/api/cars`, { cache: 'no-store' });
        const cars = await res.json();
        const car = cars.find(c => c._id === id || (c.id && c.id.toString() === id));

        if (car) {
            const imageUrl = car.coverImage || (car.images && car.images[0]);
            const ogImage = imageUrl && imageUrl.includes('cloudinary')
                ? imageUrl.replace('/upload/', '/upload/w_1200,h_630,c_pad,b_auto,q_auto,f_jpg/')
                : imageUrl;

            return {
                title: `${car.brand} ${car.name} | AutoSporting`,
                description: `Conocé este ${car.brand} ${car.name} ${car.year}. Kilometraje: ${car.km}km. Concesionaria en Comodoro Rivadavia.`,
                openGraph: {
                    type: 'website',
                    url: `https://autosportingg.com/auto/${id}`,
                    title: `${car.brand} ${car.name} | ${car.year}`,
                    description: `${car.condition} - ${car.km}km | AutoSporting`,
                    images: [
                        {
                            url: ogImage || 'https://autosportingg.com/autosporting-hero-v2.jpg',
                            width: 1200,
                            height: 630,
                        },
                    ],
                },
            };
        }
    } catch (error) {
        console.error("Error generating metadata in SSR:", error);
    }

    return {
        title: 'Detalle del Vehículo | AutoSporting',
    };
}

export default function AutoPage() {
    return <CarDetail />;
}
