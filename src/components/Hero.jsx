import { ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-bg">
        <div
          className="hero-bg-image"
          style={{ backgroundImage: `url(/autosporting-hero-v2.jpg)` }}
        />
      </div>

      <div className="hero-overlay"></div>

      <div className="container hero-content">
        <div className="hero-badge">
          <span>COMODORO RIVADAVIA</span>
        </div>

        <h1 className="hero-title">
          AUTOSPORTING <br />
          <span className="subtitle-hero">CONCESIONARIA MULTIMARCA</span>
        </h1>

        <div className="features-list">
          <div className="feature-pill"><Check size={16} /> USADOS SELECCIONADOS</div>
          <div className="feature-pill"><Check size={16} /> 0KM</div>
          <div className="feature-pill"><Check size={16} /> FINANCIACIÓN</div>
        </div>

        <div className="hero-actions">
          <Link to="/catalogo" className="btn btn-primary">
            Ver Catálogo
            <ArrowRight size={20} />
          </Link>
          <Link to="/contacto" className="btn btn-outline">
            Contactanos
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
        }

        .hero {
          position: relative;
          height: 90vh;
          min-height: 600px;
          display: flex;
          align-items: center;
          margin-top: calc(var(--header-height) * -1);
          overflow: hidden;
          background-color: #000;
        }

        .hero-bg {
          position: absolute;
          inset: 0;
          z-index: 1;
        }

        .hero-bg-image {
            width: 100%;
            height: 100%;
            background-size: cover;
            background-position: center;
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom, 
            rgba(0,0,0,0.85) 0%, 
            rgba(0,0,0,0.4) 50%, 
            rgba(0,0,0,0.9) 100%
          );
          z-index: 1;
        }

        .hero-content {
          position: relative;
          z-index: 10;
          max-width: 1200px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          height: 100%;
          padding-top: var(--header-height);
        }

        .hero-badge span {
          background-color: rgba(255,255,255,0.1);
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 0.8rem;
          letter-spacing: 0.1em;
          color: #ccc;
          border: 1px solid rgba(255,255,255,0.2);
          display: inline-block;
          margin-bottom: 1.5rem;
        }

        .hero-title {
          font-size: 5rem;
          font-weight: 900;
          line-height: 0.9;
          margin-bottom: 2rem;
          letter-spacing: -0.04em;
          color: white;
        }

        .subtitle-hero {
          font-size: 2rem;
          font-weight: 300;
          color: var(--color-primary);
          display: block;
          margin-top: 0.5rem;
          letter-spacing: 0.05em;
        }

        .features-list {
          display: flex;
          gap: 1rem;
          margin-bottom: 3rem;
          flex-wrap: wrap;
        }

        .feature-pill {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: white;
          font-weight: 600;
          font-size: 0.9rem;
          background-color: rgba(0,0,0,0.5);
          padding: 8px 16px;
          border-radius: 100px;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .hero-actions {
          display: flex;
          gap: 1.5rem;
        }

        @media (max-width: 768px) {
          .hero-title { font-size: 3.5rem; }
          .subtitle-hero { font-size: 1.5rem; }
          .hero-actions { flex-direction: column; }
          .features-list { flex-direction: column; gap: 0.5rem; align-items: start; }
        }
      `}</style>
    </section>
  );
};

export default Hero;
