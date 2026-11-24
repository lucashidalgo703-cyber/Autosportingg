"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    Search, CheckCircle2, AlertCircle, RefreshCw, 
    Car as CarIcon, Key, BookOpen, Wrench, ShieldCheck, Check, Sparkles,
    X, CheckSquare, Square
} from 'lucide-react';
import toast from 'react-hot-toast';
import CrmCard from '../ui/CrmCard';
import CrmButton from '../ui/CrmButton';

const CHECKLIST_ITEMS = [
    { key: 'hasManuals', label: 'Manual del usuario', shortLabel: 'Manual', icon: BookOpen, desc: 'Manual del fabricante y garantía original' },
    { key: 'hasDuplicateKeys', label: 'Duplicado de llaves', shortLabel: 'Duplicado', icon: Key, desc: 'Segunda llave o copia original' },
    { key: 'hasCricket', label: 'Cricket', shortLabel: 'Cricket', icon: CarIcon, desc: 'Cricket / gato elevador de auxilio' },
    { key: 'hasWheelWrench', label: 'Llave de rueda', shortLabel: 'Llave de rueda', icon: Wrench, desc: 'Llave cruz o tubo para tuercas de rueda' },
    { key: 'hasOfficialServices', label: 'Service al día', shortLabel: 'Service al día', icon: ShieldCheck, desc: 'Historial de mantenimiento o libreta oficial al día' }
];

const isItemChecked = (val) => val === 'Sí' || val === 'Si' || val === true;

