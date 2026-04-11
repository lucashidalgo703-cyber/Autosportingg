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
              unoptimized
            />

            {/* Shine Effect Layer */}
            <div className="card-shine"></div>

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
            <div className="card-content-overlay"></div>

            <div className="relative z-10">
              <h3 className="card-title text-xl font-bold text-white mb-0.5 group-hover:text-primary transition-colors">
                {car.name}
              </h3>

              <div className="card-subtitle text-white/80 text-xs mb-2 font-semibold uppercase tracking-wider">
                {car.brand} | {car.year}
              </div>

              <div className="card-status-info text-primary font-black text-[10px] mb-3 uppercase tracking-[0.2em]">
                {(car.condition === 'Nuevo' || car.km === 0) ? 'NUEVO • 0 KM' : `USADO • ${car.km.toLocaleString()} KM`}
              </div>

              <div className="card-footer mt-auto pt-4 border-t border-white/5">
                <span className="view-more flex items-center gap-2 text-white text-xs font-bold transition-all group-hover:translate-x-1">
                  VER DETALLES <ArrowRight size={14} className="text-primary" />
                </span>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>

      <style>{`
                .car-card {
                    background-color: rgba(20, 20, 20, 0.4);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border-radius: 20px;
                    display: flex;
                    flex-direction: column;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    height: 100%;
                    overflow: hidden;
                    position: relative;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    isolation: isolate;
                }

                .car-card:hover {
                    border-color: rgba(235, 38, 40, 0.3);
                    box-shadow: 0 15px 45px rgba(235, 38, 40, 0.15);
                }

                .card-image-wrapper {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 4/3;
                    background-color: #000;
                    overflow: hidden;
                }

                .card-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
                }

                .car-card:hover .card-image {
                    transform: scale(1.1);
                }

                /* Shine Effect */
                .card-shine {
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 50%;
                    height: 100%;
                    background: linear-gradient(
                        to right,
                        transparent,
                        rgba(255, 255, 255, 0.1),
                        transparent
                    );
                    transform: skewX(-25deg);
                    transition: none;
                    z-index: 5;
                }

                .car-card:hover .card-shine {
                    animation: shine 0.8s ease-in-out forwards;
                }

                @keyframes shine {
                    100% {
                        left: 200%;
                    }
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
                    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                    border: 1px solid rgba(255,255,255,0.1);
                }

                .status-badge-premium.oferta {
                    background: rgba(235, 38, 40, 0.9);
                    color: white;
                }

                .status-badge-premium.vendido {
                    background: rgba(0, 0, 0, 0.8);
                    color: #aaa;
                    border-color: rgba(255,255,255,0.05);
                }

                .status-badge-premium.nuevo {
                    background: rgba(255, 255, 255, 0.95);
                    color: black;
                }

                /* Card Actions */
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
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
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
                    backdrop-filter: blur(12px);
                }

                .share-btn {
                    background: rgba(37, 211, 102, 0.15);
                    color: #25D366;
                }

                .share-btn:hover {
                    background: #25D366;
                    color: white;
                    transform: translateY(-2px);
                }

                .favorite-btn {
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                }

                .favorite-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    transform: translateY(-2px);
                }

                /* Content Area with Glassmorphism */
                .card-content {
                    padding: 1.5rem;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    overflow: hidden;
                }

                .card-content-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, rgba(30, 30, 30, 0.3) 0%, rgba(10, 10, 10, 0.6) 100%);
                    z-index: 1;
                }

                .card-title {
                    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                }
                
                .card-status-info {
                    letter-spacing: 0.2em;
                    text-shadow: 0 2px 10px rgba(235, 38, 40, 0.3);
                }

                .view-more {
                    letter-spacing: 0.1em;
                    color: rgba(255,255,255,0.7);
                }

                .car-card:hover .view-more {
                    color: white;
                }
            `}</style>
    </>
  );
};

export default CarCard;
