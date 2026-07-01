import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const reviews = [
  {
    id: 1,
    name: "Carlos Méndez",
    text: "Excelente atención de principio a fin. Compré mi primera pickup aquí y la financiación fue súper rápida. 100% recomendados.",
    car: "Toyota Hilux 2022",
    rating: 5
  },
  {
    id: 2,
    name: "Mariana Rojas",
    text: "Transparencia total. Me tomaron el usado a un precio justo y me llevé un 0km en menos de una semana. Muy profesionales.",
    car: "Volkswagen Taos",
    rating: 5
  },
  {
    id: 3,
    name: "Jorge Schmidt",
    text: "Buscaba un auto confiable para mi familia y me asesoraron perfectamente. El servicio post-venta también es impecable.",
    car: "Ford Territory",
    rating: 5
  }
];

const Testimonials = () => {
  return (
    <section className="testimonials section-padding">
      <div className="container">
        <div className="section-header mb-16 text-center md:text-left">
          <h2 className="text-5xl font-black uppercase tracking-tighter italic mb-4">Experiencias AutoSporting</h2>
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="h-[2px] w-12 bg-[var(--color-primary)]"></div>
            <p className="testimonial-subtitle">La confianza de nuestros clientes es nuestro mayor motor</p>
          </div>
        </div>

        <div className="testimonials-grid">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              className="testimonial-card"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="quote-icon">
                <Quote size={40} fill="var(--color-primary)" opacity={0.15} />
              </div>
              
              <div className="stars">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} size={16} fill="var(--color-primary)" color="var(--color-primary)" />
                ))}
              </div>

              <p className="testimonial-text">"{review.text}"</p>

              <div className="testimonial-footer">
                <div className="user-info">
                  <span className="user-name">{review.name}</span>
                  <span className="user-car">{review.car}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        .testimonials {
          background: linear-gradient(to bottom, transparent, rgba(235, 38, 40, 0.02), transparent);
          position: relative;
        }

        .testimonials-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        @media (min-width: 1024px) {
          .testimonials-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .testimonial-card {
          font-family: 'Archivo', sans-serif;
          background: rgba(15, 15, 15, 0.85);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 2.5rem;
          border-radius: 24px;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        .testimonial-subtitle {
          font-family: 'Archivo', sans-serif;
          color: white;
          font-size: 1.25rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          opacity: 1;
        }

        @media (max-width: 768px) {
          .testimonial-subtitle {
            font-size: 1.1rem;
          }
        }

        .testimonial-card:hover {
          transform: translateY(-5px);
          border-color: rgba(235, 38, 40, 0.2);
          background: rgba(255, 255, 255, 0.05);
        }

        .quote-icon {
          position: absolute;
          top: 2rem;
          right: 2rem;
        }

        .stars {
          display: flex;
          gap: 4px;
        }

        .testimonial-text {
          font-size: 1.1rem;
          line-height: 1.6;
          color: #eee;
          font-style: italic;
          flex: 1;
        }

        .testimonial-footer {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 1rem;
        }

        .user-info {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-weight: 700;
          color: white;
          font-size: 1.1rem;
        }

        .user-car {
          font-size: 0.85rem;
          color: var(--color-primary);
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.05em;
        }
      `}</style>
    </section>
  );
};

export default Testimonials;
