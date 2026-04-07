import '../styles/index.css';
import ClientProviders from '../components/ClientProviders';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import WhatsAppButton from '../components/WhatsAppButton';
import Preloader from '../components/Preloader';
import { Analytics } from '@vercel/analytics/react';

export const metadata = {
    metadataBase: new URL('https://autosportingg.com'),
    title: 'AutoSporting',
    description: 'Elegí con seguridad. Conducí con confianza. Concesionaria Multimarca en Comodoro Rivadavia.',
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
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
            </head>
            <body suppressHydrationWarning>
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
