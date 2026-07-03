"use client";
import { Wrench, FileCheck, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

const trustFeatures = [
  {
    icon: <Wrench size={32} />,
    title: "Inspección Mecánica",
    desc: "Cada vehículo usado de nuestro catálogo pasa por una revisión técnica minuciosa antes de ser publicado."
  },
  {
    icon: <FileCheck size={32} />,
    title: "Documentación al día",
    desc: "Garantizamos que todos nuestros autos están libres de deudas y listos para transferir con gestoría propia."
  },
  {
    icon: <MapPin size={32} />,
    title: "Agencia Física",
    desc: "Vení a conocernos a nuestro salón en Comodoro Rivadavia. Trato directo, transparente y seguro."
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

const Features = () => {
  return (
    <section className="features-section section-padding">
      <div className="container">
        <div className="section-header text-center mb-16">
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-4 text-[var(--c-ivory)]" style={{ fontFamily: 'var(--font-title)' }}>
            Nuestra Garantía de Confianza
          </h2>
          <p className="text-[var(--c-ivory-muted)] max-w-2xl mx-auto">
            No inventamos números. Construimos relaciones basadas en hechos reales y vehículos en excelentes condiciones.
          </p>
        </div>

        <motion.div
          className="features-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {trustFeatures.map((feature, index) => (
            <motion.div key={index} className="feature-card" variants={itemVariants}>
              <div className="icon-wrapper">
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <style>{`
        .features-section {
          background-color: var(--c-graphite);
          border-top: var(--border-thin);
          border-bottom: var(--border-thin);
          position: relative;
        }
        
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          position: relative;
          z-index: 10;
        }

        @media (min-width: 768px) {
            .features-grid {
                gap: 2rem;
            }
        }

        .feature-card {
          background: var(--c-carbon);
          padding: 2.5rem;
          border-radius: var(--radius-lg);
          border: var(--border-thin);
          box-shadow: var(--shadow-sm);
          text-align: center;
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .feature-card:hover {
          transform: translateY(-8px);
          border-color: var(--c-graphite-light);
          box-shadow: var(--shadow-md);
        }

        .icon-wrapper {
          width: 70px;
          height: 70px;
          background: var(--c-graphite);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          color: var(--c-accent-red);
          border: var(--border-thin);
          transition: all 0.3s ease;
        }
        
        .feature-card:hover .icon-wrapper {
            transform: scale(1.1);
            color: var(--c-ivory);
            background: var(--c-accent-red);
            border-color: var(--c-accent-red);
        }

        .feature-card h3 {
          font-family: var(--font-title);
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--c-ivory);
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .feature-card p {
          color: var(--c-ivory-muted);
          line-height: 1.6;
          font-size: 0.95rem;
        }
      `}</style>
    </section>
  );
};

export default Features;
