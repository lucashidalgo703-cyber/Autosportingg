"use client";
import { ShieldCheck, FileCheck, Banknote } from 'lucide-react';
import { motion } from 'framer-motion';

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
        <motion.div
          className="features-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {/* ... cards ... */}
        </motion.div>
      </div>

      <style>{`
        .features-section {
          background: transparent;
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
          background: rgba(15, 15, 15, 0.45);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 2rem;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
          text-align: center;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        @media (min-width: 768px) {
            .feature-card {
                padding: 2.5rem;
            }
        }
        
        /* ... hover etc ... */
        .feature-card:hover {
          transform: translateY(-8px);
          background: rgba(25, 25, 25, 0.7);
          border-color: var(--color-primary);
          box-shadow: 0 20px 40px -10px rgba(235, 38, 40, 0.2);
        }

        .icon-wrapper {
          width: 60px;
          height: 60px;
          background: rgba(255,255,255,0.03);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
          color: var(--color-primary);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }
        
        @media (min-width: 768px) {
            .icon-wrapper {
                width: 70px;
                height: 70px;
                margin-bottom: 1.5rem;
            }
        }
        
        /* ... the rest of the styles ... */
        .feature-card:hover .icon-wrapper {
            transform: scale(1.1) rotate(5deg);
            color: white;
            background: var(--color-primary);
            border-color: var(--color-primary);
        }

        .feature-card h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: white;
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        @media (min-width: 768px) {
            .feature-card h3 {
                font-size: 1.25rem;
                margin-bottom: 1rem;
            }
        }

        .feature-card p {
          color: #999;
          line-height: 1.6;
          font-size: 0.9rem;
        }
        
        @media (min-width: 768px) {
            .feature-card p {
                font-size: 0.95rem;
            }
        }
      `}</style>
    </section>
  );
};

export default Features;
