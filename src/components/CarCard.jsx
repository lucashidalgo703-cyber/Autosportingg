"use client";
import { ArrowRight, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import { useCallback } from 'react';
import { getOptimizedImageUrl } from '../lib/cloudinaryUtils';
import Image from 'next/image';
import { useFavorites } from '../context/FavoritesContext';

const CarCard = ({ car }) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const carId = car._id || car.id;
  const isFav = isFavorite(carId);

  const carouselImages = (car.images && car.images.length > 0)
    ? car.images
    : [car.coverImage || car.image].filter(Boolean);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, watchDrag: true });

  const scrollPrev = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  return (
    <Link href={`/auto/${car._id || car.id}`} className="car-card group">
      <div className="card-image-wrapper relative">
        <div className="embla overflow-hidden h-full w-full" ref={emblaRef}>
          <div className="embla__container flex h-full">
            {carouselImages.length > 0 ? carouselImages.map((img, idx) => (
              <div className="embla__slide flex-[0_0_100%] min-w-0 relative h-full" key={idx}>
                <Image
                  src={getOptimizedImageUrl(img, 600) || '/placeholder.png'}
                  alt={`${car.name || 'Auto'} - Foto ${idx + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="card-image pointer-events-none"
                  style={{ objectFit: 'cover', objectPosition: car.imagePosition || '50% 75%' }}
                  unoptimized
                />
              </div>
            )) : (
              <div className="embla__slide flex-[0_0_100%] min-w-0 relative h-full">
                <Image
                  src="/placeholder.png"
                  alt="Placeholder"
                  fill
                  className="card-image pointer-events-none"
                  style={{ objectFit: 'cover' }}
                  unoptimized
                />
              </div>
            )}
          </div>
        </div>

        {carouselImages.length > 1 && (
          <>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 backdrop-blur-[2px] border border-white/20 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-20 flex items-center justify-center cursor-pointer hover:scale-110"
              onClick={scrollPrev}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Anterior foto"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 backdrop-blur-[2px] border border-white/20 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-20 flex items-center justify-center cursor-pointer hover:scale-110"
              onClick={scrollNext}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Siguiente foto"
            >
              <ChevronRight size={20} />
            </button>
          </>
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
          {(car.condition === 'Nuevo' || car.km === 0) ? 'NUEVO • 0 KM' : `USADO • ${car.km.toLocaleString()} KM`}
        </div>

        <div className="card-footer mt-auto">
          <span className="view-more flex items-center gap-2 text-white text-xs font-medium transition-all group-hover:text-[var(--color-primary)]">
            Ver más <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>

      <style>{`
                .car-card {
                    background-color: transparent;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    border: none;
                    height: 100%;
                    overflow: hidden;
                    position: relative;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease;
                    isolation: isolate; /* keeps ::before inside the rounding */
                }

                /* Shine effect */
                .car-card::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 50%;
                    height: 100%;
                    background: linear-gradient(
                        to right,
                        rgba(255, 255, 255, 0) 0%,
                        rgba(255, 255, 255, 0.15) 50%,
                        rgba(255, 255, 255, 0) 100%
                    );
                    transform: skewX(-25deg);
                    transition: left 0.6s ease-in-out;
                    z-index: 10;
                    pointer-events: none;
                }
                
                .car-card:hover::before {
                    left: 200%;
                }
                
                .car-card:hover {
                    box-shadow: 0 15px 35px rgba(235, 38, 40, 0.25);
                    transform: translateY(-6px);
                }

                .card-image-wrapper {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 4/3;
                    background-color: #0a0a0a;
                    overflow: hidden;
                    border-top-left-radius: 12px;
                    border-top-right-radius: 12px;
                }

                .card-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    /* object-position handled inline */
                    transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                }

                .car-card:hover .card-image {
                    transform: scale(1.08); /* Smooth deep zoom on hover */
                }

                .favorite-btn {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: rgba(255, 255, 255, 0.15);
                    backdrop-filter: blur(4px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
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
                    background: rgba(255, 255, 255, 0.3);
                    transform: scale(1.1);
                }

                .card-content {
                    padding: 1.25rem;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    border-bottom-left-radius: 12px;
                    border-bottom-right-radius: 12px;
                    /* Vertical Gradient: Darker near image (top) -> Redder at bottom */
                    background: linear-gradient(to bottom, #1a0505 0%, #991b1b 100%);
                    border: 1px solid rgba(255, 255, 255, 0.1); 
                    border-top: none;
                }
                
                .card-status {
                    color: white;
                    background: rgba(0,0,0,0.2);
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 4px;
                    align-self: start;
                }
                
                .text-primary {
                    color: white !important; /* Override primary text on red background */
                }
            `}</style>
    </Link>
  );
};

export default CarCard;

