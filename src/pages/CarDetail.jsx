import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Gauge, Fuel, Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCars } from '../hooks/useCars';

const CarDetail = () => {
    const { id } = useParams();
    const { cars, loading } = useCars();

    // Find car by ID (support _id from MongoDB and string/number IDs)
    const car = cars.find(c => (c._id === id) || (c.id && c.id.toString() === id));

    const [activeImage, setActiveImage] = React.useState(null);
    const [showLightbox, setShowLightbox] = React.useState(false);

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

    if (!car) {
        return (
            <div className="not-found">
                <h2>Vehículo no encontrado</h2>
                <Link to="/catalogo" className="btn btn-primary">
                    <ArrowLeft size={20} /> Volver al catálogo
                </Link>
            </div>
        );
    }

    return (
        <main className="container page-padding">
            <Link to="/catalogo" className="back-link">
                <ArrowLeft size={20} /> Volver al catálogo
            </Link>

            <div className="detail-grid">
                {/* Image Section */}
                {/* Image Section */}
                <div className="image-section">
                    <div className="main-image-container overflow-hidden rounded-xl relative">
                        <div className="flex">
                            <div className="relative min-w-full aspect-[4/3]">
                                <div className="relative w-full h-full overflow-hidden group bg-color-bg-secondary cursor-zoom-in border border-neutral-600" onClick={() => setShowLightbox(true)}>
                                    <div className="w-full h-full flex items-center justify-center">
                                        <img
                                            alt={car.name}
                                            className="object-cover w-full h-full fade-in"
                                            style={{ objectPosition: car.imagePosition || '50% 75%' }}
                                            src={activeImage || car.coverImage || (car.images && car.images[0])}
                                        />
                                    </div>
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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
                                            <img
                                                src={img}
                                                alt={`${car.name} view ${index + 2}`}
                                                className={`object-cover w-full h-full transition duration-300 ${isLast && remainingCount > 0 ? 'blur-sm' : ''}`}
                                                style={{ objectPosition: car.imagePosition || '50% 75%' }}
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
                    <div className="condition-badge">
                        {car.condition}
                    </div>

                    <h1 className="car-title">{car.brand} {car.name}</h1>
                    <div className="car-price">
                        {car.currency} {car.price.toLocaleString()}
                    </div>

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
                        onClick={() => window.open(`https://wa.me/5492974938642?text=${encodeURIComponent(`Hola AutoSporting, estoy interesado en el ${car.brand} ${car.name} ${car.year}`)}`, '_blank')}
                        className="btn btn-primary full-width"
                    >
                        Consultar por WhatsApp
                    </button>

                    <div className="legal-text">
                        <p>* Consulte por financiación.</p>
                        <p>* Tomamos su usado en parte de pago.</p>
                    </div>
                </div>
            </div>

            {/* Lightbox Modal */}
            {showLightbox && (
                <div className="lightbox-overlay" onClick={() => setShowLightbox(false)}>
                    <button className="lightbox-close">
                        <X size={32} />
                    </button>

                    <button className="lightbox-nav prev" onClick={handlePrev}>
                        <ChevronLeft size={48} />
                    </button>

                    <img
                        src={activeImage || car.coverImage || (car.images && car.images[0])}
                        alt={car.name}
                        className="lightbox-img"
                        onClick={(e) => e.stopPropagation()} // Prevent close when clicking image
                    />

                    <button className="lightbox-nav next" onClick={handleNext}>
                        <ChevronRight size={48} />
                    </button>
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
                    padding-top: 2rem;
                    padding-bottom: 5rem;
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
                    color: var(--color-text-muted);
                    text-decoration: none;
                    margin-bottom: 2rem;
                    transition: color 0.2s;
                }

                .back-link:hover {
                    color: var(--color-primary);
                }

                .detail-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 2rem;
                }

                @media (min-width: 768px) {
                    .detail-grid {
                        grid-template-columns: 7fr 5fr;
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
                    animation: zoomIn 0.3s ease;
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
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }

                .condition-badge {
                    color: var(--color-primary);
                    font-weight: 700;
                    text-transform: uppercase;
                    font-size: 0.9rem;
                    letter-spacing: 0.05em;
                    margin-bottom: 0.5rem;
                }

                .car-title {
                    font-size: clamp(2rem, 4vw, 3rem);
                    line-height: 1.1;
                    margin-bottom: 0.5rem;
                }

                .car-price {
                    font-size: 2.5rem;
                    font-weight: 700;
                    margin-bottom: 2rem;
                    padding-bottom: 2rem;
                    border-bottom: 1px solid #333;
                }

                .specs-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                    margin-bottom: 2rem;
                }

                .spec-item {
                    background-color: var(--color-surface);
                    padding: 1rem;
                    border-radius: 8px;
                    border: 1px solid #333;
                }

                .spec-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--color-text-muted);
                    font-size: 0.9rem;
                    margin-bottom: 0.25rem;
                }

                .spec-value {
                    font-size: 1.1rem;
                    font-weight: 600;
                }

                .full-width {
                    width: 100%;
                    justify-content: center;
                    font-size: 1.1rem;
                    padding: 1rem;
                }

                .car-description {
                    margin-bottom: 2rem;
                    padding-bottom: 2rem;
                    border-bottom: 1px solid #333;
                }

                .car-description h3 {
                    font-size: 1.2rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                    color: white;
                }

                .car-description p {
                    color: #ccc;
                    line-height: 1.6;
                    white-space: pre-wrap; /* Preserve line breaks */
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
