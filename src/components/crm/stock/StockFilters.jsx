"use client";
import { Search } from 'lucide-react';

const statusChips = [
    ['todos', 'Todos'], ['disponible', 'Disponible'], ['reservado', 'Reservado'],
    ['pausado', 'Pausado'], ['vendido', 'Vendido'], ['cancelado', 'Cancelado'], ['sin_estado', 'Sin estado']
];
export default function StockFilters({ searchTerm, setSearchTerm, filterStatus, setFilterStatus, stockTab, setStockTab, brandFilter, setBrandFilter, mlFilter, setMlFilter, catalogFilter = 'all', setCatalogFilter, ownershipFilter = 'todos', setOwnershipFilter, disabled = false, brandOptions = [], counts = {}, canNegotiate = false }) {
    const selectClass = 'h-10 min-w-0 w-full rounded-lg border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg';
    const mandates = stockTab === 'mandatos';
    const history = stockTab === 'historial';
    const negotiation = stockTab === 'negotiation';
    const selectTab = id => { setFilterStatus('todos'); setStockTab(id); };
    return <div className="space-y-4">
        <div className="flex flex-wrap gap-x-5 border-b border-crm-border" aria-label="Secciones de Stock">{[['stock', `Inventario disponible (${counts.disponibles ?? 0})`], ['historial', `Todos los estados (${counts.inventoryCount ?? 0})`], ['mandatos', `Mandatos (${counts.mandatos || 0})`], ...(canNegotiate ? [['negotiation', 'Negociación']] : [])].map(([id,label]) => <button key={id} type="button" disabled={disabled} onClick={() => selectTab(id)} aria-pressed={id === 'stock' ? !history && !mandates && !negotiation : stockTab === id} className={`min-h-11 border-b-2 px-1 py-3 text-sm font-semibold ${(id === 'stock' ? !history && !mandates && !negotiation : stockTab === id) ? 'border-crm-red text-crm-red' : 'border-transparent text-crm-fg-muted'}`}>{label}</button>)}</div>
        {!negotiation && <>
        {history && <div className="flex flex-wrap items-center gap-2" aria-label="Estado operativo"><span className="text-xs text-crm-fg-muted">Estado:</span>{statusChips.map(([id,label]) => <button type="button" key={id} disabled={disabled} aria-pressed={(filterStatus || 'todos') === id} onClick={() => setFilterStatus(id)} className={`min-h-10 rounded-full border px-3 py-1 text-xs font-semibold ${(filterStatus || 'todos') === id ? 'border-crm-red bg-crm-red/10 text-crm-fg' : 'border-crm-border text-crm-fg-muted'}`}>{label}</button>)}</div>}
        <div className="relative"><Search size={17} className="absolute left-3 top-3 text-crm-fg-muted"/><input type="search" disabled={disabled} aria-label={history ? 'Buscar en todos los estados' : 'Buscar en el inventario disponible'} placeholder={mandates ? 'Buscar mandato, modelo, patente o mandante…' : 'Buscar modelo, versión, patente, año…'} value={searchTerm} onChange={event => setSearchTerm(event.target.value)} className={`${selectClass} pl-9`} /></div>
        {!mandates && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {!history && <select aria-label="Condición de unidad" value={stockTab === 'cero_km' ? 'cero_km' : 'stock'} onChange={event => setStockTab(event.target.value)} disabled={disabled} className={selectClass}><option value="stock">Condición: Todas</option><option value="cero_km">0 km</option></select>}
            <select aria-label="Tipo de propiedad" value={ownershipFilter} onChange={event => setOwnershipFilter(event.target.value)} disabled={disabled} className={selectClass}><option value="todos">Propiedad: Todas</option><option value="propio">Propio 100%</option><option value="compartido">Compartido</option><option value="inversor">Inversor 100%</option><option value="consignacion">Consignación</option><option value="tercero">Tercero</option></select>
            <select aria-label="Marca del vehículo" value={brandFilter} onChange={event => setBrandFilter(event.target.value)} disabled={disabled} className={selectClass}><option value="todas">Todas las marcas</option>{brandOptions.map(brand => <option key={brand} value={brand}>{brand}</option>)}</select>
            <select aria-label="Publicación en catálogo web" value={catalogFilter} onChange={event => setCatalogFilter(event.target.value)} disabled={disabled} className={selectClass}><option value="all">Catálogo web: Todos</option><option value="published">Catálogo web: Publicados</option><option value="unpublished">Catálogo web: No publicados</option></select>
            <select aria-label="Publicación en Mercado Libre" value={mlFilter} onChange={event => setMlFilter(event.target.value)} disabled={disabled} className={selectClass}><option value="todas">Mercado Libre: Todos</option><option value="publicados">Mercado Libre: Publicados</option><option value="no_publicados">Mercado Libre: No publicados</option></select>
        </div>}
        </>}
    </div>;
}
