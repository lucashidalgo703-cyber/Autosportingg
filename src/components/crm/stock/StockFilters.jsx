"use client";
import { useState } from 'react';
import { Search } from 'lucide-react';
import { normalizeStockText } from '../../../utils/stockFilters.js';

const tabs = [
    { id: 'stock', label: 'Stock general' },
    { id: 'consignaciones', label: 'Consignaciones' },
    { id: 'compartidos', label: 'Compartidos' },
    { id: 'cero_km', label: '0 km' },
    { id: 'mandatos', label: 'Mandatos' }
];

const statusChips = [
    {
        id: 'disponible',
        icon: '✅',
        label: 'Disponible',
        active: 'border-emerald-500 bg-emerald-500/20 text-emerald-300',
        idle: 'border-emerald-500/40 bg-crm-surface text-emerald-300/80 hover:border-emerald-400/70'
    },
    {
        id: 'senado',
        icon: '⚠️',
        label: 'Señado',
        active: 'border-amber-500 bg-amber-500/20 text-amber-300',
        idle: 'border-amber-500/40 bg-crm-surface text-amber-300/80 hover:border-amber-400/70'
    },
    {
        id: 'vendido_sin_confirmar',
        icon: '⏳',
        label: 'Vendido sin confirmar',
        active: 'border-orange-500 bg-orange-500/20 text-orange-300',
        idle: 'border-orange-500/40 bg-crm-surface text-orange-300/80 hover:border-orange-400/70'
    },
    {
        id: 'vendido',
        icon: '⛔',
        label: 'Vendido',
        active: 'border-crm-fg-subtle bg-crm-fg-subtle/10 text-crm-fg',
        idle: 'border-crm-fg-subtle/40 bg-crm-surface text-crm-fg-muted hover:border-crm-border-strong'
    },
    { id: 'fuera_de_venta', icon: '○', label: 'Fuera de venta', active: 'border-crm-fg-muted bg-crm-surface-raised text-crm-fg', idle: 'border-crm-border bg-crm-surface text-crm-fg-muted hover:border-crm-border-strong' }
];

