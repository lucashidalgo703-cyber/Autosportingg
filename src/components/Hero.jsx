"use client";
import { ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';

const Hero = () => {
  const { scrollY } = useScroll();
  const yBg = useTransform(scrollY, [0, 1000], [0, 400]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };
  console.log("Hero component version: 3.0 Strict Match Loaded");
  return (
    <section className="hero">
      <div className="hero-bg">
        <motion.div style={{ y: yBg, position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <Image
            src="/autosporting-hero-v2.jpg"
            alt="Autosporting Hero"
            fill
            className="hero-bg-image object-cover"
            style={{
              objectFit: 'cover',
              objectPosition: '50% 30%'
            }}
            priority
          />
        </motion.div>
      </div>

      {/* Gradients to match reference */}
      <div className="hero-overlay-gradient-1"></div>
      <div className="hero-overlay-gradient-2"></div>

      <div className="container hero-content">
        <motion.div
          className="hero-text-wrapper"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >

          {/* Location Badge */}
          <motion.div className="badge-location" variants={itemVariants}>
            <span className="font-medium">Comodoro Rivadavia</span>
          </motion.div>

          <motion.div className="mb-2" variants={itemVariants}>
            <h1 className="hero-title">
              <span className="text-white">AutoSporting</span>
            </h1>
            <h2 className="hero-subtitle">
              Agencia de Autos en Comodoro Rivadavia
            </h2>
          </motion.div>

          {/* Features Pills */}
          <motion.div className="features-list" variants={itemVariants}>
            <span className="feature-pill">✓ Usados</span>
            <span className="feature-pill">✓ 0km</span>
            <span className="feature-pill">✓ Financiación</span>
          </motion.div>

          <motion.p className="hero-description" variants={itemVariants}>
            La mejor agencia de autos para encontrar tu próximo vehículo. Unidades usadas y 0km seleccionadas con garantía de calidad y excelente financiación.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div className="hero-actions" variants={itemVariants}>
            <Link href="/catalogo" className="btn-hero-primary group">
              <span className="relative z-10 flex items-center justify-center gap-2">
                Ver Catálogo
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <Link href="/contacto" className="btn-hero-secondary">
              <span className="relative z-10 flex items-center justify-center gap-2">
                Contactanos
              </span>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      <style>{`
        .hero {
          position: relative;
          min-height: 500px;
          height: 85vh;
          display: flex;
          align-items: center;
          margin-top: calc(var(--header-height) * -1);
          padding-top: var(--header-height);
          overflow: hidden;
          background: radial-gradient(circle at 50% 30%, #1a1a1a 0%, #050505 100%);
        }

        /* Backgrounds & Overlays */
        .hero-bg, .hero-bg-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          z-index: 0;
        }

        .hero-overlay-gradient-1 {
            position: absolute;
            inset: 0;
            background: linear-gradient(to bottom right, rgba(0,0,0,0.85), rgba(0,0,0,0.4), rgba(0,0,0,0.7));
            z-index: 1;
        }

        .hero-overlay-gradient-2 {
            position: absolute;
            inset: 0;
            background: linear-gradient(to top, rgba(0,0,0,0.6), transparent, rgba(0,0,0,0.2));
            z-index: 1;
        }

        .hero-content {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center; 
          justify-content: flex-start;
          padding-top: 2rem;
          padding-bottom: 2rem;
        }

        .hero-text-wrapper {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
            max-width: 850px;
            width: 100%;
        }

        .badge-location {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.4rem 0.8rem;
            background-color: rgba(235, 38, 40, 0.15);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(235, 38, 40, 0.3);
            border-radius: 9999px; 
            margin-bottom: 1.25rem; 
        }
        
        .badge-location span {
             color: #fff;
             font-size: 0.75rem;
             text-transform: uppercase;
             letter-spacing: 0.1em;
             font-family: 'Inter', sans-serif;
             font-weight: 700;
        }

        .hero-actions {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-top: 1.5rem;
            width: 100%;
        }

        @media (min-width: 500px) {
            .hero-actions {
                flex-direction: row; 
                width: auto;
            }
        }

        .hero-title {
            font-family: 'Inter', system-ui, sans-serif;
            font-weight: 900; 
            line-height: 1.05;
            margin-bottom: 0.5rem;
            letter-spacing: -0.03em;
            color: #FFFFFF;
            font-size: clamp(2.5rem, 8vw, 6rem);
        }

        .hero-subtitle {
            font-family: 'Inter', system-ui, sans-serif;
            font-weight: 700;
            color: #EB2628; 
            line-height: 1.2;
            margin-bottom: 1.5rem;
            font-size: clamp(1.25rem, 4vw, 3rem);
        }

        .hero-description {
            font-family: 'Inter', system-ui, sans-serif;
            font-size: clamp(1rem, 1.5vw, 1.15rem);
            color: rgba(255, 255, 255, 0.8);
            max-width: 600px;
            margin-bottom: 2rem;
            line-height: 1.6;
        }

        .features-list {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
            align-items: center;
        }
        
        .feature-pill {
             padding: 0.4rem 0.8rem;
             background-color: rgba(255, 255, 255, 0.05);
             backdrop-filter: blur(4px);
             border: 1px solid rgba(255, 255, 255, 0.1);
             border-radius: 6px;
             color: rgba(255,255,255,0.9);
             font-size: 0.85rem;
             font-weight: 600;
             display: inline-flex;
             align-items: center;
             gap: 0.3rem;
        }

        .btn-hero-primary {
            padding: 0.9rem 2.25rem; 
            background-color: var(--color-primary);
            color: white;
            font-weight: 800;
            font-size: 0.95rem; 
            text-transform: uppercase;
            letter-spacing: 0.08em;
            border-radius: 50px; 
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px rgba(235, 38, 40, 0.4);
        }

        .btn-hero-primary:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 25px rgba(235, 38, 40, 0.6);
        }
        
        .btn-hero-secondary {
            padding: 0.9rem 2rem;
            background-color: transparent;
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            font-weight: 700;
            font-size: 0.95rem; 
            border-radius: 50px; 
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .btn-hero-secondary:hover {
            background-color: white;
            color: black;
            border-color: white;
        }

        @media (max-width: 640px) {
            .hero { height: auto; min-height: 100vh; padding-bottom: 4rem; }
            .hero-content { padding-top: 5rem; }
            .feature-pill { font-size: 0.75rem; padding: 0.3rem 0.6rem; }
        }

      `}</style>
    </section >
  );
};

export default Hero;
