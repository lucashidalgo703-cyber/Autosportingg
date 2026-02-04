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
          background-color: #0c0c0c;
          /* Carbon Texture */
          background-image: 
            linear-gradient(45deg, rgba(255, 255, 255, 0.03) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.03) 75%, rgba(255, 255, 255, 0.03)),
            linear-gradient(45deg, rgba(255, 255, 255, 0.03) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.03) 75%, rgba(255, 255, 255, 0.03));
          background-size: 6px 6px;
          background-position: 0 0, 3px 3px;

          padding: 1.5rem;
          border-radius: 8px;
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 3rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
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
          background-color: #0a0a0a; /* Anthracite */
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding-left: 40px;
          padding-right: 16px;
          color: white;
          font-family: inherit;
          font-size: 1rem;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--color-primary);
          background-color: #111;
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
          background-color: #0a0a0a; /* Anthracite */
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 0 16px;
          color: white;
          font-family: inherit;
          min-width: 140px;
          cursor: pointer;
        }

        .btn-filter {
          background-color: var(--color-primary);
          color: white;
          border: none;
          padding: 0 2rem;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          height: 48px;
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
