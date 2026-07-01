"use client";
import { ShieldCheck, TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const About = () => {
  return (
    <main className="container page-padding section-padding">
      <div className="about-header">
        <span className="subtitle">SOBRE NOSOTROS</span>
        <h1 className="title-responsive">Excelencia y Confianza en Comodoro Rivadavia</h1>
      </div>

      {/* NUEVO BLOQUE INSTITUCIONAL */}
      <motion.section
        className="about-block"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true, amount: 0.1 }}
      >
        <h2>Confianza y respaldo en cada operación</h2>

        <p className="about-text">
          En <strong>AutoSporting</strong> entendemos que la seguridad y la garantía son aspectos
          fundamentales al momento de adquirir un vehículo. Por ello, cada unidad es sometida a un
          exhaustivo proceso de inspección técnica y verificación documental, garantizando estándares
          de calidad que brindan respaldo y tranquilidad.
        </p>

        <div className="about-highlights">
          <div className="about-list">
            <div className="about-item">
              <CheckCircle2 size={18} color="var(--color-primary)" />
              <span>Inspección técnica integral y control de calidad.</span>
            </div>
            <div className="about-item">
              <CheckCircle2 size={18} color="var(--color-primary)" />
              <span>Verificación de documentación e historial de la unidad.</span>
            </div>
            <div className="about-item">
              <CheckCircle2 size={18} color="var(--color-primary)" />
              <span>Asesoramiento profesional durante todo el proceso.</span>
            </div>
          </div>

          <div className="about-finance">
            <h3>Financiación y toma de usados</h3>
            <p>
              Ofrecemos la posibilidad de tomar su vehículo usado como parte de pago y, mediante la
              integración del <strong>50%</strong> del valor de la unidad seleccionada, financiar el saldo
              restante a través de <strong>cuotas fijas y accesibles</strong>.
            </p>
          </div>
        </div>

        <p className="about-claim">
          <strong>AutoSporting</strong> es sinónimo de confianza, respaldo y excelencia automotriz.
        </p>

        <div className="about-cta">
          <a className="btn-primary" href="/financiacion">Consultar financiación</a>
          <a className="btn-ghost" href="/catalogo">Ver catálogo</a>
        </div>
      </motion.section>

      <motion.div
        className="values-grid"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={containerVariants}
      >
        <motion.div className="value-card" variants={itemVariants}>
          <ShieldCheck size={48} color="var(--color-primary)" />
          <h3>Excelencia</h3>
          <p>
            Seleccionamos cada unidad bajo criterios estrictos de calidad, historial verificable y
            revisión técnica exhaustiva. Solo publicamos vehículos que cumplen nuestros estándares internos.
          </p>
        </motion.div>
        <motion.div className="value-card" variants={itemVariants}>
          <Users size={48} color="var(--color-primary)" />
          <h3>Confianza</h3>
          <p>
            Operaciones claras, documentación al día y asesoramiento transparente en cada etapa.
            Nuestro compromiso es que tomes decisiones con información real y respaldo profesional.
          </p>
        </motion.div>
        <motion.div className="value-card" variants={itemVariants}>
          <TrendingUp size={48} color="var(--color-primary)" />
          <h3>Innovación</h3>
          <p>
            Integramos herramientas digitales, valuaciones actualizadas y opciones de financiación
            a medida para ofrecer una experiencia ágil, moderna y eficiente.
          </p>
        </motion.div>
      </motion.div>

      <style>{`
        .page-padding {
          padding-top: 2rem;
        }

        @media (min-width: 768px) {
            .page-padding { padding-top: 4rem; }
        }

        .about-header {
          text-align: center;
          max-width: 800px;
          margin: 0 auto 2.5rem;
        }

        .subtitle {
          color: var(--color-primary);
          font-weight: 800;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          font-size: 0.8rem;
          display: block;
          margin-bottom: 0.75rem;
        }

        .title-responsive {
          font-size: clamp(2rem, 5vw, 3.5rem);
          font-weight: 900;
          margin-bottom: 0.5rem;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }

        .about-block {
          max-width: 900px;
          margin: 0 auto 4rem;
          padding: 1.5rem;
          background: rgba(15, 15, 15, 0.45);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }

        @media (min-width: 768px) {
            .about-block { padding: 2.5rem; }
        }

        .about-block h2 {
          font-size: 1.5rem;
          margin-bottom: 1.25rem;
          text-align: center;
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        .about-text {
          color: #999;
          line-height: 1.7;
          font-size: 1rem;
          margin-bottom: 2rem;
          text-align: center;
        }

        .about-highlights {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
          margin-bottom: 2rem;
        }

        @media (min-width: 768px) {
            .about-highlights { grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        }

        .about-list, .about-finance {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.25rem;
        }

        .about-item {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          padding: 0.5rem 0;
          color: #ccc;
          font-size: 0.95rem;
        }

        .about-finance h3 {
          margin-bottom: 0.5rem;
          font-size: 1.1rem;
          font-weight: 700;
        }

        .about-finance p {
          color: #888;
          font-size: 0.9rem;
          line-height: 1.6;
        }

        .about-cta {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn-primary, .btn-ghost {
          padding: 0.8rem 1.75rem;
          border-radius: 50px;
          font-weight: 700;
          font-size: 0.95rem;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .btn-primary {
          background: var(--color-primary);
          color: white;
          box-shadow: 0 4px 15px rgba(235, 38, 40, 0.3);
        }

        .btn-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(235, 38, 40, 0.5);
        }

        .btn-ghost {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
        }

        .btn-ghost:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
        }

        .values-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .value-card {
          background: rgba(15, 15, 15, 0.45);
          backdrop-filter: blur(8px);
          padding: 2.5rem 1.5rem;
          border-radius: 16px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.3s ease;
        }

        .value-card:hover {
          border-color: var(--color-primary);
          background: rgba(20, 20, 20, 0.6);
        }

        .value-card h3 {
          margin: 1.25rem 0 0.75rem;
          font-size: 1.35rem;
          font-weight: 800;
        }

        .value-card p {
          color: #888;
          font-size: 0.95rem;
          line-height: 1.6;
        }
      `}</style>
    </main>
  );
};

export default About;
