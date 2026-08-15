"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Star, MessageCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const Testimonials = () => {
  return (
    <section className="testimonials section-padding">
      <div className="container">
        <div className="section-header mb-12 text-center md:text-left">
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4 text-[var(--c-ivory)]" style={{ fontFamily: 'var(--font-title)' }}>Experiencias AutoSporting</h2>
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="h-[2px] w-12 bg-[var(--c-accent-red)]"></div>
            <p className="testimonial-subtitle text-[var(--c-ivory-muted)]">La confianza de nuestros clientes es nuestro mayor motor</p>
          </div>
        </div>

        <motion.div
            className="reviews-container"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
        >
            <div className="google-reviews-card">
                <div className="google-header">
                    <MessageCircle size={48} className="text-[var(--c-accent-red)] mb-4" />
                    <h3 className="text-2xl font-bold text-[var(--c-ivory)] mb-2">Reseñas en Google</h3>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-3xl font-black text-white">4.8</span>
                        <div className="stars flex gap-1">
                            {[1,2,3,4,5].map((i) => (
                                <Star key={i} size={24} fill="var(--c-accent-red)" color="var(--c-accent-red)" />
                            ))}
                        </div>
                    </div>
                    <p className="text-[var(--c-ivory-muted)] mb-8">Basado en opiniones reales de clientes que ya encontraron su vehículo con nosotros.</p>
                </div>

                <a 
                    href="https://www.google.com/maps/search/?api=1&query=AutoSporting+Comodoro+Rivadavia" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn btn-primary inline-flex gap-2"
                >
                    Leer reseñas en Google <ExternalLink size={18} />
                </a>
            </div>
        </motion.div>
      </div>

      <style>{`
        .testimonials {
          background-color: var(--c-carbon);
          position: relative;
        }

        .testimonial-subtitle {
          font-family: var(--font-title);
          font-size: 1.25rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .reviews-container {
            display: flex;
            justify-content: center;
            width: 100%;
        }

        .google-reviews-card {
          background: var(--c-graphite);
          border: var(--border-thin);
          padding: 3rem 2rem;
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 600px;
          text-align: center;
          transition: all 0.3s ease;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .google-reviews-card:hover {
          transform: translateY(-5px);
          border-color: var(--c-graphite-light);
          box-shadow: var(--shadow-md);
        }

        @media (max-width: 768px) {
          .testimonial-subtitle {
            font-size: 1.1rem;
          }
        }
      `}</style>
    </section>
  );
};

export default Testimonials;
