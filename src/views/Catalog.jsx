import { useState, useMemo } from 'react';
import SmartFilters from '../components/SmartFilters';
import CarCard from '../components/CarCard';
import { useCars } from '../hooks/useCars';
import { motion } from 'framer-motion';

const Catalog = () => {
    const { cars, loading } = useCars();
    const [filters, setFilters] = useState({
        search: '',
        brand: '',
        year: '',
        condition: ''
    });

    const handleFilterChange = (name, value) => {
        if (name === 'reset') {
            setFilters({ search: '', brand: '', year: '', condition: '' });
        } else {
            setFilters(prev => ({
                ...prev,
                [name]: value
            }));
        }
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
                ) : filteredCars.length > 0 ? (
                    filteredCars.map((car, index) => (
                        <motion.div
                            key={car.id || car._id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
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

            <style>{`
                .page-padding {
                    padding-top: 4rem;
                    padding-bottom: 4rem;
                }

                .page-header {
                    text-align: center;
                    margin-bottom: 3rem;
                }

                .page-header h1 {
                    font-size: 3rem;
                    margin-bottom: 0.5rem;
                }

                .page-header p {
                    color: var(--color-text-muted);
                    font-size: 1.2rem;
                }
                
                .cars-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 3rem; /* Larger gap like reference */
                }

                @media (min-width: 640px) {
                    .cars-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (min-width: 1024px) {
                    .cars-grid {
                        grid-template-columns: repeat(3, 1fr);
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
            `}</style>
        </main>
    );
};

export default Catalog;
