import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Car, Truck, Gauge, ShieldCheck, Zap, Briefcase, Flag, Users } from 'lucide-react';

const categories = [
  { id: 'SUV', label: 'SUVs', icon: <Truck size={32} /> },
  { id: 'Pickup', label: 'Pickups', icon: <ShieldCheck size={32} /> },
  { id: 'Sedan', label: 'Sedanes', icon: <Car size={32} /> },
  { id: 'Hatchback', label: 'Hatchbacks', icon: <Zap size={32} /> },
  { id: 'Utilitario', label: 'Utilitarios', icon: <Briefcase size={32} /> },
  { id: 'Deportivo', label: 'Deportivos', icon: <Flag size={32} /> },
  { id: 'Familiar', label: 'Familiares', icon: <Users size={32} /> },
  { id: '0km', label: '0 KM', icon: <Gauge size={32} /> },
];

const CategoryNav = ({ cars = [] }) => {
  const activeCategoriesWithCount = React.useMemo(() => {
    if (!cars || cars.length === 0) return categories.map(cat => ({ ...cat, count: 0 }));

    return categories.map(cat => {
      const count = cars.filter(car => {
        if (cat.id === '0km') {
          return car.condition === '0km' || car.km === 0 || car.condition === 'Nuevo';
        }
        return (car.vehicleType && car.vehicleType.toLowerCase() === cat.id.toLowerCase()) || 
               (car.type && car.type.toLowerCase() === cat.id.toLowerCase()) ||
               (car.category && car.category.toLowerCase() === cat.id.toLowerCase());
      }).length;
      return { ...cat, count };
    }); // Eliminamos el filtro de > 0 para que se vean todos los estilos
  }, [cars]);

  if (activeCategoriesWithCount.length === 0) return null;

  return (
    <section className="category-nav container section-padding">
      <div className="section-header mb-12 text-center md:text-left">
        <h2 className="text-4xl font-black uppercase tracking-tighter" style={{ fontFamily: 'var(--font-title)' }}>Explora por Estilo</h2>
        <div className="flex items-center gap-4 mt-2 justify-center md:justify-start">
          <div className="h-[2px] w-12 bg-[var(--c-accent-red)]"></div>
          <p className="text-[var(--c-ivory-muted)] text-lg font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-title)' }}>
            El vehículo que mejor se adapte a tu vida
          </p>
        </div>
      </div>

      <div className="category-grid">
        {activeCategoriesWithCount.map((cat, index) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            viewport={{ once: true }}
          >
            <Link href={`/catalogo?type=${cat.id}`} className="category-card group">
              <div className="icon-wrapper">
                {cat.icon}
              </div>
              <span className="category-label">{cat.label}</span>
              <span className="category-count">{cat.count} {cat.count === 1 ? 'vehículo' : 'vehículos'}</span>
              <div className="category-hover-effect"></div>
            </Link>
          </motion.div>
        ))}
      </div>

      <style>{`
        .category-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }

        @media (min-width: 768px) {
          .category-grid {
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 2rem;
          }
        }

        .category-card {
          position: relative;
          background: var(--c-graphite);
          border: var(--border-thin);
          border-radius: var(--radius-lg);
          padding: 2.5rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          transition: all 0.3s ease;
          overflow: hidden;
          text-decoration: none;
          box-shadow: var(--shadow-sm);
        }

        .category-card:hover {
          background: var(--c-graphite-light);
          border-color: var(--c-accent-red);
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
        }

        .icon-wrapper {
          color: var(--c-ivory-muted);
          transition: all 0.3s ease;
          z-index: 2;
        }

        .category-card:hover .icon-wrapper {
          color: var(--c-accent-red);
          transform: scale(1.1);
        }

        .category-label {
          color: var(--c-ivory);
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-size: 1rem;
          z-index: 2;
          font-family: var(--font-title);
        }
        
        .category-count {
            color: var(--c-ivory-muted);
            font-size: 0.85rem;
            z-index: 2;
            font-weight: 500;
        }

        .category-hover-effect {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 0;
          background: linear-gradient(to top, rgba(230, 48, 39, 0.1), transparent);
          transition: height 0.4s ease;
          z-index: 1;
        }

        .category-card:hover .category-hover-effect {
          height: 100%;
        }

        @media (max-width: 480px) {
          .category-card {
            padding: 2rem 1rem;
          }
        }
      `}</style>
    </section>
  );
};

export default CategoryNav;
