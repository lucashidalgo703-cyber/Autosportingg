"use client";
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

const faqData = [
  {
    question: "¿Ofrecen financiación?",
    answer: "Sí, ofrecemos financiación propia entregando el 50% del valor del vehículo y un plazo máximo de 18 meses. Además contamos con financiación bancaria a través de Banco Nación y Santander Río, con Crédito Personal o Prendario con un plazo de 12 a 72 meses."
  },
  {
    question: "¿Toman vehículos en parte de pago?",
    answer: "Si, tomamos tu usado como parte de pago. Realizamos una cotización justa y transparente basada en el estado y valor de mercado de tu unidad."
  },
  {
    question: "¿Los vehículos tienen garantía?",
    answer: "Todas nuestras unidades cuentan con garantía de documentación y mecánica. Los 0km cuentan con garantía oficial de fábrica."
  }
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="faq-section container">
      <h2 className="section-title text-center">Preguntas Frecuentes</h2>
      <motion.div
        className="faq-grid"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {faqData.map((item, index) => (
          <motion.div
            key={index}
            variants={itemVariants}
            className={`faq-item ${openIndex === index ? 'open' : ''}`}
            onClick={() => toggle(index)}
          >
            <div className="faq-header">
              <h3>{item.question}</h3>
              {openIndex === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
            <div className="faq-content">
              <p>{item.answer}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <style>{`
        .faq-section {
          padding-bottom: 5rem;
        }
        .text-center { text-align: center; margin-bottom: 3rem; }
        .faq-grid { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; }
        
        .faq-item {
          background-color: var(--color-surface);
          border: 1px solid #333;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .faq-item:hover {
          border-color: var(--color-primary);
        }

        .faq-header {
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .faq-header h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
        }

        .faq-content {
          padding: 0 1.5rem;
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease, padding 0.3s ease;
        }

        .faq-item.open .faq-content {
          padding-bottom: 1.5rem;
          max-height: 200px;
        }

        .faq-content p {
          color: var(--color-text-muted);
          line-height: 1.6;
        }
      `}</style>
    </section>
  );
};

export default FAQ;
