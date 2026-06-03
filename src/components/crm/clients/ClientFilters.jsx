import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import CrmInput from '../ui/CrmInput';
import CrmSelect from '../ui/CrmSelect';
import CrmButton from '../ui/CrmButton';

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
        <div className="bg-crm-surface border border-crm-border rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-1/3">
                <label className="block text-xs font-bold text-crm-fg-muted uppercase tracking-wider mb-2">
                    Buscar Cliente
                </label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={18} />
                    <CrmInput
                        type="text"
                        name="search"
                        value={filters.search}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Nombre, email, teléfono, localidad..."
                        className="pl-10"
                    />
                </div>
            </div>

            <div className="w-full md:w-1/6">
                <label className="block text-xs font-bold text-crm-fg-muted uppercase tracking-wider mb-2">Tipo</label>
                <CrmSelect
                    name="type"
                    value={filters.type}
                    onChange={handleChange}
                >
                    <option value="">Todos</option>
                    <option value="comprador">Comprador</option>
                    <option value="vendedor">Vendedor</option>
                    <option value="ambos">Ambos</option>
                    <option value="potencial">Potencial</option>
                </CrmSelect>
            </div>

            <div className="w-full md:w-1/6">
                <label className="block text-xs font-bold text-crm-fg-muted uppercase tracking-wider mb-2">Origen</label>
                <CrmSelect
                    name="source"
                    value={filters.source}
                    onChange={handleChange}
                >
                    <option value="">Todos</option>
                    <option value="web">Web</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                    <option value="referido">Referido</option>
                    <option value="local">Local</option>
                    <option value="mercadolibre">MercadoLibre</option>
                    <option value="otro">Otro</option>
                </CrmSelect>
            </div>

            <div className="w-full md:w-1/6">
                <label className="block text-xs font-bold text-crm-fg-muted uppercase tracking-wider mb-2">Estado</label>
                <CrmSelect
                    name="status"
                    value={filters.status}
                    onChange={handleChange}
                >
                    <option value="">Todos</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="bloqueado">Bloqueado</option>
                </CrmSelect>
            </div>

            <div className="w-full md:w-auto flex gap-2">
                <CrmButton
                    onClick={() => onSearch(filters)}
                    className="flex-1 md:flex-none gap-2"
                >
                    <Filter size={16} /> Filtrar
                </CrmButton>
                {(filters.search || filters.type || filters.source || filters.status) && (
                    <CrmButton
                        variant="secondary"
                        onClick={handleReset}
                        className="flex-none px-3"
                        title="Limpiar filtros"
                    >
                        <X size={16} />
                    </CrmButton>
                )}
            </div>
        </div>
    );
}
