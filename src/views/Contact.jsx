"use client";
import React, { useState } from 'react';
import Head from 'next/head';
import { MapPin, Phone, Mail, Clock, Send, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { trackEvent } from '../lib/analytics';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const baseUrl = process.env.NODE_ENV === 'production' ? '' : API_URL;

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: 'Consulta General',
        message: '',
        honeypot: '',
        consent: false
    });

    const [status, setStatus] = useState('idle'); // idle, submitting, success, error

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Spam prevention (Honeypot)
        if (formData.honeypot) {
            console.warn("Spam detected");
            setStatus('success');
            return;
        }

        if (!formData.consent) {
            alert('Debes aceptar los términos y condiciones');
            return;
        }

        if (status === 'submitting') return;
        setStatus('submitting');
        trackEvent('submit_lead', { intent: formData.subject });

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const utmSource = urlParams.get('utm_source') || 'direct';
            const utmMedium = urlParams.get('utm_medium') || '';
            const utmCampaign = urlParams.get('utm_campaign') || '';

            const response = await fetch(`${baseUrl}/api/leads/public`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    message: formData.message,
                    source: `Web - Contacto - ${formData.subject}`,
                    pageUrl: window.location.href,
                    utmSource,
                    utmMedium,
                    utmCampaign,
                    consent: true
                }),
            });

            if (response.ok) {
                trackEvent('lead_success', { intent: formData.subject });
                setStatus('success');
                setFormData({ name: '', email: '', phone: '', subject: 'Consulta General', message: '', honeypot: '', consent: false });
                setTimeout(() => setStatus('idle'), 5000);
            } else {
                trackEvent('lead_error', { intent: formData.subject, error: 'HTTP Not OK' });
                throw new Error('Error en el servidor');
            }
        } catch (error) {
            console.error("Error submitting form:", error);
            trackEvent('lead_error', { intent: formData.subject, error: error.message });
            setStatus('error');
            setTimeout(() => setStatus('idle'), 5000);
        }
    };

    return (
        <>
            <Head>
                <title>Contacto | AutoSporting</title>
                <meta name="description" content="Comunicate con AutoSporting. Estamos en Comodoro Rivadavia para asesorarte en la compra o venta de tu vehículo." />
            </Head>

            <main className="contact-page">
                {/* Hero */}
                <section className="contact-hero py-16 px-4 text-center border-b border-[rgba(255,255,255,0.05)]">
                    <motion.h1 
                        className="text-4xl md:text-5xl font-black text-[var(--c-ivory)] mb-4"
                        style={{ fontFamily: 'var(--font-title)' }}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        Contacto
                    </motion.h1>
                    <motion.p 
                        className="text-[var(--c-ivory-muted)] text-lg max-w-2xl mx-auto"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        Dejanos tu consulta y un asesor comercial se pondrá en contacto a la brevedad.
                    </motion.p>
                </section>

                <div className="container max-w-6xl mx-auto px-4 py-16">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
                        
                        {/* Contact Info */}
                        <motion.div 
                            className="contact-info flex flex-col gap-8"
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="info-blocks flex flex-col gap-6">
                                <div className="info-block">
                                    <div className="icon-wrapper">
                                        <MapPin size={24} />
                                    </div>
                                    <div>
                                        <h3>Ubicación</h3>
                                        <p>Av. Hipólito Yrigoyen 2289<br/>Comodoro Rivadavia, Chubut</p>
                                    </div>
                                </div>
                                <div className="info-block">
                                    <div className="icon-wrapper">
                                        <Phone size={24} />
                                    </div>
                                    <div>
                                        <h3>Teléfono / WhatsApp</h3>
                                        <a href="tel:+5492974045378" className="hover:text-[var(--c-accent-red)] transition-colors">+54 9 297 404-5378</a>
                                    </div>
                                </div>
                                <div className="info-block">
                                    <div className="icon-wrapper">
                                        <Mail size={24} />
                                    </div>
                                    <div>
                                        <h3>Email</h3>
                                        <a href="mailto:info@autosporting.com.ar" className="hover:text-[var(--c-accent-red)] transition-colors">info@autosporting.com.ar</a>
                                    </div>
                                </div>
                                <div className="info-block">
                                    <div className="icon-wrapper">
                                        <Clock size={24} />
                                    </div>
                                    <div>
                                        <h3>Horario de Atención</h3>
                                        <p>Lunes a Viernes: 09:00 - 18:00 hs<br/>Sábados: 09:00 - 13:00 hs</p>
                                    </div>
                                </div>
                            </div>

                            <div className="map-container mt-4 rounded-[var(--radius-lg)] overflow-hidden border border-[rgba(255,255,255,0.05)]">
                                <iframe 
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2938.8315053229864!2d-67.502931!3d-45.864392!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDXCsDUxJzUxLjgiUyA2N8KwMzAnMTAuNiJX!5e0!3m2!1ses-419!2sar!4v1620000000000!5m2!1ses-419!2sar" 
                                    width="100%" 
                                    height="300" 
                                    style={{ border: 0 }} 
                                    allowFullScreen="" 
                                    loading="lazy" 
                                    referrerPolicy="no-referrer-when-downgrade"
                                    title="Ubicación AutoSporting"
                                ></iframe>
                            </div>
                        </motion.div>

                        {/* Contact Form */}
                        <motion.div 
                            className="form-wrapper"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="form-card">
                                <h2 className="text-2xl font-bold text-[var(--c-ivory)] mb-6" style={{ fontFamily: 'var(--font-title)' }}>
                                    Envianos tu mensaje
                                </h2>

                                {status === 'success' ? (
                                    <div className="success-message">
                                        <ShieldCheck size={48} className="text-[var(--c-accent-red)] mx-auto mb-4" />
                                        <h3 className="text-xl font-bold text-[var(--c-ivory)] mb-2">¡Mensaje enviado!</h3>
                                        <p>Gracias por contactarte. Un asesor se comunicará con vos a la brevedad.</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="contact-form">
                                        {/* Honeypot Field - Hidden from users */}
                                        <div style={{ position: 'absolute', left: '-5000px' }} aria-hidden="true">
                                            <label htmlFor="honeypot">No completar si eres humano</label>
                                            <input type="text" name="honeypot" id="honeypot" tabIndex="-1" value={formData.honeypot} onChange={handleChange} />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="name">Nombre completo <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                id="name" 
                                                name="name" 
                                                required 
                                                autoComplete="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                className="form-input"
                                                placeholder="Ej. Juan Pérez"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="form-group">
                                                <label htmlFor="email">Email <span className="text-red-500">*</span></label>
                                                <input 
                                                    type="email" 
                                                    id="email" 
                                                    name="email" 
                                                    required 
                                                    autoComplete="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    className="form-input"
                                                    placeholder="ejemplo@correo.com"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="phone">Teléfono <span className="text-red-500">*</span></label>
                                                <input 
                                                    type="tel" 
                                                    id="phone" 
                                                    name="phone" 
                                                    required 
                                                    autoComplete="tel"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    className="form-input"
                                                    placeholder="Ej. 297 123 4567"
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="subject">Asunto</label>
                                            <select 
                                                id="subject" 
                                                name="subject" 
                                                value={formData.subject}
                                                onChange={handleChange}
                                                className="form-input"
                                            >
                                                <option value="Consulta General">Consulta General</option>
                                                <option value="Comprar Vehículo">Comprar Vehículo</option>
                                                <option value="Vender Vehículo">Vender Vehículo</option>
                                                <option value="Financiación">Financiación</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="message">Mensaje <span className="text-red-500">*</span></label>
                                            <textarea 
                                                id="message" 
                                                name="message" 
                                                required 
                                                rows="5"
                                                value={formData.message}
                                                onChange={handleChange}
                                                className="form-input resize-none"
                                                placeholder="Escribí tu consulta aquí..."
                                            ></textarea>
                                        </div>

                                        <div className="consent-text text-xs text-[var(--c-ivory-muted)] mb-6">
                                            Al enviar este formulario, aceptás que AutoSporting almacene y procese tus datos para contactarte, en cumplimiento con la normativa de protección de datos personales.
                                        </div>

                                        {status === 'error' && (
                                            <div className="error-message mb-4 flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded">
                                                <AlertCircle size={18} />
                                                <p className="text-sm">Ocurrió un error al enviar. Por favor, intentá de nuevo.</p>
                                            </div>
                                        )}

                                        <button 
                                            type="submit" 
                                            className="btn btn-primary w-full flex items-center justify-center gap-2"
                                            disabled={status === 'submitting'}
                                        >
                                            {status === 'submitting' ? 'Enviando...' : (
                                                <>Enviar Mensaje <Send size={18} /></>
                                            )}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </main>

            <style>{`
                .contact-hero {
                    background: var(--c-graphite);
                }

                .info-block {
                    display: flex;
                    align-items: flex-start;
                    gap: var(--space-4);
                }

                .icon-wrapper {
                    width: 48px;
                    height: 48px;
                    background: var(--c-graphite);
                    border: var(--border-thin);
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--c-accent-red);
                    flex-shrink: 0;
                }

                .info-block h3 {
                    color: var(--c-ivory);
                    font-weight: 700;
                    margin-bottom: 4px;
                    font-size: 1.05rem;
                }

                .info-block p, .info-block a {
                    color: var(--c-ivory-muted);
                    font-size: 0.95rem;
                    line-height: 1.5;
                }

                .form-card {
                    background: var(--c-graphite);
                    border: var(--border-thin);
                    border-radius: var(--radius-lg);
                    padding: var(--space-6) var(--space-8);
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    margin-bottom: var(--space-4);
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

                .success-message {
                    text-align: center;
                    padding: 3rem 1rem;
                }

                .success-message p {
                    color: var(--c-ivory-muted);
                }
            `}</style>
        </>
    );
};

export default Contact;
