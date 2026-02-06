import { useState, useMemo } from 'react';
import SmartFilters from '../components/SmartFilters';
import CarCard from '../components/CarCard';
import { useCars } from '../hooks/useCars';

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
        return [...new Set(cars.map(car => car.brand))].sort();
    }, [cars]);

    const years = useMemo(() => {
        return [...new Set(cars.map(car => car.year))].sort((a, b) => b - a);
    }, [cars]);

    // Filter logic
    const filteredCars = useMemo(() => {
        return cars.filter(car => {
            const matchesSearch = car.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                car.brand.toLowerCase().includes(filters.search.toLowerCase());
            const matchesBrand = filters.brand === '' || car.brand === filters.brand;
            const matchesYear = filters.year === '' || car.year.toString() === filters.year;
            const matchesCondition = filters.condition === '' || car.condition === filters.condition;

            return matchesSearch && matchesBrand && matchesYear && matchesCondition;
        });
    }, [filters, cars]);

    return (
        <main className="container page-padding">
            <div className="page-header">
                <h1>Catálogo de Vehículos</h1>
                <p>Explorá nuestra selección premium</p>
            </div>

            <SmartFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                brands={brands}
                years={years}
            />

            <div className="cars-grid">
                {filteredCars.length > 0 ? (
                    filteredCars.map(car => (
                        <CarCard key={car.id} car={car} />
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
            `}</style>
        </main>
    );
};

export default Catalog;
