"use client";
import Hero from '../components/Hero';
import CarCarousel from '../components/CarCarousel';
import CategoryNav from '../components/CategoryNav';
import Features from '../components/Features';
import PurchaseProcess from '../components/PurchaseProcess';
import FinancingTradeIn from '../components/FinancingTradeIn';
import Testimonials from '../components/Testimonials';
import FAQ from '../components/FAQ';
import Link from 'next/link';
import { useCars } from '../hooks/useCars';
import { motion } from 'framer-motion';
import { trackEvent } from '../lib/analytics';
import { useEffect } from 'react';

const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

const Home = () => {
  const { cars, loading } = useCars();

  useEffect(() => {
    trackEvent('view_home');
  }, []);

  const featuredCars = cars.filter(car => car.featured || car.year > 2020).slice(0, 8);

  return (
    <main id="main-content" className="home-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [{
              "@type": "Question",
              "name": "¿Toman autos usados en parte de pago?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Sí, tomamos tu auto usado en parte de pago previa inspección y tasación en nuestro local."
              }
            }, {
              "@type": "Question",
              "name": "¿Ofrecen financiación?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Sí, contamos con financiación propia y crédito prendario bancario con cuotas fijas."
              }
            }]
          })
        }}
      />
      {/* 1. Hero */}
      <Hero />

      {/* 2. Categorías */}
      <CategoryNav cars={cars} />

      {/* 3. Vehículos Destacados */}
      <motion.section
        className="featured container section-padding"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={sectionVariants}
      >
        <div className="section-header mb-8">
          <h2 className="text-3xl font-bold border-l-4 border-[var(--c-accent-red)] pl-4 text-[var(--c-ivory)]">Vehículos Destacados</h2>
          <Link href="/catalogo" className="view-all-link">Ver todo el catálogo →</Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.1 }}
          className="mt-8"
        >
          <CarCarousel cars={featuredCars} />
        </motion.div>
      </motion.section>

      {/* 4. Razones para confiar (Features) */}
      <Features />

      {/* 5. Proceso de compra */}
      <PurchaseProcess />

      {/* 6. Financiación y Toma de Usados */}
      <FinancingTradeIn />

      {/* 7. Reseñas Reales */}
      <Testimonials />

      {/* 8. FAQ */}
      <FAQ />

      {/* 9. CTA Final */}
      <motion.section 
        className="final-cta section-padding"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={sectionVariants}
      >
        <div className="container text-center">
            <h2 className="text-4xl md:text-5xl font-black mb-6 text-[var(--c-ivory)]" style={{ fontFamily: 'var(--font-title)' }}>¿Listo para dar el salto?</h2>
            <p className="text-[var(--c-ivory-muted)] text-lg mb-8 max-w-2xl mx-auto">Vení a conocer tu próximo vehículo o contactanos para recibir asesoramiento personalizado. Estamos para ayudarte.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/catalogo" className="btn btn-primary btn-lg">Ver catálogo de autos</Link>
                <Link href="/contacto" className="btn btn-hero-outline btn-lg">Escribir por WhatsApp</Link>
            </div>
        </div>
      </motion.section>

      <style>{`
        .section-padding {
          padding-top: 5rem;
          padding-bottom: 5rem;
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: end;
          margin-bottom: 3rem;
        }

        .section-header h2 {
          font-family: var(--font-title);
          font-size: 2.5rem;
          font-weight: 700;
        }

        .view-all-link {
          background-color: var(--c-graphite);
          color: var(--c-ivory);
          font-weight: 700;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 0.75rem 1.5rem;
          border-radius: 50px;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: var(--shadow-sm);
          display: inline-flex;
          align-items: center;
          border: var(--border-thin);
        }

        .view-all-link:hover {
          background-color: var(--c-graphite-light);
          border-color: var(--c-accent-red);
          transform: translateY(-3px) scale(1.05);
          box-shadow: var(--shadow-md);
        }

        .final-cta {
            background-color: var(--c-carbon);
            border-top: var(--border-thin);
            margin-top: 2rem;
        }

        .btn-lg {
            padding: 1rem 2rem;
            font-size: 1.1rem;
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

        @media (max-width: 768px) {
          .section-header { flex-direction: column; align-items: start; gap: 1rem; }
          .section-header h2 { font-size: 2rem; }
        }
      `}</style>
    </main>
  );
};

export default Home;
