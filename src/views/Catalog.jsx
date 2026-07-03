"use client";
import { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SmartFilters from '../components/SmartFilters';
import CarCard from '../components/CarCard';
import { useCars } from '../hooks/useCars';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { trackEvent } from '../lib/analytics';

const CatalogContent = () => {
    const { cars, loading, error } = useCars();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Read filters from URL
    const filters = useMemo(() => {
        return {
            search: searchParams.get('search') || '',
            brand: searchParams.get('brand') || '',
            year: searchParams.get('year') || '',
            condition: searchParams.get('condition') || '',
            type: searchParams.get('type') || '',
            transmission: searchParams.get('transmission') || '',
            fuel: searchParams.get('fuel') || '',
            sortBy: searchParams.get('sortBy') || ''
        };
    }, [searchParams]);

    const currentPage = parseInt(searchParams.get('page')) || 1;
    const itemsPerPage = 9;

    const handleFilterChange = (name, value) => {
        const params = new URLSearchParams(searchParams);
        
        if (name === 'reset') {
            const currentType = params.get('type');
            // Keep type if we came from CategoryNav, or just clear all? Let's clear all.
            params.forEach((_, key) => {
                params.delete(key);
            });
        } else {
            if (value) {
                params.set(name, value);
            } else {
                params.delete(name);
            }
        }
        
        // Reset page on any filter change
        params.delete('page');
        
        // Analytics
        if (name === 'search' && value) {
            trackEvent('search_inventory', { query: value });
        } else if (name !== 'reset') {
            trackEvent('apply_filter', { filterName: name, filterValue: value });
        } else {
            trackEvent('apply_filter', { filterName: 'reset_all' });
        }

        router.push(`/catalogo?${params.toString()}`, { scroll: false });
    };

    const handlePageChange = (page) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', page);
        router.push(`/catalogo?${params.toString()}`, { scroll: true });
    };

    // Derived lists for filter options (Dynamic)
    const brands = useMemo(() => {
        const normalized = cars.map(car => {
            let trimmed = (car.brand || '').trim();
            if (trimmed.toLowerCase() === 'volskwagen' || trimmed.toLowerCase() === 'vokswagen') {
                trimmed = 'Volkswagen';
            }
            return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase() : '';
        }).filter(Boolean);
        return [...new Set(normalized)].sort();
    }, [cars]);

    const years = useMemo(() => {
        return [...new Set(cars.map(car => car.year).filter(Boolean))].sort((a, b) => b - a);
    }, [cars]);

    const transmissions = useMemo(() => {
        return [...new Set(cars.map(car => car.transmission).filter(Boolean))].sort();
    }, [cars]);

    const fuels = useMemo(() => {
        return [...new Set(cars.map(car => car.fuel || car.fuelType).filter(Boolean))].sort();
    }, [cars]);

    // Filter and Sort logic
    const filteredCars = useMemo(() => {
        let results = cars.filter(car => {
            const matchesSearch = filters.search === '' || 
                (car.name && car.name.toLowerCase().includes(filters.search.toLowerCase())) ||
                (car.brand && car.brand.toLowerCase().includes(filters.search.toLowerCase()));

            // Normalize car brand for comparison
            let carBrandNormalized = (car.brand || '').trim();
            if (carBrandNormalized.toLowerCase() === 'volskwagen' || carBrandNormalized.toLowerCase() === 'vokswagen') {
                carBrandNormalized = 'Volkswagen';
            }
            carBrandNormalized = carBrandNormalized ? carBrandNormalized.charAt(0).toUpperCase() + carBrandNormalized.slice(1).toLowerCase() : '';
            const matchesBrand = filters.brand === '' || carBrandNormalized === filters.brand;
            const matchesYear = filters.year === '' || (car.year && car.year.toString() === filters.year);
            const matchesTrans = filters.transmission === '' || (car.transmission === filters.transmission);
            const matchesFuel = filters.fuel === '' || (car.fuel === filters.fuel || car.fuelType === filters.fuel);

            // Type/Category match
            let matchesType = true;
            if (filters.type === '0km') {
                matchesType = car.condition === '0km' || car.km === 0 || car.condition === 'Nuevo';
            } else if (filters.type) {
                matchesType = (car.computedType && car.computedType.toLowerCase() === filters.type.toLowerCase()) ||
                              (car.vehicleType && car.vehicleType.toLowerCase() === filters.type.toLowerCase()) || 
                              (car.type && car.type.toLowerCase() === filters.type.toLowerCase()) ||
                              (car.category && car.category.toLowerCase() === filters.type.toLowerCase());
            }

            let matchesCondition = true;
            if (filters.condition === 'Nuevo') {
                matchesCondition = car.condition === 'Nuevo' || car.condition === '0km' || car.km === 0;
            } else if (filters.condition === 'Usado') {
                matchesCondition = car.condition !== 'Nuevo' && car.condition !== '0km' && car.km > 0;
            } else if (filters.condition !== '') {
                matchesCondition = car.condition === filters.condition;
            }

            return matchesSearch && matchesBrand && matchesYear && matchesCondition && matchesType && matchesTrans && matchesFuel;
        });

        // Apply Sorting
        if (filters.sortBy === 'year-desc') {
            results.sort((a, b) => b.year - a.year);
        } else if (filters.sortBy === 'year-asc') {
            results.sort((a, b) => a.year - b.year);
        } else if (filters.sortBy === 'km-asc') {
            results.sort((a, b) => (a.km || 0) - (b.km || 0));
        } else if (filters.sortBy === 'km-desc') {
            results.sort((a, b) => (b.km || 0) - (a.km || 0));
        } else if (filters.sortBy === 'price-asc') {
            results.sort((a, b) => (a.price || 0) - (b.price || 0));
        } else if (filters.sortBy === 'price-desc') {
            results.sort((a, b) => (b.price || 0) - (a.price || 0));
        }

        return results;
    }, [filters, cars]);

    const totalPages = Math.ceil(filteredCars.length / itemsPerPage);
    const paginatedCars = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredCars.slice(start, start + itemsPerPage);
    }, [filteredCars, currentPage, itemsPerPage]);

    // Handle Error Boundary gracefully
    if (error) {
        return (
            <div className="error-state text-center py-20 container">
                <XCircle size={64} className="text-[var(--c-accent-red)] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Error al cargar el catálogo</h2>
                <p className="text-[var(--c-ivory-muted)] mb-6">Ocurrió un problema al conectar con el servidor.</p>
                <button onClick={() => window.location.reload()} className="btn btn-primary">Reintentar</button>
            </div>
        );
    }

    return (
        <main id="main-content" className="catalog-container pb-16">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
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
                        }]
                    })
                }}
            />
            <motion.div
                className="page-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <h1>Catálogo Premium</h1>
                <p>Encontrá el vehículo ideal para vos</p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
            >
                <SmartFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    brands={brands}
                    years={years}
                    transmissions={transmissions}
                    fuels={fuels}
                    resultsCount={filteredCars.length}
                />
            </motion.div>

            <div className="cars-grid">
                {loading ? (
                    Array.from({ length: 9 }).map((_, i) => (
                        <div key={`skeleton-${i}`} className="car-skeleton">
                            <div className="skeleton-img"></div>
                            <div className="skeleton-content">
                                <div className="skeleton-title"></div>
                                <div className="skeleton-subtitle"></div>
                                <div className="skeleton-specs"></div>
                                <div className="skeleton-footer"></div>
                            </div>
                        </div>
                    ))
                ) : paginatedCars.length > 0 ? (
                    <AnimatePresence mode="popLayout">
                        {paginatedCars.map((car, index) => (
                            <motion.div
                                key={car._id || car.id}
                                layout
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                            >
                                <CarCard car={car} />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                ) : (
                    <div className="no-results">
                        <XCircle size={48} className="text-[var(--c-ivory-muted)] mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-bold text-[var(--c-ivory)] mb-2">Sin resultados</h3>
                        <p className="mb-6">No se encontraron vehículos que coincidan con estos filtros.</p>
                        <button
                            className="btn btn-hero-outline"
                            onClick={() => handleFilterChange('reset')}
                        >
                            Limpiar todos los filtros
                        </button>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        aria-label="Página Anterior"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className="pagination-numbers">
                        {Array.from({ length: totalPages }).map((_, i) => {
                            const pageNum = i + 1;
                            if (
                                pageNum === 1 ||
                                pageNum === totalPages ||
                                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                            ) {
                                return (
                                    <button
                                        key={pageNum}
                                        className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                                        onClick={() => handlePageChange(pageNum)}
                                        aria-label={`Página ${pageNum}`}
                                        aria-current={currentPage === pageNum ? "page" : undefined}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            } else if (
                                pageNum === currentPage - 2 ||
                                pageNum === currentPage + 2
                            ) {
                                return <span key={pageNum} className="pagination-ellipsis">...</span>;
                            }
                            return null;
                        })}
                    </div>

                    <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        aria-label="Siguiente Página"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            <style>{`
                .page-padding {
                    padding-top: 3rem;
                    padding-bottom: 4rem;
                }
                
                @media (min-width: 768px) {
                    .page-padding {
                        padding-top: 5rem;
                    }
                }

                .page-header {
                    text-align: center;
                    margin-bottom: 3rem;
                }

                .page-header h1 {
                    font-family: var(--font-title);
                    font-size: clamp(2.5rem, 5vw, 4rem);
                    margin-bottom: 0.5rem;
                    font-weight: 900;
                    color: var(--c-ivory);
                }

                .page-header p {
                    color: var(--c-ivory-muted);
                    font-size: clamp(1rem, 1.5vw, 1.25rem);
                }
                
                .catalog-container {
                    width: 100%;
                    max-width: 1280px;
                    margin-inline: auto;
                    padding-inline: 16px;
                }

                @media (min-width: 768px) {
                    .catalog-container {
                        padding-inline: 24px;
                    }
                }

                @media (min-width: 1024px) {
                    .catalog-container {
                        padding-inline: 32px;
                    }
                }

                .cars-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 16px;
                }

                @media (max-width: 639px) {
                    .cars-grid > * {
                        max-width: 350px;
                        margin-inline: auto;
                        width: 100%;
                    }
                }

                @media (min-width: 640px) {
                    .cars-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 20px;
                    }
                }

                @media (min-width: 900px) {
                    .cars-grid {
                        grid-template-columns: repeat(3, 1fr);
                        gap: 20px;
                    }
                }

                @media (min-width: 1200px) {
                    .cars-grid {
                        grid-template-columns: repeat(4, 1fr);
                        gap: 24px;
                    }
                }

                .no-results {
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 4rem 2rem;
                    color: var(--c-ivory-muted);
                    background-color: var(--c-graphite);
                    border: var(--border-thin);
                    border-radius: var(--radius-lg);
                }

                /* Skeletons */
                .car-skeleton {
                    background-color: var(--c-graphite);
                    border-radius: var(--radius-lg);
                    border: var(--border-thin);
                    overflow: hidden;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }

                .skeleton-img {
                    width: 100%;
                    aspect-ratio: 16/10;
                    background: linear-gradient(90deg, var(--c-carbon) 25%, var(--c-graphite-light) 50%, var(--c-carbon) 75%);
                    background-size: 200% 100%;
                    animation: loading 1.5s infinite;
                }

                .skeleton-content {
                    padding: var(--space-4);
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .skeleton-title {
                    height: 24px;
                    width: 70%;
                    background: var(--c-carbon);
                    border-radius: var(--radius-sm);
                    margin-bottom: 8px;
                    animation: loading 1.5s infinite;
                }

                .skeleton-subtitle {
                    height: 16px;
                    width: 40%;
                    background: var(--c-carbon);
                    border-radius: var(--radius-sm);
                    margin-bottom: 16px;
                    animation: loading 1.5s infinite;
                }
                
                .skeleton-specs {
                    height: 20px;
                    width: 80%;
                    background: var(--c-carbon);
                    border-radius: var(--radius-sm);
                    margin-bottom: 16px;
                    animation: loading 1.5s infinite;
                }

                .skeleton-footer {
                    height: 30px;
                    width: 100%;
                    background: var(--c-carbon);
                    border-radius: var(--radius-sm);
                    margin-top: auto;
                    animation: loading 1.5s infinite;
                }

                @keyframes loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                /* Pagination */
                .pagination {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: var(--space-4);
                    margin-top: 4rem;
                }

                .pagination-numbers {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                }

                .pagination-btn, .pagination-number {
                    background: var(--c-graphite);
                    border: var(--border-thin);
                    color: var(--c-ivory);
                    width: 40px;
                    height: 40px;
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .pagination-btn:hover:not(:disabled), .pagination-number:hover:not(.active) {
                    background: var(--c-graphite-light);
                    border-color: var(--c-accent-red);
                }

                .pagination-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .pagination-number.active {
                    background: var(--c-accent-red);
                    border-color: var(--c-accent-red);
                    color: var(--c-ivory);
                }

                .pagination-ellipsis {
                    color: var(--c-ivory-muted);
                    padding: 0 4px;
                }
            `}</style>
        </main>
    );
};

// Wrap in Suspense because of useSearchParams
export default function Catalog() {
    return (
        <Suspense fallback={<div className="text-center py-20 text-white">Cargando catálogo...</div>}>
            <CatalogContent />
        </Suspense>
    );
}
