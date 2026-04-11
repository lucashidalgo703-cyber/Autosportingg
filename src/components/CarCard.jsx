"use client";
import { ArrowRight, Heart, Share2, Calendar, Gauge } from 'lucide-react';
import Link from 'next/link';
import { getOptimizedImageUrl } from '../lib/cloudinaryUtils';
import Image from 'next/image';
import { useFavorites } from '../context/FavoritesContext';
import { motion } from 'framer-motion';

const CarCard = ({ car }) => {
  const { isFavorite, toggleFavorite } = useFavorites();

  if (!car) return null;

  const carId = car._id || car.id;
  const isFav = isFavorite ? isFavorite(carId) : false;

  const shareOnWhatsApp = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const message = `¡Hola! Mira este ${car.name} que encontré en AutoSporting: https://autosportingg.com/auto/${carId}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const priceValue = typeof car.price === 'string' ? parseFloat(car.price.replace(/[^0-9.-]+/g, "")) : car.price;
  const formattedPrice = (priceValue && !isNaN(priceValue))
    ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: car.currency || 'USD', maximumFractionDigits: 0 }).format(priceValue)
    : 'Consultar';
  const kmValue = typeof car.km === 'string' ? parseFloat(car.km.replace(/[^0-9.-]+/g, "")) : car.km;

  return (
    <>
      <motion.div
        whileHover={{ y: -10, scale: 1.01 }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
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
                <Share2 size={16} />
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
                <Heart size={16} fill={isFav ? "var(--color-primary)" : "none"} color="white" />
              </button>
            </div>

            {/* Iconized Spec Bar - Ultra Premium Overlay */}
            <div className="card-spec-overlay">
              <div className="spec-capsule">
                <Calendar size={12} className="text-primary" />
                <span>{car.year}</span>
              </div>
              <div className="spec-capsule">
                <Gauge size={12} className="text-primary" />
                <span>{(kmValue || 0).toLocaleString()} KM</span>
              </div>
            </div>
          </div>

          <div className="card-content">
            <div className="card-content-overlay"></div>

            <div className="relative z-10 flex flex-col h-full">
              <div className="mb-2">
                <div className="card-brand-tag">{car.brand}</div>
                <h3 className="card-title text-xl font-bold text-white group-hover:text-primary transition-colors duration-300">
                  {car.name}
                </h3>
              </div>

              <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/5">
                <div className="price-container">
                  <span className="price-label">Precio</span>
                  <div className="price-value">{formattedPrice}</div>
                </div>
                <div className="view-details-ring">
                  <ArrowRight size={18} />
                </div>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>

      <style>{`
                .car-card {
                    background-color: rgba(15, 15, 15, 0.4);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 24px;
                    display: flex;
                    flex-direction: column;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    height: 100%;
                    overflow: hidden;
                    position: relative;
                    box-shadow: 
                        0 20px 40px rgba(0, 0, 0, 0.5),
                        inset 0 0 0 1px rgba(255, 255, 255, 0.05);
                    transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
                    isolation: isolate;
                }

                .car-card:hover {
                    background-color: rgba(25, 25, 25, 0.5);
                    border-color: rgba(235, 38, 40, 0.4);
                    box-shadow: 
                        0 30px 60px rgba(0, 0, 0, 0.6),
                        0 0 20px rgba(235, 38, 40, 0.1),
                        inset 0 0 0 1px rgba(235, 38, 40, 0.2);
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
                    transition: transform 1.2s cubic-bezier(0.2, 0.8, 0.2, 1);
                }

                .car-card:hover .card-image {
                    transform: scale(1.08);
                }

                /* Shine Effect */
                .card-shine {
                    position: absolute;
                    top: 0;
                    left: -150%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(
                        to right,
                        transparent,
                        rgba(255, 255, 255, 0.08),
                        rgba(255, 255, 255, 0.15),
                        rgba(255, 255, 255, 0.08),
                        transparent
                    );
                    transform: skewX(-30deg);
                    z-index: 5;
                }

                .car-card:hover .card-shine {
                    animation: shine 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                }

                @keyframes shine {
                    0% { left: -150%; }
                    100% { left: 150%; }
                }

                /* Spec Capsules Overlay */
                .card-spec-overlay {
                    position: absolute;
                    bottom: 12px;
                    left: 12px;
                    display: flex;
                    gap: 6px;
                    z-index: 20;
                    opacity: 0.9;
                    transition: transform 0.4s ease;
                }

                .car-card:hover .card-spec-overlay {
                    transform: translateY(-2px);
                }

                .spec-capsule {
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(8px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 4px 10px;
                    border-radius: 50px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: white;
                    font-size: 0.65rem;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                }

                /* Premium Status Badges */
                .status-badge-premium {
                    position: absolute;
                    top: 16px;
                    left: 16px;
                    padding: 6px 14px;
                    border-radius: 50px;
                    font-size: 0.65rem;
                    font-weight: 900;
                    letter-spacing: 0.15em;
                    text-transform: uppercase;
                    z-index: 25;
                    backdrop-filter: blur(12px);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                    border: 1px solid rgba(255,255,255,0.15);
                }

                .status-badge-premium.oferta { background: linear-gradient(135deg, #EB2628, #9b1a1b); color: white; }
                .status-badge-premium.vendido { background: rgba(20, 20, 20, 0.9); color: #888; border-color: rgba(255,255,255,0.05); }
                .status-badge-premium.nuevo { background: rgba(255, 255, 255, 0.95); color: black; }

                /* Action Orbs */
                .card-actions {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    z-index: 25;
                    opacity: 0;
                    transform: translateY(-10px);
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                .car-card:hover .card-actions {
                    opacity: 1;
                    transform: translateY(0);
                }

                .action-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(12px);
                    color: white;
                }

                .share-btn:hover { background: #25D366; border-color: #25D366; color: white; transform: scale(1.15); }
                .favorite-btn:hover { background: var(--color-primary); border-color: var(--color-primary); transform: scale(1.15); }

                /* Luxury Content Styling */
                .card-content {
                    padding: 1.5rem;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                }

                .card-brand-tag {
                    font-size: 0.6rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.2em;
                    color: var(--color-primary);
                    margin-bottom: 2px;
                }

                .card-title {
                    font-size: 1.15rem;
                    line-height:1.2;
                    letter-spacing: -0.01em;
                }

                .price-container {
                    display: flex;
                    flex-direction: column;
                }

                .price-label {
                    font-size: 0.6rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: rgba(255,255,255,0.4);
                    letter-spacing: 0.1em;
                    margin-bottom: -2px;
                }

                .price-value {
                    font-size: 1.4rem;
                    font-weight: 900;
                    color: white;
                    letter-spacing: -0.02em;
                }

                .view-details-ring {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 1px solid rgba(255,255,255,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    transition: all 0.3s ease;
                    background: rgba(255,255,255,0.02);
                }

                .car-card:hover .view-details-ring {
                    background: var(--color-primary);
                    border-color: var(--color-primary);
                    color: white;
                    transform: rotate(-45deg);
                }
            `}</style>
    </>
  );
};

export default CarCard;
