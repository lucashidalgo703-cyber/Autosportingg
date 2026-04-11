"use client";
import { ArrowRight, Heart, Share2 } from 'lucide-react';
import Link from 'next/link';
import { getOptimizedImageUrl, getBlurPlaceholder } from '../lib/cloudinaryUtils';
import Image from 'next/image';
import { useFavorites } from '../context/FavoritesContext';
import { motion } from 'framer-motion';

const CarCard = ({ car }) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const carId = car._id || car.id;
  const isFav = isFavorite(carId);

  const shareOnWhatsApp = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const message = `¡Hola! Mira este ${car.name} que encontré en AutoSporting: https://autosportingg.com/auto/${carId}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <>
      <motion.div
        whileHover={{ y: -8 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="h-full"
      >
        <Link href={`/auto/${carId}`} className="car-card group">
          <div className="card-image-wrapper">
            <Image
              src={getOptimizedImageUrl(car.coverImage || (car.images && car.images[0]) || car.image, 600) || '/placeholder.png'}
              alt={car.name || 'Auto'}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="card-image"
              style={{ objectFit: 'cover', objectPosition: car.imagePosition || '50% 75%' }}
              placeholder="blur"
              blurDataURL={getBlurPlaceholder(car.coverImage || (car.images && car.images[0]) || car.image)}
            />

            {/* Status Badge */}
            {car.status && (
              <div className={`status-badge-premium ${car.status.toLowerCase()}`}>
                {car.status}
              </div>
            )}

            <div className="card-actions">
              <button
                className="action-btn share-btn"
                onClick={shareOnWhatsApp}
                aria-label="Compartir en WhatsApp"
              >
                <Share2 size={18} />
              </button>
              <button
                className="action-btn favorite-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFavorite(carId);
                }}
                aria-label={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
              >
                <Heart size={18} fill={isFav ? "var(--color-primary)" : "rgba(0,0,0,0.3)"} color={isFav ? "var(--color-primary)" : "white"} />
              </button>
            </div>
          </div>

          <div className="card-content">
            <h3 className="card-title text-xl font-bold text-white mb-0.5">
              {car.name}
            </h3>

            <div className="card-subtitle text-white/70 text-xs mb-2 font-medium uppercase tracking-wide">
              {car.brand} | {car.year}
            </div>

            <div className="card-status-info text-white font-bold text-xs mb-3 uppercase tracking-wider">
              {(car.condition === 'Nuevo' || car.km === 0) ? 'NUEVO • 0 KM' : `USADO • ${car.km.toLocaleString()} KM`}
            </div>

            <div className="card-footer mt-auto">
              <span className="view-more flex items-center gap-2 text-white text-xs font-bold transition-all group-hover:text-white">
                VER DETALLES <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </Link>
      </motion.div>

      <style>{`
                .car-card {
                    background-color: transparent;
                    border-radius: 20px;
                    display: flex;
                    flex-direction: column;
                    border: none;
                    height: 100%;
                    overflow: hidden;
                    position: relative;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
                    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease;
                    isolation: isolate;
                }

                .card-image-wrapper {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 4/3;
                    background-color: #0a0a0a;
                    overflow: hidden;
                }

                .card-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                }

                .car-card:hover .card-image {
                    transform: scale(1.1);
                }

                /* Premium Status Badges */
                .status-badge-premium {
                    position: absolute;
                    top: 16px;
                    left: 16px;
                    padding: 6px 14px;
                    border-radius: 50px;
                    font-size: 0.7rem;
                    font-weight: 800;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    z-index: 25;
                    backdrop-filter: blur(8px);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.1);
                }

                .status-badge-premium.oferta {
                    background: rgba(235, 38, 40, 0.9);
                    color: white;
                }

                .status-badge-premium.vendido {
                    background: rgba(0, 0, 0, 0.8);
                    color: #999;
                    border-color: rgba(255,255,255,0.05);
                }

                .status-badge-premium.nuevo {
                    background: rgba(255, 255, 255, 0.9);
                    color: black;
                }

                /* Card Actions (Share & Fav) */
                .card-actions {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    z-index: 25;
                    opacity: 0;
                    transform: translateX(10px);
                    transition: all 0.3s ease;
                }

                .car-card:hover .card-actions {
                    opacity: 1;
                    transform: translateX(0);
                }

                .action-btn {
                    width: 38px;
                    height: 38px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .share-btn {
                    background: rgba(37, 211, 102, 0.2);
                    backdrop-filter: blur(8px);
                    color: #25D366;
                }

                .share-btn:hover {
                    background: #25D366;
                    color: white;
                    transform: scale(1.1);
                }

                .favorite-btn {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(8px);
                    color: white;
                }

                .favorite-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    transform: scale(1.1);
                }

                .card-content {
                    padding: 1.5rem;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    background: linear-gradient(135deg, #121212 0%, #0a0a0a 100%);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-top: none;
                }
                
                .card-status-info {
                    color: var(--color-primary);
                    font-size: 0.7rem;
                    font-weight: 800;
                    letter-spacing: 0.1em;
                }

                .view-more {
                    letter-spacing: 0.1em;
                }
            `}</style>
    </>
  );
};

export default CarCard;
