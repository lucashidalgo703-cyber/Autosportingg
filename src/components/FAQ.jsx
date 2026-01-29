import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const faqData = [
    {
        question: "¿Ofrecen financiación?",
        answer: "Si, ofrecemos financiación prendaria y créditos personales. Trabajamos con los principales bancos para ofrecerte las mejores tasas del mercado."
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
            <div className="faq-grid">
                {faqData.map((item, index) => (
                    <div
                        key={index}
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
                    </div>
                ))}
            </div>

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
