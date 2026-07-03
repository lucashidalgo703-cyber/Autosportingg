"use client";
import React, { useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { CarFront, User, FileText, Send, ShieldCheck, AlertCircle, Camera } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const baseUrl = process.env.NODE_ENV === 'production' ? '' : API_URL;

const Quote = () => {
    const [formData, setFormData] = useState({
        // Vehicle Data
        brand: '',
        model: '',
        version: '',
        year: '',
        km: '',
        condition: 'Excelente', // Excelente, Muy Bueno, Bueno, Regular
        // Client Data
        name: '',
        email: '',
        phone: '',
        location: '',
        message: '',
        honeypot: ''
    });

    const [status, setStatus] = useState('idle'); // idle, submitting, success, error

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.honeypot) {
            setStatus('success'); // Spam prevention
            return;
        }

        if (status === 'submitting') return;
        setStatus('submitting');

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const utmSource = urlParams.get('utm_source') || 'direct';
            const utmMedium = urlParams.get('utm_medium') || '';
            const utmCampaign = urlParams.get('utm_campaign') || '';

            const customMessage = `Cotización de Usado:\nVehículo: ${formData.brand} ${formData.model} ${formData.version} (${formData.year})\nKilómetros: ${formData.km} km\nEstado: ${formData.condition}\nUbicación: ${formData.location}\n\nMensaje extra: ${formData.message}`;

            const response = await fetch(`${baseUrl}/api/leads/public`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    message: customMessage,
                    source: `Web - Cotizar Usado`,
                    pageUrl: window.location.href,
                    utmSource,
                    utmMedium,
                    utmCampaign,
                    consent: true
                }),
            });

            if (response.ok) {
                setStatus('success');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                throw new Error('Error en el servidor');
            }
        } catch (error) {
            console.error("Error submitting quote:", error);
            setStatus('error');
            setTimeout(() => setStatus('idle'), 5000);
        }
    };

    if (status === 'success') {
        return (
            <main className="quote-page py-20 px-4 min-h-[60vh] flex items-center justify-center">
                <div className="container max-w-2xl mx-auto text-center">
                    <ShieldCheck size={80} className="text-[var(--c-accent-red)] mx-auto mb-6" />
                    <h1 className="text-4xl font-black text-[var(--c-ivory)] mb-4" style={{ fontFamily: 'var(--font-title)' }}>¡Solicitud enviada!</h1>
                    <p className="text-xl text-[var(--c-ivory-muted)] mb-8">
                        Recibimos los datos de tu {formData.brand} {formData.model}. Un asesor de compras se pondrá en contacto con vos a la brevedad para solicitarte fotos y enviarte una cotización preliminar.
                    </p>
                    <button onClick={() => window.location.reload()} className="btn btn-outline">
                        Cotizar otro vehículo
                    </button>
                </div>
            </main>
        );
    }

    return (
        <>
            <Head>
                <title>Cotizá tu Usado | AutoSporting</title>
                <meta name="description" content="Vendé o entregá tu auto usado en parte de pago. Cotización rápida, segura y transparente en Comodoro Rivadavia." />
            </Head>

            <main className="quote-page">
                {/* Hero */}
                <section className="quote-hero py-16 px-4 text-center border-b border-[rgba(255,255,255,0.05)]">
                    <motion.h1 
                        className="text-4xl md:text-5xl font-black text-[var(--c-ivory)] mb-4"
                        style={{ fontFamily: 'var(--font-title)' }}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        Cotizá tu Usado
                    </motion.h1>
                    <motion.p 
                        className="text-[var(--c-ivory-muted)] text-lg max-w-2xl mx-auto"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        Completá los datos de tu vehículo y recibí una tasación justa para venta directa o como parte de pago.
                    </motion.p>
                </section>

                <div className="container max-w-4xl mx-auto px-4 py-16">
                    
                    <div className="info-alert mb-8 flex items-start gap-4 p-4 bg-[var(--c-carbon)] border border-[rgba(255,255,255,0.1)] rounded-[var(--radius-md)]">
                        <Camera size={24} className="text-[var(--c-accent-red)] flex-shrink-0 mt-1" />
                        <div>
                            <h4 className="text-[var(--c-ivory)] font-bold mb-1">Fotos del Vehículo</h4>
                            <p className="text-[var(--c-ivory-muted)] text-sm">Por el momento, completá únicamente los datos técnicos. Nuestro equipo te contactará por WhatsApp para solicitarte las fotografías de la unidad.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="quote-form">
                        {/* Honeypot Field */}
                        <div style={{ position: 'absolute', left: '-5000px' }} aria-hidden="true">
                            <label htmlFor="honeypot">No completar si eres humano</label>
                            <input type="text" name="honeypot" id="honeypot" tabIndex="-1" value={formData.honeypot} onChange={handleChange} />
                        </div>

                        {/* SECTION: VEHICLE */}
                        <div className="form-section">
                            <div className="section-header">
                                <CarFront size={24} />
                                <h3>Datos del Vehículo</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label htmlFor="brand">Marca <span className="text-red-500">*</span></label>
                                    <input type="text" id="brand" name="brand" required value={formData.brand} onChange={handleChange} className="form-input" placeholder="Ej. Volkswagen" />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="model">Modelo <span className="text-red-500">*</span></label>
                                    <input type="text" id="model" name="model" required value={formData.model} onChange={handleChange} className="form-input" placeholder="Ej. Gol Trend" />
                                </div>
                                <div className="form-group md:col-span-2">
                                    <label htmlFor="version">Versión / Motor</label>
                                    <input type="text" id="version" name="version" value={formData.version} onChange={handleChange} className="form-input" placeholder="Ej. 1.6 MSI Trendline" />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="year">Año <span className="text-red-500">*</span></label>
                                    <input type="number" id="year" name="year" required min="1990" max={new Date().getFullYear()} value={formData.year} onChange={handleChange} className="form-input" placeholder="Ej. 2018" />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="km">Kilometraje <span className="text-red-500">*</span></label>
                                    <input type="number" id="km" name="km" required min="0" value={formData.km} onChange={handleChange} className="form-input" placeholder="Ej. 65000" />
                                </div>
                                <div className="form-group md:col-span-2">
                                    <label htmlFor="condition">Estado General <span className="text-red-500">*</span></label>
                                    <select id="condition" name="condition" required value={formData.condition} onChange={handleChange} className="form-input">
                                        <option value="Excelente">Excelente (Sin detalles)</option>
                                        <option value="Muy Bueno">Muy Bueno (Detalles estéticos menores)</option>
                                        <option value="Bueno">Bueno (Desgaste normal de uso)</option>
                                        <option value="Regular">Regular (Requiere reparaciones)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* SECTION: CLIENT */}
                        <div className="form-section">
                            <div className="section-header">
                                <User size={24} />
                                <h3>Datos de Contacto</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-group md:col-span-2">
                                    <label htmlFor="name">Nombre y Apellido <span className="text-red-500">*</span></label>
                                    <input type="text" id="name" name="name" required autoComplete="name" value={formData.name} onChange={handleChange} className="form-input" placeholder="Tu nombre completo" />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="phone">Teléfono (WhatsApp) <span className="text-red-500">*</span></label>
                                    <input type="tel" id="phone" name="phone" required autoComplete="tel" value={formData.phone} onChange={handleChange} className="form-input" placeholder="Con código de área" />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="email">Email <span className="text-red-500">*</span></label>
                                    <input type="email" id="email" name="email" required autoComplete="email" value={formData.email} onChange={handleChange} className="form-input" placeholder="tu@email.com" />
                                </div>
                                <div className="form-group md:col-span-2">
                                    <label htmlFor="location">Ubicación <span className="text-red-500">*</span></label>
                                    <input type="text" id="location" name="location" required value={formData.location} onChange={handleChange} className="form-input" placeholder="Ej. Comodoro Rivadavia, Chubut" />
                                </div>
                            </div>
                        </div>

                        {/* SECTION: EXTRA */}
                        <div className="form-section">
                            <div className="section-header">
                                <FileText size={24} />
                                <h3>Comentarios Adicionales</h3>
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="message">¿Tiene algún detalle mecánico o estético que debamos saber?</label>
                                <textarea id="message" name="message" rows="3" value={formData.message} onChange={handleChange} className="form-input resize-none" placeholder="Opcional. Ej. Cambio de correas hace 10.000km, raspon en paragolpes trasero..."></textarea>
                            </div>
                        </div>

                        {/* Submit Area */}
                        <div className="submit-area mt-8">
                            <div className="consent-text text-xs text-[var(--c-ivory-muted)] mb-6 text-center max-w-2xl mx-auto">
                                Al enviar este formulario, confirmás que los datos ingresados son reales y aceptás que AutoSporting almacene tu información para contactarte en relación a esta cotización.
                            </div>

                            {status === 'error' && (
                                <div className="error-message mb-6 flex items-center justify-center gap-2 text-red-400 bg-red-400/10 p-4 rounded max-w-md mx-auto">
                                    <AlertCircle size={20} />
                                    <p className="text-sm font-semibold">Error al enviar. Por favor, intentá de nuevo más tarde.</p>
                                </div>
                            )}

                            <button 
                                type="submit" 
                                className="btn btn-primary w-full max-w-md mx-auto flex items-center justify-center gap-2 py-4 text-lg"
                                disabled={status === 'submitting'}
                            >
                                {status === 'submitting' ? 'Procesando...' : (
                                    <>Solicitar Cotización <Send size={20} /></>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>

            <style>{`
                .quote-hero {
                    background: var(--c-graphite);
                }

                .quote-form {
                    background: transparent;
                }

                .form-section {
                    background: var(--c-graphite);
                    border: var(--border-thin);
                    border-radius: var(--radius-lg);
                    padding: var(--space-6) var(--space-8);
                    margin-bottom: var(--space-6);
                }

                .section-header {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    margin-bottom: var(--space-6);
                    padding-bottom: var(--space-4);
                    border-bottom: var(--border-thin);
                }

                .section-header svg {
                    color: var(--c-accent-red);
                }

                .section-header h3 {
                    color: var(--c-ivory);
                    font-size: 1.25rem;
                    font-weight: 700;
                    font-family: var(--font-title);
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    margin-bottom: var(--space-2);
                }

                .form-group label {
                    color: var(--c-ivory-muted);
                    font-size: 0.85rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .form-input {
                    width: 100%;
                    background: var(--c-carbon);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: var(--radius-sm);
                    padding: 12px 16px;
                    color: var(--c-ivory);
                    font-family: var(--font-main);
                    font-size: 1rem;
                    transition: all 0.2s ease;
                }

                .form-input:focus {
                    outline: none;
                    border-color: var(--c-accent-red);
                    box-shadow: 0 0 0 1px var(--c-accent-red);
                }

                .form-input::placeholder {
                    color: rgba(255,255,255,0.2);
                }

                select.form-input {
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 16px center;
                }
            `}</style>
        </>
    );
};

export default Quote;
