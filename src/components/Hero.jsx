import { ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-bg">
        {/* Background Image - Desktop */}
        <div
          className="hero-bg-image hidden md:block"
          style={{ backgroundImage: `url(/autosporting-hero-v2.jpg)` }} // Using existing asset
        />
        {/* Background Image - Mobile - Fallback to same for now or valid asset */}
        <div
          className="hero-bg-image md:hidden"
          style={{ backgroundImage: `url(/autosporting-hero-v2.jpg)` }}
        />
      </div>

      {/* Gradients to match reference */}
      <div className="hero-overlay-gradient-1"></div>
      <div className="hero-overlay-gradient-2"></div>

      <div className="container hero-content">
        <div className="lg:col-span-7 flex flex-col justify-center h-full">

          {/* Location Badge */}
          <div className="badge-location fade-in-up delay-1">
            <span className="font-medium">Comodoro Rivadavia</span>
          </div>

          <div className="mb-2 fade-in-up delay-2">
            <h1 className="hero-title">
              <span className="text-gradient">AutoSporting</span>
            </h1>
            <h2 className="hero-subtitle">
              Concesionaria Multimarca
            </h2>
          </div>

          {/* Features Pills */}
          <div className="features-list fade-in-up delay-3">
            <span className="feature-pill">✓ Usados</span>
            <span className="feature-pill">✓ 0km</span>
            <span className="feature-pill">✓ Financiación</span>
          </div>

          <p className="hero-description fade-in-up delay-3">
            Encontrá el auto que buscás. Vehículos seleccionados con los mejores precios y garantía de calidad.
          </p>

          {/* CTA Buttons */}
          <div className="hero-actions fade-in-up delay-4">
            <Link to="/catalogo" className="btn-hero-primary group">
              <span className="relative z-10 flex items-center justify-center gap-2">
                Ver Catálogo
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <Link to="/contacto" className="btn-hero-secondary">
              <span className="relative z-10 flex items-center justify-center gap-2">
                Contactanos
              </span>
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .fade-in-up {
            opacity: 0;
            animation: fadeInUp 0.8s ease-out forwards;
        }

        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.3s; }
        .delay-3 { animation-delay: 0.5s; }
        .delay-4 { animation-delay: 0.7s; }

        .hero {
          position: relative;
          min-height: 600px;
          height: 90vh; /* Adjust as needed */
          display: flex;
          align-items: center;
          margin-top: calc(var(--header-height) * -1); /* Under navbar */
          padding-top: var(--header-height);
          overflow: hidden;
          background-color: #000;
        }

        /* Backgrounds & Overlays */
        .hero-bg, .hero-bg-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          z-index: 0;
        }

        .hero-overlay-gradient-1 {
            position: absolute;
            inset: 0;
            background: linear-gradient(to bottom right, rgba(0,0,0,0.8), rgba(0,0,0,0.6), rgba(0,0,0,0.7));
            z-index: 1;
        }

        .hero-overlay-gradient-2 {
            position: absolute;
            inset: 0;
            background: linear-gradient(to top, rgba(0,0,0,0.4), rgba(0,0,0,0.1), rgba(0,0,0,0.2));
            z-index: 1;
        }

        .hero-content {
          position: relative;
          z-index: 10;
          width: 100%;
          height: 100%;
          padding-top: 4rem;
          padding-bottom: 4rem;
          display: flex;
          align-items: center;
        }

        /* Typography & Elements */
        .badge-location {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background-color: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 9999px; /* full rounded */
            width: fit-content;
            margin-bottom: 1rem; 
            /* transform: translateX(-30px); animation handles this? Reference had it */
        }
        
        .badge-location span {
             color: white;
             font-size: 0.9rem;
             text-transform: uppercase;
             letter-spacing: 0.05em;
        }

        .hero-title {
            font-family: var(--font-title); /* Anton */
            font-size: clamp(3rem, 8vw, 6rem); /* Responsive giant text */
            font-weight: 800; /* Extra bold */
            line-height: 1;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.02em;
        }

        .text-gradient {
             background: linear-gradient(to right, #ffffff, #ffffff, #e5e5e5);
             -webkit-background-clip: text;
             -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
            font-family: var(--font-title);
            font-size: clamp(1.5rem, 4vw, 3.5rem);
            font-weight: 600;
            color: var(--color-primary); /* #EB2628 */
            text-transform: uppercase;
            margin-bottom: 1.5rem;
        }

        .features-list {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
            align-items: center;
        }

        .feature-pill {
             padding: 0.5rem 1rem;
             background-color: rgba(255, 255, 255, 0.1);
             backdrop-filter: blur(4px);
             border: 1px solid rgba(255, 255, 255, 0.2);
             border-radius: 0.5rem;
             color: white;
             font-weight: 500;
             font-size: 0.95rem;
        }

        .hero-description {
            font-size: 1.15rem;
            color: rgba(255, 255, 255, 0.8);
            max-width: 650px;
            line-height: 1.6;
            margin-bottom: 2rem;
        }

        .hero-actions {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        @media (min-width: 640px) {
            .hero-actions { flex-direction: row; }
        }

        /* Buttons matching reference */
        .btn-hero-primary {
            position: relative;
            padding: 1rem 2rem;
            background-color: var(--color-primary);
            color: white;
            font-weight: 700;
            font-size: 1.125rem;
            border-radius: 0.75rem; /* rounded-xl */
            overflow: hidden;
            transition: all 0.3s;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            display: inline-flex;
            text-decoration: none;
        }
        
        .btn-hero-primary:hover {
            box-shadow: 0 20px 25px -5px rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }

        .btn-hero-secondary {
            position: relative;
            padding: 1rem 2rem;
            background-color: transparent;
            backdrop-filter: blur(4px);
            border: 2px solid white;
            color: white;
            font-weight: 700;
            font-size: 1.125rem;
            border-radius: 0.75rem;
            transition: all 0.3s;
            display: inline-flex;
            text-decoration: none;
        }

        .btn-hero-secondary:hover {
            background-color: white;
            color: black;
            box-shadow: 0 20px 25px -5px rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
        }

        /* Utility helper for hidden/block */
        .hidden { display: none; }
        @media (min-width: 768px) {
            .md\\:block { display: block; }
            .md\\:hidden { display: none; }
        }

      `}</style>
    </section>
  );
};

export default Hero;
