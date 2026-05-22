import { Search, RotateCcw } from 'lucide-react';

const SmartFilters = ({ filters, onFilterChange, brands = [], years = [] }) => {

  const handleChange = (e) => {
    const { name, value } = e.target;
    onFilterChange(name, value);
  };

  return (
    <div className="filters-container">
      <div className="search-section">
        <div className="search-box">
          <Search className="search-icon" size={22} />
          <input
            type="text"
            name="search"
            placeholder="¿Qué vehículo estás buscando? (Marca, modelo...)"
            className="search-input"
            value={filters.search}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="options-section">
        <div className="options-grid">
          <div className="filter-item">
            <label>Marca</label>
            <select name="brand" value={filters.brand} onChange={handleChange}>
              <option value="">Todas las Marcas</option>
              {brands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label>Condición</label>
            <select name="condition" value={filters.condition} onChange={handleChange}>
              <option value="">Cualquier Condición</option>
              <option value="Nuevo">Nuevo</option>
              <option value="Usado">Usado</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Ordenar por</label>
            <select name="sortBy" value={filters.sortBy || ''} onChange={handleChange}>
              <option value="">Destacados</option>
              <option value="year-desc">Año: Más nuevo</option>
              <option value="year-asc">Año: Más viejo</option>
              <option value="km-asc">Menos Kilometraje</option>
              <option value="km-desc">Más Kilometraje</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Año</label>
            <select name="year" value={filters.year} onChange={handleChange}>
              <option value="">Cualquier Año</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="filter-item flex items-end">
            <button
              className="reset-button"
              onClick={() => onFilterChange('reset')}
            >
              <RotateCcw size={16} />
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .filters-container {
          background: rgba(15, 15, 15, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 2rem;
          margin-bottom: 3rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        }

        .search-box {
          position: relative;
          width: 100%;
        }

        .search-icon {
          position: absolute;
          left: 20px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-primary);
          opacity: 0.8;
        }

        .search-input {
          width: 100%;
          height: 60px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding-left: 60px;
          padding-right: 20px;
          color: white;
          font-size: 1.1rem;
          font-weight: 500;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .search-input:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--color-primary);
          box-shadow: 0 0 20px rgba(235, 38, 40, 0.15);
        }

        .options-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        @media (min-width: 640px) {
          .options-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .options-grid {
            grid-template-columns: repeat(5, 1fr);
          }
        }

        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .filter-item label {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding-left: 4px;
        }

        .filter-item select {
          height: 52px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 0 16px;
          color: white;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 16px;
        }

        .filter-item select:hover {
          background-color: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .filter-item select:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        .filter-item select option {
          background-color: #111;
          color: white;
        }

        .reset-button {
          height: 52px;
          background: transparent;
          border: 1px solid rgba(235, 38, 40, 0.3);
          color: var(--color-primary);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          font-weight: 700;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          transition: all 0.3s ease;
          width: 100%;
        }

        .reset-button:hover {
          background: rgba(235, 38, 40, 0.1);
          border-color: var(--color-primary);
          transform: translateY(-2px);
        }

        @media (max-width: 1024px) {
          .filters-container {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default SmartFilters;
