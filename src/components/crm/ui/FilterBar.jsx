import React from 'react';
import { Search, Filter, X } from 'lucide-react';

export default function FilterBar({
    searchPlaceholder = 'Buscar...',
    searchValue = '',
    onSearchChange = null,
    onClearSearch = null,
    filters = [],
    activeFiltersCount = 0,
    onClearFilters = null,
    children,
    className = ''
}) {
    return (
        <div className={`flex flex-col sm:flex-row items-center gap-3 w-full bg-crm-surface border border-crm-border rounded-[var(--crm-radius)] p-2 shadow-sm ${className}`}>
            
            {/* Search Input */}
            {onSearchChange && (
                <div className="relative flex items-center w-full sm:max-w-xs shrink-0">
                    <Search size={16} className="absolute left-3 text-crm-fg-muted pointer-events-none" />
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full h-9 bg-crm-bg border border-crm-border rounded-lg pl-9 pr-9 text-sm text-crm-fg placeholder:text-crm-fg-subtle focus:outline-none focus:border-crm-red transition-colors"
                    />
                    {searchValue && onClearSearch && (
                        <button
                            onClick={onClearSearch}
                            className="absolute right-2 p-1 text-crm-fg-muted hover:text-crm-fg"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            )}

            {/* Custom Filters / Children */}
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto custom-scrollbar flex-1">
                {children}
            </div>

            {/* Global Clear Filters */}
            {activeFiltersCount > 0 && onClearFilters && (
                <button
                    onClick={onClearFilters}
                    className="flex shrink-0 items-center gap-1.5 px-3 h-9 text-xs font-semibold text-crm-red hover:bg-crm-red/10 rounded-lg transition-colors ml-auto sm:ml-0"
                >
                    <Filter size={14} />
                    Limpiar filtros ({activeFiltersCount})
                </button>
            )}
        </div>
    );
}
