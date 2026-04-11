import React, { useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from 'embla-carousel-auto-scroll';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CarCard from './CarCard';

const CarCarousel = ({ cars }) => {
    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: true,
        align: 'start',
        skipSnaps: true,
        dragFree: true
    }, [
        AutoScroll({
            speed: 1.2, // Slightly faster, very smooth
            direction: 'forward',
            stopOnInteraction: false,
            stopOnMouseEnter: false,
            startDelay: 0
        })
    ]);

    // Always double the list to ensure Embla has enough room to loop seamlessly
    // even with larger cards, avoiding any "pre-loading" or gap sensation.
    const displayCars = cars.length > 0 ? [...cars, ...cars] : cars;

    const scrollPrev = useCallback(() => {
        if (emblaApi) emblaApi.scrollPrev();
    }, [emblaApi]);

    const scrollNext = useCallback(() => {
        if (emblaApi) emblaApi.scrollNext();
    }, [emblaApi]);

    return (
        <div className="relative group">
            {/* Carousel Container */}
            <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex touch-pan-y" style={{ marginLeft: '-2rem' }}>
                    {displayCars.map((car, index) => (
                        <div className="min-w-0 carousel-item" key={`${car._id || car.id}-${index}`}>
                            <CarCard car={car} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation Buttons (Visible on hover or mobile) */}
            <button
                className="nav-btn prev"
                onClick={scrollPrev}
                aria-label="Previous slide"
            >
                <ChevronLeft size={24} />
            </button>

            <button
                className="nav-btn next"
                onClick={scrollNext}
                aria-label="Next slide"
            >
                <ChevronRight size={24} />
            </button>

            {/* Removed mobile controls as requested */}

            <style>{`
                .carousel-item {
                    flex: 0 0 85%;
                    padding-left: 1rem;
                }

                .nav-btn {
                    display: none;
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: white;
                    padding: 0.75rem;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    z-index: 10;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
                    opacity: 0;
                }

                .nav-btn.prev { left: 0; transform: translateY(-50%) translateX(-50%); }
                .nav-btn.next { right: 0; transform: translateY(-50%) translateX(50%); }

                .nav-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
                
                /* Simplify hover transforms */
                .nav-btn.prev:hover { transform: translateY(-50%) translateX(-50%) scale(1.1); }
                .nav-btn.next:hover { transform: translateY(-50%) translateX(50%) scale(1.1); }

                @media (min-width: 768px) {
                    .nav-btn {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .group:hover .nav-btn {
                        opacity: 1;
                    }
                }

                @media (min-width: 480px) {
                    .carousel-item {
                        flex: 0 0 70%;
                        padding-left: 1.25rem;
                    }
                }
                @media (min-width: 768px) {
                    .carousel-item {
                        flex: 0 0 45%;
                        padding-left: 1.5rem;
                    }
                }
                @media (min-width: 1024px) {
                    .carousel-item {
                        flex: 0 0 30%;
                        padding-left: 2rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default CarCarousel;
