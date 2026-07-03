"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Head from 'next/head';
import { ArrowLeft, Calendar, Gauge, Fuel, Maximize2, X, ChevronLeft, ChevronRight, Heart, Share2, ShieldCheck, Banknote, RefreshCw, Smartphone } from 'lucide-react';
import { useCars } from '../hooks/useCars';
import { getOptimizedImageUrl } from '../lib/cloudinaryUtils';
import { useFavorites } from '../context/FavoritesContext';
import { trackEvent } from '../lib/analytics';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import CarCard from '../components/CarCard'; // For similar cars

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const baseUrl = process.env.NODE_ENV === 'production' ? '' : API_URL;

const formatPrice = (price, currency = 'USD') => {
    return 'Consultar precio';
};

const CarDetail = () => {
    const { id } = useParams();
    const router = useRouter();
    const { cars: allCars } = useCars();
    const [car, setCar] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    
    const { isFavorite, toggleFavorite } = useFavorites();
    
    // Gallery State
    const [activeImage, setActiveImage] = useState(null);
    const [showLightbox, setShowLightbox] = useState(false);
    const [copied, setCopied] = useState(false);

    // Form State
    const [showCaptureModal, setShowCaptureModal] = useState(false);
    const [captureIntent, setCaptureIntent] = useState('Asesoramiento'); // 'Asesoramiento', 'Test Drive', 'Cotizar Usado'
    const [captureData, setCaptureData] = useState({ name: '', phone: '', email: '', message: '' });
    const [isCapturing, setIsCapturing] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    useEffect(() => {
        const fetchSingleCar = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${baseUrl}/api/public/cars/${id}?t=${Date.now()}`);
                if (response.ok) {
                    const data = await response.json();
                    setCar(data);
                    setActiveImage(data.coverImage || (data.images && data.images[0]) || data.image);
                    trackEvent('view_vehicle', { brand: data.brand, name: data.name }, data._id || data.id);
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error("Error fetching car detail:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchSingleCar();
    }, [id]);

    const isFav = car ? isFavorite(car._id || car.id) : false;
    const images = car ? (car.images || [car.coverImage || car.image].filter(Boolean)) : [];

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${car.brand} ${car.name} - AutoSporting`,
                    url: url
                });
            } catch (err) {
                copyToClipboard(url);
            }
        } else {
            copyToClipboard(url);
        }
    };

    const copyToClipboard = (url) => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleNext = (e) => {
        e?.stopPropagation();
        if (images.length === 0) return;
        const currentIndex = images.indexOf(activeImage);
        const nextIndex = (currentIndex + 1) % images.length;
        setActiveImage(images[nextIndex]);
    };

    const handlePrev = (e) => {
        e?.stopPropagation();
        if (images.length === 0) return;
        const currentIndex = images.indexOf(activeImage);
        const prevIndex = (currentIndex - 1 + images.length) % images.length;
        setActiveImage(images[prevIndex]);
    };

    const getWhatsAppUrl = () => {
        trackEvent('click_whatsapp', { intent: 'Asesoramiento General' }, car?._id || car?.id);
        return `https://wa.me/5492974045378?text=${encodeURIComponent(`Hola AutoSporting, estoy interesado en el ${car?.brand} ${car?.name} ${car?.year} (ID: ${car?.internalId || id}). Link: ${window.location.href}`)}`;
    };

    const openForm = (intent) => {
        trackEvent('start_lead', { intent }, car?._id || car?.id);
        setCaptureIntent(intent);
        setShowCaptureModal(true);
        setSubmitSuccess(false);
    };

    const handleCaptureSubmit = async (e) => {
        e.preventDefault();
        if (isCapturing) return; // Prevent double submit
        setIsCapturing(true);
        trackEvent('submit_lead', { intent: captureIntent }, car?._id || car?.id);

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const utmSource = urlParams.get('utm_source') || 'direct';
            const utmMedium = urlParams.get('utm_medium') || '';
            const utmCampaign = urlParams.get('utm_campaign') || '';

            await fetch(`${baseUrl}/api/leads/public`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...captureData,
                    vehicleId: car._id || car.id,
                    vehicleName: `${car.brand} ${car.name}`,
                    source: `Web - ${captureIntent}`,
                    pageUrl: window.location.href,
                    utmSource,
                    utmMedium,
                    utmCampaign,
                    consent: true
                })
            });
            trackEvent('lead_success', { intent: captureIntent }, car?._id || car?.id);
            setSubmitSuccess(true);
            setTimeout(() => {
                setShowCaptureModal(false);
                setCaptureData({ name: '', phone: '', email: '', message: '' });
            }, 3000);
        } catch (error) {
            console.error("Error submitting lead:", error);
            trackEvent('lead_error', { intent: captureIntent, error: error.message }, car?._id || car?.id);
            alert("Ocurrió un error al enviar tu consulta. Por favor, intentá nuevamente o contactanos por WhatsApp.");
        } finally {
            setIsCapturing(false);
        }
    };

    const similarCars = useMemo(() => {
        if (!car || !allCars) return [];
        return allCars
            .filter(c => c._id !== car._id && c.id !== car.id) // Exclude current
            .filter(c => c.brand === car.brand || c.type === car.type || c.vehicleType === car.vehicleType)
            .slice(0, 3);
    }, [car, allCars]);

    if (loading) {
        return (
            <div className="container page-padding text-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-8 w-64 bg-[var(--c-carbon)] rounded mb-8"></div>
                    <div className="w-full h-[50vh] bg-[var(--c-carbon)] rounded-xl mb-8"></div>
                    <div className="h-4 w-48 bg-[var(--c-carbon)] rounded"></div>
                </div>
            </div>
        );
    }

    if (error || !car) {
        return (
            <div className="container page-padding text-center py-20">
                <h1 className="text-4xl font-black text-[var(--c-ivory)] mb-4" style={{ fontFamily: 'var(--font-title)' }}>Vehículo no encontrado</h1>
                <p className="text-[var(--c-ivory-muted)] mb-8">El vehículo que estás buscando ya no está disponible o el enlace es incorrecto.</p>
                <Link href="/catalogo" className="btn btn-primary">Volver al catálogo</Link>
            </div>
        );
    }

    const isReserved = car.status === 'Reservado' || car.status === 'Señado';
    const isSold = car.status === 'Vendido';
    const isAvailable = !isReserved && !isSold;
    
    // Estimated Quota (Mock calculation: 50% down payment, 36 months, 5% monthly rate)
    const estimatedQuota = car.price ? (car.price * 0.5 * 1.05) / 36 : 0;

    // Schema Markup
    const schemaData = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": `${car.brand} ${car.name}`,
        "image": images.map(img => getOptimizedImageUrl(img, 800)),
        "description": car.description || `Excelente ${car.brand} ${car.name} año ${car.year}`,
        "brand": {
            "@type": "Brand",
            "name": car.brand
        },
        "offers": {
            "@type": "Offer",
            "url": typeof window !== 'undefined' ? window.location.href : '',
            "priceCurrency": car.currency || "USD",
            "price": car.price,
            "itemCondition": "https://schema.org/UsedCondition",
            "availability": isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
        }
    };

    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [{
            "@type": "ListItem",
            "position": 1,
            "name": "Inicio",
            "item": "https://autosportingg.com"
        },{
            "@type": "ListItem",
            "position": 2,
            "name": "Catálogo",
            "item": "https://autosportingg.com/catalogo"
        },{
            "@type": "ListItem",
            "position": 3,
            "name": `${car.brand} ${car.name}`,
            "item": typeof window !== 'undefined' ? window.location.href : `https://autosportingg.com/auto/${car._id || car.id}`
        }]
    };

    return (
        <>
            <Head>
                <title>{`${car.brand} ${car.name} ${car.year} | AutoSporting`}</title>
                <meta name="description" content={car.description || `Comprá tu ${car.brand} ${car.name} en AutoSporting. Inspeccionado, garantizado y listo para transferir.`} />
                <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : ''} />
                <meta property="og:title" content={`${car.brand} ${car.name} ${car.year}`} />
                <meta property="og:image" content={getOptimizedImageUrl(activeImage, 800)} />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([schemaData, breadcrumbSchema]) }} />
            </Head>

            <main id="main-content" className="car-detail-page">
                <div className="container">
                    
                    {/* Breadcrumbs */}
                    <nav className="breadcrumbs" aria-label="Breadcrumb">
                        <ol>
                            <li><Link href="/">Inicio</Link></li>
                            <li><span className="separator">/</span><Link href="/catalogo">Catálogo</Link></li>
                            <li><span className="separator">/</span><span className="current">{car.brand} {car.name}</span></li>
                        </ol>
                    </nav>

                    <div className="detail-grid">
                        
                        {/* LEFT COLUMN: Gallery */}
                        <div className="gallery-section">
                            <div className="main-image-container group" onClick={() => setShowLightbox(true)}>
                                <Image
                                    src={getOptimizedImageUrl(activeImage, 1200) || '/placeholder.png'}
                                    alt={`${car.brand} ${car.name}`}
                                    width={1200}
                                    height={1200}
                                    className="main-image"
                                    unoptimized
                                    priority={true}
                                />
                                {!isAvailable && (
                                    <div className={`status-badge-large ${isSold ? 'status-vendido' : 'status-reservado'}`}>
                                        {isSold ? 'Vendido' : 'Reservado'}
                                    </div>
                                )}
                                <div className="zoom-hint">
                                    <Maximize2 size={24} />
                                </div>
                            </div>
                            
                            {images.length > 1 && (
                                <div className="thumbnail-strip">
                                    {images.map((img, idx) => (
                                        <button 
                                            key={idx}
                                            className={`thumb-btn ${activeImage === img ? 'active' : ''}`}
                                            onClick={() => setActiveImage(img)}
                                        >
                                            <Image src={getOptimizedImageUrl(img, 200)} alt={`Thumb ${idx}`} fill className="thumb-img" unoptimized />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Trust Modules (Desktop Layout) */}
                            <div className="trust-modules mt-8 hidden lg:grid">
                                <div className="trust-card">
                                    <ShieldCheck size={32} className="text-[var(--c-accent-red)] mb-4" />
                                    <h4>Inspección Verificada</h4>
                                    <p>Vehículo revisado mecánicamente y libre de deudas.</p>
                                </div>
                                <div className="trust-card">
                                    <Banknote size={32} className="text-[var(--c-accent-red)] mb-4" />
                                    <h4>Financiación</h4>
                                    <p>Opciones a tu medida con cuotas fijas.</p>
                                </div>
                                <div className="trust-card">
                                    <RefreshCw size={32} className="text-[var(--c-accent-red)] mb-4" />
                                    <h4>Tomamos tu usado</h4>
                                    <p>Cotización justa y en el acto.</p>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Info & Actions */}
                        <div className="info-section">
                            <div className="info-header">
                                <div className="brand-year">
                                    {car.brand} | {car.year}
                                </div>
                                <div className="actions">
                                    <button className="icon-btn" onClick={handleShare} aria-label="Compartir">
                                        <Share2 size={20} />
                                    </button>
                                    <button 
                                        className="icon-btn" 
                                        onClick={() => toggleFavorite(carId)}
                                        aria-pressed={isFav}
                                        aria-label="Favorito"
                                    >
                                        <Heart size={20} fill={isFav ? "var(--c-accent-red)" : "transparent"} color={isFav ? "var(--c-accent-red)" : "var(--c-ivory)"} />
                                    </button>
                                </div>
                            </div>

                            <h1 className="car-title">
                                {car.name} {car.version && <span className="version">{car.version}</span>}
                            </h1>

                            <div className="price-container">
                                <div className="main-price">
                                    {formatPrice(car.price, car.currency)}
                                </div>
                                {estimatedQuota > 0 && isAvailable && (
                                    <div className="estimated-quota">
                                        Cuota aprox. desde {formatPrice(estimatedQuota, car.currency)}/mes
                                    </div>
                                )}
                            </div>

                            {/* Main Specs Grid */}
                            <div className="specs-grid">
                                <div className="spec-box">
                                    <Calendar size={20} className="spec-icon" />
                                    <span className="spec-value">{car.year}</span>
                                    <span className="spec-label">Año</span>
                                </div>
                                <div className="spec-box">
                                    <Gauge size={20} className="spec-icon" />
                                    <span className="spec-value">{car.km === 0 ? '0' : car.km.toLocaleString()}</span>
                                    <span className="spec-label">Kilómetros</span>
                                </div>
                                <div className="spec-box">
                                    <Fuel size={20} className="spec-icon" />
                                    <span className="spec-value">{car.fuel || car.fuelType || '-'}</span>
                                    <span className="spec-label">Combustible</span>
                                </div>
                                <div className="spec-box">
                                    <Smartphone size={20} className="spec-icon" />
                                    <span className="spec-value">{car.transmission || '-'}</span>
                                    <span className="spec-label">Transmisión</span>
                                </div>
                            </div>

                            {/* Desktop CTAs */}
                            <div className="cta-group hidden lg:flex flex-col gap-3 mt-8">
                                <a 
                                    href={getWhatsAppUrl()} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="btn btn-primary w-full text-center flex items-center justify-center gap-2"
                                    disabled={!isAvailable}
                                >
                                    Consultar por WhatsApp
                                </a>
                                <button 
                                    className="btn btn-hero-outline w-full"
                                    onClick={() => openForm('Asesoramiento')}
                                    disabled={!isAvailable}
                                >
                                    Solicitar asesoramiento
                                </button>
                                <div className="flex gap-3">
                                    <button 
                                        className="btn btn-outline flex-1 text-sm"
                                        onClick={() => openForm('Cotizar Usado')}
                                    >
                                        Cotizar mi usado
                                    </button>
                                    <button 
                                        className="btn btn-outline flex-1 text-sm"
                                        onClick={() => openForm('Test Drive')}
                                        disabled={!isAvailable}
                                    >
                                        Agendar Test Drive
                                    </button>
                                </div>
                            </div>

                            {car.description && (
                                <div className="description-box mt-8">
                                    <h3>Descripción</h3>
                                    <p>{car.description}</p>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Similar Cars */}
                    {similarCars.length > 0 && (
                        <div className="similar-cars-section mt-16 pb-16">
                            <h2 className="text-3xl font-bold mb-6 text-[var(--c-ivory)] border-l-4 border-[var(--c-accent-red)] pl-4" style={{ fontFamily: 'var(--font-title)' }}>
                                Vehículos Similares
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {similarCars.map(c => (
                                    <CarCard key={c._id || c.id} car={c} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Mobile Fixed Bottom Bar */}
            <div className="mobile-bottom-bar lg:hidden">
                <div className="flex-1">
                    <div className="text-[0.75rem] text-[var(--c-ivory-muted)] uppercase font-bold tracking-wider mb-0.5">Precio</div>
                    <div className="text-lg font-black text-[var(--c-ivory)]" style={{ fontFamily: 'var(--font-title)' }}>
                        {formatPrice(car.price, car.currency)}
                    </div>
                </div>
                <a 
                    href={getWhatsAppUrl()} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn btn-primary h-12 flex items-center px-6"
                    disabled={!isAvailable}
                >
                    Consultar
                </a>
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {showLightbox && (
                    <motion.div 
                        className="lightbox"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <button className="lightbox-close" onClick={() => setShowLightbox(false)}><X size={32} /></button>
                        <button className="lightbox-nav prev" onClick={handlePrev}><ChevronLeft size={48} /></button>
                        <div className="lightbox-content">
                            <Image src={getOptimizedImageUrl(activeImage, 1600)} alt="Zoom" fill className="object-contain" unoptimized />
                        </div>
                        <button className="lightbox-nav next" onClick={handleNext}><ChevronRight size={48} /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Capture Modal */}
            <AnimatePresence>
                {showCaptureModal && (
                    <motion.div 
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div 
                            className="modal-content"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                        >
                            <button className="modal-close" onClick={() => setShowCaptureModal(false)}><X size={24} /></button>
                            
                            {submitSuccess ? (
                                <div className="text-center py-8">
                                    <ShieldCheck size={64} className="text-[var(--c-accent-red)] mx-auto mb-4" />
                                    <h3 className="text-2xl font-bold text-[var(--c-ivory)] mb-2">¡Solicitud enviada!</h3>
                                    <p className="text-[var(--c-ivory-muted)]">Un asesor se pondrá en contacto con vos a la brevedad.</p>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-2xl font-bold text-[var(--c-ivory)] mb-2" style={{ fontFamily: 'var(--font-title)' }}>
                                        {captureIntent}
                                    </h3>
                                    <p className="text-[var(--c-ivory-muted)] mb-6 text-sm">
                                        Dejanos tus datos para recibir información sobre el {car.brand} {car.name}.
                                    </p>
                                    <form onSubmit={handleCaptureSubmit} className="flex flex-col gap-4">
                                        <div className="input-group">
                                            <label>Nombre completo</label>
                                            <input required type="text" className="input" value={captureData.name} onChange={e => setCaptureData({...captureData, name: e.target.value})} />
                                        </div>
                                        <div className="input-group">
                                            <label>Teléfono (WhatsApp)</label>
                                            <input required type="tel" className="input" value={captureData.phone} onChange={e => setCaptureData({...captureData, phone: e.target.value})} />
                                        </div>
                                        <div className="input-group">
                                            <label>Email</label>
                                            <input required type="email" className="input" value={captureData.email} onChange={e => setCaptureData({...captureData, email: e.target.value})} />
                                        </div>
                                        <div className="input-group">
                                            <label>Mensaje (Opcional)</label>
                                            <textarea className="input" rows="3" value={captureData.message} onChange={e => setCaptureData({...captureData, message: e.target.value})}></textarea>
                                        </div>
                                        <button type="submit" className="btn btn-primary mt-2" disabled={isCapturing}>
                                            {isCapturing ? 'Enviando...' : 'Enviar solicitud'}
                                        </button>
                                    </form>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .car-detail-page {
                    padding-top: calc(var(--header-height) + 2rem);
                    padding-bottom: 6rem; /* Space for mobile bar */
                }

                @media (min-width: 1024px) {
                    .car-detail-page {
                        padding-bottom: 2rem;
                    }
                }

                /* Breadcrumbs */
                .breadcrumbs {
                    margin-bottom: var(--space-6);
                }

                .breadcrumbs ol {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    list-style: none;
                    margin: 0;
                    padding: 0;
                    font-size: 0.85rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .breadcrumbs a {
                    color: var(--c-ivory-muted);
                    transition: color 0.2s ease;
                }

                .breadcrumbs a:hover {
                    color: var(--c-ivory);
                }

                .breadcrumbs .separator {
                    color: var(--c-graphite-light);
                }

                .breadcrumbs .current {
                    color: var(--c-ivory);
                }

                /* Layout */
                .detail-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: var(--space-6);
                }

                @media (min-width: 1024px) {
                    .detail-grid {
                        grid-template-columns: 1fr 1fr;
                        gap: var(--space-8);
                        align-items: flex-start;
                    }
                }

                /* Gallery */
                .main-image-container {
                    position: relative;
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background-color: transparent;
                    border-radius: var(--radius-lg);
                    cursor: zoom-in;
                }

                .main-image {
                    max-width: 100%;
                    max-height: 600px;
                    width: auto;
                    height: auto;
                    border-radius: var(--radius-lg);
                    object-fit: contain;
                    transition: transform 0.4s ease;
                }

                .main-image-container:hover .main-image {
                    transform: scale(1.02);
                }

                .zoom-hint {
                    position: absolute;
                    bottom: var(--space-4);
                    right: var(--space-4);
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(4px);
                    color: white;
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .main-image-container:hover .zoom-hint {
                    opacity: 1;
                }

                .thumbnail-strip {
                    display: flex;
                    gap: var(--space-3);
                    margin-top: var(--space-3);
                    overflow-x: auto;
                    padding-bottom: var(--space-2);
                    scrollbar-width: none; /* Firefox */
                }
                
                .thumbnail-strip::-webkit-scrollbar {
                    display: none; /* Chrome */
                }

                .thumb-btn {
                    position: relative;
                    width: 100px;
                    flex-shrink: 0;
                    aspect-ratio: 16/10;
                    border-radius: var(--radius-sm);
                    overflow: hidden;
                    border: 2px solid transparent;
                    cursor: pointer;
                    opacity: 0.6;
                    transition: all 0.2s ease;
                }

                .thumb-btn.active, .thumb-btn:hover {
                    opacity: 1;
                    border-color: var(--c-accent-red);
                }

                .thumb-img {
                    object-fit: cover;
                }

                .status-badge-large {
                    position: absolute;
                    top: var(--space-4);
                    left: var(--space-4);
                    padding: 8px 16px;
                    border-radius: var(--radius-md);
                    font-size: 0.9rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: white;
                    z-index: 10;
                    font-family: var(--font-title);
                    box-shadow: var(--shadow-md);
                }

                .trust-modules {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: var(--space-4);
                }

                .trust-card {
                    background: var(--c-graphite);
                    border: var(--border-thin);
                    border-radius: var(--radius-md);
                    padding: var(--space-4);
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .trust-card h4 {
                    color: var(--c-ivory);
                    font-size: 0.9rem;
                    font-weight: 700;
                    margin-bottom: 4px;
                }
                
                .trust-card p {
                    color: var(--c-ivory-muted);
                    font-size: 0.8rem;
                    line-height: 1.4;
                }

                /* Info Section */
                .info-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--space-2);
                }

                .brand-year {
                    color: var(--c-ivory-muted);
                    font-size: 0.85rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }

                .icon-btn {
                    background: var(--c-graphite);
                    border: var(--border-thin);
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--c-ivory);
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .icon-btn:hover {
                    background: var(--c-graphite-light);
                    border-color: var(--c-ivory-muted);
                }

                .car-title {
                    font-family: var(--font-title);
                    font-size: clamp(2rem, 4vw, 3rem);
                    font-weight: 900;
                    color: var(--c-ivory);
                    line-height: 1.1;
                    margin-bottom: var(--space-6);
                }

                .car-title .version {
                    display: block;
                    font-size: 0.5em;
                    font-weight: 600;
                    color: var(--c-ivory-muted);
                    margin-top: 4px;
                    font-family: var(--font-main);
                }

                .price-container {
                    margin-bottom: var(--space-6);
                    padding-bottom: var(--space-6);
                    border-bottom: var(--border-thin);
                }

                .main-price {
                    font-family: var(--font-title);
                    font-size: 2.5rem;
                    font-weight: 900;
                    color: var(--c-ivory);
                    margin-bottom: 4px;
                }

                .estimated-quota {
                    font-size: 0.95rem;
                    color: var(--c-accent-red);
                    font-weight: 600;
                }

                .specs-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: var(--space-3);
                    margin-bottom: var(--space-6);
                }

                .spec-box {
                    background: var(--c-graphite);
                    border: var(--border-thin);
                    border-radius: var(--radius-md);
                    padding: var(--space-4);
                    display: flex;
                    flex-direction: column;
                }

                .spec-icon {
                    color: var(--c-accent-red);
                    margin-bottom: 8px;
                }

                .spec-value {
                    color: var(--c-ivory);
                    font-weight: 800;
                    font-size: 1.1rem;
                    margin-bottom: 2px;
                }

                .spec-label {
                    color: var(--c-ivory-muted);
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    font-weight: 600;
                }

                .btn-outline {
                    background: transparent;
                    border: 1px solid var(--c-ivory-muted);
                    color: var(--c-ivory);
                    padding: var(--space-3) var(--space-4);
                    border-radius: var(--radius-md);
                    font-weight: 600;
                    transition: all 0.2s ease;
                }

                .btn-outline:hover:not(:disabled) {
                    border-color: var(--c-ivory);
                    background: rgba(255,255,255,0.05);
                }

                .btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .description-box {
                    background: var(--c-graphite);
                    border: var(--border-thin);
                    border-radius: var(--radius-md);
                    padding: var(--space-5);
                }

                .description-box h3 {
                    color: var(--c-ivory);
                    font-weight: 700;
                    margin-bottom: var(--space-3);
                    text-transform: uppercase;
                    font-size: 0.9rem;
                    letter-spacing: 0.05em;
                }

                .description-box p {
                    color: var(--c-ivory-muted);
                    line-height: 1.6;
                    font-size: 0.95rem;
                    white-space: pre-wrap;
                }

                /* Mobile Bottom Bar */
                .mobile-bottom-bar {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    background: var(--c-carbon);
                    border-top: var(--border-thin);
                    padding: var(--space-3) var(--space-4);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    z-index: 50;
                    box-shadow: 0 -4px 20px rgba(0,0,0,0.5);
                }

                /* Lightbox */
                .lightbox {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.95);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .lightbox-close {
                    position: absolute;
                    top: 2rem;
                    right: 2rem;
                    color: white;
                    background: rgba(0,0,0,0.5);
                    border-radius: 50%;
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    cursor: pointer;
                    z-index: 100;
                    transition: background 0.2s ease;
                }
                
                .lightbox-close:hover {
                    background: rgba(0,0,0,0.8);
                }

                .lightbox-nav {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    color: white;
                    background: none;
                    border: none;
                    cursor: pointer;
                    opacity: 0.7;
                    transition: opacity 0.2s ease;
                    z-index: 10;
                }

                .lightbox-nav:hover {
                    opacity: 1;
                }

                .lightbox-nav.prev { left: var(--space-4); }
                .lightbox-nav.next { right: var(--space-4); }

                .lightbox-content {
                    position: relative;
                    width: 90vw;
                    height: 85vh;
                }

                /* Modal */
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.8);
                    backdrop-filter: blur(4px);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: var(--space-4);
                }

                .modal-content {
                    background: var(--c-graphite);
                    border: var(--border-thin);
                    border-radius: var(--radius-lg);
                    padding: var(--space-6);
                    width: 100%;
                    max-width: 500px;
                    position: relative;
                    box-shadow: var(--shadow-lg);
                }

                .modal-close {
                    position: absolute;
                    top: var(--space-4);
                    right: var(--space-4);
                    color: var(--c-ivory-muted);
                    background: none;
                    border: none;
                    cursor: pointer;
                }

                .input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .input-group label {
                    color: var(--c-ivory-muted);
                    font-size: 0.85rem;
                    font-weight: 600;
                }
            `}</style>
        </>
    );
};

export default CarDetail;
