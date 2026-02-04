import Hero from '../components/Hero';
import CarCard from '../components/CarCard';
import Features from '../components/Features';
import FAQ from '../components/FAQ';
import { useCars } from '../hooks/useCars';

const Home = () => {
  const { cars, loading } = useCars();

  // Filter only featured cars for the home page (or first 5)
  // If loading, we could show skeletons, but for now empty array prevents crash
  const featuredCars = cars.filter(car => car.featured || car.year > 2020).slice(0, 5);

  return (
    <main>
      <Hero />

      {/* Sección Nuestros Vehículos */}
      <section className="featured container section-padding">
        <div className="section-header mb-8">
          <h2 className="text-3xl font-bold border-l-4 border-[var(--color-primary)] pl-4">Nuestros Vehículos</h2>
          <a href="/catalogo" className="view-all-link text-[var(--color-primary)] font-semibold hover:underline">Ver todo el catálogo →</a>
        </div>

        <div className="cars-grid">
          {featuredCars.map(car => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      </section>

      {/* Sección Features */}
      <Features />

      {/* Banner de Confianza */}
      <section className="trust-banner bg-dark-gradient">
        <div className="trust-overlay"></div>
        <div className="container trust-content">
          <h2>Confianza y Experiencia</h2>
          <div className="trust-stats">
            <div className="stat-item">
              <span className="stat-number">+15</span>
              <span className="stat-label">Años de trayectoria</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">100%</span>
              <span className="stat-label">Garantía asegurada</span>
            </div>
          </div>
        </div>
      </section>

      {/* Sección FAQ */}
      <FAQ />

      <style>{`
        .section-padding {
          padding-top: 5rem;
          padding-bottom: 5rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: end;
          margin-bottom: 3rem;
        }

        .section-header h2 {
          font-size: 2.5rem;
          font-weight: 700;
          color: white;
        }

        .view-all-link {
          color: var(--color-primary);
          font-weight: 600;
          font-size: 1.1rem;
          transition: color 0.2s;
        }

        .view-all-link:hover {
          color: white;
        }

        .cars-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        @media (min-width: 640px) {
          .cars-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .cars-grid {
            grid-template-columns: repeat(4, 1fr); /* 4 columns to make them smaller */
          }
        }

        /* Trust Banner Styles */
        .trust-banner {
            position: relative;
            padding: 8rem 0;
            margin-bottom: 5rem;
            text-align: center;
        }
        
        .trust-overlay {
            position: absolute;
            inset: 0;
            background-color: rgba(0,0,0,0.8);
        }

        .trust-content {
            position: relative;
            z-index: 10;
        }

        .trust-content h2 {
            font-size: 3rem;
            margin-bottom: 4rem;
            font-weight: 800;
        }

        .trust-stats {
            display: flex;
            justify-content: center;
            gap: 5rem;
        }

        .stat-item {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .stat-number {
             font-size: 4rem;
             font-weight: 900;
             color: var(--color-primary);
             line-height: 1;
        }

        .stat-label {
             font-size: 1.2rem;
             color: white;
             text-transform: uppercase;
             letter-spacing: 0.1em;
        }

        @media (max-width: 768px) {
          .section-header { flex-direction: column; align-items: start; gap: 1rem; }
          .section-header h2 { font-size: 2rem; }
          .trust-stats { flex-direction: column; gap: 3rem; }
        }
      `}</style>
    </main>
  );
};

export default Home;
