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
              <span>297-4938642 / 297-4768429</span>
            </div>
            <div className="social-links-footer" style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
              <a href="https://instagram.com/autosporting.cr" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Instagram size={20} />
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
          background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%);
          backdrop-filter: blur(5px);
          padding: 4rem 0 2rem;
          margin-top: auto;
          position: relative;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        
        /* "Shine" separator with Red Accent */
        .footer::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 1px;
            /* Transparent -> Subtle Red -> Transparent */
            background: linear-gradient(90deg, transparent, rgba(235, 38, 40, 0.5), transparent);
        }

        .footer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 3rem;
          margin-bottom: 3rem;
        }

        .footer-col h3 {
          color: white;
          margin-bottom: 1rem;
          font-size: 1.5rem;
        }

        .footer-col h4 {
          color: white;
          margin-bottom: 1rem;
          font-size: 1.1rem;
        }

        .footer-col p, .footer-col a, .contact-item span {
          color: var(--color-text-muted);
          font-size: 0.95rem;
          line-height: 1.6;
          display: block;
        }

        .footer-col a:hover {
          color: var(--color-primary);
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .footer-bottom {
          text-align: center;
          padding-top: 2rem;
          border-top: 1px solid #333;
        }

        .footer-bottom p {
          color: #555;
          font-size: 0.9rem;
        }
      `}</style>
    </footer>
  );
};

export default Footer;
