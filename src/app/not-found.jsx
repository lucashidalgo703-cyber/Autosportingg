import Link from 'next/link';
import { Search, Home, Car } from 'lucide-react';

export const metadata = {
    title: 'Página no encontrada | AutoSporting',
    description: 'La página que buscás no existe o fue movida. Volvé al catálogo de AutoSporting para seguir buscando tu próximo vehículo.',
    robots: {
        index: false,
        follow: true,
    }
};

export default function NotFound() {
    return (
        <main id="main-content" className="not-found-page min-h-[70vh] flex items-center justify-center py-20 px-4">
            <div className="container max-w-2xl mx-auto text-center">
                <Search size={80} className="text-[var(--c-accent-red)] mx-auto mb-6 opacity-80" aria-hidden="true" />
                <h1 className="text-5xl md:text-6xl font-black text-[var(--c-ivory)] mb-4" style={{ fontFamily: 'var(--font-title)' }}>
                    Error 404
                </h1>
                <h2 className="text-2xl text-[var(--c-ivory)] mb-6">Página no encontrada</h2>
                <p className="text-[var(--c-ivory-muted)] mb-10 text-lg">
                    Parece que la dirección que buscás no existe, fue eliminada o el vehículo ya fue vendido. ¿Te ayudamos a encontrar lo que necesitás?
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/catalogo" className="btn btn-primary flex items-center justify-center gap-2 py-4 px-8 text-lg">
                        <Car size={20} />
                        Ver Catálogo
                    </Link>
                    <Link href="/" className="btn btn-outline flex items-center justify-center gap-2 py-4 px-8 text-lg">
                        <Home size={20} />
                        Ir al Inicio
                    </Link>
                </div>
            </div>
        </main>
    );
}
