"use client";
import { useState, useEffect } from 'react';
import { Search, RotateCcw, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SmartFilters = ({ 
  filters, 
  onFilterChange, 
  brands = [], 
  years = [], 
  transmissions = [],
  fuels = [],
  resultsCount = 0 
}) => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Prevent scroll when drawer is open
  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileDrawerOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    onFilterChange(name, value);
  };

  const handleClearAll = () => {
    onFilterChange('reset');
  };

  const removeFilter = (key) => {
    onFilterChange(key, '');
  };

  // Calculate active filters count
  const activeFilters = Object.entries(filters).filter(([key, value]) => value !== '' && key !== 'sortBy' && key !== 'search');
  const activeCount = activeFilters.length;

  const FilterSelects = () => (
    <>
      <div className="filter-item">
        <label>Marca</label>
        <select name="brand" value={filters.brand} onChange={handleChange}>
          <option value="">Todas</option>
          {brands.map(brand => (
            <option key={brand} value={brand}>{brand}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label>Condición</label>
        <select name="condition" value={filters.condition} onChange={handleChange}>
          <option value="">Todas</option>
          <option value="Nuevo">0 KM</option>
          <option value="Usado">Usado</option>
        </select>
      </div>

      <div className="filter-item">
        <label>Año</label>
        <select name="year" value={filters.year} onChange={handleChange}>
          <option value="">Todos</option>
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {transmissions.length > 0 && (
        <div className="filter-item">
          <label>Transmisión</label>
          <select name="transmission" value={filters.transmission} onChange={handleChange}>
            <option value="">Todas</option>
            {transmissions.map(trans => (
              <option key={trans} value={trans}>{trans}</option>
            ))}
          </select>
        </div>
      )}

      {fuels.length > 0 && (
        <div className="filter-item">
          <label>Combustible</label>
          <select name="fuel" value={filters.fuel} onChange={handleChange}>
            <option value="">Todos</option>
            {fuels.map(fuel => (
              <option key={fuel} value={fuel}>{fuel}</option>
            ))}
          </select>
        </div>
      )}

      <div className="filter-item">
        <label>Ordenar por</label>
        <select name="sortBy" value={filters.sortBy || ''} onChange={handleChange}>
          <option value="">Destacados</option>
          <option value="year-desc">Año: Más nuevo</option>
          <option value="year-asc">Año: Más viejo</option>
          <option value="km-asc">Menos Kilometraje</option>
          <option value="km-desc">Más Kilometraje</option>
          <option value="price-asc">Menor Precio</option>
          <option value="price-desc">Mayor Precio</option>
        </select>
      </div>
    </>
  );

  return (
    <div className="filters-wrapper">
      
      {/* Top Search Bar */}
      <div className="search-bar-container">
        <div className="search-box">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            name="search"
            placeholder="Buscar por marca o modelo..."
            className="search-input"
            value={filters.search}
            onChange={handleChange}
          />
        </div>
        
        {/* Mobile Filter Toggle */}
        <button 
            className="mobile-filter-toggle"
            onClick={() => setIsMobileDrawerOpen(true)}
        >
            <Filter size={20} />
            Filtros {activeCount > 0 && <span className="badge-count">{activeCount}</span>}
        </button>
      </div>

      {/* Active Filter Chips */}
      {activeCount > 0 && (
        <div className="active-chips">
            <span className="chips-label">Filtros aplicados:</span>
            {activeFilters.map(([key, value]) => (
                <div key={key} className="chip">
                    {value}
                    <button onClick={() => removeFilter(key)} aria-label={`Eliminar filtro ${value}`}>
                        <X size={14} />
                    </button>
                </div>
            ))}
            <button className="btn-clear-all" onClick={handleClearAll}>
                Limpiar todo
            </button>
        </div>
      )}

      {/* Desktop Filters Grid */}
      <div className="desktop-filters-grid">
        <FilterSelects />
      </div>

      {/* Results Count (Desktop) */}
      <div className="results-count-desktop">
          Se encontraron {resultsCount} {resultsCount === 1 ? 'vehículo' : 'vehículos'}
      </div>

      {/* Mobile Drawer (Bottom Sheet) */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
            <>
                <motion.div 
                    className="drawer-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsMobileDrawerOpen(false)}
                />
                <motion.div 
                    className="mobile-drawer"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                >
                    <div className="drawer-header">
                        <h3>Filtros ({activeCount})</h3>
                        <button className="drawer-close" onClick={() => setIsMobileDrawerOpen(false)}>
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="drawer-content">
                        <FilterSelects />
                    </div>

                    <div className="drawer-footer">
                        {activeCount > 0 && (
                            <button className="btn btn-outline" onClick={handleClearAll}>
                                Limpiar
                            </button>
                        )}
                        <button className="btn btn-primary flex-1" onClick={() => setIsMobileDrawerOpen(false)}>
                            Ver {resultsCount} {resultsCount === 1 ? 'vehículo' : 'vehículos'}
                        </button>
                    </div>
                </motion.div>
            </>
        )}
      </AnimatePresence>

      <style>{`
        .filters-wrapper {
          margin-bottom: var(--space-8);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          max-width: 1100px;
          margin-left: auto;
          margin-right: auto;
        }

        /* Search Bar */
        .search-bar-container {
            display: flex;
            gap: var(--space-3);
        }

        .search-box {
            position: relative;
            flex: 1;
        }

        .search-icon {
            position: absolute;
            left: var(--space-4);
            top: 50%;
            transform: translateY(-50%);
            color: var(--c-ivory-muted);
        }

        .search-input {
            width: 100%;
            padding: var(--space-3) var(--space-4) var(--space-3) 3rem;
            background-color: var(--c-graphite);
            border: var(--border-thin);
            border-radius: var(--radius-md);
            color: var(--c-ivory);
            font-family: var(--font-main);
            font-size: 1rem;
            transition: all 0.2s ease;
        }

        .search-input:focus {
            outline: none;
            border-color: var(--c-accent-red);
            background-color: var(--c-graphite-light);
        }

        /* Mobile Filter Toggle */
        .mobile-filter-toggle {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            padding: 0 var(--space-4);
            background-color: var(--c-graphite);
            border: var(--border-thin);
            border-radius: var(--radius-md);
            color: var(--c-ivory);
            font-weight: 600;
            font-family: var(--font-main);
            transition: all 0.2s ease;
        }

        @media (min-width: 768px) {
            .mobile-filter-toggle {
                display: none;
            }
        }

        .badge-count {
            background-color: var(--c-accent-red);
            color: var(--c-ivory);
            font-size: 0.75rem;
            padding: 2px 6px;
            border-radius: var(--radius-full);
            line-height: 1;
        }

        /* Desktop Filters Grid */
        .desktop-filters-grid {
            display: none;
        }

        @media (min-width: 768px) {
            .desktop-filters-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: var(--space-4);
                background: var(--c-graphite);
                border: var(--border-thin);
                border-radius: var(--radius-lg);
                padding: var(--space-5);
            }
        }

        @media (min-width: 1024px) {
            .desktop-filters-grid {
                display: flex;
                flex-wrap: wrap;
                align-items: flex-end;
            }
            .desktop-filters-grid .filter-item {
                flex: 1;
                min-width: 140px;
            }
        }

        .filter-item {
            display: flex;
            flex-direction: column;
            gap: var(--space-2);
        }

        .filter-item label {
            font-size: 0.85rem;
            color: var(--c-ivory-muted);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .filter-item select {
            width: 100%;
            height: 44px;
            padding: var(--space-2) var(--space-3);
            background-color: var(--c-carbon);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: var(--radius-sm);
            color: var(--c-ivory);
            font-family: var(--font-main);
            font-size: 0.95rem;
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 0.75rem center;
        }

        .filter-item select:focus {
            outline: none;
            border-color: var(--c-accent-red);
        }

        /* Active Chips */
        .active-chips {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: var(--space-2);
        }

        .chips-label {
            font-size: 0.85rem;
            color: var(--c-ivory-muted);
            margin-right: var(--space-2);
        }

        .chip {
            display: inline-flex;
            align-items: center;
            gap: var(--space-2);
            padding: 4px 10px;
            background-color: var(--c-graphite-light);
            border: 1px solid rgba(230, 48, 39, 0.3);
            border-radius: var(--radius-full);
            font-size: 0.85rem;
            color: var(--c-ivory);
            font-weight: 500;
        }

        .chip button {
            background: none;
            border: none;
            color: var(--c-ivory-muted);
            cursor: pointer;
            padding: 0;
            display: flex;
            align-items: center;
            transition: color 0.2s ease;
        }

        .chip button:hover {
            color: var(--c-accent-red);
        }

        .btn-clear-all {
            background: none;
            border: none;
            color: var(--c-ivory-muted);
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            text-decoration: underline;
            padding: 4px 8px;
            transition: color 0.2s ease;
        }

        .btn-clear-all:hover {
            color: var(--c-ivory);
        }

        /* Results count */
        .results-count-desktop {
            font-size: 0.95rem;
            color: var(--c-ivory-muted);
            font-weight: 500;
        }

        @media (max-width: 1023px) {
            .results-count-desktop {
                display: none;
            }
        }

        /* Mobile Drawer */
        .drawer-overlay {
            position: fixed;
            inset: 0;
            background-color: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            z-index: 100;
        }

        .mobile-drawer {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            max-height: 90vh;
            background-color: var(--c-graphite);
            border-top-left-radius: var(--radius-xl);
            border-top-right-radius: var(--radius-xl);
            z-index: 101;
            display: flex;
            flex-direction: column;
            border-top: var(--border-thin);
        }

        .drawer-header {
            padding: var(--space-5);
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: var(--border-thin);
        }

        .drawer-header h3 {
            font-family: var(--font-title);
            color: var(--c-ivory);
            font-size: 1.25rem;
            font-weight: 800;
            margin: 0;
        }

        .drawer-close {
            background: none;
            border: none;
            color: var(--c-ivory-muted);
            cursor: pointer;
        }

        .drawer-content {
            padding: var(--space-5);
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: var(--space-5);
        }

        .drawer-footer {
            padding: var(--space-5);
            border-top: var(--border-thin);
            display: flex;
            gap: var(--space-3);
            background-color: var(--c-carbon);
        }
        
        .btn-outline {
            background-color: transparent;
            border: 1px solid var(--c-ivory-muted);
            color: var(--c-ivory);
            font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default SmartFilters;
