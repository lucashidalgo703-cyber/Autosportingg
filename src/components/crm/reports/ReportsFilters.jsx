import React from 'react';

export default function ReportsFilters({ filters, setFilters }) {
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="bg-[#161619] border border-[#33333A] rounded-2xl p-4 mb-6 flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Período</label>
                <select
                    name="dateRange"
                    value={filters.dateRange}
                    onChange={handleChange}
                    className="bg-[#0B0B0D] border border-[#33333A] text-white text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500"
                >
                    <option value="all">Histórico (Todo)</option>
                    <option value="30d">Últimos 30 días</option>
                    <option value="90d">Últimos 90 días</option>
                    <option value="year">Último año</option>
                </select>
            </div>
            <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Moneda Global</label>
                <select
                    name="currency"
                    value={filters.currency}
                    onChange={handleChange}
                    className="bg-[#0B0B0D] border border-[#33333A] text-white text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500"
                >
                    <option value="todos">ARS y USD</option>
                    <option value="ARS">Solo Pesos (ARS)</option>
                    <option value="USD">Solo Dólares (USD)</option>
                </select>
            </div>
        </div>
    );
}
