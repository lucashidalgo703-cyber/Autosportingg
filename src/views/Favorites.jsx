"use client";
import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Car } from 'lucide-react';
import CarCard from '../components/CarCard';
import { useCars } from '../hooks/useCars';
import { useFavorites } from '../context/FavoritesContext';

const Favorites = () => {
    const { cars, loading } = useCars();
    const { favorites } = useFavorites();

    const favoriteCars = useMemo(() => {
        return cars.filter(car => favorites.includes((car._id || car.id).toString()));
    }, [cars, favorites]);

    return (
        <main className="container page-padding">
            <Link to="/catalogo" className="back-link">
                <ArrowLeft size={20} /> Volver al catálogo
            </Link>

            <div className="page-header">
                <h1>Tus Vehículos Favoritos</h1>
                <p>Autos que has guardado para revisar más tarde.</p>
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-white text-center">Cargando...</p>
                </div>
            ) : favoriteCars.length > 0 ? (
                <div className="cars-grid">
                    {favoriteCars.map(car => (
                        <CarCard key={car._id || car.id} car={car} />
                    ))}
                </div>
            ) : (
                <div className="empty-favorites">
                    <Car size={64} className="empty-icon" />
                    <h2>Aún no tienes favoritos</h2>
                    <p>Explora nuestro catálogo y guarda los vehículos que más te interesen haciendo clic en el corazón.</p>
                    <Link to="/catalogo" className="btn btn-primary mt-6">
                        Explorar Catálogo
                    </Link>
                </div>
            )}

            <style>{`
                .page-padding {
                    padding-top: 2rem;
                    padding-bottom: 5rem;
                }

                .back-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--color-text-muted);
                    text-decoration: none;
                    margin-bottom: 2rem;
                    transition: color 0.2s;
                }

                .back-link:hover {
                    color: var(--color-primary);
                }

                .page-header {
                    text-align: center;
                    margin-bottom: 3rem;
                }

                .page-header h1 {
                    font-size: clamp(2rem, 4vw, 3rem);
                    margin-bottom: 0.5rem;
                    color: white;
                }

                .page-header p {
                    color: var(--color-text-muted);
                    font-size: 1.1rem;
                }

                .cars-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 2rem;
                }

                @media (min-width: 640px) {
                    .cars-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (min-width: 1024px) {
                    .cars-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }

                .empty-favorites {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem 1rem;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px border rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    text-align: center;
                    margin-top: 2rem;
                }

                .empty-icon {
                    color: var(--color-text-muted);
                    margin-bottom: 1.5rem;
                    opacity: 0.5;
                }

                .empty-favorites h2 {
                    font-size: 1.5rem;
                    color: white;
                    margin-bottom: 0.5rem;
                }

                .empty-favorites p {
                    color: var(--color-text-muted);
                    max-width: 400px;
                }
                
                .btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0.75rem 1.5rem;
                    border-radius: 0.5rem;
                    font-weight: 600;
                    text-decoration: none;
                    transition: all 0.2s;
                    cursor: pointer;
                    border: none;
                }

                .btn-primary {
                    background-color: var(--color-primary);
                    color: white;
                }

                .btn-primary:hover {
                    background-color: #c91f21;
                    transform: translateY(-2px);
                }
            `}</style>
        </main>
    );
};

export default Favorites;
