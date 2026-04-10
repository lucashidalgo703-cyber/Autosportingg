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
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white p-3 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 hidden md:flex items-center justify-center hover:scale-110"
                onClick={scrollPrev}
                aria-label="Previous slide"
            >
                <ChevronLeft size={24} />
            </button>

            <button
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white p-3 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 hidden md:flex items-center justify-center hover:scale-110"
                onClick={scrollNext}
                aria-label="Next slide"
            >
                <ChevronRight size={24} />
            </button>

            {/* Removed mobile controls as requested */}

            <style>{`
                .carousel-item {
                    flex: 0 0 85%; /* Shows a peek of the next card on mobile */
                    padding-left: 1.5rem;
                }
                @media (min-width: 640px) {
                    .carousel-item {
                        flex: 0 0 60%;
                        padding-left: 2rem;
                    }
                }
                @media (min-width: 1024px) {
                    .carousel-item {
                        flex: 0 0 30%;
                    }
                }
            `}</style>
        </div>
    );
};

export default CarCarousel;
