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
          padding: 1.5rem;
          border-radius: 12px;
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 3rem;
          /* Glassmorphism */
          background: rgba(20, 20, 20, 0.4);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }

        .search-group {
          flex: 2;
          min-width: 300px;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-muted);
        }

        .search-input {
          width: 100%;
          height: 48px;
          background-color: rgba(0, 0, 0, 0.3); /* Semi-transparent inputs */
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding-left: 40px;
          padding-right: 16px;
          color: white;
          font-family: inherit;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--color-primary);
          background-color: rgba(0, 0, 0, 0.6);
        }

        .select-group {
          flex: 3;
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .filter-select {
          flex: 1;
          height: 48px;
          background-color: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 0 16px;
          color: white;
          font-family: inherit;
          min-width: 140px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .filter-select:focus {
             outline: none;
             border-color: var(--color-primary);
             background-color: rgba(0, 0, 0, 0.6);
        }

        .btn-filter {
          background-color: var(--color-primary);
          color: white;
          border: none;
          padding: 0 2rem;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          height: 48px;
          box-shadow: 0 4px 15px rgba(235, 38, 40, 0.3);
          transition: transform 0.2s, background-color 0.2s;
        }
        
        .btn-filter:hover {
            background-color: var(--color-primary-dark);
        }

        @media (max-width: 768px) {
          .filters-container {
            flex-direction: column;
          }
          .select-group {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default SmartFilters;
