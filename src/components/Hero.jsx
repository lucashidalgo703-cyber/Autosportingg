"use client";
import { ArrowRight, Search } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const Hero = () => {
  const { scrollY } = useScroll();
  const yBg = useTransform(scrollY, [0, 1000], [0, 400]);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

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

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/catalogo?q=${encodeURIComponent(searchQuery)}`);
    } else {
      router.push('/catalogo');
    }
  };

  return (
    <section className="hero">
      <div className="hero-bg">
        <motion.div style={{ y: yBg, position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <Image
            src="/hero-autosporting.jpg"
            alt="Vehículo premium en AutoSporting"
            fill
            className="hero-bg-image object-cover"
            style={{
              objectFit: 'cover',
              objectPosition: 'center'
            }}
            priority
          />
        </motion.div>
      </div>

      <div className="hero-overlay-gradient-1"></div>
      <div className="hero-overlay-gradient-2"></div>

      <div className="container hero-content">
        <motion.div
          className="hero-text-wrapper"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >

          <motion.div className="badge-location" variants={itemVariants}>
            <span className="font-medium">Comodoro Rivadavia</span>
          </motion.div>

          <motion.div className="mb-6" variants={itemVariants}>
            <h1 className="hero-title">
              Tu próximo auto,<br/>con respaldo real
            </h1>
            <p className="hero-description">
              Usados seleccionados y 0km con la garantía, inspección técnica y transparencia que merecés.
            </p>
          </motion.div>

          {/* Search Form */}
          <motion.form onSubmit={handleSearch} className="hero-search-form" variants={itemVariants}>
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input 
                type="text" 
                placeholder="Buscar por marca o modelo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="hero-search-input"
              />
            </div>
            <button type="submit" className="btn btn-accent btn-search">
              Buscar
            </button>
          </motion.form>

          {/* CTA Buttons */}
          <motion.div className="hero-actions" variants={itemVariants}>
            <Link href="/catalogo" className="btn btn-primary group">
              <span className="relative z-10 flex items-center justify-center gap-2">
                Ver Catálogo
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <Link href="/contacto?asunto=Cotizar%20mi%20usado" className="btn btn-hero-outline">
              <span className="relative z-10 flex items-center justify-center gap-2">
                Cotizar mi usado
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
          background-color: var(--c-carbon);
        }

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
            background: linear-gradient(to right, rgba(18, 18, 20, 0.95) 0%, rgba(18, 18, 20, 0.6) 50%, rgba(18, 18, 20, 0.3) 100%);
            z-index: 1;
        }

        .hero-overlay-gradient-2 {
            position: absolute;
            inset: 0;
            background: linear-gradient(to top, var(--c-carbon) 0%, transparent 30%);
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
            max-width: 800px;
            width: 100%;
        }

        .badge-location {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.4rem 0.8rem;
            background-color: var(--c-graphite);
            border: var(--border-thin);
            border-radius: var(--radius-full); 
            margin-bottom: var(--space-4); 
        }
        
        .badge-location span {
             color: var(--c-ivory);
             font-size: 0.75rem;
             text-transform: uppercase;
             letter-spacing: 0.1em;
             font-weight: 700;
        }

        .hero-title {
            font-family: var(--font-title);
            font-weight: 900; 
            line-height: 1.1;
            margin-bottom: var(--space-4);
            letter-spacing: -0.02em;
            color: var(--c-ivory);
            font-size: clamp(3rem, 6vw, 5rem);
        }

        .hero-description {
            font-family: var(--font-main);
            font-size: clamp(1.1rem, 2vw, 1.25rem);
            color: var(--c-ivory-muted);
            max-width: 600px;
            line-height: 1.6;
        }

        .hero-search-form {
            display: flex;
            flex-direction: column;
            width: 100%;
            max-width: 500px;
            gap: var(--space-3);
            margin-bottom: var(--space-8);
        }

        @media (min-width: 640px) {
            .hero-search-form {
                flex-direction: row;
            }
        }

        .search-input-wrapper {
            position: relative;
            flex: 1;
        }

        .search-icon {
            position: absolute;
            left: var(--space-4);
            top: 50%;
            transform: translateY(-50%);
            color: var(--c-ivory-muted);
        }

        .hero-search-input {
            width: 100%;
            padding: var(--space-3) var(--space-4) var(--space-3) 3rem;
            background-color: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-md);
            color: var(--c-ivory);
            font-family: var(--font-main);
            font-size: 1rem;
            transition: all 0.2s ease;
            backdrop-filter: blur(8px);
        }

        .hero-search-input:focus {
            outline: none;
            border-color: var(--c-ivory);
            background-color: rgba(255, 255, 255, 0.1);
        }

        .btn-search {
            padding-left: var(--space-8);
            padding-right: var(--space-8);
        }

        .hero-actions {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            width: 100%;
        }

        @media (min-width: 500px) {
            .hero-actions {
                flex-direction: row; 
                width: auto;
            }
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

        @media (max-width: 640px) {
            .hero { height: auto; min-height: 90vh; padding-bottom: 6rem; }
            .hero-content { padding-top: 5rem; }
            .hero-title { font-size: 2.5rem; }
            .hero-actions { padding-bottom: 2rem; } /* Extra padding for WhatsApp button */
        }
      `}</style>
    </section>
  );
};

export default Hero;
