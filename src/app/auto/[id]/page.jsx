import CarDetail from '../../../views/CarDetail';

export async function generateMetadata({ params }) {
    const { id } = await params;
    try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        // Config fetch for SSR
        const res = await fetch(`${API_URL}/api/cars`, { cache: 'no-store' });
        const cars = await res.json();
        const car = cars.find(c => c._id === id || (c.id && c.id.toString() === id));

        if (car) {
            const imageUrl = car.coverImage || (car.images && car.images[0]);
            const ogImage = imageUrl && imageUrl.includes('cloudinary')
                ? imageUrl.replace('/upload/', '/upload/w_1200,h_630,c_fill/')
                : imageUrl;

            return {
                title: `${car.brand} ${car.name} | AutoSporting`,
                description: `Conocé este ${car.brand} ${car.name} ${car.year} en excelentes condiciones. Kilometraje: ${car.km}km. Concesionaria en Comodoro Rivadavia.`,
                openGraph: {
                    title: `${car.brand} ${car.name} | ${car.year}`,
                    description: `Catálogo AutoSporting: ${car.condition} - ${car.km}km | Consultanos por financiación.`,
                    images: [
                        {
                            url: ogImage || '/autosporting-hero-v2.jpg',
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
