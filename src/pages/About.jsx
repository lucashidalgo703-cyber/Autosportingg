import { ShieldCheck, TrendingUp, Users } from 'lucide-react';

const About = () => {
    return (
        <main className="container page-padding">
            <div className="about-header">
                <span className="subtitle">SOBRE NOSOTROS</span>
                <h1>Tu socio de confianza</h1>
                <p className="lead">
                    En AutoSporting, nos especializamos en vehículos usados y 0km seleccionados.
                    Nuestro compromiso incluye asesoramiento personalizado, procesos de financiamiento
                    accesibles y garantía de calidad en cada unidad.
                </p>
            </div>

            <div className="values-grid">
                <div className="value-card">
                    <ShieldCheck size={48} color="var(--color-primary)" />
                    <h3>Excelencia</h3>
                    <p>Riguroso proceso de selección y revisión técnica para garantizar la mejor calidad.</p>
                </div>
                <div className="value-card">
                    <Users size={48} color="var(--color-primary)" />
                    <h3>Confianza</h3>
                    <p>Transparencia total en historial del vehículo y documentación al día.</p>
                </div>
                <div className="value-card">
                    <TrendingUp size={48} color="var(--color-primary)" />
                    <h3>Innovación</h3>
                    <p>Evolución constante en plataformas digitales y soluciones financieras a tu medida.</p>
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
          margin: 0 auto 5rem;
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
      `}</style>
        </main>
    );
};

export default About;
