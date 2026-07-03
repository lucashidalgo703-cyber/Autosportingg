"use client";
import Link from 'next/link';
import { motion } from 'framer-motion';
import { RefreshCw, Landmark } from 'lucide-react';

const FinancingTradeIn = () => {
  return (
    <section className="finance-tradein section-padding">
      <div className="container">
        <div className="finance-grid">
          
          <motion.div 
            className="finance-card"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="icon-wrapper">
              <RefreshCw size={40} />
            </div>
            <h3 className="finance-title">Tomamos tu Usado</h3>
            <p className="finance-desc">
              Aceptamos tu vehículo actual como parte de pago. Realizamos una tasación justa y transparente basada en el mercado actual para que des el salto al próximo nivel.
            </p>
            <Link href="/contacto?asunto=Cotizar%20mi%20usado" className="btn btn-hero-outline mt-4 inline-flex">
              Cotizar mi usado
            </Link>
          </motion.div>

          <motion.div 
            className="finance-card"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <div className="icon-wrapper">
              <Landmark size={40} />
            </div>
            <h3 className="finance-title">Financiación a Medida</h3>
            <p className="finance-desc">
              Trabajamos con las mejores entidades bancarias para ofrecerte cuotas fijas en pesos y prendarios que se adapten a tu capacidad de pago.
            </p>
            <Link href="/financiacion" className="btn btn-primary mt-4 inline-flex">
              Ver opciones de financiación
            </Link>
          </motion.div>

        </div>
      </div>

      <style>{`
        .finance-tradein {
          background-color: var(--c-carbon);
          position: relative;
        }

        .finance-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        @media (min-width: 768px) {
          .finance-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 3rem;
          }
        }

        .finance-card {
          background: var(--c-graphite);
          border: var(--border-thin);
          border-radius: var(--radius-lg);
          padding: 3rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          transition: all 0.3s ease;
          box-shadow: var(--shadow-sm);
        }

        .finance-card:hover {
          border-color: var(--c-graphite-light);
          box-shadow: var(--shadow-md);
        }

        .icon-wrapper {
          color: var(--c-accent-red);
          margin-bottom: 1.5rem;
        }

        .finance-title {
          color: var(--c-ivory);
          font-family: var(--font-title);
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 1rem;
        }

        .finance-desc {
          color: var(--c-ivory-muted);
          line-height: 1.6;
          margin-bottom: 1.5rem;
          flex: 1;
        }
        
        .btn-hero-outline {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: var(--space-2) var(--space-4);
            background-color: transparent;
            border: 1px solid rgba(255,255,255,0.3);
            color: var(--c-ivory);
            font-weight: 500;
            border-radius: var(--radius-md); 
            transition: all 0.2s ease;
        }

        .btn-hero-outline:hover {
            background-color: var(--c-ivory);
            color: var(--c-carbon);
            border-color: var(--c-ivory);
        }
      `}</style>
    </section>
  );
};

export default FinancingTradeIn;
