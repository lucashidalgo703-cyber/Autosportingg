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
          background: linear-gradient(180deg, #111 0%, #0a0a0a 100%);
          position: relative;
          overflow: hidden;
        }
        
        /* Subtle texture overlay */
        .features-section::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background-image: 
                radial-gradient(circle at 50% 50%, rgba(235, 38, 40, 0.03) 0%, transparent 50%),
                linear-gradient(45deg, rgba(255,255,255,0.02) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.02) 75%, rgba(255,255,255,0.02)),
                linear-gradient(-45deg, rgba(255,255,255,0.02) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.02) 75%, rgba(255,255,255,0.02));
            background-size: 100% 100%, 20px 20px, 20px 20px;
            opacity: 0.5;
            pointer-events: none;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          position: relative;
          z-index: 10;
        }

        .feature-card {
          /* Carbon Texture */
          background-color: #0c0c0c;
          background-image: 
            linear-gradient(45deg, rgba(255, 255, 255, 0.03) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.03) 75%, rgba(255, 255, 255, 0.03)),
            linear-gradient(45deg, rgba(255, 255, 255, 0.03) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.03) 75%, rgba(255, 255, 255, 0.03));
          background-size: 6px 6px;
          background-position: 0 0, 3px 3px;
          
          backdrop-filter: blur(10px);
          padding: 2.5rem;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          text-align: center;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .feature-card:hover {
          transform: translateY(-10px);
          background-color: #111; /* Slightly lighter on hover */
          border-color: var(--color-primary);
          box-shadow: 0 20px 40px -10px rgba(235, 38, 40, 0.15); /* Red glow match */
        }

        .icon-wrapper {
          width: 70px;
          height: 70px;
          background: linear-gradient(135deg, var(--color-surface) 0%, #000 100%);
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
