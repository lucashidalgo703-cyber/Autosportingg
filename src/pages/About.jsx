import { ShieldCheck, TrendingUp, Users, CheckCircle2 } from 'lucide-react';

const About = () => {
  return (
    <main className="container page-padding">
      <div className="about-header">
        <span className="subtitle">SOBRE NOSOTROS</span>

      </div>

      {/* NUEVO BLOQUE INSTITUCIONAL */}
      <section className="about-block">
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
          <a className="btn-primary" href="/contacto">Consultar financiación</a>
          <a className="btn-ghost" href="/catalogo">Ver catálogo</a>
        </div>
      </section>

      <div className="values-grid">
        <div className="value-card">
          <ShieldCheck size={48} color="var(--color-primary)" />
          <h3>Excelencia</h3>
          <p>
            Seleccionamos cada unidad bajo criterios estrictos de calidad, historial verificable y
            revisión técnica exhaustiva. Solo publicamos vehículos que cumplen nuestros estándares internos.
          </p>
        </div>
        <div className="value-card">
          <Users size={48} color="var(--color-primary)" />
          <h3>Confianza</h3>
          <p>
            Operaciones claras, documentación al día y asesoramiento transparente en cada etapa.
            Nuestro compromiso es que tomes decisiones con información real y respaldo profesional.
          </p>
        </div>
        <div className="value-card">
          <TrendingUp size={48} color="var(--color-primary)" />
          <h3>Innovación</h3>
          <p>
            Integramos herramientas digitales, valuaciones actualizadas y opciones de financiación
            a medida para ofrecer una experiencia ágil, moderna y eficiente.
          </p>
        </div>
      </div>

      <style>{`
        .page-padding {
          padding-top: 4rem;
          padding-bottom: 5rem;
        }

        .about-header {
          text-align: center;
          max-width: 800px;
          margin: 0 auto 3rem;
        }

        .subtitle {
          color: var(--color-primary);
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-size: 0.9rem;
          display: block;
          margin-bottom: 1rem;
        }

        .about-header h1 {
          font-size: 3.5rem;
          margin-bottom: 1.5rem;
          line-height: 1.1;
        }

        .lead {
          color: var(--color-text-muted);
          font-size: 1.25rem;
          line-height: 1.6;
        }

        /* BLOQUE INSTITUCIONAL */
        .about-block {
          max-width: 1000px;
          margin: 0 auto 3.5rem;
          padding: 2.25rem 2rem;
          background: rgba(15, 15, 15, 0.65);
          border: 1px solid rgba(255, 0, 0, 0.22);
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.55);
          backdrop-filter: blur(8px);
        }

        .about-block h2 {
          font-size: 1.6rem;
          margin-bottom: 1rem;
          text-align: center;
        }

        .about-text {
          color: var(--color-text-muted);
          line-height: 1.8;
          font-size: 1.05rem;
          margin: 0 auto 1.5rem;
          max-width: 900px;
          text-align: center;
        }

        .about-highlights {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 1.5rem;
          align-items: start;
          margin-top: 1.25rem;
        }

        .about-list {
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 1.25rem 1.25rem;
          background: rgba(0,0,0,0.25);
        }

        .about-item {
          display: flex;
          gap: 0.7rem;
          align-items: flex-start;
          padding: 0.55rem 0;
          color: #d3d3d3;
          line-height: 1.5;
        }

        .about-finance {
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 1.25rem 1.25rem;
          background: rgba(0,0,0,0.25);
        }

        .about-finance h3 {
          margin: 0 0 0.75rem;
          font-size: 1.15rem;
        }

        .about-finance p {
          margin: 0;
          color: var(--color-text-muted);
          line-height: 1.7;
        }

        .about-claim {
          margin: 1.5rem 0 1.25rem;
          text-align: center;
          font-size: 1.05rem;
        }

        .about-cta {
          display: flex;
          gap: 0.9rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.9rem 1.2rem;
          border-radius: 12px;
          background: rgba(255, 0, 0, 0.85);
          color: #fff;
          text-decoration: none;
          font-weight: 700;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 10px 30px rgba(0,0,0,0.45);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 35px rgba(0,0,0,0.6);
        }

        .btn-ghost {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.9rem 1.2rem;
          border-radius: 12px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.14);
          color: #fff;
          text-decoration: none;
          font-weight: 700;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .btn-ghost:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 0, 0, 0.35);
        }

        /* Tarjetas existentes */
        .values-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .value-card {
          background-color: var(--color-surface);
          padding: 3rem 2rem;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #333;
          transition: transform 0.3s ease;
        }

        .value-card:hover {
          transform: translateY(-5px);
          border-color: var(--color-primary);
        }

        .value-card h3 {
          margin: 1.5rem 0 1rem;
          font-size: 1.5rem;
        }

        .value-card p {
          color: var(--color-text-muted);
          line-height: 1.6;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .about-highlights {
            grid-template-columns: 1fr;
          }
          .about-header h1 {
            font-size: 2.6rem;
          }
        }
      `}</style>
    </main>
  );
};

export default About;