export default function StockFilters({
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    stockTab,
    setStockTab,
    brandFilter,
    setBrandFilter,
    mlFilter,
    setMlFilter,
    filters = {},
    setFilters,
    modelOptions = [],
    onClearFilters,
    brandOptions = [],
    counts = {},
    savedViews = [], onSaveView, onApplyView, onDeleteView, users = [], showTabs = true
}) {
    const [viewName, setViewName] = useState('');
    const [selectedView, setSelectedView] = useState('');
    const [viewBusy, setViewBusy] = useState(false);
    const [viewError, setViewError] = useState('');
    const saveView = async event => {
        event.preventDefault(); if (!viewName.trim() || !onSaveView || viewBusy) return;
        setViewBusy(true); setViewError('');
        try { await onSaveView(viewName.trim()); setViewName(''); }
        catch (failure) { setViewError(failure.message); }
        finally { setViewBusy(false); }
    };
    const update = (key, value) => setFilters?.(previous => ({ ...previous, [key]: value }));
    const fieldClass = 'm-0 h-[38px] w-full min-w-0 appearance-none rounded-lg border border-crm-border bg-crm-surface px-3 text-sm leading-5 text-crm-fg outline-none focus:border-crm-red focus:ring-2 focus:ring-crm-red/20 disabled:cursor-not-allowed disabled:opacity-40';
    return (
        <div className="flex min-w-0 flex-col gap-5">
            {showTabs && <div className="overflow-x-auto custom-scrollbar">
            <nav aria-label="Categorías de stock" className="flex w-max min-w-full items-center gap-6 border-b border-crm-border px-1">
                {tabs.map(tab => {
                    const isActive = stockTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => setStockTab(tab.id)}
                            className={`m-0 inline-flex min-h-10 shrink-0 items-baseline gap-1.5 whitespace-nowrap appearance-none border-0 border-b-2 bg-transparent px-1 pb-3 pt-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red ${
                                isActive
                                    ? 'border-crm-red text-crm-red'
                                    : 'border-transparent text-crm-fg-muted hover:text-crm-fg'
                            }`}
                        >
                            {tab.label}
                            {tab.id === 'stock' && counts.total > 0 && (
                                <span className="text-xs text-current font-medium">{counts.total}</span>
                            )}
                            {tab.id === 'consignaciones' && counts.consignaciones > 0 && (
                                <span className="text-xs text-current font-medium">{counts.consignaciones}</span>
                            )}
                            {tab.id === 'compartidos' && counts.compartidos > 0 && (
                                <span className="text-xs text-current font-medium">{counts.compartidos}</span>
                            )}
                            {tab.id === 'cero_km' && counts.ceroKm > 0 && (
                                <span className="text-xs text-current font-medium">{counts.ceroKm}</span>
                            )}
                            {tab.id === 'mandatos' && counts.mandatos > 0 && (
                                <span className="text-xs text-current font-medium">{counts.mandatos}</span>
                            )}
                        </button>
                    );
                })}
            </nav>
            </div>}

            <div className="flex flex-wrap items-center gap-2">
                {statusChips.map(chip => {
                    const isActive = filterStatus === chip.id;

                    return (
                        <button
                            key={chip.id}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => setFilterStatus(isActive ? '' : chip.id)}
                            className={`m-0 inline-flex h-[26px] appearance-none items-center gap-1 rounded-full border px-3 text-xs font-semibold leading-none transition-colors ${
                                isActive ? chip.active : chip.idle
                            }`}
                        >
                            <span aria-hidden="true">{chip.icon}</span>
                            {chip.label}
                        </button>
                    );
                })}
                <button type="button" aria-pressed={Boolean(filters.stagnant)} onClick={() => update('stagnant', !filters.stagnant)} className={`m-0 inline-flex h-[26px] items-center rounded-full border px-3 text-xs font-semibold ${filters.stagnant ? 'border-amber-500 bg-amber-500/20 text-amber-300' : 'border-crm-border text-crm-fg-muted'}`} title="Vehículos con más de 90 días en stock">Estancados (&gt;90 días)</button>
                <button type="button" aria-pressed={Boolean(filters.review)} onClick={() => update('review', !filters.review)} className={`m-0 inline-flex h-[26px] items-center rounded-full border px-3 text-xs font-semibold ${filters.review ? 'border-crm-red bg-crm-red/10 text-crm-red' : 'border-crm-border text-crm-fg-muted'}`} title="Vehículos con datos incompletos: sin publicar en ML, sin foto o sin precio">A revisar</button>
            </div>

            <div className="flex min-w-0 flex-col gap-3">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={17} />
                    <input
                        type="text"
                        aria-label="Búsqueda de stock"
                        placeholder="Buscar marca, modelo, patente, año, propietario, teléfono, consig., ubicación, notas..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="m-0 h-[38px] w-full appearance-none rounded-lg border border-crm-border bg-crm-surface py-2 pl-9 pr-3 text-sm text-crm-fg outline-none transition-colors placeholder:text-crm-fg-muted focus:border-crm-red focus:ring-2 focus:ring-crm-red/20"
                    />
                </div>

                <section aria-label="Filtros de inventario" className="rounded-xl border border-crm-border bg-crm-surface p-4">
                <div className="mb-3 flex items-center justify-between gap-3"><h2 className="m-0 text-sm font-medium text-crm-fg">Filtros</h2><button type="button" onClick={onClearFilters} className="text-xs text-crm-fg-muted hover:text-crm-fg">Limpiar filtros</button></div>
                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <label className="min-w-0 text-xs text-crm-fg-muted">Marca
                    <select aria-label="Filtrar por marca" value={normalizeStockText(brandFilter)} onChange={(event) => { setBrandFilter(event.target.value); update('model', ''); }} className={fieldClass}>
                        <option value="todas">Todas las marcas</option>
                        {brandOptions.map(brand => <option key={normalizeStockText(brand)} value={normalizeStockText(brand)}>{brand}</option>)}
                    </select></label>
                    <label className="min-w-0 text-xs text-crm-fg-muted">Modelo
                    <select aria-label="Filtrar por modelo" value={normalizeStockText(filters.model)} onChange={(event) => update('model', event.target.value)} className={fieldClass}>
                        <option value="">Todos los modelos</option>
                        {modelOptions.map(model => <option key={normalizeStockText(model)} value={normalizeStockText(model)}>{model}</option>)}
                    </select></label>
                    <label className="min-w-0 text-xs text-crm-fg-muted">Transmisión
                    <input type="text" list="stock-transmissions" aria-label="Filtrar por transmisión" value={filters.transmission || ''} onChange={(event) => update('transmission', event.target.value)} placeholder="Todas las transmisiones" className={fieldClass} />
                    <datalist id="stock-transmissions"><option value="Manual" /><option value="Automática" /><option value="CVT" /><option value="DCT" /></datalist></label>
                    <label className="min-w-0 text-xs text-crm-fg-muted">Moneda
                    <select aria-label="Moneda del precio de stock" value={filters.currency || ''} onChange={(event) => setFilters?.(previous => ({ ...previous, currency: event.target.value, minPrice: '', maxPrice: '' }))} className={fieldClass}>
                        <option value="">Todas las monedas</option><option value="USD">USD</option><option value="ARS">ARS</option>
                    </select></label>
                    <label className="min-w-0 text-xs text-crm-fg-muted">Precio desde
                    <input type="number" min="0" aria-label="Precio mínimo de stock" value={filters.minPrice ?? ''} disabled={!filters.currency} onChange={(event) => update('minPrice', event.target.value)} placeholder="Sin mínimo" className={fieldClass} /></label>
                    <label className="min-w-0 text-xs text-crm-fg-muted">Precio hasta
                    <input type="number" min="0" aria-label="Precio máximo de stock" value={filters.maxPrice ?? ''} disabled={!filters.currency} onChange={(event) => update('maxPrice', event.target.value)} placeholder="Sin máximo" className={fieldClass} /></label>
                </div>
                <details className="mt-3 border-t border-crm-border pt-3">
                    <summary className="cursor-pointer text-xs font-medium text-crm-fg-muted">Más filtros y búsquedas guardadas</summary>
                <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <label className="min-w-0 text-xs text-crm-fg-muted">Km desde
                    <input type="number" min="0" aria-label="Kilometraje mínimo" value={filters.minKm ?? ''} onChange={(event) => update('minKm', event.target.value)} placeholder="Sin mínimo" className={fieldClass} /></label>
                    <label className="min-w-0 text-xs text-crm-fg-muted">Km hasta
                    <input type="number" min="0" aria-label="Kilometraje máximo" value={filters.maxKm ?? ''} onChange={(event) => update('maxKm', event.target.value)} placeholder="Sin máximo" className={fieldClass} /></label>
                    <label className="min-w-0 text-xs text-crm-fg-muted">Días en stock desde
                    <input type="number" min="0" step="1" aria-label="Días mínimos en stock" value={filters.minDays ?? ''} onChange={(event) => update('minDays', event.target.value)} placeholder="Sin mínimo" className={fieldClass} /></label>
                    <label className="min-w-0 text-xs text-crm-fg-muted">Días en stock hasta
                    <input type="number" min="0" step="1" aria-label="Días máximos en stock" value={filters.maxDays ?? ''} onChange={(event) => update('maxDays', event.target.value)} placeholder="Sin máximo" className={fieldClass} /></label>
                    <label className="min-w-0 text-xs text-crm-fg-muted">Mercado Libre
                    <select
                        aria-label="Filtrar por publicación en Mercado Libre"
                        value={mlFilter}
                        onChange={(event) => setMlFilter(event.target.value)}
                        className={fieldClass}
                    >
                        <option value="todas">Mercado Libre: Todos</option>
                        <option value="publicados">Mercado Libre: Publicados</option>
                        <option value="no_publicados">Mercado Libre: No Publicados</option>
                    </select></label>
                    <label className="min-w-0 text-xs text-crm-fg-muted">Año desde<input type="number" min="1886" max={new Date().getFullYear() + 1} value={filters.minYear ?? ''} onChange={event => update('minYear', event.target.value)} className={fieldClass} /></label>
                    <label className="min-w-0 text-xs text-crm-fg-muted">Año hasta<input type="number" min="1886" max={new Date().getFullYear() + 1} value={filters.maxYear ?? ''} onChange={event => update('maxYear', event.target.value)} className={fieldClass} /></label>
                    <label className="min-w-0 text-xs text-crm-fg-muted">Ubicación<input value={filters.location || ''} onChange={event => update('location', event.target.value)} placeholder="Todas las ubicaciones" className={fieldClass} /></label>
                    <label className="min-w-0 text-xs text-crm-fg-muted">Responsable<select value={filters.responsible || ''} onChange={event => update('responsible', event.target.value)} className={fieldClass}><option value="">Todos los responsables</option><option value="unassigned">Sin asignar</option>{users.map(user => <option key={user._id} value={user._id}>{user.name || user.email}</option>)}</select></label>
                    <label className="min-w-0 text-xs text-crm-fg-muted">Origen<select value={filters.origin || ''} onChange={event => update('origin', event.target.value)} className={fieldClass}><option value="">Todos los orígenes</option><option value="owned">Propios / permuta</option><option value="consigned">Consignados</option><option value="undefined">Sin definir</option></select></label>
                </div>
                <div className="mt-4 space-y-2 border-t border-crm-border pt-3"><h3 className="m-0 text-xs font-semibold text-crm-fg">Vistas personales</h3><div className="flex flex-wrap items-center gap-2"><select aria-label="Vistas guardadas" value={selectedView} onChange={event => setSelectedView(event.target.value)} className={`${fieldClass} !w-auto max-w-full`}><option value="">Elegí una vista guardada</option>{savedViews.map(view => <option key={view._id} value={view._id}>{view.name}</option>)}</select><button type="button" disabled={!selectedView || viewBusy} onClick={() => { const view = savedViews.find(item => item._id === selectedView); if (view) onApplyView?.(view); }} className="min-h-9 rounded-lg border border-crm-border px-3 text-xs text-crm-fg disabled:opacity-40">Aplicar vista</button><button type="button" disabled={!selectedView || viewBusy} onClick={async () => { const view = savedViews.find(item => item._id === selectedView); if (!view || !onDeleteView) return; setViewBusy(true); setViewError(''); try { await onDeleteView(view); setSelectedView(''); } catch (failure) { setViewError(failure.message); } finally { setViewBusy(false); } }} className="min-h-9 px-2 text-xs text-crm-fg-muted disabled:opacity-40">Eliminar vista</button></div><form onSubmit={saveView} className="flex flex-wrap items-center gap-2"><label className="min-w-0 flex-1 text-xs text-crm-fg-muted"><span className="sr-only">Nombre de la vista</span><input value={viewName} maxLength={80} onChange={event => setViewName(event.target.value)} placeholder="Nombre de la búsqueda" className={fieldClass} /></label><button type="submit" disabled={!viewName.trim() || viewBusy} className="min-h-9 rounded-lg bg-crm-red px-3 text-xs font-semibold text-white disabled:opacity-40">{viewBusy ? 'Guardando…' : 'Guardar vista'}</button></form>{viewError && <p role="alert" className="m-0 text-xs text-red-400">{viewError}</p>}<p className="m-0 text-[11px] text-crm-fg-muted">Las vistas se guardan para tu usuario y conservan los filtros y la presentación.</p></div>
                </details>
                <p className="m-0 mt-3 text-xs text-crm-fg-muted">Los precios se filtran en la moneda elegida, sin conversión. Los días se calculan por fecha de ingreso en Argentina.</p>
                </section>
            </div>
        </div>
    );
}
