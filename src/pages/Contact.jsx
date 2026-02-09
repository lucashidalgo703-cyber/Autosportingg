import { MapPin, Instagram, MessageCircle, Clock, ArrowUpRight } from 'lucide-react';

const Contact = () => {
  return (
    <main className="contact-page">
      {/* Header Section */}
      <section className="contact-header">
        <div className="header-overlay"></div>
        <div className="container header-content">
          <span className="badge">CONTACTO</span>
          <h1 className="header-title">
            Contactate con nosotros para <br />
            obtener más información
          </h1>
        </div>
      </section>

      {/* Grid de Contacto */}
      <section className="container contact-grid-section">
        <div className="contact-grid">
          {/* Card WhatsApp */}
          <a href="https://wa.me/5492974938642" target="_blank" rel="noopener noreferrer" className="contact-card">
            <div className="card-top">
              <div className="icon-box">
                <MessageCircle size={24} color="white" />
              </div>
              <span className="external-link-icon">
                <ArrowUpRight size={20} />
              </span>
            </div>
            <div className="card-content">
              <h3>WhatsApp</h3>
              <p className="card-value">2974938642</p>
              <span className="link-text">Mensaje directo</span>
            </div>
          </a>

          {/* Card Instagram */}
          <a href="https://instagram.com/autosporting.cr" target="_blank" rel="noopener noreferrer" className="contact-card">
            <div className="card-top">
              <div className="icon-box">
                <Instagram size={24} color="white" />
              </div>
              <span className="external-link-icon">
                <ArrowUpRight size={20} />
              </span>
            </div>
            <div className="card-content">
              <h3>Instagram</h3>
              <p className="card-value">@autosporting.cr</p>
              <span className="link-text">Seguinos</span>
            </div>
          </a>

          {/* Card Ubicación */}
          <a href="https://maps.app.goo.gl/PuuMDFJsR4SWxHuu5" target="_blank" rel="noopener noreferrer" className="contact-card">
            <div className="card-top">
              <div className="icon-box">
                <MapPin size={24} color="white" />
              </div>
              <span className="external-link-icon">
                <ArrowUpRight size={20} />
              </span>
            </div>
            <div className="card-content">
              <h3>Ubicación</h3>
              <p className="card-value">Av. Julio Argentino Roca 116, U9000 Comodoro Rivadavia, Chubut</p>
              <span className="link-text">Ver en Google Maps</span>
            </div>
          </a>
        </div>

        {/* Sección Horarios */}
        <div className="hours-card">
          <div className="hours-header">
            <div className="icon-box">
              <Clock size={24} color="white" />
            </div>
            <h3>Horarios de atención</h3>
          </div>
          <div className="hours-list">
            <div className="hour-row">
              <span className="status-dot"></span>
              <span className="hour-text">Lunes a Viernes <strong>10:00 a 19:00hs</strong></span>
            </div>
            <div className="hour-row">
              <span className="status-dot"></span>
              <span className="hour-text">Sábado <strong>10:30 a 13:00hs</strong></span>
            </div>
          </div>
        </div>

        {/* Mapa Embebido - Actualizado con enlace específico de negocio */}
        <div className="map-container">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2616.590509673966!2d-67.48641902319086!3d-45.87249997103233!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xbde457599723237d%3A0xc3f73e8e1966a4f5!2sAv.+Julio+Argentino+Roca+116%2C+U9000+Comodoro+Rivadavia%2C+Chubut!5e0!3m2!1ses!2sar!4v1714078800000!5m2!1ses!2sar"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Ubicación AutoSporting"
          ></iframe>
        </div>
      </section>

      <style>{`
                .contact-page {
                    padding-bottom: 5rem;
                }

                /* Header Styles */
                .contact-header {
                    position: relative;
                    height: 400px;
                    display: flex;
                    align-items: flex-start; /* Aligns to top, pushed down by padding */
                    /* background-image removed to show global background */
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    margin-top: calc(var(--header-height) * -1);
                }

                .header-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.9) 100%);
                }

                .header-content {
                    position: relative;
                    z-index: 10;
                    /* Adjusted padding to move text "up" as requested */
                    padding-top: calc(var(--header-height) + 4rem);
                }

                .badge {
                    display: inline-block;
                    background-color: rgba(255, 255, 255, 0.1);
                    color: white;
                    padding: 6px 14px;
                    border-radius: 999px;
                    font-size: 0.825rem;
                    font-weight: 500;
                    margin-bottom: 1.5rem;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    letter-spacing: 0.05em;
                }

                .header-title {
                    font-size: 3rem; 
                    font-weight: 600;
                    line-height: 1.1;
                    color: rgba(255, 255, 255, 0.95);
                    letter-spacing: -0.02em;
                }

                /* Grid Styles */
                .contact-grid-section {
                    margin-top: -60px; /* Adjusted overlap */
                    position: relative;
                    z-index: 20;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .contact-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 1.5rem;
                }

                .contact-card {
                    /* Carbon Texture */
                    background-color: #0c0c0c;
                    background-image: 
                        linear-gradient(45deg, rgba(255, 255, 255, 0.03) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.03) 75%, rgba(255, 255, 255, 0.03)),
                        linear-gradient(45deg, rgba(255, 255, 255, 0.03) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.03) 75%, rgba(255, 255, 255, 0.03));
                    background-size: 6px 6px;
                    background-position: 0 0, 3px 3px;
                    
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    padding: 2rem;
                    display: flex;
                    flex-direction: column;
                    gap: 3.5rem; /* Adjusted gap inside card */
                    transition: all 0.3s ease;
                    text-decoration: none;
                }

                .contact-card:hover {
                    border-color: var(--color-primary);
                    transform: translateY(-2px);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }

                .card-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: start;
                }

                .icon-box {
                    background-color: rgb(26, 26, 26);
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .external-link-icon {
                    color: #666;
                    transition: color 0.3s;
                }

                .contact-card:hover .external-link-icon {
                    color: white;
                }

                .card-content h3 {
                    color: #fff;
                    font-size: 1.125rem; /* 18px */
                    margin-bottom: 0.5rem;
                    font-weight: 600;
                }

                .card-value {
                    color: rgb(163, 163, 163); /* Neutral-400 equivalent */
                    font-size: 1rem;
                    margin-bottom: 1.5rem;
                    line-height: 1.5;
                }

                .link-text {
                    color: var(--color-primary);
                    font-weight: 500;
                    font-size: 0.95rem;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .link-text::after {
                    content: '→';
                    transition: transform 0.2s;
                }

                .contact-card:hover .link-text::after {
                    transform: translateX(4px);
                }

                /* Hours Card styling */
                .hours-card {
                    /* Carbon Texture */
                    background-color: #0c0c0c;
                    background-image: 
                        linear-gradient(45deg, rgba(255, 255, 255, 0.03) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.03) 75%, rgba(255, 255, 255, 0.03)),
                        linear-gradient(45deg, rgba(255, 255, 255, 0.03) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.03) 75%, rgba(255, 255, 255, 0.03));
                    background-size: 6px 6px;
                    background-position: 0 0, 3px 3px;

                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    padding: 2rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .hours-header {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .hours-header h3 {
                    font-size: 1.25rem;
                    color: white;
                    font-weight: 600;
                }

                .hours-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    padding-left: 0.5rem;
                }

                .hour-row {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .status-dot {
                    width: 8px;
                    height: 8px;
                    background-color: var(--color-primary);
                    border-radius: 50%;
                }

                .hour-text {
                    color: rgb(212, 212, 212); /* text-neutral-300 */
                    font-size: 1rem;
                }
                
                .hour-text strong {
                    color: white;
                    font-weight: 500;
                    margin-left: 0.5rem;
                }

                /* Map Container */
                .map-container {
                    height: 450px;
                    width: 100%;
                    border-radius: 16px;
                    overflow: hidden;
                    border: 1px solid rgb(50, 50, 50);
                    margin-top: 1rem;
                }

                @media (max-width: 768px) {
                    .header-title { font-size: 2.25rem; }
                    .contact-card { gap: 2rem; }
                    .map-container { height: 350px; }
                    .contact-grid-section { margin-top: -40px; }
                }
            `}</style>
    </main>
  );
};

export default Contact;
