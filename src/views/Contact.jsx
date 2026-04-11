"use client";
import { MapPin, Instagram, MessageCircle, Clock, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const Contact = () => {
  return (
    <main className="contact-page">
      {/* Header Section */}
      <section className="contact-header">
        <motion.div
          className="container header-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <span className="badge">CONTACTO</span>
          <h1 className="header-title">
            Conectate con el próximo <br />
            nivel de conducción
          </h1>
        </motion.div>
      </section>

      {/* Grid de Contacto */}
      <section className="container contact-grid-section">
        <motion.div
          className="contact-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
        >
          {/* Card WhatsApp */}
          <motion.a href="https://wa.me/5492974045378" target="_blank" rel="noopener noreferrer" className="contact-card" variants={itemVariants}>
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
              <p className="card-value">2974045378</p>
              <span className="link-text">Mensaje directo</span>
            </div>
          </motion.a>

          {/* Card Instagram */}
          <motion.a href="https://instagram.com/autosporting.cr" target="_blank" rel="noopener noreferrer" className="contact-card" variants={itemVariants}>
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
          </motion.a>

          {/* Card Ubicación */}
          <motion.a href="https://maps.app.goo.gl/PuuMDFJsR4SWxHuu5" target="_blank" rel="noopener noreferrer" className="contact-card" variants={itemVariants}>
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
          </motion.a>
        </motion.div>

        {/* Sección Horarios */}
        <motion.div
          className="hours-card"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, amount: 0.2 }}
        >
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
        </motion.div>

        {/* Mapa Embebido - Actualizado con enlace específico de negocio */}
        <motion.div
          className="map-container"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
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
        </motion.div>
      </section>

      <style>{`
                .contact-page {
                    padding-bottom: 5rem;
                    position: relative;
                }

                /* Global Overlay to tone down background */
                .contact-page::before {
                    content: '';
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.55);
                    z-index: 0;
                    pointer-events: none;
                }

                .contact-header {
                    position: relative;
                    height: 50vh;
                    min-height: 400px;
                    display: flex;
                    align-items: center;
                    margin-top: calc(var(--header-height) * -1);
                    z-index: 10;
                    overflow: hidden;
                }

                .header-content {
                    position: relative;
                    z-index: 10;
                    padding-top: var(--header-height);
                }

                .badge {
                    display: inline-block;
                    background: rgba(235, 38, 40, 0.1);
                    color: var(--color-primary);
                    padding: 6px 16px;
                    border-radius: 50px;
                    font-size: 0.75rem;
                    font-weight: 800;
                    margin-bottom: 1.5rem;
                    border: 1px solid rgba(235, 38, 40, 0.2);
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                }

                .header-title {
                    font-size: clamp(2.5rem, 8vw, 4.5rem);
                    font-weight: 900;
                    line-height: 1;
                    color: #ffffff;
                    letter-spacing: -0.04em;
                    max-width: 900px;
                }

                .contact-grid-section {
                    margin-top: -80px;
                    position: relative;
                    z-index: 20;
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }

                .contact-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                    gap: 1.5rem;
                }

                .contact-card {
                    background: rgba(20, 20, 20, 0.6);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 24px;
                    padding: 2.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 4rem;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    text-decoration: none;
                }

                .contact-card:hover {
                    transform: translateY(-10px);
                    border-color: rgba(235, 38, 40, 0.4);
                    background: rgba(25, 25, 25, 0.8);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }

                .card-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: start;
                }

                .icon-box {
                    background: rgba(255, 255, 255, 0.03);
                    width: 56px;
                    height: 56px;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    color: var(--color-primary);
                    transition: all 0.3s ease;
                }

                .contact-card:hover .icon-box {
                    background: var(--color-primary);
                    color: white;
                    transform: rotate(5deg) scale(1.1);
                }

                .external-link-icon {
                    color: #444;
                    transition: color 0.3s, transform 0.3s;
                }

                .contact-card:hover .external-link-icon {
                    color: white;
                    transform: translate(2px, -2px);
                }

                .card-content h3 {
                    color: #888;
                    font-size: 0.85rem;
                    margin-bottom: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }

                .card-value {
                    color: #ffffff;
                    font-size: 1.5rem;
                    margin-bottom: 1.5rem;
                    line-height: 1.2;
                    font-weight: 800;
                    letter-spacing: -0.02em;
                }

                .link-text {
                    color: var(--color-primary);
                    font-weight: 800;
                    font-size: 0.9rem;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                
                .link-text::after {
                    content: '→';
                    transition: transform 0.2s;
                }

                .contact-card:hover .link-text::after {
                    transform: translateX(5px);
                }

                .hours-card {
                    background: rgba(20, 20, 20, 0.6);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 24px;
                    padding: 2.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }

                .hours-header {
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                }
                
                .hours-header h3 {
                    font-size: 1.5rem;
                    color: #ffffff;
                    font-weight: 800;
                    letter-spacing: -0.02em;
                }

                .hours-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1.5rem;
                }

                .hour-row {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    padding: 1.25rem;
                    background: rgba(255,255,255,0.02);
                    border-radius: 16px;
                    border: 1px solid rgba(255,255,255,0.03);
                }

                .status-dot {
                    width: 6px;
                    height: 6px;
                    background-color: var(--color-primary);
                    border-radius: 50%;
                    margin-bottom: 0.5rem;
                }

                .hour-text {
                    color: #777;
                    font-size: 0.9rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                
                .hour-text strong {
                    color: #ffffff;
                    font-size: 1.25rem;
                    font-weight: 800;
                    display: block;
                    margin-top: 0.25rem;
                    letter-spacing: -0.01em;
                }

                .map-container {
                    height: 500px;
                    width: 100%;
                    border-radius: 24px;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    margin-top: 1rem;
                    box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.5);
                }

                @media (max-width: 768px) {
                    .contact-header { height: 40vh; }
                    .header-title { font-size: 2.75rem; }
                    .contact-card { padding: 2rem; gap: 3rem; }
                    .card-value { font-size: 1.25rem; }
                    .map-container { height: 350px; }
                    .contact-grid-section { margin-top: -60px; }
                }
            `}</style>
    </main>
  );
};

export default Contact;
