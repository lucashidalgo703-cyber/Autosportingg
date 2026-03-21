import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getOptimizedImageUrl } from '../lib/cloudinaryUtils';

const CarCard = ({ car }) => {
  return (
    <Link to={`/auto/${car._id || car.id}`} className="car-card group">
      <div className="card-image-wrapper">
        <img
          src={getOptimizedImageUrl(car.coverImage || (car.images && car.images[0]) || car.image, 600)}
          alt={car.name}
          className="card-image"
          style={{ objectPosition: car.imagePosition || '50% 75%' }}
        />
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

