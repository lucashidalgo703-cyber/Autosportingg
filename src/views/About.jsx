"use client";
import React from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShieldCheck, Wrench, ThumbsUp, MapPin } from 'lucide-react';

const About = () => {
    return (
        <>
            <Head>
                <title>Nosotros | AutoSporting</title>
                <meta name="description" content="Conocé la historia de AutoSporting, nuestra dedicación al rubro automotor en Comodoro Rivadavia y nuestro riguroso proceso de inspección de vehículos usados." />
            </Head>

            <main className="about-page">
                {/* Hero Section */}
                <section className="about-hero py-20 px-4 text-center">
                    <div className="container max-w-4xl mx-auto">
                        <motion.h1 
                            className="text-4xl md:text-5xl font-black text-[var(--c-ivory)] mb-6"
                            style={{ fontFamily: 'var(--font-title)' }}
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            Transparencia en cada kilómetro
                        </motion.h1>
                        <motion.p 
                            className="text-[var(--c-ivory-muted)] text-lg md:text-xl leading-relaxed"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            En AutoSporting nos dedicamos a ofrecer vehículos seleccionados, garantizando un proceso de compra claro, seguro y respaldado por nuestro equipo de profesionales en Comodoro Rivadavia.
                        </motion.p>
                    </div>
                </section>

                <div className="container max-w-6xl mx-auto px-4 pb-20">
                    
                    {/* History & Local */}
                    <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
                        <motion.div 
                            className="about-image-wrapper"
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <Image 
                                src="/agencia-autosporting.jpg" 
                                alt="Concesionaria AutoSporting"
                                fill
                                className="object-cover rounded-[var(--radius-lg)]"
                                unoptimized
                            />
                        </motion.div>
                        
                        <motion.div 
                            className="about-text"
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-3xl font-bold text-[var(--c-ivory)] mb-6" style={{ fontFamily: 'var(--font-title)' }}>Nuestra Historia</h2>
                            <p className="text-[var(--c-ivory-muted)] mb-4 leading-relaxed">
                                Desde nuestros inicios, el objetivo de AutoSporting fue crear un espacio donde la compra de un vehículo usado deje de ser una incertidumbre.
                            </p>
                            <p className="text-[var(--c-ivory-muted)] mb-6 leading-relaxed">
                                Situados en el corazón de Comodoro Rivadavia, hemos construido relaciones a largo plazo con nuestros clientes basadas en una simple premisa: decir la verdad sobre el estado de cada vehículo. No maquillamos defectos; los reparamos o los informamos.
                            </p>
                            <div className="flex items-center gap-3 text-[var(--c-ivory)] font-semibold">
                                <MapPin className="text-[var(--c-accent-red)]" />
                                Av. Hipólito Yrigoyen 2289, Comodoro Rivadavia
                            </div>
                        </motion.div>
                    </div>

                    {/* Inspection Process */}
                    <div className="process-section bg-[var(--c-graphite)] rounded-[var(--radius-lg)] p-8 md:p-12 mb-24 border border-[rgba(255,255,255,0.05)]">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-[var(--c-ivory)] mb-4" style={{ fontFamily: 'var(--font-title)' }}>El Proceso AutoSporting</h2>
                            <p className="text-[var(--c-ivory-muted)] max-w-2xl mx-auto">
                                Cada vehículo que ingresa a nuestro salón pasa por un estricto control antes de ser publicado en nuestro catálogo.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <motion.div 
                                className="process-card"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 }}
                            >
                                <div className="process-icon">
                                    <ShieldCheck size={32} />
                                </div>
                                <h3>1. Verificación Legal</h3>
                                <p>Control exhaustivo de dominio, libre deuda de patentes e infracciones, e inhibiciones. Garantizamos que el vehículo está listo para transferir.</p>
                            </motion.div>

                            <motion.div 
                                className="process-card"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                            >
                                <div className="process-icon">
                                    <Wrench size={32} />
                                </div>
                                <h3>2. Inspección Mecánica</h3>
                                <p>Revisión en taller de motor, fluidos, tren delantero, frenos y escaneo computarizado para asegurar su correcto funcionamiento.</p>
                            </motion.div>

                            <motion.div 
                                className="process-card"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3 }}
                            >
                                <div className="process-icon">
                                    <ThumbsUp size={32} />
                                </div>
                                <h3>3. Acondicionamiento</h3>
                                <p>Limpieza profunda de interiores, tratamiento estético exterior y solución de detalles menores para entregártelo en las mejores condiciones.</p>
                            </motion.div>
                        </div>
                    </div>

                    {/* Team & Post-sales */}
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <motion.div 
                            className="about-text order-2 lg:order-1"
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-3xl font-bold text-[var(--c-ivory)] mb-6" style={{ fontFamily: 'var(--font-title)' }}>Equipo y Postventa</h2>
                            <p className="text-[var(--c-ivory-muted)] mb-4 leading-relaxed">
                                Nuestro equipo de asesores no busca empujarte a una compra, sino encontrar el vehículo que realmente se adapte a tu necesidad y presupuesto.
                            </p>
                            <p className="text-[var(--c-ivory-muted)] leading-relaxed">
                                Además, la relación no termina cuando te llevas la llave. Contamos con un sólido canal de atención postventa para asistirte con la gestoría y responder cualquier inquietud que surja sobre el uso de tu nueva unidad.
                            </p>
                        </motion.div>

                        <motion.div 
                            className="about-image-wrapper order-1 lg:order-2"
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <Image 
                                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=1000&auto=format&fit=crop" 
                                alt="Atención al cliente AutoSporting"
                                fill
                                className="object-cover rounded-[var(--radius-lg)]"
                                unoptimized
                            />
                        </motion.div>
                    </div>

                </div>
            </main>

            <style>{`
                .about-hero {
                    background: radial-gradient(circle at center top, var(--c-graphite) 0%, var(--c-carbon) 100%);
                    border-bottom: var(--border-thin);
                }

                .about-image-wrapper {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 4/3;
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    border: var(--border-thin);
                    box-shadow: var(--shadow-md);
                }

                .process-card {
                    background: var(--c-carbon);
                    border: var(--border-thin);
                    border-radius: var(--radius-md);
                    padding: var(--space-6);
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .process-icon {
                    width: 64px;
                    height: 64px;
                    background: rgba(230, 48, 39, 0.1);
                    color: var(--c-accent-red);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: var(--space-5);
                }

                .process-card h3 {
                    color: var(--c-ivory);
                    font-size: 1.1rem;
                    font-weight: 700;
                    margin-bottom: var(--space-3);
                }

                .process-card p {
                    color: var(--c-ivory-muted);
                    font-size: 0.95rem;
                    line-height: 1.5;
                }
            `}</style>
        </>
    );
};

export default About;
