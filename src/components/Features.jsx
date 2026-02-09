import { ShieldCheck, FileCheck, Banknote } from 'lucide-react';

const Features = () => {
  return (
    <section className="features-section">
      <div className="container">
        <div className="features-grid">
          {/* Feature 01 */}
          <div className="feature-card">
            <div className="icon-wrapper">
              <Banknote size={32} />
            </div>
            <h3>Mejor Precio Garantizado</h3>
            <p>Cotizaciones justas y competitivas. Maximizamos el valor de tu usado y te ofrecemos las mejores condiciones para tu 0km.</p>
          </div>

          {/* Feature 02 */}
          <div className="feature-card">
            <div className="icon-wrapper">
              <ShieldCheck size={32} />
            </div>
            <h3>Revisión Vehicular</h3>
            <p>Calidad asegurada. Cada unidad atraviesa un estricto control mecánico y estético de 25 puntos antes de ingresar a nuestro salón.</p>
          </div>

          {/* Feature 03 */}
          <div className="feature-card">
            <div className="icon-wrapper">
              <FileCheck size={32} />
            </div>
            <h3>Documentación Ágil</h3>
            <p>Olvidate de los trámites. Contamos con gestoría propia para resolver transferencias y papeles en tiempo récord.</p>
          </div>
        </div>
      </div>

      <style>{`
        .features-section {
          padding: 6rem 0;
          background: transparent; /* Let global pattern show */
          position: relative;
        }
        
        /* Remove texture overlay since global has it */
        .features-section::before {
            display: none;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          position: relative;
          z-index: 10;
        }

        .feature-card {
          /* Glassmorphism */
          background: rgba(15, 15, 15, 0.4); /* Semi-transparent dark */
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 2.5rem;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
          text-align: center;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .feature-card:hover {
          transform: translateY(-10px);
          background: rgba(25, 25, 25, 0.6);
          border-color: var(--color-primary);
          box-shadow: 0 20px 40px -10px rgba(235, 38, 40, 0.15);
        }

        .icon-wrapper {
          width: 70px;
          height: 70px;
          background: rgba(255,255,255,0.03);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          color: var(--color-primary);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          transition: transform 0.3s ease, color 0.3s ease;
        }
        
        .feature-card:hover .icon-wrapper {
            transform: scale(1.1) rotate(5deg);
            color: white;
            background: var(--color-primary);
            border-color: var(--color-primary);
        }

        .feature-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .feature-card p {
          color: #aaa;
          line-height: 1.6;
          font-size: 0.95rem;
        }
      `}</style>
    </section>
  );
};

export default Features;
