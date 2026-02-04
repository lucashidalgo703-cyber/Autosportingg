import { ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const Hero = () => {
  console.log("Hero component version: 3.0 Strict Match Loaded");
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
        <div className="hero-text-wrapper">

          {/* Location Badge */}
          <div className="badge-location fade-in-up delay-1">
            <span className="font-medium">Comodoro Rivadavia</span>
          </div>

          <div className="mb-2 fade-in-up delay-2">
            <h1 className="hero-title">
              <span className="text-white">AutoSporting</span>
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
          /* Explicit Gradient per user request */
          background: radial-gradient(circle at 50% 30%, #1a1a1a 0%, #050505 100%);
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

      /* Hero Content Layout - SIMPLIFIED & STRICT */
        .hero-content {
          position: relative;
          z-index: 10;
          width: 100%;
          height: 100%;
          /* Center content VERTICALLY in the screen */
          display: flex;
          align-items: center; 
          /* Align content HORIZONTALLY to the start (left) */
          justify-content: flex-start;
          
          padding-top: 4rem;
          padding-bottom: 4rem;
        }

        /* The inner wrapper for text elements */
        .hero-text-wrapper {
            display: flex;
            flex-direction: column;
            align-items: flex-start; /* STRICT LEFT ALIGNMENT */
            justify-content: center;
            text-align: left; /* Ensure text inherits left alignment */
            max-width: 900px;
            width: 100%;
        }

        /* Typography & Elements */
        /* Badge styling to match reference dark pill */
        .badge-location {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background-color: rgba(30, 30, 30, 0.6); /* Darker semitransparent like reference */
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 9999px; 
            width: fit-content;
            margin-bottom: 1.5rem; 
        }
        
        .badge-location span {
             color: white;
             font-size: 0.9rem;
             text-transform: uppercase;
             letter-spacing: 0.05em;
             font-family: 'Inter', sans-serif;
             font-weight: 600;
        }

        /* Hero Actions Layout */
        .hero-actions {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-top: 1.5rem;
        }

        @media (min-width: 500px) {
            .hero-actions {
                flex-direction: row; 
                align-items: center;
            }
        }

        /* Typography - FINAL CORRECTIVE MATCH (INTER) */
        
        .hero-title {
            font-family: 'Inter', system-ui, sans-serif;
            font-weight: 900; 
            line-height: 1.1;
            margin-bottom: 0.25rem;
            text-transform: none; 
            letter-spacing: -0.02em;
            color: #FFFFFF;
            
            font-size: 3.5rem; 
        }

        /* Scaling */
        @media (min-width: 640px) { .hero-title { font-size: 4.5rem; } }
        @media (min-width: 1024px) { .hero-title { font-size: 5.5rem; } } 
        @media (min-width: 1280px) { .hero-title { font-size: 6.5rem; } } 

        .hero-subtitle {
            font-family: 'Inter', system-ui, sans-serif;
            font-weight: 700;
            color: #EB2628; 
            line-height: 1.2;
            margin-top: 0;
            margin-bottom: 1.5rem; /* Tighter spacing like reference */
            text-transform: none;
            
            font-size: 2rem;
        }
        
        @media (min-width: 640px) { .hero-subtitle { font-size: 2.25rem; } }
        @media (min-width: 1024px) { .hero-subtitle { font-size: 3rem; } }
        @media (min-width: 1280px) { .hero-subtitle { font-size: 3.5rem; } }

        /* Description & Body */
        .hero-description {
            font-family: 'Inter', system-ui, sans-serif;
            font-size: 1.125rem;
            color: rgba(255, 255, 255, 0.85);
            max-width: 650px;
            margin-bottom: 2rem;
            line-height: 1.6;
            font-weight: 400;
        }

        .features-list {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            margin-bottom: 1.5rem; /* Ensure space before description */
            align-items: center;
            font-family: 'Inter', system-ui, sans-serif;
        }
        
        .feature-pill {
             padding: 0.5rem 1rem; /* px-4 py-2 */
             background-color: rgba(255, 255, 255, 0.1);
             backdrop-filter: blur(4px);
             border: 1px solid rgba(255, 255, 255, 0.2);
             border-radius: 0.5rem;
             color: white;
             font-size: 1rem;
             font-weight: 500;
             display: inline-flex;
             align-items: center;
             gap: 0.4rem;
        }

         /* Buttons */
        .btn-hero-primary {
            position: relative;
            padding: 1rem 2rem; 
            background-color: var(--color-primary);
            color: white;
            font-family: 'Inter', sans-serif;
            font-weight: 700;
            font-size: 1.125rem; 
            border-radius: 0.5rem; /* Slightly squarer 8px radius like reference */
            overflow: hidden;
            transition: all 0.3s;
            display: inline-flex;
            text-decoration: none;
            align-items: center;
            justify-content: center;
        }
        
        .btn-hero-secondary {
            position: relative;
            padding: 1rem 2rem;
            background-color: transparent;
            /* No blur on reference secondary button, just border */
            border: 2px solid white;
            color: white;
            font-family: 'Inter', sans-serif;
            font-weight: 700;
            font-size: 1.125rem; 
            border-radius: 0.5rem; 
            transition: all 0.3s;
            display: inline-flex;
            text-decoration: none;
            align-items: center;
            justify-content: center;
        }

        .btn-hero-secondary:hover {
            background-color: white;
            color: black;
        }

        /* Utility helper for hidden/block */
        .hidden { display: none; }
        @media (min-width: 768px) {
            .md\\:block { display: block; }
            .md\\:hidden { display: none; }
        }

        .container {
             width: 100%;
             margin-right: auto;
             margin-left: auto;
             padding-right: 1.5rem;
             padding-left: 1.5rem;
        }
        
        @media (min-width: 640px) { .container { max-width: 640px; } }
        @media (min-width: 1024px) { .container { max-width: 1024px; } }
        @media (min-width: 1280px) { .container { max-width: 1400px; } } /* Wider for impact */

      `}</style>
    </section>
  );
};

export default Hero;
