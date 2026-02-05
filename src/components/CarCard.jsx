import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const CarCard = ({ car }) => {
  return (
    <Link to={`/auto/${car._id || car.id}`} className="car-card group">
      <div className="card-image-wrapper">
        <img
          src={car.coverImage || (car.images && car.images[0]) || car.image}
          alt={car.name}
          className="card-image"
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
          {car.condition === 'Nuevo' ? 'NUEVO • 0 KM' : `USADO • ${car.km.toLocaleString()} KM`}
        </div>

        <div className="card-footer mt-auto">
          <span className="view-more flex items-center gap-2 text-white text-xs font-medium group-hover:underline transition-all">
            Ver más <ArrowRight size={14} />
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
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                }
                
                .car-card:hover {
                    box-shadow: 0 8px 30px rgba(235, 38, 40, 0.3);
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
                    object-fit: cover; /* Fills the square completely */
                    object-position: 50% 75%; /* Reference site value */
                    transition: transform 0.5s ease;
                }

                .car-card:hover .card-image {
                    transform: scale(1.05); /* Smooth zoom on hover */
                }

                .card-content {
                    padding: 1.25rem;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    border-bottom-left-radius: 12px;
                    border-bottom-right-radius: 12px;
                    /* Intense Red Gradient */
                    background: linear-gradient(135deg, #8B0000 0%, var(--color-primary) 100%);
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

