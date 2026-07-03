"use client";
import { Heart, Info, Fuel, Settings, Calendar, Gauge } from 'lucide-react';
import Link from 'next/link';
import { getOptimizedImageUrl } from '../lib/cloudinaryUtils';
import Image from 'next/image';
import { useFavorites } from '../context/FavoritesContext';

const CarCard = ({ car }) => {
  const { isFavorite, toggleFavorite } = useFavorites();

  if (!car) return null;

  const carId = car._id || car.id;
  const isFav = isFavorite ? isFavorite(carId) : false;

  const formatPrice = (price, currency = 'USD') => {
      if (!price || isNaN(price) || price <= 0) return 'Consultar precio';
      return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: currency,
          maximumFractionDigits: 0
      }).format(price);
  };

  const isReserved = car.status === 'Reservado' || car.status === 'Señado';
  const isSold = car.status === 'Vendido';
  const isAvailable = !isReserved && !isSold;

  // Render specs dynamically if available
  const specs = [];
  if (car.year) specs.push({ icon: <Calendar size={14} />, text: car.year });
  if (car.km !== undefined) specs.push({ icon: <Gauge size={14} />, text: car.km === 0 || car.condition === '0km' ? '0 KM' : `${car.km.toLocaleString()} km` });
  if (car.transmission) specs.push({ icon: <Settings size={14} />, text: car.transmission });
  if (car.fuel || car.fuelType) specs.push({ icon: <Fuel size={14} />, text: car.fuel || car.fuelType });

  const displaySpecs = specs.slice(0, 3); // Up to 3 specs

  return (
    <div className={`car-card group ${isSold ? 'car-sold' : ''}`}>
      <div className="card-image-wrapper">
        <Link href={`/auto/${carId}`} tabIndex="-1">
            <Image
            src={getOptimizedImageUrl(car.coverImage || (car.images && car.images[0]) || car.image, 600) || '/placeholder.png'}
            alt={`${car.brand} ${car.name}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="card-image"
            style={{ objectFit: 'cover', objectPosition: car.imagePosition || '50% 50%' }}
            unoptimized
            />
        </Link>
        
        {/* Status Badges */}
        {!isAvailable && (
          <div className={`status-badge ${isSold ? 'status-vendido' : 'status-reservado'}`}>
            {isSold ? 'Vendido' : 'Reservado'}
          </div>
        )}
        
        {/* Favorite Button Accessible */}
        <button
          className="favorite-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(carId);
          }}
          aria-pressed={isFav}
          aria-label={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
        >
          <Heart size={20} fill={isFav ? "var(--c-accent-red)" : "rgba(0,0,0,0.5)"} color={isFav ? "var(--c-accent-red)" : "white"} />
        </button>
      </div>

      <div className="card-content">
        <Link href={`/auto/${carId}`} className="card-header-link">
            <div className="card-subtitle">
            {car.brand}
            </div>
            <h3 className="card-title">
            {car.name} {car.version && <span className="card-version">{car.version}</span>}
            </h3>
        </Link>

        {/* Specs Row */}
        <div className="card-specs">
            {displaySpecs.map((spec, index) => (
                <div key={index} className="spec-item">
                    {spec.icon}
                    <span>{spec.text}</span>
                </div>
            ))}
        </div>

        <div className="card-footer">
            <div className="card-price">
                {formatPrice(car.price, car.currency)}
            </div>
            <Link href={`/auto/${carId}`} className="btn-ver-detalle">
                Ver detalle
            </Link>
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
                border-color: var(--c-graphite-light);
            }

            .car-sold {
                opacity: 0.8;
                filter: grayscale(0.5);
            }

            .car-sold:hover {
                transform: none;
                box-shadow: var(--shadow-sm);
            }

            .card-image-wrapper {
                position: relative;
                width: 100%;
                aspect-ratio: 16/10;
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

            .favorite-btn:hover, .favorite-btn:focus-visible {
                background: rgba(0, 0, 0, 0.8);
                transform: scale(1.1);
                outline: 2px solid var(--c-ivory);
                outline-offset: 2px;
            }

            .status-badge {
                position: absolute;
                top: var(--space-3);
                left: var(--space-3);
                padding: 4px 10px;
                border-radius: var(--radius-sm);
                font-size: 0.75rem;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: white;
                z-index: 20;
                box-shadow: var(--shadow-sm);
                font-family: var(--font-title);
            }

            .status-vendido {
                background-color: var(--c-accent-red);
            }

            .status-reservado {
                background-color: #F59E0B; /* Amber */
                color: #000;
            }

            .card-content {
                padding: var(--space-4);
                display: flex;
                flex-direction: column;
                flex: 1;
            }

            .card-header-link {
                text-decoration: none;
                margin-bottom: var(--space-3);
            }

            .card-subtitle {
                color: var(--c-ivory-muted);
                font-size: 0.75rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                margin-bottom: 0.25rem;
            }

            .card-title {
                color: var(--c-ivory);
                font-size: 1.15rem;
                font-weight: 800;
                line-height: 1.2;
                font-family: var(--font-title);
            }

            .card-version {
                color: var(--c-ivory-muted);
                font-size: 0.9rem;
                font-weight: 500;
                display: block;
                margin-top: 0.2rem;
            }

            .card-specs {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
                margin-bottom: var(--space-4);
            }

            .spec-item {
                display: flex;
                align-items: center;
                gap: 4px;
                background-color: rgba(255,255,255,0.05);
                padding: 4px 8px;
                border-radius: var(--radius-sm);
                font-size: 0.75rem;
                color: var(--c-ivory-muted);
                font-weight: 500;
            }

            .card-footer {
                margin-top: auto;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-top: var(--border-thin);
                padding-top: var(--space-3);
            }

            .card-price {
                color: var(--c-ivory);
                font-size: 1.15rem;
                font-weight: 800;
                font-family: var(--font-title);
            }

            .btn-ver-detalle {
                display: inline-flex;
                align-items: center;
                font-size: 0.85rem;
                font-weight: 700;
                color: var(--c-accent-red);
                text-transform: uppercase;
                letter-spacing: 0.05em;
                transition: color 0.2s ease;
            }

            .btn-ver-detalle:hover {
                color: var(--c-ivory);
            }
      `}</style>
    </div>
  );
};

export default CarCard;
