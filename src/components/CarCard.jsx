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

        <div className="card-subtitle text-gray-400 text-xs mb-2 font-medium uppercase tracking-wide">
          {car.brand} | {car.year}
        </div>

        <div className="card-status text-primary font-bold text-xs mb-3 uppercase tracking-wider">
          {car.condition === 'Nuevo' ? 'NUEVO • 0 KM' : `USADO • ${car.km.toLocaleString()} KM`}
        </div>

        <div className="card-footer mt-auto">
          <span className="view-more flex items-center gap-2 text-white text-xs font-medium group-hover:text-primary transition-colors">
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
                }

                .card-image-wrapper {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 4/3;
                    background-color: #0a0a0a; /* Anthracite instead of pure black */
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
                    padding: 1rem;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    
                    /* Carbon Texture + Red Gradient Overlay */
                    background-color: #0c0c0c;
                    background-image: 
                        linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(235, 38, 40, 0.15) 100%),
                        linear-gradient(45deg, rgba(255, 255, 255, 0.03) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.03) 75%, rgba(255, 255, 255, 0.03)),
                        linear-gradient(45deg, rgba(255, 255, 255, 0.03) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.03) 75%, rgba(255, 255, 255, 0.03));
                    background-size: 100% 100%, 6px 6px, 6px 6px;
                    background-position: 0 0, 0 0, 3px 3px;

                    border-bottom-left-radius: 12px;
                    border-bottom-right-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.08); 
                    border-top: none;
                }
                
                .card-status {
                    color: #EB2628; /* Primary Red */
                }
                
                .text-primary {
                    color: #EB2628;
                }
            `}</style>
    </Link>
  );
};

export default CarCard;

