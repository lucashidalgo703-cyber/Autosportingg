import React, { useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from 'embla-carousel-auto-scroll';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CarCard from './CarCard';

const CarCarousel = ({ cars }) => {
    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: true,
        align: 'start',
        skipSnaps: false,
        dragFree: true
    }, [
        AutoScroll({
            speed: 1, // Adjust speed as needed (approx 1px/frame)
            stopOnInteraction: false,
            stopOnMouseEnter: true,
            startDelay: 0
        })
    ]);

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
                <div className="flex -ml-4 touch-pan-y">
                    {cars.map((car) => (
                        <div className="flex-[0_0_100%] min-w-0 pl-4 sm:flex-[0_0_50%] lg:flex-[0_0_25%]" key={car._id || car.id}>
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

            {/* Mobile Controls (Optional, usually swipe is enough but arrows help) */}
            <div className="mt-6 flex justify-center gap-4 md:hidden">
                <button onClick={scrollPrev} className="p-2 rounded-full bg-white/5 border border-white/10 active:bg-white/20">
                    <ChevronLeft size={20} />
                </button>
                <button onClick={scrollNext} className="p-2 rounded-full bg-white/5 border border-white/10 active:bg-white/20">
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default CarCarousel;
