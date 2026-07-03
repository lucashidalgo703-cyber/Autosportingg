"use client";
import { Search, FileText, Key } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  {
    icon: <Search size={32} />,
    title: "1. Buscá tu vehículo",
    description: "Explorá nuestro catálogo con fotos reales y especificaciones detalladas de cada unidad."
  },
  {
    icon: <FileText size={32} />,
    title: "2. Cotización y Asesoramiento",
    description: "Te guiamos con opciones de financiación y tasamos tu vehículo usado como parte de pago."
  },
  {
    icon: <Key size={32} />,
    title: "3. Entrega Llave en Mano",
    description: "Nos encargamos de toda la gestoría y el papeleo para que te lleves tu auto listo para usar."
  }
];

const PurchaseProcess = () => {
  return (
    <section className="purchase-process section-padding">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-4 text-[var(--c-ivory)]" style={{ fontFamily: 'var(--font-title)' }}>
            Comprar es simple
          </h2>
          <p className="text-[var(--c-ivory-muted)] max-w-2xl mx-auto">
            Nuestro proceso está diseñado para que no tengas que preocuparte por nada. Desde la búsqueda hasta la gestoría, nosotros nos encargamos.
          </p>
        </div>

        <div className="process-grid">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="process-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              viewport={{ once: true }}
            >
              <div className="step-icon-wrapper">
                {step.icon}
              </div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-desc">{step.description}</p>
              
              {index < steps.length - 1 && (
                <div className="step-connector hidden lg:block"></div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        .purchase-process {
          background-color: var(--c-carbon);
          position: relative;
        }

        .process-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 3rem;
          position: relative;
        }

        @media (min-width: 1024px) {
          .process-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 2rem;
          }
        }

        .process-card {
          background: var(--c-graphite);
          border: var(--border-thin);
          border-radius: var(--radius-lg);
          padding: 3rem 2rem;
          text-align: center;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: all 0.3s ease;
        }

        .process-card:hover {
          border-color: var(--c-accent-red);
          transform: translateY(-5px);
          box-shadow: var(--shadow-md);
        }

        .step-icon-wrapper {
          width: 80px;
          height: 80px;
          background: var(--c-graphite-light);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--c-accent-red);
          margin-bottom: 2rem;
          border: var(--border-thin);
        }

        .step-title {
          color: var(--c-ivory);
          font-family: var(--font-title);
          font-size: 1.25rem;
          font-weight: 800;
          margin-bottom: 1rem;
        }

        .step-desc {
          color: var(--c-ivory-muted);
          line-height: 1.6;
          font-size: 0.95rem;
        }

        .step-connector {
          position: absolute;
          top: 4rem;
          right: -50%;
          width: 100%;
          height: 2px;
          background: dashed 2px var(--c-graphite-light);
          z-index: 0;
        }
      `}</style>
    </section>
  );
};

export default PurchaseProcess;
