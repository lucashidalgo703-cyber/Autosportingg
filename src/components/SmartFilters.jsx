import { Search } from 'lucide-react';

const SmartFilters = ({ filters, onFilterChange, brands = [], years = [] }) => {

  const handleChange = (e) => {
    const { name, value } = e.target;
    onFilterChange(name, value);
  };

  return (
    <div className="filters-container">
      <div className="search-group">
        <Search className="search-icon" size={20} />
        <input
          type="text"
          name="search"
          placeholder="Buscar por nombre, modelo..."
          className="search-input"
          value={filters.search}
          onChange={handleChange}
        />
      </div>

      <div className="select-group">
        <select
          className="filter-select"
          name="brand"
          value={filters.brand}
          onChange={handleChange}
        >
          <option value="">Todas las Marcas</option>
          {brands.map(brand => (
            <option key={brand} value={brand}>{brand}</option>
          ))}
        </select>

        <select
          className="filter-select"
          name="condition"
          value={filters.condition}
          onChange={handleChange}
        >
          <option value="">Cualquier Condición</option>
          <option value="Nuevo">Nuevo</option>
          <option value="Usado">Usado</option>
        </select>

        <select
          className="filter-select"
          name="year"
          value={filters.year}
          onChange={handleChange}
        >
          <option value="">Cualquier Año</option>
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        <button
          className="btn-filter"
          onClick={() => onFilterChange('reset')}
        >
          Limpiar
        </button>
      </div>

      <style>{`
        .filters-container {
          padding: 1rem;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 2.5rem;
          background: rgba(20, 20, 20, 0.4);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        @media (min-width: 1024px) {
            .filters-container {
                flex-direction: row;
                padding: 1.5rem;
                margin-bottom: 3.5rem;
            }
        }

        .search-group {
          flex: 1.5;
          position: relative;
          width: 100%;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-muted);
        }

        .search-input {
          width: 100%;
          height: 52px;
          background-color: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding-left: 44px;
          padding-right: 16px;
          color: white;
          font-family: inherit;
          font-size: 1rem;
          transition: all 0.3s;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--color-primary);
          background-color: rgba(0, 0, 0, 0.6);
          box-shadow: 0 0 15px rgba(235, 38, 40, 0.1);
        }

        .select-group {
          flex: 2;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          width: 100%;
        }
        
        @media (min-width: 640px) {
            .select-group {
                gap: 1rem;
            }
        }
        
        @media (min-width: 1024px) {
            .select-group {
                display: flex;
                flex-wrap: nowrap;
            }
        }

        .filter-select {
          height: 52px;
          background-color: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 0 12px;
          color: white;
          font-family: inherit;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s;
          width: 100%;
        }
        
        @media (min-width: 768px) {
            .filter-select {
                font-size: 1rem;
                padding: 0 16px;
            }
        }
        
        .filter-select:focus {
             outline: none;
             border-color: var(--color-primary);
             background-color: rgba(0, 0, 0, 0.6);
        }

        .btn-filter {
          grid-column: span 2;
          background-color: var(--color-primary);
          color: white;
          border: none;
          padding: 0 1.5rem;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          height: 52px;
          transition: all 0.3s;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 0.9rem;
        }
        
        @media (min-width: 1024px) {
            .btn-filter {
                grid-column: auto;
                padding: 0 2rem;
            }
        }
        
        .btn-filter:hover {
            background-color: var(--color-primary-dark);
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(235, 38, 40, 0.3);
        }

        @media (max-width: 640px) {
            .select-group {
                grid-template-columns: 1fr;
            }
            .btn-filter {
                grid-column: span 1;
            }
        }
      `}</style>
    </div>
  );
};

export default SmartFilters;
