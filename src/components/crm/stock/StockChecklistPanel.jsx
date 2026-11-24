"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    Search, CheckCircle2, XCircle, AlertCircle, RefreshCw, 
    Car as CarIcon, Key, BookOpen, Wrench, ShieldCheck, Check, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import CrmCard from '../ui/CrmCard';

const ITEMS = [
    { key: 'hasManuals', label: 'Manual', icon: BookOpen, desc: 'Manual del usuario / garantía' },
    { key: 'hasDuplicateKeys', label: 'Duplicado', icon: Key, desc: 'Segunda llave / copia' },
    { key: 'hasCricket', label: 'Cricket', icon: CarIcon, desc: 'Gato / cricket de auxilio' },
    { key: 'hasWheelWrench', label: 'Llave de rueda', icon: Wrench, desc: 'Llave cruz o tubo de rueda' },
    { key: 'hasOfficialServices', label: 'Service al día', icon: ShieldCheck, desc: 'Mantenimiento / libreta al día' }
];

export default function StockChecklistPanel() {
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('todos'); // 'todos' | 'completos' | 'incompletos'
    const [savingId, setSavingId] = useState(null);

    const fetchCars = useCallback(async () => {
        setLoading(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const res = await fetch('/api/admin/stock/checklist', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const data = await res.json();
            if (data.ok && Array.isArray(data.cars)) {
                setCars(data.cars);
            } else {
                toast.error(data.message || 'Error al cargar unidades de stock.');
            }
        } catch (err) {
            console.error('fetchCars error:', err);
            toast.error('Error de conexión al cargar el stock.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCars();
    }, [fetchCars]);

    const isComplete = (car) => {
        return (
            (car.hasManuals === 'Sí' || car.hasManuals === 'Si') &&
            (car.hasDuplicateKeys === 'Sí' || car.hasDuplicateKeys === 'Si') &&
            (car.hasCricket === 'Sí' || car.hasCricket === 'Si') &&
            (car.hasWheelWrench === 'Sí' || car.hasWheelWrench === 'Si') &&
            (car.hasOfficialServices === 'Sí' || car.hasOfficialServices === 'Si')
        );
    };

    const countCompletedItems = (car) => {
        let count = 0;
        if (car.hasManuals === 'Sí' || car.hasManuals === 'Si') count++;
        if (car.hasDuplicateKeys === 'Sí' || car.hasDuplicateKeys === 'Si') count++;
        if (car.hasCricket === 'Sí' || car.hasCricket === 'Si') count++;
        if (car.hasWheelWrench === 'Sí' || car.hasWheelWrench === 'Si') count++;
        if (car.hasOfficialServices === 'Sí' || car.hasOfficialServices === 'Si') count++;
        return count;
    };

    const handleToggleField = async (carId, fieldKey, currentValue) => {
        // Ciclo: No -> Sí -> Parcial -> No
        let nextValue = 'Sí';
        if (currentValue === 'Sí' || currentValue === 'Si') {
            nextValue = 'No';
        } else if (currentValue === 'No') {
            nextValue = 'Sí';
        } else if (currentValue === 'Parcial') {
            nextValue = 'No';
        }

        // Actualización optimista
        setCars(prev => prev.map(c => c._id === carId ? { ...c, [fieldKey]: nextValue } : c));
        setSavingId(carId);

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const res = await fetch(`/api/admin/stock/checklist/${carId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ [fieldKey]: nextValue })
            });
            const data = await res.json();
            if (!data.ok) {
                // Revertir
                setCars(prev => prev.map(c => c._id === carId ? { ...c, [fieldKey]: currentValue } : c));
                toast.error(data.message || 'No se pudo guardar el cambio.');
            }
        } catch (err) {
            console.error('handleToggleField error:', err);
            setCars(prev => prev.map(c => c._id === carId ? { ...c, [fieldKey]: currentValue } : c));
            toast.error('Error de conexión al actualizar.');
        } finally {
            setSavingId(null);
        }
    };

    const handleSelectField = async (carId, fieldKey, nextValue) => {
        const car = cars.find(c => c._id === carId);
        const prevValue = car ? car[fieldKey] : 'No';
        if (prevValue === nextValue) return;

        setCars(prev => prev.map(c => c._id === carId ? { ...c, [fieldKey]: nextValue } : c));
        setSavingId(carId);

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const res = await fetch(`/api/admin/stock/checklist/${carId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ [fieldKey]: nextValue })
            });
            const data = await res.json();
            if (!data.ok) {
                setCars(prev => prev.map(c => c._id === carId ? { ...c, [fieldKey]: prevValue } : c));
                toast.error(data.message || 'No se pudo guardar el cambio.');
            }
        } catch (err) {
            console.error('handleSelectField error:', err);
            setCars(prev => prev.map(c => c._id === carId ? { ...c, [fieldKey]: prevValue } : c));
            toast.error('Error de conexión al actualizar.');
        } finally {
            setSavingId(null);
        }
    };

    // Filtrado
    const filteredCars = useMemo(() => {
        return cars.filter(car => {
            const term = searchTerm.trim().toLowerCase();
            if (term) {
                const text = `${car.brand || ''} ${car.name || ''} ${car.model || ''} ${car.version || ''} ${car.plateOrVin || ''} ${car.year || ''}`.toLowerCase();
                if (!text.includes(term)) return false;
            }

            const complete = isComplete(car);
            if (filterStatus === 'completos' && !complete) return false;
            if (filterStatus === 'incompletos' && complete) return false;

            return true;
        });
    }, [cars, searchTerm, filterStatus]);

    // Métricas
    const metrics = useMemo(() => {
        const total = cars.length;
        const completos = cars.filter(isComplete).length;
        const incompletos = total - completos;
        return { total, completos, incompletos };
    }, [cars]);

    return (
        <div className="space-y-6">
            {/* Header del módulo */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-crm-surface to-crm-surface-raised shadow-lg">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                            <Sparkles size={18} />
                        </span>
                        <h2 className="text-lg font-bold text-white tracking-wide">
                            Control de Equipamiento y Entrega de Stock
                        </h2>
                    </div>
                    <p className="text-xs text-crm-fg-muted mt-1">
                        Carga y verificación física de unidades: manuales, duplicado de llaves, cricket, llave de rueda y service al día.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchCars}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-crm-fg-muted bg-crm-surface-raised hover:text-white border border-crm-border rounded-xl transition-colors disabled:opacity-50"
                        title="Actualizar lista"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <CrmCard className="p-4 border border-crm-border/60 bg-crm-surface flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted block">Total Unidades en Stock</span>
                        <span className="text-2xl font-black text-white">{metrics.total}</span>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <CarIcon size={20} />
                    </div>
                </CrmCard>

                <CrmCard className="p-4 border border-emerald-500/20 bg-crm-surface flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">100% Equipadas (5/5)</span>
                        <span className="text-2xl font-black text-emerald-400">{metrics.completos}</span>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 size={20} />
                    </div>
                </CrmCard>

                <CrmCard className="p-4 border border-amber-500/20 bg-crm-surface flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">Con Faltantes / A Revisar</span>
                        <span className="text-2xl font-black text-amber-400">{metrics.incompletos}</span>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <AlertCircle size={20} />
                    </div>
                </CrmCard>
            </div>

            {/* Filtros y Buscador */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-2.5 text-crm-fg-muted" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar por marca, modelo o patente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-crm-surface border border-crm-border rounded-xl text-xs text-white placeholder-crm-fg-muted focus:outline-none focus:border-purple-500"
                    />
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={() => setFilterStatus('todos')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            filterStatus === 'todos'
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'bg-crm-surface text-crm-fg-muted hover:text-white border border-crm-border'
                        }`}
                    >
                        Todos ({metrics.total})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterStatus('incompletos')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            filterStatus === 'incompletos'
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'bg-crm-surface text-crm-fg-muted hover:text-white border border-crm-border'
                        }`}
                    >
                        Con Faltantes ({metrics.incompletos})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterStatus('completos')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            filterStatus === 'completos'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-crm-surface text-crm-fg-muted hover:text-white border border-crm-border'
                        }`}
                    >
                        Completos ({metrics.completos})
                    </button>
                </div>
            </div>

            {/* Listado de unidades */}
            {loading ? (
                <div className="p-12 text-center text-crm-fg-muted flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="animate-spin text-purple-400" size={24} />
                    <p className="text-sm">Cargando inventario de vehículos...</p>
                </div>
            ) : filteredCars.length === 0 ? (
                <div className="p-8 text-center text-crm-fg-muted bg-crm-surface border border-crm-border rounded-2xl">
                    <CarIcon size={32} className="mx-auto mb-2 opacity-40 text-purple-400" />
                    <p className="text-sm font-semibold text-white">No se encontraron vehículos</p>
                    <p className="text-xs text-crm-fg-muted mt-1">Probá cambiando el criterio de búsqueda o el filtro.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredCars.map((car) => {
                        const completeCount = countCompletedItems(car);
                        const isAllComplete = completeCount === 5;
                        const photoUrl = (Array.isArray(car.images) && car.images[0]) || car.coverImage || null;

                        return (
                            <div
                                key={car._id}
                                className={`p-4 rounded-xl border transition-all ${
                                    isAllComplete
                                        ? 'bg-crm-surface/80 border-emerald-500/25 hover:border-emerald-500/40'
                                        : 'bg-crm-surface border-crm-border hover:border-purple-500/40'
                                } shadow-sm`}
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    {/* Ficha básica del auto */}
                                    <div className="flex items-center gap-3.5 min-w-[280px]">
                                        <div className="h-14 w-20 rounded-lg overflow-hidden bg-crm-bg flex-shrink-0 border border-crm-border/70 flex items-center justify-center">
                                            {photoUrl ? (
                                                <img src={photoUrl} alt={car.brand} className="h-full w-full object-cover" />
                                            ) : (
                                                <CarIcon size={22} className="text-crm-fg-muted" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white text-sm truncate">
                                                    {car.brand} {car.name || car.model}
                                                </span>
                                                {car.year && (
                                                    <span className="text-xs text-crm-fg-muted">({car.year})</span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <span className="font-mono text-[11px] font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded">
                                                    {car.plateOrVin || 'S/D'}
                                                </span>
                                                {car.km !== undefined && (
                                                    <span className="text-[11px] text-crm-fg-muted">
                                                        {Number(car.km).toLocaleString('es-AR')} km
                                                    </span>
                                                )}
                                                {car.color && (
                                                    <span className="text-[11px] text-crm-fg-muted capitalize">
                                                        · {car.color}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Checklist de los 5 items */}
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 flex-grow">
                                        {ITEMS.map((item) => {
                                            const Icon = item.icon;
                                            const val = car[item.key] || 'No';
                                            const isYes = val === 'Sí' || val === 'Si';
                                            const isPartial = val === 'Parcial';

                                            return (
                                                <div
                                                    key={item.key}
                                                    className="p-2 rounded-lg bg-crm-bg/80 border border-crm-border flex flex-col justify-between gap-1.5"
                                                >
                                                    <div className="flex items-center justify-between gap-1">
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            <Icon size={12} className={isYes ? 'text-emerald-400' : isPartial ? 'text-amber-400' : 'text-crm-fg-muted'} />
                                                            <span className="text-[11px] font-semibold text-white truncate" title={item.desc}>
                                                                {item.label}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Botón selector tipo chip interactivo */}
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            disabled={savingId === car._id}
                                                            onClick={() => handleToggleField(car._id, item.key, val)}
                                                            className={`w-full py-1 px-1.5 rounded text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                                                                isYes
                                                                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
                                                                    : isPartial
                                                                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30'
                                                                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                                                            }`}
                                                            title={`Click para alternar: ${item.desc}`}
                                                        >
                                                            {isYes ? (
                                                                <>
                                                                    <Check size={11} className="stroke-[3]" />
                                                                    <span>Sí</span>
                                                                </>
                                                            ) : isPartial ? (
                                                                <>
                                                                    <AlertCircle size={11} />
                                                                    <span>Parcial</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <XCircle size={11} />
                                                                    <span>No</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Badge de progreso total (ej: 4/5) */}
                                    <div className="flex lg:flex-col items-center justify-between lg:justify-center flex-shrink-0 min-w-[70px] text-right">
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                                            isAllComplete
                                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                                : completeCount >= 3
                                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                        }`}>
                                            {completeCount} / 5
                                        </span>
                                        <span className="text-[10px] text-crm-fg-muted mt-0.5 hidden lg:block">
                                            {isAllComplete ? 'Completo' : 'Incompleto'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
