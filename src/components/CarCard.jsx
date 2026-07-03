"use client";
import { ArrowRight, Heart } from 'lucide-react';
import Link from 'next/link';
import { getOptimizedImageUrl } from '../lib/cloudinaryUtils';
import Image from 'next/image';
import { useFavorites } from '../context/FavoritesContext';

const CarCard = ({ car }) => {
  const { isFavorite, toggleFavorite } = useFavorites();

  if (!car) return null;

  const carId = car._id || car.id;
  const isFav = isFavorite ? isFavorite(carId) : false;

  return (
    <Link href={`/auto/${car._id || car.id}`} className="car-card group">
      <div className="card-image-wrapper">
        <Image
          src={getOptimizedImageUrl(car.coverImage || (car.images && car.images[0]) || car.image, 600) || '/placeholder.png'}
          alt={car.name || 'Auto'}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="card-image"
          style={{ objectFit: 'cover', objectPosition: car.imagePosition || '50% 75%' }}
          unoptimized
        />
        {car.status && car.status !== 'Disponible' && (
          <div className={`status-badge ${car.status === 'Vendido' ? 'status-vendido' : 'status-senado'}`}>
            {car.status}
          </div>
        )}
        <button
          className="favorite-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(carId);
          }}
          aria-label={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
        >
          <Heart size={20} fill={isFav ? "var(--color-primary)" : "rgba(0,0,0,0.5)"} color={isFav ? "var(--color-primary)" : "white"} />
        </button>
      </div>

      <div className="card-content">
        <h3 className="card-title text-xl font-bold text-white mb-0.5">
          {car.name}
        </h3>

        <div className="card-subtitle text-white/80 text-xs mb-2 font-medium uppercase tracking-wide">
          {car.brand} | {car.year}
        </div>

        <div className="card-status text-white font-bold text-xs mb-3 uppercase tracking-wider">
          {(car.condition === 'Nuevo' || car.km === 0) ? 'NUEVO • 0 KM' : `USADO • ${(car.km || 0).toLocaleString()} KM`}
        </div>

        <div className="card-footer mt-auto">
          <span className="view-more flex items-center gap-2 text-white text-xs font-medium transition-all group-hover:text-[var(--color-primary)]">
            Ver más <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>

      <style>{`
                .car-card {
                    background-color: var(--c-graphite);
                    border-radius: var(--radius-lg);
                    display: flex;
                    flex-direction: column;
                    border: var(--border-thin);
                    height: 100%;
                    overflow: hidden;
                    position: relative;
                    box-shadow: var(--shadow-sm);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    isolation: isolate;
                }
                
                .car-card:hover {
                    box-shadow: var(--shadow-md);
                    transform: translateY(-4px);
                }

                .card-image-wrapper {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 4/3;
                    background-color: var(--c-carbon);
                    overflow: hidden;
                }

                .card-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.4s ease;
                }

                .car-card:hover .card-image {
                    transform: scale(1.05);
                }

                .favorite-btn {
                    position: absolute;
                    top: var(--space-3);
                    right: var(--space-3);
                    background: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(4px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 50%;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 20;
                    transition: all 0.2s ease;
                }

                .favorite-btn:hover {
                    background: rgba(0, 0, 0, 0.6);
                    transform: scale(1.05);
                }

                .status-badge {
                    position: absolute;
                    top: var(--space-3);
                    left: var(--space-3);
                    padding: 4px var(--space-3);
                    border-radius: var(--radius-sm);
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: white;
                    z-index: 20;
                    box-shadow: var(--shadow-sm);
                }

                .status-vendido {
                    background-color: var(--c-accent-red);
                }

                .status-senado {
                    background-color: #F59E0B;
                }

                .card-content {
                    padding: var(--space-4);
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                
                .card-status {
                    color: var(--c-ivory-muted);
                    background: var(--c-graphite-light);
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: var(--radius-sm);
                    align-self: start;
                    font-size: 0.75rem;
                }
                
                .text-primary {
                    color: var(--c-accent-red) !important;
                }
            `}</style>
    </Link>
  );
};

export default CarCard;
