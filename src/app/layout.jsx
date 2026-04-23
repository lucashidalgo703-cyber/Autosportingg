import '../styles/index.css';
import ClientProviders from '../components/ClientProviders';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import WhatsAppButton from '../components/WhatsAppButton';
import Preloader from '../components/Preloader';
import { Analytics } from '@vercel/analytics/react';

export const metadata = {
    metadataBase: new URL('https://autosportingg.com'),
    title: {
        default: 'AutoSporting | Agencia de Autos en Comodoro Rivadavia',
        template: '%s | AutoSporting'
    },
    description: '¿Buscás agencia de autos en Comodoro Rivadavia? Encontrá tu próximo vehículo usado o 0km en AutoSporting. Excelente financiación y toma de usados.',
    keywords: ['agencia de autos comodoro rivadavia', 'concesionaria de autos comodoro rivadavia', 'autos usados comodoro', 'venta de autos chubut', 'autos 0km comodoro'],
    icons: {
        icon: '/favicon.svg',
    },
    openGraph: {
        type: 'website',
        siteName: 'AutoSporting',
    }
};

export default function RootLayout({ children }) {
    return (
        <html lang="es">
            <body suppressHydrationWarning>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "AutoDealer",
                            "name": "AutoSporting",
                            "url": "https://autosportingg.com",
                            "telephone": "+5492974045378",
                            "address": {
                                "@type": "PostalAddress",
                                "addressLocality": "Comodoro Rivadavia",
                                "addressRegion": "Chubut",
                                "addressCountry": "AR"
                            },
                            "description": "Tu agencia de autos de confianza en Comodoro Rivadavia. Amplio catálogo de vehículos usados seleccionados y 0km. Ofrecemos financiación y tomamos usados.",
                            "image": "https://autosportingg.com/autosporting-hero-v2.jpg",
                            "geo": {
                                "@type": "GeoCoordinates",
                                "latitude": "-45.864130",
                                "longitude": "-67.496560"
                            },
                            "openingHoursSpecification": [
                                {
                                    "@type": "OpeningHoursSpecification",
                                    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                                    "opens": "09:00",
                                    "closes": "19:00"
                                },
                                {
                                    "@type": "OpeningHoursSpecification",
                                    "dayOfWeek": "Saturday",
                                    "opens": "09:00",
                                    "closes": "13:00"
                                }
                            ]
                        })
                    }}
                />
                <ClientProviders>
                    <div className="app">
                        <Preloader />
                        <Navbar />
                        <WhatsAppButton />
                        {children}
                        <Footer />
                        <Analytics />
                    </div>
                </ClientProviders>
            </body>
        </html>
    );
}