export default function StockChecklistPanel() {
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('todos'); // 'todos' | 'completos' | 'incompletos'
    const [savingId, setSavingId] = useState(null);

    // Modal para editar vehículo clickeado
    const [modalCar, setModalCar] = useState(null);
    const [modalForm, setModalForm] = useState({
        hasManuals: false,
        hasDuplicateKeys: false,
        hasCricket: false,
        hasWheelWrench: false,
        hasOfficialServices: false
    });
    const [modalSaving, setModalSaving] = useState(false);

    const getBaseUrl = () => {
        const API_URL = process.env.NEXT_PUBLIC_API_URL;
        return process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
    };

    const fetchCars = useCallback(async () => {
        setLoading(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const baseUrl = getBaseUrl();
            const res = await fetch(`${baseUrl}/api/admin/stock/checklist`, {
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
        return CHECKLIST_ITEMS.every(item => isItemChecked(car[item.key]));
    };

    const countCompleted = (car) => {
        return CHECKLIST_ITEMS.filter(item => isItemChecked(car[item.key])).length;
    };

    // Toggle rápido directo en la fila/tarjeta
    const handleQuickToggle = async (carId, fieldKey, e) => {
        if (e) e.stopPropagation();
        const car = cars.find(c => c._id === carId);
        if (!car) return;

        const currentChecked = isItemChecked(car[fieldKey]);
        const nextValue = currentChecked ? 'No' : 'Sí';

        // Optimista
        setCars(prev => prev.map(c => c._id === carId ? { ...c, [fieldKey]: nextValue } : c));
        setSavingId(carId);

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const baseUrl = getBaseUrl();
            const res = await fetch(`${baseUrl}/api/admin/stock/checklist/${carId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ [fieldKey]: nextValue })
            });
            const data = await res.json();
            if (!data.ok) {
                setCars(prev => prev.map(c => c._id === carId ? { ...c, [fieldKey]: car[fieldKey] } : c));
                toast.error(data.message || 'No se pudo guardar.');
            }
        } catch (err) {
            console.error('handleQuickToggle error:', err);
            setCars(prev => prev.map(c => c._id === carId ? { ...c, [fieldKey]: car[fieldKey] } : c));
            toast.error('Error de red al actualizar.');
        } finally {
            setSavingId(null);
        }
    };

    // Abrir modal al hacer click en el auto
    const handleOpenModal = (car) => {
        setModalCar(car);
        setModalForm({
            hasManuals: isItemChecked(car.hasManuals),
            hasDuplicateKeys: isItemChecked(car.hasDuplicateKeys),
            hasCricket: isItemChecked(car.hasCricket),
            hasWheelWrench: isItemChecked(car.hasWheelWrench),
            hasOfficialServices: isItemChecked(car.hasOfficialServices)
        });
    };

    const handleModalToggle = (fieldKey) => {
        setModalForm(prev => ({
            ...prev,
            [fieldKey]: !prev[fieldKey]
        }));
    };

    const handleSaveModal = async (e) => {
        e.preventDefault();
        if (!modalCar) return;
        setModalSaving(true);

        const payload = {
            hasManuals: modalForm.hasManuals ? 'Sí' : 'No',
            hasDuplicateKeys: modalForm.hasDuplicateKeys ? 'Sí' : 'No',
            hasCricket: modalForm.hasCricket ? 'Sí' : 'No',
            hasWheelWrench: modalForm.hasWheelWrench ? 'Sí' : 'No',
            hasOfficialServices: modalForm.hasOfficialServices ? 'Sí' : 'No'
        };

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const baseUrl = getBaseUrl();
            const res = await fetch(`${baseUrl}/api/admin/stock/checklist/${modalCar._id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.ok) {
                setCars(prev => prev.map(c => c._id === modalCar._id ? { ...c, ...payload } : c));
                toast.success(`Equipamiento guardado: ${modalCar.brand} ${modalCar.name || modalCar.model}`);
                setModalCar(null);
            } else {
                toast.error(data.message || 'Error al guardar el equipamiento.');
            }
        } catch (err) {
            console.error('handleSaveModal error:', err);
            toast.error('Error de conexión al guardar.');
        } finally {
            setModalSaving(false);
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
                            Control de Equipamiento de Unidades en Stock
                        </h2>
                    </div>
                    <p className="text-xs text-crm-fg-muted mt-1">
                        Hacé click en cualquier vehículo para abrir su ficha y tildar el equipamiento recibido (manual, duplicado, cricket, llave de rueda y service al día).
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchCars}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-crm-fg-muted bg-crm-surface-raised hover:text-white border border-crm-border rounded-xl transition-colors disabled:opacity-50"
                        title="Actualizar lista de vehículos"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Actualizar Stock
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <CrmCard className="p-4 border border-crm-border/60 bg-crm-surface flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted block">Vehículos en Stock</span>
                        <span className="text-2xl font-black text-white">{metrics.total}</span>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <CarIcon size={20} />
                    </div>
                </CrmCard>

                <CrmCard className="p-4 border border-emerald-500/20 bg-crm-surface flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">Equipamiento Completo (5/5)</span>
                        <span className="text-2xl font-black text-emerald-400">{metrics.completos}</span>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 size={20} />
                    </div>
                </CrmCard>

                <CrmCard className="p-4 border border-amber-500/20 bg-crm-surface flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">Con Faltantes / A Tildar</span>
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

            {/* Listado de unidades en Stock */}
            {loading ? (
                <div className="p-12 text-center text-crm-fg-muted flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="animate-spin text-purple-400" size={24} />
                    <p className="text-sm">Cargando vehículos de stock...</p>
                </div>
            ) : filteredCars.length === 0 ? (
                <div className="p-8 text-center text-crm-fg-muted bg-crm-surface border border-crm-border rounded-2xl">
                    <CarIcon size={32} className="mx-auto mb-2 opacity-40 text-purple-400" />
                    <p className="text-sm font-semibold text-white">No hay vehículos para mostrar</p>
                    <p className="text-xs text-crm-fg-muted mt-1">Verificá los filtros de búsqueda o actualizá el inventario.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredCars.map((car) => {
                        const completeCount = countCompleted(car);
                        const isAllComplete = completeCount === 5;
                        const photoUrl = (Array.isArray(car.images) && car.images[0]) || car.coverImage || null;

                        return (
                            <div
                                key={car._id}
                                onClick={() => handleOpenModal(car)}
                                className={`group p-4 rounded-xl border transition-all cursor-pointer ${
                                    isAllComplete
                                        ? 'bg-crm-surface/85 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-crm-surface'
                                        : 'bg-crm-surface border-crm-border hover:border-purple-500/60 hover:bg-crm-surface-raised'
                                } shadow-sm`}
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    {/* Ficha básica del auto (solo stock, sin precios ni números de toma) */}
                                    <div className="flex items-center gap-3.5 min-w-[260px]">
                                        <div className="h-14 w-20 rounded-lg overflow-hidden bg-crm-bg flex-shrink-0 border border-crm-border/70 flex items-center justify-center group-hover:border-purple-500/40 transition-colors">
                                            {photoUrl ? (
                                                <img src={photoUrl} alt={car.brand} className="h-full w-full object-cover" />
                                            ) : (
                                                <CarIcon size={22} className="text-crm-fg-muted" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white text-sm truncate group-hover:text-purple-300 transition-colors">
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
                                                {car.km !== undefined && Number(car.km) > 0 && (
                                                    <span className="text-[11px] text-crm-fg-muted">
                                                        {Number(car.km).toLocaleString('es-AR')} km
                                                    </span>
                                                )}
                                                {car.color && (
                                                    <span className="text-[11px] text-crm-fg-muted capitalize">
                                                        · {car.color}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                                    {car.status || 'Disponible'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Checklist interactivo con tildes (Click para tildar directo o click en auto para modal) */}
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 flex-grow">
                                        {CHECKLIST_ITEMS.map((item) => {
                                            const Icon = item.icon;
                                            const checked = isItemChecked(car[item.key]);

                                            return (
                                                <button
                                                    key={item.key}
                                                    type="button"
                                                    disabled={savingId === car._id}
                                                    onClick={(e) => handleQuickToggle(car._id, item.key, e)}
                                                    className={`p-2 rounded-lg border text-left flex items-center justify-between gap-1.5 transition-all ${
                                                        checked
                                                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                                                            : 'bg-crm-bg/70 border-crm-border text-crm-fg-muted hover:border-crm-border-strong hover:text-white'
                                                    }`}
                                                    title={`${item.desc} (Click para ${checked ? 'destildar' : 'tildar'})`}
                                                >
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <Icon size={13} className={checked ? 'text-emerald-400' : 'text-crm-fg-muted'} />
                                                        <span className="text-[11px] font-semibold truncate">
                                                            {item.shortLabel}
                                                        </span>
                                                    </div>
                                                    <div className="flex-shrink-0">
                                                        {checked ? (
                                                            <CheckSquare size={14} className="text-emerald-400 stroke-[2.5]" />
                                                        ) : (
                                                            <Square size={14} className="text-crm-fg-muted/60" />
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Progreso total y botón para abrir modal */}
                                    <div className="flex items-center justify-between lg:justify-end gap-3 flex-shrink-0">
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                                            isAllComplete
                                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                                : completeCount >= 3
                                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                        }`}>
                                            {completeCount} / 5
                                        </span>
                                        <span className="text-[11px] font-medium text-purple-400 group-hover:text-purple-300 underline underline-offset-2">
                                            Cargar »
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal para tildar equipamiento al hacer click en el vehículo */}
            {modalCar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-crm-surface border border-crm-border rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative">
                        {/* Header del modal */}
                        <div className="flex items-start justify-between gap-3 border-b border-crm-border pb-4">
                            <div>
                                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block">
                                    Cargar Equipamiento de Unidad
                                </span>
                                <h3 className="text-lg font-bold text-white mt-0.5">
                                    {modalCar.brand} {modalCar.name || modalCar.model} {modalCar.year ? `(${modalCar.year})` : ''}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="font-mono text-xs font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded">
                                        {modalCar.plateOrVin || 'S/D'}
                                    </span>
                                    {modalCar.km !== undefined && Number(modalCar.km) > 0 && (
                                        <span className="text-xs text-crm-fg-muted">
                                            · {Number(modalCar.km).toLocaleString('es-AR')} km
                                        </span>
                                    )}
                                    {modalCar.color && (
                                        <span className="text-xs text-crm-fg-muted capitalize">
                                            · {modalCar.color}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalCar(null)}
                                className="text-crm-fg-muted hover:text-white p-1 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Formulario con los 5 checkboxes grandes */}
                        <form onSubmit={handleSaveModal} className="space-y-3">
                            <p className="text-xs text-crm-fg-muted">
                                Marcá con un tilde cada elemento con el que cuenta esta unidad:
                            </p>

                            <div className="space-y-2">
                                {CHECKLIST_ITEMS.map((item) => {
                                    const Icon = item.icon;
                                    const checked = modalForm[item.key];

                                    return (
                                        <div
                                            key={item.key}
                                            onClick={() => handleModalToggle(item.key)}
                                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                                                checked
                                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
                                                    : 'bg-crm-bg/80 border-crm-border text-crm-fg-muted hover:border-crm-border-strong hover:text-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                                                    checked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-crm-surface text-crm-fg-muted'
                                                }`}>
                                                    <Icon size={16} />
                                                </div>
                                                <div>
                                                    <span className={`text-sm font-bold block ${checked ? 'text-white' : 'text-crm-fg'}`}>
                                                        {item.label}
                                                    </span>
                                                    <span className="text-[11px] text-crm-fg-muted block">
                                                        {item.desc}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                                    checked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-crm-surface text-crm-fg-muted'
                                                }`}>
                                                    {checked ? 'Cuenta con él' : 'No tiene'}
                                                </span>
                                                {checked ? (
                                                    <CheckSquare size={20} className="text-emerald-400 stroke-[2.5]" />
                                                ) : (
                                                    <Square size={20} className="text-crm-fg-muted/60" />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Botones de acción del modal */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-crm-border">
                                <CrmButton
                                    type="button"
                                    variant="ghost"
                                    disabled={modalSaving}
                                    onClick={() => setModalCar(null)}
                                >
                                    Cancelar
                                </CrmButton>
                                <CrmButton
                                    type="submit"
                                    disabled={modalSaving}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white"
                                >
                                    {modalSaving ? 'Guardando…' : 'Guardar Equipamiento'}
                                </CrmButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
