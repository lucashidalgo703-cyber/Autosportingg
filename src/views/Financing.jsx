"use client";
import React, { useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { Calculator, Landmark, ShieldCheck, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { trackEvent } from '../lib/analytics';

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0
    }).format(value);
};

const Financing = () => {
    // Simulator State
    const [amount, setAmount] = useState(5000000);
    const [term, setTerm] = useState(24);
    
    // Configuración BNA +Autos (Aprox 46% TNA)
    const TNA = 0.46; 
    const MONTHLY_RATE = TNA / 12;

    // Basic Amortization Formula (French System approximation)
    const calculateQuota = () => {
        if (!amount || amount <= 0) return 0;
        const r = MONTHLY_RATE;
        const n = term;
        return (amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    };

    const estimatedQuota = calculateQuota();

    const handleCtaClick = () => {
        trackEvent('click_financing_consultation', { amount, term });
    };

    return (
        <>
            <Head>
                <title>Financiación | AutoSporting</title>
                <meta name="description" content="Opciones de financiación para tu próximo vehículo en AutoSporting. Financiación propia y crédito prendario bancario sujeto a aprobación crediticia." />
            </Head>

            <main className="financing-page">
                {/* Hero Section */}
                <section className="hero-section text-center py-20 px-4">
                    <div className="container max-w-4xl mx-auto">
                        <motion.h1 
                            className="text-4xl md:text-5xl font-black text-[var(--c-ivory)] mb-6"
                            style={{ fontFamily: 'var(--font-title)' }}
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            Financiá tu próximo vehículo
                        </motion.h1>
                        <motion.p 
                            className="text-[var(--c-ivory-muted)] text-lg md:text-xl mb-10 leading-relaxed"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            Trabajamos para ofrecerte condiciones claras y opciones adaptadas a tu perfil. Evaluamos tu caso para encontrar la mejor alternativa crediticia.
                        </motion.p>
                    </div>
                </section>

                <div className="container max-w-6xl mx-auto px-4 pb-20">
                    {/* Financing Types */}
                    <div className="grid md:grid-cols-2 gap-8 mb-20">
                        
                        {/* Crédito Prendario Bancario */}
                        <motion.div 
                            className="finance-card"
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <div className="finance-icon bg-blue-900/30 text-blue-400">
                                <Landmark size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-[var(--c-ivory)] mb-4">Crédito Prendario Bancario</h2>
                            <p className="text-[var(--c-ivory-muted)] mb-6 line-clamp-3">
                                Operamos con las principales entidades bancarias para ofrecerte plazos de hasta 60 meses. El vehículo queda prendado como garantía del préstamo.
                            </p>
                            <ul className="finance-features">
                                <li><CheckCircle2 size={18} className="text-[var(--c-accent-red)]" /> Financiación sujeta a aprobación crediticia.</li>
                                <li><CheckCircle2 size={18} className="text-[var(--c-accent-red)]" /> Plazos desde 12 hasta 60 meses.</li>
                                <li><CheckCircle2 size={18} className="text-[var(--c-accent-red)]" /> Anticipo mínimo sugerido del 40% al 50%.</li>
                                <li><CheckCircle2 size={18} className="text-[var(--c-accent-red)]" /> Cuotas fijas o indexadas según la línea bancaria elegida.</li>
                            </ul>
                        </motion.div>

                        {/* Financiación Propia */}
                        <motion.div 
                            className="finance-card"
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <div className="finance-icon bg-[var(--c-accent-red)]/20 text-[var(--c-accent-red)]">
                                <ShieldCheck size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-[var(--c-ivory)] mb-4">Financiación Propia</h2>
                            <p className="text-[var(--c-ivory-muted)] mb-6 line-clamp-3">
                                Una alternativa directa con la concesionaria para saldos menores, con evaluación rápida y requisitos simplificados.
                            </p>
                            <ul className="finance-features">
                                <li><CheckCircle2 size={18} className="text-[var(--c-accent-red)]" /> Sujeto a análisis interno de AutoSporting.</li>
                                <li><CheckCircle2 size={18} className="text-[var(--c-accent-red)]" /> Plazos cortos y medianos (hasta 24 meses).</li>
                                <li><CheckCircle2 size={18} className="text-[var(--c-accent-red)]" /> Ideal para cubrir pequeñas diferencias de capital.</li>
                                <li><CheckCircle2 size={18} className="text-[var(--c-accent-red)]" /> Flexibilidad en la entrega de tu usado como parte de pago.</li>
                            </ul>
                        </motion.div>
                    </div>

                    {/* Requirements Section */}
                    <div className="requirements-section mb-20 bg-[var(--c-graphite)] p-8 md:p-12 rounded-[var(--radius-lg)] border border-[rgba(255,255,255,0.05)]">
                        <div className="flex items-center gap-4 mb-8">
                            <FileText size={32} className="text-[var(--c-accent-red)]" />
                            <h2 className="text-3xl font-bold text-[var(--c-ivory)]" style={{ fontFamily: 'var(--font-title)' }}>Requisitos Básicos</h2>
                        </div>
                        <p className="text-[var(--c-ivory-muted)] mb-8 max-w-3xl">
                            Para iniciar una solicitud de crédito, independientemente de la línea elegida, deberás presentar la siguiente documentación para su evaluación:
                        </p>
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="req-item">
                                <span className="req-number">1</span>
                                <h4>Identidad</h4>
                                <p>DNI argentino (Original y fotocopia).</p>
                            </div>
                            <div className="req-item">
                                <span className="req-number">2</span>
                                <h4>Domicilio</h4>
                                <p>Servicio reciente a tu nombre (luz, gas, teléfono) para constatar domicilio.</p>
                            </div>
                            <div className="req-item">
                                <span className="req-number">3</span>
                                <h4>Ingresos</h4>
                                <p>Últimos 3 recibos de sueldo (Relación de dependencia) o Constancia de Monotributo/Inscripción AFIP.</p>
                            </div>
                        </div>
                    </div>

                    {/* Simulator Section */}
                    <motion.div 
                        className="simulator-section"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-bold text-[var(--c-ivory)] mb-4" style={{ fontFamily: 'var(--font-title)' }}>Simulador Orientativo</h2>
                            <p className="text-[var(--c-ivory-muted)]">Calculá un estimado de tus cuotas ingresando el monto a financiar.</p>
                        </div>

                        <div className="simulator-grid">
                            <div className="simulator-controls">
                                <div className="input-group">
                                    <label htmlFor="amountRange">Monto a financiar (Capital)</label>
                                    <div className="range-header">
                                        <span className="current-val">{formatCurrency(amount)}</span>
                                    </div>
                                    <input 
                                        id="amountRange"
                                        type="range" 
                                        min="1000000" 
                                        max="100000000" 
                                        step="500000" 
                                        value={amount} 
                                        onChange={(e) => setAmount(Number(e.target.value))} 
                                        className="range-slider"
                                    />
                                    <div className="range-limits">
                                        <span>$1.000.000</span>
                                        <span>$100.000.000</span>
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label>Plazo (Meses) - Banco Nación +Autos</label>
                                    <div className="term-selector">
                                        {[12, 24, 36, 48, 60, 72].map(t => (
                                            <button 
                                                key={t} 
                                                className={`term-btn ${term === t ? 'active' : ''}`}
                                                onClick={() => setTerm(t)}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="simulator-result">
                                <div className="result-header">
                                    <Calculator size={24} className="text-[var(--c-accent-red)]" />
                                    <h3>Cuota Estimada</h3>
                                </div>
                                <div className="result-value">
                                    {formatCurrency(estimatedQuota)} <span className="result-suffix">/mes</span>
                                </div>
                                <div className="result-details">
                                    <p>Capital: {formatCurrency(amount)}</p>
                                    <p>Plazo: {term} cuotas</p>
                                </div>
                                <div className="legal-disclaimer">
                                    <AlertTriangle size={16} />
                                    <p>
                                        <strong>Aviso Legal:</strong> Este simulador es estrictamente orientativo y con fines demostrativos. El cálculo no constituye una oferta formal. El otorgamiento del crédito, la Tasa Nominal Anual (TNA), el Costo Financiero Total (CFT) y el valor real de la cuota están sujetos a evaluación crediticia y condiciones comerciales vigentes al momento de la solicitud.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="text-center mt-12">
                            <Link href="/contacto" className="btn btn-primary px-10 py-4 text-lg">
                                Solicitar Asesoramiento Financiero
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </main>

            <style>{`
                .hero-section {
                    background: radial-gradient(circle at center, var(--c-graphite) 0%, var(--c-carbon) 100%);
                    border-bottom: var(--border-thin);
                }

                .finance-card {
                    background: var(--c-graphite);
                    border: var(--border-thin);
                    border-radius: var(--radius-lg);
                    padding: var(--space-6);
                    transition: transform 0.3s ease;
                }

                .finance-card:hover {
                    transform: translateY(-5px);
                    border-color: var(--c-graphite-light);
                }

                .finance-icon {
                    width: 64px;
                    height: 64px;
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: var(--space-5);
                }

                .finance-features {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-3);
                }

                .finance-features li {
                    display: flex;
                    align-items: flex-start;
                    gap: var(--space-3);
                    color: var(--c-ivory);
                    font-size: 0.95rem;
                    line-height: 1.4;
                }

                .finance-features li svg {
                    flex-shrink: 0;
                    margin-top: 2px;
                }

                .req-item {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-2);
                    padding: var(--space-4);
                    background: var(--c-carbon);
                    border-radius: var(--radius-md);
                    border: var(--border-thin);
                }

                .req-number {
                    width: 32px;
                    height: 32px;
                    background: rgba(230, 48, 39, 0.1);
                    color: var(--c-accent-red);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    font-weight: 800;
                    font-size: 1.1rem;
                }

                .req-item h4 {
                    color: var(--c-ivory);
                    font-weight: 700;
                    font-size: 1.1rem;
                }

                .req-item p {
                    color: var(--c-ivory-muted);
                    font-size: 0.9rem;
                    line-height: 1.5;
                }

                /* Simulator */
                .simulator-section {
                    background: var(--c-graphite);
                    border: var(--border-thin);
                    border-radius: var(--radius-lg);
                    padding: var(--space-8);
                }

                .simulator-grid {
                    display: grid;
                    md:grid-cols-2;
                    gap: var(--space-8);
                }

                @media (min-width: 768px) {
                    .simulator-grid {
                        grid-template-columns: 1fr 1fr;
                    }
                }

                .simulator-controls {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-6);
                }

                .input-group label {
                    display: block;
                    color: var(--c-ivory-muted);
                    font-size: 0.9rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-bottom: var(--space-3);
                }

                .range-header {
                    display: flex;
                    justify-content: flex-start;
                    margin-bottom: var(--space-4);
                }

                .current-val {
                    font-size: 2rem;
                    font-weight: 900;
                    color: var(--c-ivory);
                    font-family: var(--font-title);
                }

                .range-slider {
                    width: 100%;
                    -webkit-appearance: none;
                    height: 8px;
                    border-radius: 4px;
                    background: var(--c-carbon);
                    outline: none;
                    margin-bottom: 8px;
                }

                .range-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: var(--c-accent-red);
                    cursor: pointer;
                    border: 2px solid var(--c-ivory);
                }

                .range-limits {
                    display: flex;
                    justify-content: space-between;
                    color: var(--c-ivory-muted);
                    font-size: 0.8rem;
                }

                .term-selector {
                    display: flex;
                    gap: var(--space-2);
                    flex-wrap: wrap;
                }

                .term-btn {
                    flex: 1;
                    min-width: 60px;
                    padding: 12px 0;
                    background: var(--c-carbon);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: var(--c-ivory);
                    font-weight: 700;
                    border-radius: var(--radius-sm);
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .term-btn:hover {
                    background: var(--c-graphite-light);
                }

                .term-btn.active {
                    background: var(--c-accent-red);
                    border-color: var(--c-accent-red);
                }

                .simulator-result {
                    background: var(--c-carbon);
                    border-radius: var(--radius-md);
                    padding: var(--space-6);
                    border: var(--border-thin);
                }

                .result-header {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    margin-bottom: var(--space-4);
                }

                .result-header h3 {
                    color: var(--c-ivory);
                    font-size: 1.2rem;
                    font-weight: 700;
                }

                .result-value {
                    font-size: 3rem;
                    font-weight: 900;
                    color: var(--c-accent-red);
                    font-family: var(--font-title);
                    margin-bottom: var(--space-4);
                    line-height: 1;
                }

                .result-suffix {
                    font-size: 1.2rem;
                    color: var(--c-ivory-muted);
                    font-family: var(--font-main);
                    font-weight: 600;
                }

                .result-details {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    color: var(--c-ivory);
                    font-size: 1rem;
                    margin-bottom: var(--space-6);
                    font-weight: 500;
                }

                .legal-disclaimer {
                    display: flex;
                    align-items: flex-start;
                    gap: var(--space-3);
                    background: rgba(255,255,255,0.03);
                    padding: var(--space-4);
                    border-radius: var(--radius-sm);
                }

                .legal-disclaimer svg {
                    color: #F59E0B;
                    flex-shrink: 0;
                    margin-top: 2px;
                }

                .legal-disclaimer p {
                    color: var(--c-ivory-muted);
                    font-size: 0.75rem;
                    line-height: 1.5;
                }
            `}</style>
        </>
    );
};

export default Financing;
