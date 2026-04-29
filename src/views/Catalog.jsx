import { useState, useMemo, useEffect } from 'react';
import SmartFilters from '../components/SmartFilters';
import CarCard from '../components/CarCard';
import { useCars } from '../hooks/useCars';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Catalog = () => {
    const { cars, loading } = useCars();
    const [filters, setFilters] = useState({
        search: '',
        brand: '',
        year: '',
        condition: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;

    const handleFilterChange = (name, value) => {
        if (name === 'reset') {
            setFilters({ search: '', brand: '', year: '', condition: '' });
        } else {
            setFilters(prev => ({
                ...prev,
                [name]: value
            }));
        }
        setCurrentPage(1); // Reset to first page on filter change
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
        // Smooth scroll to top of catalog
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Derived lists for filter options
    const brands = useMemo(() => {
        // Normalize brands: trim whitespace and Capitalize first letter
        const normalized = cars.map(car => {
            const trimmed = car.brand.trim();
            return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
        });
        return [...new Set(normalized)].sort();
    }, [cars]);

    const years = useMemo(() => {
        return [...new Set(cars.map(car => car.year))].sort((a, b) => b - a);
    }, [cars]);

    // Filter logic
    const filteredCars = useMemo(() => {
        return cars.filter(car => {
            const matchesSearch = car.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                car.brand.toLowerCase().includes(filters.search.toLowerCase());

            // Normalize car brand for comparison
            const carBrandNormalized = car.brand.trim().charAt(0).toUpperCase() + car.brand.trim().slice(1).toLowerCase();
            const matchesBrand = filters.brand === '' || carBrandNormalized === filters.brand;
            const matchesYear = filters.year === '' || car.year.toString() === filters.year;

            let matchesCondition = true;
            if (filters.condition === 'Nuevo') {
                matchesCondition = car.condition === 'Nuevo' || car.condition === '0km';
            } else if (filters.condition !== '') {
                matchesCondition = car.condition === filters.condition;
            }

            return matchesSearch && matchesBrand && matchesYear && matchesCondition;
        });
    }, [filters, cars]);

    const totalPages = Math.ceil(filteredCars.length / itemsPerPage);
    const paginatedCars = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredCars.slice(start, start + itemsPerPage);
    }, [filteredCars, currentPage, itemsPerPage]);

    return (
        <main className="container page-padding">
            <motion.div
                className="page-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <h1>Catálogo de Vehículos</h1>
                <p>Explorá nuestra selección premium</p>
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
                />
            </motion.div>

            <div className="cars-grid">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={`skeleton-${i}`} className="car-skeleton">
                            <div className="skeleton-img"></div>
                            <div className="skeleton-content">
                                <div className="skeleton-title"></div>
                                <div className="skeleton-subtitle"></div>
                                <div className="skeleton-meta"></div>
                            </div>
                        </div>
                    ))
                ) : paginatedCars.length > 0 ? (
                    paginatedCars.map((car, index) => (
                        <motion.div
                            key={car._id || car.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.5, delay: (index % itemsPerPage) * 0.05, ease: "easeOut" }}
                            viewport={{ once: true, amount: 0.1 }}
                        >
                            <CarCard car={car} />
                        </motion.div>
                    ))
                ) : (
                    <div className="no-results">
                        <p>No se encontraron vehículos con esos criterios.</p>
                        <button
                            className="btn-text"
                            onClick={() => handleFilterChange('reset')}
                        >
                            Limpiar filtros
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
                        title="Anterior"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className="pagination-numbers">
                        {Array.from({ length: totalPages }).map((_, i) => {
                            const pageNum = i + 1;
                            // Show first, last, and pages around current
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
                        title="Siguiente"
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
                    margin-bottom: 2.5rem;
                }

                .page-header h1 {
                    font-size: clamp(2rem, 5vw, 3.5rem);
                    margin-bottom: 0.5rem;
                    font-weight: 900;
                    letter-spacing: -0.02em;
                }

                .page-header p {
                    color: var(--color-text-muted);
                    font-size: clamp(1rem, 1.5vw, 1.25rem);
                }
                
                .cars-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1.5rem; /* Tighter gap on mobile */
                }

                @media (min-width: 640px) {
                    .cars-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 2rem;
                    }
                }

                @media (min-width: 1024px) {
                    .cars-grid {
                        grid-template-columns: repeat(3, 1fr);
                        gap: 2.5rem;
                    }
                }

                .no-results {
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 4rem;
                    color: var(--color-text-muted);
                }

                .btn-text {
                    background: none;
                    border: none;
                    color: var(--color-primary);
                    text-decoration: underline;
                    cursor: pointer;
                    margin-top: 1rem;
                    font-size: 1rem;
                }

                .car-skeleton {
                    background: var(--color-surface);
                    border-radius: 12px;
                    overflow: hidden;
                    height: 100%;
                    min-height: 380px;
                    display: flex;
                    flex-direction: column;
                }
                .skeleton-img {
                    width: 100%;
                    aspect-ratio: 4/3;
                    background: #2a2a2a;
                    animation: pulse 1.5s infinite ease-in-out;
                }
                .skeleton-content {
                    padding: 1.25rem;
                    flex: 1;
                    background: linear-gradient(to bottom, #1a0505 0%, #5a0a0a 100%);
                }
                .skeleton-title {
                    height: 24px;
                    width: 80%;
                    background: rgba(255, 255, 255, 0.2);
                    margin-bottom: 0.5rem;
                    border-radius: 4px;
                    animation: pulse 1.5s infinite ease-in-out;
                }
                .skeleton-subtitle {
                    height: 16px;
                    width: 60%;
                    background: rgba(255, 255, 255, 0.1);
                    margin-bottom: 1rem;
                    border-radius: 4px;
                    animation: pulse 1.5s infinite ease-in-out;
                }
                .skeleton-meta {
                    height: 20px;
                    width: 40%;
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 4px;
                    margin-top: auto;
                    animation: pulse 1.5s infinite ease-in-out;
                }

                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }

                .pagination {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 1rem;
                    margin-top: 4rem;
                    user-select: none;
                }

                .pagination-numbers {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .pagination-btn, .pagination-number {
                    background: var(--color-surface);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: white;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-weight: 600;
                }

                .pagination-btn:hover:not(:disabled), .pagination-number:hover {
                    border-color: var(--color-primary);
                    background: rgba(235, 38, 40, 0.1);
                    transform: translateY(-2px);
                }

                .pagination-number.active {
                    background: var(--color-primary);
                    border-color: var(--color-primary);
                    box-shadow: 0 4px 15px rgba(235, 38, 40, 0.4);
                }

                .pagination-btn:disabled {
                    opacity: 0.3;
                    cursor: not-allowed;
                }

                .pagination-ellipsis {
                    color: var(--color-text-muted);
                    padding: 0 0.25rem;
                }

                @media (max-width: 480px) {
                    .pagination {
                        gap: 0.5rem;
                    }
                    .pagination-btn, .pagination-number {
                        width: 36px;
                        height: 36px;
                        font-size: 0.9rem;
                    }
                }
            `}</style>
        </main>
    );
};

export default Catalog;
