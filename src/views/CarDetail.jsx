"use client";
import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Calendar, Gauge, Fuel, Maximize2, X, ChevronLeft, ChevronRight, Heart, Share2, Copy } from 'lucide-react';
import { useCars } from '../hooks/useCars';
import { getOptimizedImageUrl, getBlurPlaceholder } from '../lib/cloudinaryUtils';
import { useFavorites } from '../context/FavoritesContext';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

const CarDetail = () => {
    const { id } = useParams();
    const [car, setCar] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const { isFavorite, toggleFavorite } = useFavorites();

    React.useEffect(() => {
        const fetchSingleCar = async () => {
            try {
                setLoading(true);
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                const baseUrl = process.env.NODE_ENV === 'production' ? '' : API_URL;
                const response = await fetch(`${baseUrl}/api/cars/${id}?t=${Date.now()}`);
                if (response.ok) {
                    const data = await response.json();
                    setCar(data);
                } else {
                    setCar(null);
                }
            } catch (err) {
                console.error("Error fetching car detail:", err);
                setCar(null);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchSingleCar();
        }
    }, [id]);

    const carId = car ? (car._id || car.id) : null;
    const isFav = carId ? isFavorite(carId) : false;

    const [activeImage, setActiveImage] = React.useState(null);
    const [showLightbox, setShowLightbox] = React.useState(false);
    const [copied, setCopied] = React.useState(false);

    const handleShare = () => {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({
                title: `${car.brand} ${car.name} - AutoSporting`,
                url: url
            }).catch(() => {
                // Fallback to clipboard if sharing fails
                navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        } else {
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    React.useEffect(() => {
        if (car) {
            setActiveImage(car.coverImage || (car.images && car.images[0]));
        }
    }, [car]);

    const handleNext = (e) => {
        e.stopPropagation();
        if (!car.images) return;
        const currentIndex = car.images.indexOf(activeImage || car.coverImage || (car.images && car.images[0]));
        const nextIndex = (currentIndex + 1) % car.images.length;
        setActiveImage(car.images[nextIndex]);
    };

    const handlePrev = (e) => {
        e.stopPropagation();
        if (!car.images) return;
        const currentIndex = car.images.indexOf(activeImage || car.coverImage || (car.images && car.images[0]));
        const prevIndex = (currentIndex - 1 + car.images.length) % car.images.length;
        setActiveImage(car.images[prevIndex]);
    };

    // Preload next and previous images dynamically
    React.useEffect(() => {
        if (!car || !car.images || car.images.length < 2) return;

        const currentActive = activeImage || car.coverImage || car.images[0];
        const currentIndex = car.images.indexOf(currentActive);
        if (currentIndex === -1) return;

        const nextIndex = (currentIndex + 1) % car.images.length;
        const prevIndex = (currentIndex - 1 + car.images.length) % car.images.length;

        const imagesToPreload = [
            car.images[nextIndex],
            car.images[prevIndex]
        ];

        // Deduplicate in case there are only 2 images
        const uniqueToPreload = [...new Set(imagesToPreload)];

        uniqueToPreload.forEach(imgUrl => {
            const preloader = new window.Image();
            preloader.src = getOptimizedImageUrl(imgUrl, 1200); // Same resolution as main container

            // If lightbox might be opened, also warm up the 1600px version
            const lightboxPreloader = new window.Image();
            lightboxPreloader.src = getOptimizedImageUrl(imgUrl, 1600);
        });

    }, [activeImage, car]);

    if (loading) {
        return (
            <div className="not-found">
                <div className="animate-pulse" style={{ color: 'var(--color-primary)', fontSize: '1.2rem', fontWeight: 'bold' }}>Cargando especificaciones...</div>
            </div>
        );
    }

    if (!car) {
        return (
            <div className="not-found">
                <h2>Vehículo no encontrado</h2>
                <Link href="/catalogo" className="btn btn-primary">
                    <ArrowLeft size={20} /> Volver al catálogo
                </Link>
            </div>
        );
    }

    const currentImg = activeImage || car.coverImage || (car.images && car.images[0]);

    return (
        <main className="container page-padding">
            <Link href="/catalogo" className="back-link">
                <ArrowLeft size={20} /> Volver al catálogo
            </Link>

            <div className="detail-grid">
                {/* Image Section */}
                <div className="image-section">
                    <div className="main-image-container overflow-hidden rounded-xl relative shadow-2xl">
                        <div className="flex">
                            <div className="relative min-w-full aspect-[4/3]">
                                <div
                                    className={`relative w-full h-full overflow-hidden group bg-color-bg-secondary border border-neutral-600 ${currentImg ? 'cursor-zoom-in' : 'cursor-default'}`}
                                    onClick={() => { if (currentImg) setShowLightbox(true); }}
                                >
                                    <div className="w-full h-full flex items-center justify-center">
                                        {currentImg ? (
                                            <Image
                                                alt={car.name}
                                                fill
                                                className="object-cover w-full h-full fade-in"
                                                style={{ objectFit: 'cover', objectPosition: car.imagePosition || '50% 75%' }}
                                                src={getOptimizedImageUrl(currentImg, 1200)}
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="text-neutral-600 flex flex-col items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>
                                                <span>Sin imagen disponible</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                    {/* Status Badge */}
                                    {car.status && (
                                        <div className={`detail-status-badge ${car.status.toLowerCase()}`}>
                                            {car.status}
                                        </div>
                                    )}
                                </div>

                                {/* In-place Navigation Arrows */}
                                {car.images && car.images.length > 1 && (
                                    <>
                                        <button
                                            className="absolute top-1/2 left-2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors z-10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handlePrev(e);
                                            }}
                                        >
                                            <ChevronLeft size={24} />
                                        </button>
                                        <button
                                            className="absolute top-1/2 right-2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors z-10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleNext(e);
                                            }}
                                        >
                                            <ChevronRight size={24} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Mobile Counter (1/N) - Only visible on mobile/tablet */}
                        {car.images && car.images.length > 0 && (
                            <div className="absolute bottom-4 right-4 bg-black/80 text-white px-3 py-2 rounded-full text-sm font-medium shadow-lg z-10 md:hidden">
                                {car.images.indexOf(activeImage || car.images[0]) + 1} / {car.images.length}
                            </div>
                        )}
                    </div>

                    {/* Thumbnails Grid (Desktop Only) */}
                    {car.images && car.images.length > 1 && (
                        <div className="hidden md:grid grid-cols-3 gap-3 mt-3">
                            {car.images.slice(1, 4).map((img, index) => {
                                const isLast = index === 2;
                                const remainingCount = car.images.length - 4;

                                return (
                                    <button
                                        key={index}
                                        className={`relative aspect-[4/3] rounded-lg overflow-hidden border border-neutral-600 ${activeImage === img ? 'ring-2 ring-primary' : ''}`}
                                        onClick={() => {
                                            if (isLast && remainingCount > 0) {
                                                setShowLightbox(true);
                                            } else {
                                                setActiveImage(img);
                                            }
                                        }}
                                    >
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Image
                                                src={getOptimizedImageUrl(img, 400)}
                                                alt={`${car.name} view ${index + 2}`}
                                                fill
                                                className={`object-cover w-full h-full transition duration-300 ${isLast && remainingCount > 0 ? 'blur-sm' : ''}`}
                                                style={{ objectFit: 'cover', objectPosition: car.imagePosition || '50% 75%' }}
                                                unoptimized
                                            />
                                        </div>

                                        {/* +N Overlay */}
                                        {isLast && remainingCount > 0 && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                                                <div className="text-3xl font-bold">+{remainingCount}</div>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className="info-section">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="condition-badge mb-0">
                                {car.condition}
                            </div>
                            <button
                                className={`share-action-btn ${copied ? 'copied' : ''}`}
                                onClick={handleShare}
                                title="Compartir vehículo"
                            >
                                <AnimatePresence mode="wait">
                                    {copied ? (
                                        <motion.div
                                            key="copied"
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.5 }}
                                            className="flex items-center gap-1"
                                        >
                                            <Copy size={16} /> <span className="text-[10px] font-bold uppercase">Copiado</span>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="share"
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.5 }}
                                        >
                                            <Share2 size={18} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </button>
                        </div>
                        <button
                            className="detail-favorite-btn flex items-center gap-2"
                            onClick={() => toggleFavorite(carId)}
                        >
                            <Heart size={24} fill={isFav ? "var(--color-primary)" : "none"} color={isFav ? "var(--color-primary)" : "white"} />
                            <span className="text-sm font-medium">{isFav ? "Guardado" : "Guardar"}</span>
                        </button>
                    </div>

                    <h1 className="car-title">{car.brand} {car.name}</h1>


                    <div className="specs-grid">
                        <div className="spec-item">
                            <div className="spec-label">
                                <Calendar size={18} /> <span>Año</span>
                            </div>
                            <div className="spec-value">{car.year}</div>
                        </div>
                        <div className="spec-item">
                            <div className="spec-label">
                                <Gauge size={18} /> <span>Kilometraje</span>
                            </div>
                            <div className="spec-value">{car.km.toLocaleString()} km</div>
                        </div>
                        <div className="spec-item">
                            <div className="spec-label">
                                <Fuel size={18} /> <span>Combustible</span>
                            </div>
                            <div className="spec-value">{car.fuel}</div>
                        </div>
                    </div>

                    {car.description && (
                        <div className="car-description">
                            <h3>Sobre este vehículo</h3>
                            <p>{car.description}</p>
                        </div>
                    )}

                    <button
                        onClick={() => window.open(`https://wa.me/5492974045378?text=${encodeURIComponent(`Hola AutoSporting, estoy interesado en el ${car.brand} ${car.name} ${car.year}`)}`, '_blank')}
                        className="btn btn-primary full-width"
                    >
                        Consultar por WhatsApp
                    </button>

                    <div className="mt-16 space-y-3 p-4 bg-white/5 rounded-lg border border-white/10">
                        <p className="flex items-center gap-2 text-lg font-light text-white tracking-wide">
                            <span className="text-primary text-2xl">*</span> Consulte por financiación.
                        </p>
                        <p className="flex items-center gap-2 text-lg font-light text-white tracking-wide">
                            <span className="text-primary text-2xl">*</span> Tomamos su usado en parte de pago.
                        </p>
                    </div>
                </div>
            </div>

            {/* Lightbox Modal */}
            {showLightbox && (activeImage || car.coverImage || (car.images && car.images.length > 0)) && (
                <div className="lightbox-overlay" onClick={() => setShowLightbox(false)}>
                    <button className="lightbox-close">
                        <X size={32} />
                    </button>

                    {car.images && car.images.length > 1 && (
                        <button className="lightbox-nav prev" onClick={handlePrev}>
                            <ChevronLeft size={48} />
                        </button>
                    )}

                    <Image
                        src={getOptimizedImageUrl(activeImage || car.coverImage || (car.images && car.images[0]), 1600)}
                        alt={car.name}
                        width={1600}
                        height={1200}
                        className="lightbox-img fade-in"
                        key={activeImage}
                        onClick={(e) => e.stopPropagation()}
                        unoptimized
                        style={{ objectFit: 'contain', width: 'auto', height: 'auto', maxWidth: '95%', maxHeight: '95%' }}
                    />

                    {car.images && car.images.length > 1 && (
                        <button className="lightbox-nav next" onClick={handleNext}>
                            <ChevronRight size={48} />
                        </button>
                    )}
                </div>
            )}

            <style>{`
                .container {
                    max-width: 1280px; /* Reverted to 1280px to match reference size exactly */
                    margin: 0 auto;
                    width: 100%;
                    padding-left: 1rem;
                    padding-right: 1rem;
                }

                .page-padding {
                    padding-top: 1.5rem;
                    padding-bottom: 5rem;
                }
                
                @media (min-width: 768px) {
                    .page-padding { padding-top: 3rem; }
                }

                .not-found {
                    min-height: 60vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 1rem;
                    color: white;
                }

                .back-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #999;
                    text-decoration: none;
                    margin-bottom: 2rem;
                    transition: all 0.3s ease;
                    font-size: 0.95rem;
                    font-weight: 500;
                }

                .back-link:hover {
                    color: white;
                    transform: translateX(-5px);
                }

                .detail-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 2.5rem;
                }

                @media (min-width: 1024px) {
                    .detail-grid {
                        grid-template-columns: 1.2fr 1fr;
                        gap: 4rem;
                    }
                }

                /* Tailwind Utility Replacements / New Components */
                .rounded-xl { border-radius: 0.75rem; }
                .rounded-lg { border-radius: 0.5rem; }
                .overflow-hidden { overflow: hidden; }
                .relative { position: relative; }
                .absolute { position: absolute; }
                
                /* Double escaped characters for CSS-in-JS */
                .top-1\\/2 { top: 50%; }
                .left-2 { left: 0.5rem; }
                .right-2 { right: 0.5rem; }
                .-translate-y-1\\/2 { transform: translateY(-50%); }
                .p-2 { padding: 0.5rem; }
                
                .bg-black\\/50 { background-color: rgba(0, 0, 0, 0.5); }
                .hover\\:bg-black\\/70:hover { background-color: rgba(0, 0, 0, 0.7); }
                
                .transition-colors { transition-property: background-color, border-color, color, fill, stroke; transition-duration: 0.2s; }
                
                .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
                .bottom-4 { bottom: 1rem; }
                .right-4 { right: 1rem; }
                .w-full { width: 100%; }
                .h-full { height: 100%; }
                .min-w-full { min-width: 100%; }
                .object-cover { object-fit: cover; }
                .flex { display: flex; }
                .items-center { align-items: center; }
                .justify-center { justify-content: center; }
                
                .bg-black\\/20 { background-color: rgba(0, 0, 0, 0.2); }
                .bg-black\\/40 { background-color: rgba(0, 0, 0, 0.4); }
                .bg-black\\/80 { background-color: rgba(0, 0, 0, 0.8); }
                
                .text-white { color: white; }
                .text-sm { font-size: 0.875rem; }
                .text-3xl { font-size: 1.875rem; }
                .font-bold { font-weight: 700; }
                .font-medium { font-weight: 500; }
                
                .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
                .z-10 { z-index: 10; }
                .z-20 { z-index: 20; }
                .z-30 { z-index: 30; }
                
                .transition-opacity { transition-property: opacity; }
                .duration-300 { transition-duration: 300ms; }
                .opacity-0 { opacity: 0; }
                .group:hover .group-hover\\:opacity-100 { opacity: 1; }
                
                .cursor-zoom-in { cursor: zoom-in; }
                .blur-sm { filter: blur(4px); }
                .border-neutral-600 { border-color: #525252; }
                .bg-color-bg-secondary { background-color: #1a1a1a; }
                .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
                .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
                .rounded-full { border-radius: 9999px; }
                .mt-3 { margin-top: 0.75rem; }
                .gap-3 { gap: 0.75rem; }

                /* Grid System Replacements */
                .hidden { display: none; }
                @media (min-width: 768px) {
                    .md\\:grid { display: grid; }
                    .md\\:hidden { display: none; }
                    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
                }

                /* Escaped bracket selectors */
                .aspect-\\[4\\/3\\] { aspect-ratio: 4/3; }
                
                /* Cleanup of old classes */
                .main-image, .thumbnails-grid, .thumbnail-btn, .thumb-wrapper, .more-images-overlay {
                    /* Disabled/Superseded by utilities above */
                }

                /* Lightbox Styles */
                .lightbox-overlay {
                    position: fixed;
                    inset: 0;
                    background-color: rgba(0, 0, 0, 0.95);
                    z-index: 2000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    animation: fadeIn 0.3s ease;
                }

                .lightbox-img {
                    max-width: 95%;
                    max-height: 95%;
                    object-fit: contain;
                    border-radius: 4px;
                    box-shadow: 0 0 30px rgba(0,0,0,0.5);
                    /* Animation class added dynamically */
                }
                
                .lightbox-img.fade-in {
                    animation: zoomInLight 0.2s ease-out;
                }

                .lightbox-close {
                    position: absolute;
                    top: 2rem;
                    right: 2rem;
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 0.5rem;
                    transition: transform 0.2s;
                    z-index: 2001;
                }

                .lightbox-close:hover {
                    transform: scale(1.1);
                    color: var(--color-primary);
                }
                
                .lightbox-nav {
                    background: none;
                    border: none;
                    color: rgba(255,255,255,0.5);
                    cursor: pointer;
                    padding: 1rem;
                    transition: all 0.2s;
                    z-index: 2001;
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                }
                
                .lightbox-nav.prev {
                    left: 20px;
                }

                .lightbox-nav.next {
                    right: 20px;
                }
                
                .lightbox-nav:hover {
                    color: white;
                    background-color: rgba(0,0,0,0.3);
                    border-radius: 50%;
                }

                @keyframes zoomIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                
                @keyframes zoomInLight {
                    from { transform: scale(0.98); opacity: 0.8; }
                    to { transform: scale(1); opacity: 1; }
                }

                .condition-badge {
                    display: inline-block;
                    background: rgba(235, 38, 40, 0.1);
                    color: var(--color-primary);
                    font-weight: 800;
                    text-transform: uppercase;
                    font-size: 0.75rem;
                    letter-spacing: 0.1em;
                    padding: 4px 12px;
                    border-radius: 50px;
                    border: 1px solid rgba(235, 38, 40, 0.2);
                }

                .share-action-btn {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    color: white;
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .share-action-btn:hover {
                    background: rgba(255, 255, 255, 0.15);
                    transform: scale(1.1);
                    border-color: rgba(255, 255, 255, 0.2);
                }

                .share-action-btn.copied {
                    background: #25D366;
                    color: white;
                    width: auto;
                    padding: 0 12px;
                    border-radius: 20px;
                    border: none;
                }

                .detail-status-badge {
                    position: absolute;
                    top: 20px;
                    left: 20px;
                    padding: 8px 18px;
                    border-radius: 50px;
                    font-size: 0.8rem;
                    font-weight: 800;
                    letter-spacing: 0.15em;
                    text-transform: uppercase;
                    z-index: 25;
                    backdrop-filter: blur(12px);
                    box-shadow: 0 8px 25px rgba(0,0,0,0.5);
                    border: 1px solid rgba(255,255,255,0.1);
                    animation: slideInLeft 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                .detail-status-badge.oferta {
                    background: rgba(235, 38, 40, 0.9);
                    color: white;
                }

                .detail-status-badge.vendido {
                    background: rgba(0, 0, 0, 0.85);
                    color: #999;
                }

                .detail-status-badge.nuevo {
                    background: rgba(255, 255, 255, 0.95);
                    color: black;
                }

                @keyframes slideInLeft {
                    from { transform: translateX(-20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }

                .detail-favorite-btn {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    color: white;
                    padding: 0.5rem 1rem;
                    border-radius: 50px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .detail-favorite-btn:hover {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: rgba(255, 255, 255, 0.2);
                }

                .car-title {
                    font-size: clamp(2rem, 5vw, 3.5rem);
                    font-weight: 900;
                    line-height: 1.1;
                    margin-bottom: 2rem;
                    letter-spacing: -0.02em;
                }

                .specs-grid {
                    display: grid;
                    grid-template-columns: repeat(1, 1fr);
                    gap: 1rem;
                    margin-bottom: 2.5rem;
                }
                
                @media (min-width: 480px) {
                    .specs-grid { grid-template-columns: repeat(2, 1fr); }
                }

                .spec-item {
                    background: rgba(255, 255, 255, 0.03);
                    padding: 1.25rem;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }

                .spec-label {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    color: #777;
                    font-size: 0.85rem;
                    margin-bottom: 0.5rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    font-weight: 600;
                }

                .spec-value {
                    font-size: 1.15rem;
                    font-weight: 700;
                    color: white;
                }

                .car-description {
                    margin-bottom: 2.5rem;
                }

                .car-description h3 {
                    font-size: 1.25rem;
                    font-weight: 800;
                    margin-bottom: 1rem;
                    color: white;
                    letter-spacing: -0.01em;
                }

                .car-description p {
                    color: #999;
                    line-height: 1.7;
                    font-size: 1rem;
                }

                .btn.full-width {
                    width: 100%;
                    padding: 1.25rem;
                    font-size: 1.1rem;
                    font-weight: 800;
                    border-radius: 12px;
                    background: #25D366;
                    color: #000;
                    border: none;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 10px 30px rgba(37, 211, 102, 0.2);
                }

                .btn.full-width:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 15px 40px rgba(37, 211, 102, 0.4);
                    background: #22c55e;
                }

                .legal-text {
                    margin-top: 2rem;
                    color: #666;
                    font-size: 0.9rem;
                }
            `}</style>
        </main>
    );
};

export default CarDetail;
