import { MapPin, Phone, Instagram } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <h3>AUTOSPORTING</h3>
            <p>Elegí con seguridad. Conducí con confianza.</p>
          </div>

          <div className="footer-col">
            <h4>Navegación</h4>
            <a href="/">Inicio</a>
            <a href="/catalogo">Catálogo</a>
            <a href="/nosotros">Nosotros</a>
            <a href="/contacto">Contacto</a>
          </div>

          <div className="footer-col">
            <h4>Contacto</h4>
            <div className="contact-item">
              <MapPin size={18} color="var(--color-primary)" />
              <span>Av. Roca 116, Comodoro Rivadavia</span>
            </div>
            <div className="contact-item">
              <Phone size={18} color="var(--color-primary)" />
              <span>297-4045378</span>
            </div>
            <div className="social-links-footer" style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
              <a href="https://instagram.com/autosporting.cr" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Instagram size={20} color="var(--color-primary)" />
                <span>@autosporting.cr</span>
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} AutoSporting. Todos los derechos reservados.</p>
        </div>
      </div>

      <style>{`
        .footer {
          background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 100%);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          padding: 4rem 0 2rem;
          margin-top: auto;
          position: relative;
          border-top: 1px solid rgba(255,255,255,0.03);
        }
        
        .footer::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(235, 38, 40, 0.4), transparent);
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2.5rem;
          margin-bottom: 3rem;
          text-align: center;
        }

        @media (min-width: 640px) {
            .footer-grid {
                grid-template-columns: repeat(2, 1fr);
                text-align: left;
                gap: 2rem;
            }
        }

        @media (min-width: 1024px) {
            .footer-grid {
                grid-template-columns: 2fr 1fr 1.5fr;
                gap: 4rem;
            }
        }

        .footer-col h3 {
          color: white;
          margin-bottom: 1rem;
          font-size: 1.5rem;
          font-weight: 900;
          letter-spacing: -0.02em;
        }

        .footer-col h4 {
          color: white;
          margin-bottom: 1.25rem;
          font-size: 1.1rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .footer-col p, .footer-col a, .contact-item span {
          color: #999;
          font-size: 0.95rem;
          line-height: 1.6;
          display: block;
          transition: all 0.3s ease;
        }

        .footer-col a {
            padding: 0.4rem 0;
        }

        .footer-col a:hover {
          color: white;
          transform: translateX(5px);
        }
        
        @media (max-width: 640px) {
            .footer-col a:hover {
                transform: translateY(-2px);
            }
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        
        @media (max-width: 640px) {
            .contact-item {
                justify-content: center;
            }
            .social-links-footer {
                justify-content: center;
            }
        }

        .footer-bottom {
          text-align: center;
          padding-top: 2rem;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .footer-bottom p {
          color: #666;
          font-size: 0.85rem;
        }
      `}</style>
    </footer>
  );
};

export default Footer;
