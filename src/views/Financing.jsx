"use client";
import { Banknote, Calculator, FileCheck, ArrowRight, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const Financing = () => {
    return (
        <main className="financing-page">
            {/* Header Section */}
            <section className="financing-header">
                <div className="header-overlay"></div>
                <motion.div
                    className="container header-content"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <span className="badge">FINANCIACIÓN</span>
                    <h1 className="header-title">
                        Financiá tu próximo <br />
                        vehículo con nosotros
                    </h1>
                    <p className="header-subtitle">
                        Planes a medida, aprobación inmediata y las mejores tasas del mercado.
                        Subite a tu auto nuevo hoy mismo.
                    </p>
                </motion.div>
            </section>

            {/* Main Content */}
            <section className="container financing-body">

                {/* Intro / Highlight Card */}
                <motion.div
                    className="highlight-card"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={itemVariants}
                >
                    <div className="highlight-text">
                        <h2>¿Cómo funciona?</h2>
                        <p>
                            En AutoSporting simplificamos el proceso para que obtener tu auto sea rápido y transparente.
                            Ofrecemos financiación propia y bancaria para unidades seleccionadas.
                        </p>
                    </div>
                    <div className="highlight-stats">
                        <div className="stat">
                            <span className="stat-number">50%</span>
                            <span className="stat-label">Entrega mínima</span>
                        </div>
                        <div className="stat">
                            <span className="stat-number">12/72</span>
                            <span className="stat-label">Cuotas fijas</span>
                        </div>
                    </div>
                </motion.div>

                {/* Steps Grid */}
                <motion.div
                    className="steps-grid"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={containerVariants}
                >
                    <motion.div className="step-card" variants={itemVariants}>
                        <div className="icon-box">
                            <Calculator size={32} color="white" />
                        </div>
                        <h3>1. Elegí tu vehículo</h3>
                        <p>Explorá nuestro catálogo y seleccioná la unidad que mejor se adapte a tus necesidades.</p>
                    </motion.div>
                    <motion.div className="step-card" variants={itemVariants}>
                        <div className="icon-box">
                            <FileCheck size={32} color="white" />
                        </div>
                        <h3>2. Pre-aprobación</h3>
                        <p>Presenta tu DNI y comprobante de ingresos. Evaluamos tu perfil crediticio en el acto.</p>
                    </motion.div>
                    <motion.div className="step-card" variants={itemVariants}>
                        <div className="icon-box">
                            <Wallet size={32} color="white" />
                        </div>
                        <h3>3. Entrega y Cuotas</h3>
                        <p>Aboná el anticipo y financia el saldo en cuotas fijas en pesos. ¡Te llevás el auto!</p>
                    </motion.div>
                </motion.div>

                {/* Requirements Section */}
                <motion.div
                    className="requirements-section"
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true, amount: 0.2 }}
                >
                    <div className="req-content">
                        <div className="icon-box-large">
                            <Banknote size={40} color="var(--color-primary)" />
                        </div>
                        <div className="req-text">
                            <h3>Requisitos Mínimos</h3>
                            <ul className="req-list">
                                <li><ArrowRight size={16} color="var(--color-primary)" /> DNI vigente</li>
                                <li><ArrowRight size={16} color="var(--color-primary)" /> Servicio a nombre del solicitante</li>
                                <li><ArrowRight size={16} color="var(--color-primary)" /> Comprobante de ingresos (Recibo de sueldo / Monotributo)</li>
                                <li><ArrowRight size={16} color="var(--color-primary)" /> No estar en Veraz (sujeto a evaluación)</li>
                            </ul>
                        </div>
                    </div>
                    <div className="req-cta">
                        <a href="https://wa.me/5492974045378" target="_blank" rel="noopener noreferrer" className="btn-whatsapp-financing">
                            Consultar por WhatsApp
                        </a>
                    </div>
                </motion.div>

            </section>

            <style>{`
        .financing-page {
            padding-bottom: 4rem;
            position: relative;
        }

        .financing-header {
            position: relative;
            padding: 6rem 0 3rem;
            display: flex;
            align-items: center;
            border-bottom: 1px solid rgba(255,255,255,0.03);
            background: radial-gradient(circle at 50% 30%, rgba(235, 38, 40, 0.1) 0%, transparent 70%);
            text-align: center;
        }

        @media (min-width: 1024px) {
            .financing-header {
                padding: 10rem 0 6rem;
                text-align: left;
            }
        }

        .header-content {
            position: relative;
            z-index: 10;
        }

        .badge {
            display: inline-block;
            background: rgba(235, 38, 40, 0.1);
            color: var(--color-primary);
            padding: 6px 16px;
            border-radius: 50px;
            font-size: 0.75rem;
            font-weight: 800;
            margin-bottom: 1.5rem;
            border: 1px solid rgba(235, 38, 40, 0.2);
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }

        .header-title {
            font-size: clamp(2.25rem, 6vw, 4rem);
            font-weight: 900;
            line-height: 1;
            color: #ffffff;
            margin-bottom: 1.5rem;
            letter-spacing: -0.03em;
        }

        .header-subtitle {
            font-size: clamp(1rem, 1.5vw, 1.25rem);
            color: #999;
            max-width: 600px;
            line-height: 1.6;
            margin: 0 auto;
        }
        
        @media (min-width: 1024px) {
            .header-subtitle { margin: 0; }
        }

        .financing-body {
            position: relative;
            z-index: 20;
            margin-top: -2rem;
            display: flex;
            flex-direction: column;
            gap: 2.5rem;
        }
        
        @media (min-width: 1024px) {
            .financing-body { margin-top: -4rem; gap: 4rem; }
        }

        .highlight-card {
            background: rgba(20, 20, 20, 0.45);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            padding: 2rem;
            display: grid;
            grid-template-columns: 1fr;
            gap: 2.5rem;
            align-items: center;
            box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        }
        
        @media (min-width: 1024px) {
            .highlight-card {
                grid-template-columns: 1.5fr 1fr;
                padding: 4rem;
                gap: 4rem;
            }
        }

        .highlight-text h2 {
            font-size: clamp(1.5rem, 3vw, 2.25rem);
            margin-bottom: 1rem;
            font-weight: 800;
            letter-spacing: -0.01em;
        }

        .highlight-text p {
            color: #999;
            font-size: 1.05rem;
            line-height: 1.7;
        }

        .highlight-stats {
            display: flex;
            flex-direction: column;
            gap: 2rem;
            border-top: 1px solid rgba(255,255,255,0.05);
            padding-top: 2.5rem;
        }
        
        @media (min-width: 640px) {
            .highlight-stats {
                flex-direction: row;
                justify-content: space-around;
            }
        }
        
        @media (min-width: 1024px) {
            .highlight-stats {
                flex-direction: column;
                border-top: none;
                border-left: 1px solid rgba(255,255,255,0.08);
                padding-top: 0;
                padding-left: 4rem;
                gap: 3rem;
            }
        }

        .stat-number {
            display: block;
            font-size: clamp(3rem, 5vw, 4rem);
            font-weight: 900;
            color: var(--color-primary);
            line-height: 1;
            margin-bottom: 0.5rem;
            letter-spacing: -0.02em;
        }

        .stat-label {
            color: white;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            font-weight: 700;
        }

        .steps-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
        }

        .step-card {
            background: rgba(15, 15, 15, 0.45);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 20px;
            padding: 2.5rem;
            transition: all 0.3s ease;
        }

        .step-card:hover {
            transform: translateY(-8px);
            border-color: var(--color-primary);
            background: rgba(20, 20, 20, 0.6);
        }

        .step-card .icon-box {
            background: rgba(255, 255, 255, 0.03);
            width: 64px;
            height: 64px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1.5rem;
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: var(--color-primary);
        }

        .step-card h3 {
            font-size: 1.35rem;
            font-weight: 800;
            margin-bottom: 1rem;
            letter-spacing: -0.01em;
        }

        .step-card p {
            color: #888;
            line-height: 1.6;
            font-size: 0.95rem;
        }

        .requirements-section {
            background: rgba(15, 15, 15, 0.45);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            padding: 2rem;
            display: flex;
            flex-direction: column;
            gap: 2.5rem;
        }
        
        @media (min-width: 1024px) {
            .requirements-section {
                flex-direction: row;
                justify-content: space-between;
                align-items: center;
                padding: 4rem;
                gap: 4rem;
            }
        }

        .req-content {
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }
        
        @media (min-width: 768px) {
            .req-content { flex-direction: row; align-items: flex-start; }
        }

        .icon-box-large {
            background: rgba(235, 38, 40, 0.1);
            width: 80px;
            height: 80px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border: 1px solid rgba(235, 38, 40, 0.2);
        }

        .req-text h3 {
            font-size: 1.75rem;
            margin-bottom: 1.5rem;
            font-weight: 800;
            letter-spacing: -0.01em;
        }

        .req-list {
            list-style: none;
            padding: 0;
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.25rem;
        }
        
        @media (min-width: 640px) {
            .req-list { grid-template-columns: 1fr 1fr; }
        }

        .req-list li {
            display: flex;
            align-items: center;
            gap: 1rem;
            color: #ccc;
            font-size: 1rem;
        }

        .btn-whatsapp-financing {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: #25D366;
            color: #000;
            font-weight: 800;
            padding: 1.25rem 2.5rem;
            border-radius: 50px;
            text-decoration: none;
            font-size: 1.1rem;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            box-shadow: 0 10px 30px rgba(37, 211, 102, 0.2);
            text-align: center;
        }

        .btn-whatsapp-financing:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(37, 211, 102, 0.4);
            background: #22c55e;
        }
        
        @media (max-width: 1024px) {
            .btn-whatsapp-financing { width: 100%; }
        }
      `}</style>
        </main>
    );
};

export default Financing;
