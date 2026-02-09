import Hero from '../components/Hero';
import CarCard from '../components/CarCard';
import Features from '../components/Features';
import FAQ from '../components/FAQ';
import { useCars } from '../hooks/useCars';

const Home = () => {
  const { cars, loading } = useCars();

  const featuredCars = cars.filter(car => car.featured || car.year > 2020).slice(0, 8);

  return (
    <div className="home-container">
      <Hero />

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

      <Features />

      <section className="trust-banner">
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

      <FAQ />

      <style>{`
        .section-padding {
          padding-top: 5rem;
          padding-bottom: 5rem;
        }
        /* ... existing styles ... */
        
        /* Trust Banner Styles */
        .trust-banner {
            position: relative;
            padding: 8rem 0;
            margin-bottom: 5rem;
            text-align: center;
            /* Glassmorphism for banner */
            background: rgba(10, 10, 10, 0.3);
            backdrop-filter: blur(8px);
            border-top: 1px solid rgba(255,255,255,0.05);
            border-bottom: 1px solid rgba(255,255,255,0.05);
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
    </div>
  );
};

export default Home;
