import React, { useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from 'embla-carousel-auto-scroll';
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

            {/* Removed mobile controls as requested */}

            <style>{`
                .carousel-item {
                    flex: 0 0 85%;
                    padding-left: 1rem;
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
