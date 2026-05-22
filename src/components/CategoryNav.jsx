import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Car, Truck, Gauge, ShieldCheck, Zap } from 'lucide-react';

const categories = [
  { id: 'SUV', label: 'SUVs', icon: <Truck size={32} />, color: '#EB2628' },
  { id: 'Pickup', label: 'Pickups', icon: <ShieldCheck size={32} />, color: '#EB2628' },
  { id: 'Sedan', label: 'Sedanes', icon: <Car size={32} />, color: '#EB2628' },
  { id: 'Hatchback', label: 'Hatchbacks', icon: <Zap size={32} />, color: '#EB2628' },
  { id: '0km', label: '0 KM', icon: <Gauge size={32} />, color: '#EB2628' },
];

const CategoryNav = () => {
  return (
    <section className="category-nav container section-padding">
      <div className="section-header mb-12 text-center md:text-left">
        <h2 className="text-5xl font-black uppercase tracking-tighter italic" style={{ fontFamily: 'Archivo, sans-serif' }}>Explora por Estilo</h2>
        <div className="flex items-center gap-4 mt-2 justify-center md:justify-start">
          <div className="h-[2px] w-12 bg-[var(--color-primary)]"></div>
          <p className="text-white text-lg font-bold uppercase tracking-wider" style={{ fontFamily: 'Archivo, sans-serif' }}>
            Encuentra el vehículo que mejor se adapte a tu vida
          </p>
        </div>
      </div>

      <div className="category-grid">
        {categories.map((cat, index) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            viewport={{ once: true }}
          >
            <Link href={`/catalogo?type=${cat.id}`} className="category-card group">
              <div className="icon-wrapper">
                {cat.icon}
              </div>
              <span className="category-label">{cat.label}</span>
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
            grid-template-columns: repeat(5, 1fr);
            gap: 2rem;
          }
        }

        .category-card {
          position: relative;
          background: rgba(15, 15, 15, 0.8);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 2.5rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.25rem;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          overflow: hidden;
          text-decoration: none;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        }

        .category-card:hover {
          background: rgba(20, 20, 20, 0.9);
          border-color: var(--color-primary);
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(235, 38, 40, 0.2);
        }

        .icon-wrapper {
          color: white;
          transition: all 0.3s ease;
          z-index: 2;
        }

        .category-card:hover .icon-wrapper {
          color: var(--color-primary);
          transform: scale(1.15);
        }

        .category-label {
          color: white;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-size: 1rem; /* Increased size */
          z-index: 2;
          font-family: 'Archivo', sans-serif;
        }

        .category-hover-effect {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 0;
          background: linear-gradient(to top, rgba(235, 38, 40, 0.15), transparent);
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
