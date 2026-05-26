import React from 'react';
import { Search, Filter, X } from 'lucide-react';

export default function ClientFilters({ filters, setFilters, onSearch }) {
    const handleReset = () => {
        setFilters({ search: '', type: '', source: '', status: '' });
        onSearch({ search: '', type: '', source: '', status: '' });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            onSearch(filters);
        }
    };

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-1/3">
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                    Buscar Cliente
                </label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                    <input
                        type="text"
                        name="search"
                        value={filters.search}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Nombre, email, teléfono, localidad..."
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-red-500 transition-colors"
                    />
                </div>
            </div>

            <div className="w-full md:w-1/6">
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Tipo</label>
                <select
                    name="type"
                    value={filters.type}
                    onChange={handleChange}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                >
                    <option value="">Todos</option>
                    <option value="comprador">Comprador</option>
                    <option value="vendedor">Vendedor</option>
                    <option value="ambos">Ambos</option>
                    <option value="potencial">Potencial</option>
                </select>
            </div>

            <div className="w-full md:w-1/6">
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Origen</label>
                <select
                    name="source"
                    value={filters.source}
                    onChange={handleChange}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                >
                    <option value="">Todos</option>
                    <option value="web">Web</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                    <option value="referido">Referido</option>
                    <option value="local">Local</option>
                    <option value="mercadolibre">MercadoLibre</option>
                    <option value="otro">Otro</option>
                </select>
            </div>

            <div className="w-full md:w-1/6">
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Estado</label>
                <select
                    name="status"
                    value={filters.status}
                    onChange={handleChange}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                >
                    <option value="">Todos</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="bloqueado">Bloqueado</option>
                </select>
            </div>

            <div className="w-full md:w-auto flex gap-2">
                <button
                    onClick={() => onSearch(filters)}
                    className="flex-1 md:flex-none bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-neutral-700 flex items-center justify-center gap-2"
                >
                    <Filter size={16} /> Filtrar
                </button>
                {(filters.search || filters.type || filters.source || filters.status) && (
                    <button
                        onClick={handleReset}
                        className="flex-none bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white px-3 py-2 rounded-lg transition-colors border border-neutral-700 flex items-center justify-center"
                        title="Limpiar filtros"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}
