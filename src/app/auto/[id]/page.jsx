import connectDB from '../../../config/db.js';
import Car from '../../../models/Car.js';
import CarDetail from '../../../views/CarDetail';

export async function generateMetadata({ params }) {
    const { id } = await params;
    try {
        await connectDB();
        const car = await Car.findById(id).lean();

        if (car) {
            const imageUrl = car.coverImage || (car.images && car.images[0]);
            const ogImage = imageUrl && imageUrl.includes('cloudinary')
                ? imageUrl.replace('/upload/', '/upload/w_1200,h_630,c_fill,g_auto,q_auto,f_jpg/')
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
