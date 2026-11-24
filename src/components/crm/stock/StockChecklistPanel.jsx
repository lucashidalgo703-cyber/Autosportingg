"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
    Search, CheckCircle2, AlertCircle, RefreshCw, 
    Car as CarIcon, Key, BookOpen, Wrench, ShieldCheck,
    X, CheckSquare, Square, Camera, Upload, Trash2, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import CrmCard from '../ui/CrmCard';
import CrmButton from '../ui/CrmButton';

const CHECKLIST_ITEMS = [
    { key: 'hasManuals', photoKey: 'manuals', label: 'Manual del usuario', shortLabel: 'Manual', icon: BookOpen, desc: 'Manual del fabricante y garantía original' },
    { key: 'hasDuplicateKeys', photoKey: 'duplicateKeys', label: 'Duplicado de llaves', shortLabel: 'Duplicado', icon: Key, desc: 'Segunda llave o copia original' },
    { key: 'hasCricket', photoKey: 'cricket', label: 'Cricket', shortLabel: 'Cricket', icon: CarIcon, desc: 'Cricket / gato elevador de auxilio' },
    { key: 'hasWheelWrench', photoKey: 'wheelWrench', label: 'Llave de rueda', shortLabel: 'Llave de rueda', icon: Wrench, desc: 'Llave cruz o tubo para tuercas' },
    { key: 'hasOfficialServices', photoKey: 'officialServices', label: 'Service al día', shortLabel: 'Service al día', icon: ShieldCheck, desc: 'Historial de mantenimiento o libreta oficial al día' }
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
        hasOfficialServices: false,
        checklistPhotos: {
            manuals: '',
            duplicateKeys: '',
            cricket: '',
            wheelWrench: '',
            officialServices: ''
        }
    });
    const [modalSaving, setModalSaving] = useState(false);
    const [uploadingItemKey, setUploadingItemKey] = useState(null);

    // Visor de foto en pantalla completa
    const [lightboxPhoto, setLightboxPhoto] = useState(null);

    const fileInputRefs = useRef({});

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

    const countPhotos = (car) => {
        const photos = car.checklistPhotos || {};
        return CHECKLIST_ITEMS.filter(item => Boolean(photos[item.photoKey])).length;
    };

    // Toggle rápido directo en la fila/tarjeta
    const handleQuickToggle = async (carId, fieldKey, e) => {
        if (e) e.stopPropagation();
        const car = cars.find(c => c._id === carId);
        if (!car) return;

        const currentChecked = isItemChecked(car[fieldKey]);
        const nextValue = currentChecked ? 'No' : 'Sí';

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
            hasOfficialServices: isItemChecked(car.hasOfficialServices),
            checklistPhotos: {
                manuals: car.checklistPhotos?.manuals || '',
                duplicateKeys: car.checklistPhotos?.duplicateKeys || '',
                cricket: car.checklistPhotos?.cricket || '',
                wheelWrench: car.checklistPhotos?.wheelWrench || '',
                officialServices: car.checklistPhotos?.officialServices || ''
            }
        });
    };

    const handleModalToggle = (fieldKey) => {
        setModalForm(prev => ({
            ...prev,
            [fieldKey]: !prev[fieldKey]
        }));
    };

    // Subir foto para un ítem específico del checklist
    const handlePhotoUpload = async (photoKey, file) => {
        if (!file) return;
        setUploadingItemKey(photoKey);
        const toastId = toast.loading('Subiendo foto del equipamiento...');

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const baseUrl = getBaseUrl();

            const formData = new FormData();
            formData.append('files', file);

            const res = await fetch(`${baseUrl}/api/admin/upload`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: formData
            });

            const data = await res.json();
            if (!res.ok || !data.uploadedFiles || !data.uploadedFiles[0]?.url) {
                throw new Error(data.message || data.error || 'Error al subir la imagen');
            }

            const photoUrl = data.uploadedFiles[0].url;

            // Actualizar estado del formulario
            setModalForm(prev => {
                const nextPhotos = { ...(prev.checklistPhotos || {}), [photoKey]: photoUrl };
                const itemDef = CHECKLIST_ITEMS.find(it => it.photoKey === photoKey);
                return {
                    ...prev,
                    ...(itemDef ? { [itemDef.key]: true } : {}),
                    checklistPhotos: nextPhotos
                };
            });

            toast.success('Foto adjuntada correctamente', { id: toastId });
        } catch (err) {
            console.error('handlePhotoUpload error:', err);
            toast.error(err.message || 'Error al subir la imagen.', { id: toastId });
        } finally {
            setUploadingItemKey(null);
        }
    };

    const handleRemovePhoto = (photoKey, e) => {
        if (e) e.stopPropagation();
        setModalForm(prev => ({
            ...prev,
            checklistPhotos: {
                ...(prev.checklistPhotos || {}),
                [photoKey]: ''
            }
        }));
        toast.success('Foto eliminada');
    };

    const handleSaveModal = async (e) => {
        if (e) e.preventDefault();
        if (!modalCar) return;
        setModalSaving(true);

        const payload = {
            hasManuals: modalForm.hasManuals ? 'Sí' : 'No',
            hasDuplicateKeys: modalForm.hasDuplicateKeys ? 'Sí' : 'No',
            hasCricket: modalForm.hasCricket ? 'Sí' : 'No',
            hasWheelWrench: modalForm.hasWheelWrench ? 'Sí' : 'No',
            hasOfficialServices: modalForm.hasOfficialServices ? 'Sí' : 'No',
            checklistPhotos: modalForm.checklistPhotos || {}
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

    // Filtrado de autos
    const filteredCars = useMemo(() => {
        return cars.filter(car => {
            const term = searchTerm.trim().toLowerCase();
            if (term) {
                const text = `${car.brand || ''} ${car.name || ''} ${car.model || ''} ${car.version || ''} ${car.plateOrVin || ''} ${car.year || ''} ${car.color || ''}`.toLowerCase();
                if (!text.includes(term)) return false;
            }

            const complete = isComplete(car);
            if (filterStatus === 'completos' && !complete) return false;
            if (filterStatus === 'incompletos' && complete) return false;

            return true;
        });
    }, [cars, searchTerm, filterStatus]);

    // Métricas para los KPIs
    const metrics = useMemo(() => {
        const total = cars.length;
        const completos = cars.filter(isComplete).length;
        const incompletos = total - completos;
        const conFotos = cars.filter(c => countPhotos(c) > 0).length;
        return { total, completos, incompletos, conFotos };
    }, [cars]);

    return (
        <div className="space-y-6">
            {/* Header del módulo con diseño limpio AutoSporting */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-800 bg-[#121215] shadow-lg">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600/10 text-red-500 border border-red-500/20">
                            <CheckSquare size={19} />
                        </span>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                                Control de Equipamiento de Stock
                            </h2>
                            <p className="text-xs text-zinc-400 mt-0.5">
                                Registrá y adjuntá fotos de manuales, llaves duplicadas, cricket, llave de rueda y services de cada unidad.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchCars}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-300 bg-zinc-900 hover:text-white border border-zinc-700/80 rounded-xl transition-colors disabled:opacity-50"
                        title="Actualizar lista de vehículos"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin text-red-500' : ''} />
                        Actualizar Stock
                    </button>
                </div>
            </div>

            {/* KPIs visuales estilo CRM Sote */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <CrmCard className="p-4 border border-zinc-800 bg-[#121215] flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">Unidades disponibles</span>
                        <span className="text-2xl font-black text-white">{metrics.total}</span>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
                        <CarIcon size={20} />
                    </div>
                </CrmCard>

                <CrmCard className="p-4 border border-emerald-500/20 bg-[#121215] flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">Equipamiento Completo</span>
                        <span className="text-2xl font-black text-emerald-400">{metrics.completos}</span>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 size={20} />
                    </div>
                </CrmCard>

                <CrmCard className="p-4 border border-amber-500/20 bg-[#121215] flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">Con Faltantes</span>
                        <span className="text-2xl font-black text-amber-400">{metrics.incompletos}</span>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <AlertCircle size={20} />
                    </div>
                </CrmCard>

                <CrmCard className="p-4 border border-blue-500/20 bg-[#121215] flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 block">Con Fotos Adjuntas</span>
                        <span className="text-2xl font-black text-blue-400">{metrics.conFotos}</span>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <Camera size={20} />
                    </div>
                </CrmCard>
            </div>

            {/* Filtros y Buscador */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-2.5 text-zinc-400" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar por marca, modelo, versión o patente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[#121215] border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                    />
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={() => setFilterStatus('todos')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            filterStatus === 'todos'
                                ? 'bg-zinc-800 text-white border border-zinc-600 shadow-sm'
                                : 'bg-[#121215] text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                    >
                        Todos ({metrics.total})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterStatus('incompletos')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            filterStatus === 'incompletos'
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'bg-[#121215] text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                    >
                        Con Faltantes ({metrics.incompletos})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterStatus('completos')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            filterStatus === 'completos'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-[#121215] text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                    >
                        Completos ({metrics.completos})
                    </button>
                </div>
            </div>

            {/* Listado de unidades en Stock */}
            {loading ? (
                <div className="p-16 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="animate-spin text-red-500" size={26} />
                    <p className="text-sm">Cargando inventario de stock...</p>
                </div>
            ) : filteredCars.length === 0 ? (
                <div className="p-10 text-center text-zinc-400 bg-[#121215] border border-zinc-800 rounded-2xl">
                    <CarIcon size={36} className="mx-auto mb-2 opacity-30 text-zinc-400" />
                    <p className="text-sm font-semibold text-white">No hay vehículos disponibles para mostrar</p>
                    <p className="text-xs text-zinc-500 mt-1">Verificá los filtros de búsqueda o actualizá el listado.</p>
                </div>
            ) : (
                <div className="space-y-3.5">
                    {filteredCars.map((car) => {
                        const completeCount = countCompleted(car);
                        const isAllComplete = completeCount === 5;
                        const photoUrl = (Array.isArray(car.images) && car.images[0]) || car.coverImage || null;
                        const photosCount = countPhotos(car);

                        return (
                            <div
                                key={car._id}
                                onClick={() => handleOpenModal(car)}
                                className={`group p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                                    isAllComplete
                                        ? 'bg-[#121215] border-emerald-500/30 hover:border-emerald-500/60 shadow-sm'
                                        : 'bg-[#121215] border-zinc-800 hover:border-zinc-700 shadow-sm'
                                }`}
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
                                    {/* Ficha física del auto */}
                                    <div className="flex items-center gap-4 min-w-[280px]">
                                        <div className="h-16 w-24 rounded-xl overflow-hidden bg-black/40 flex-shrink-0 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-700 transition-colors">
                                            {photoUrl ? (
                                                <img src={photoUrl} alt={car.brand} className="h-full w-full object-cover" />
                                            ) : (
                                                <CarIcon size={24} className="text-zinc-600" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white text-base truncate group-hover:text-red-400 transition-colors">
                                                    {car.brand} {car.name || car.model}
                                                </span>
                                                {car.year && (
                                                    <span className="text-xs text-zinc-400">({car.year})</span>
                                                )}
                                            </div>
                                            {car.version && (
                                                <p className="text-xs text-zinc-400 truncate mt-0.5">
                                                    {car.version}
                                                </p>
                                            )}
                                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                <span className="font-mono text-xs font-bold text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700/80">
                                                    {car.plateOrVin || 'S/D'}
                                                </span>
                                                {car.km !== undefined && Number(car.km) > 0 && (
                                                    <span className="text-xs text-zinc-400">
                                                        {Number(car.km).toLocaleString('es-AR')} km
                                                    </span>
                                                )}
                                                {car.color && (
                                                    <span className="text-xs text-zinc-400 capitalize">
                                                        · {car.color}
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                                                    {car.status || 'Disponible'}
                                                </span>
                                                {photosCount > 0 && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded" title={`${photosCount} foto(s) de comprobante adjunta(s)`}>
                                                        <Camera size={11} /> {photosCount} fotos
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 5 Chips de equipamiento con indicador de foto */}
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 flex-grow">
                                        {CHECKLIST_ITEMS.map((item) => {
                                            const Icon = item.icon;
                                            const checked = isItemChecked(car[item.key]);
                                            const hasPhoto = Boolean(car.checklistPhotos?.[item.photoKey]);

                                            return (
                                                <button
                                                    key={item.key}
                                                    type="button"
                                                    disabled={savingId === car._id}
                                                    onClick={(e) => handleQuickToggle(car._id, item.key, e)}
                                                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-1.5 transition-all ${
                                                        checked
                                                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                                                            : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                                                    }`}
                                                    title={`${item.desc} (Click para ${checked ? 'destildar' : 'tildar'})`}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Icon size={14} className={checked ? 'text-emerald-400' : 'text-zinc-500'} />
                                                        <span className="text-xs font-semibold truncate">
                                                            {item.shortLabel}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        {hasPhoto && (
                                                            <span title="Comprobante con foto adjunta" className="text-blue-400">
                                                                <Camera size={12} />
                                                            </span>
                                                        )}
                                                        {checked ? (
                                                            <CheckSquare size={15} className="text-emerald-400 stroke-[2.5]" />
                                                        ) : (
                                                            <Square size={15} className="text-zinc-600" />
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Progreso y botón de abrir modal */}
                                    <div className="flex items-center justify-between lg:justify-end gap-3 flex-shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-zinc-800">
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                                            isAllComplete
                                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                                : completeCount >= 3
                                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                        }`}>
                                            {completeCount} / 5
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-300 group-hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 rounded-xl transition-colors">
                                            <Camera size={13} className="text-red-500" />
                                            Cargar Fotos »
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal para tildar equipamiento y adjuntar fotos */}
            {modalCar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-[#121215] border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden">
                        {/* Header del modal */}
                        <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-zinc-800 bg-zinc-900/60 shrink-0">
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className="h-12 w-16 rounded-lg overflow-hidden bg-black/50 border border-zinc-800 flex-shrink-0">
                                    {modalCar.images?.[0] || modalCar.coverImage ? (
                                        <img src={modalCar.images?.[0] || modalCar.coverImage} alt={modalCar.brand} className="h-full w-full object-cover" />
                                    ) : (
                                        <CarIcon size={20} className="m-auto text-zinc-500" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider block">
                                        Ficha de Equipamiento y Comprobantes
                                    </span>
                                    <h3 className="text-base sm:text-lg font-bold text-white truncate">
                                        {modalCar.brand} {modalCar.name || modalCar.model} {modalCar.year ? `(${modalCar.year})` : ''}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="font-mono text-xs font-bold text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700/60">
                                            {modalCar.plateOrVin || 'S/D'}
                                        </span>
                                        {modalCar.km !== undefined && Number(modalCar.km) > 0 && (
                                            <span className="text-xs text-zinc-400">
                                                · {Number(modalCar.km).toLocaleString('es-AR')} km
                                            </span>
                                        )}
                                        {modalCar.color && (
                                            <span className="text-xs text-zinc-400 capitalize">
                                                · {modalCar.color}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalCar(null)}
                                className="text-zinc-400 hover:text-white p-1.5 rounded-lg transition-colors hover:bg-zinc-800"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Cuerpo del modal scrolleable */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-4">
                            <p className="text-xs text-zinc-400">
                                Tildá cada elemento con el que cuenta el auto y adjuntá una foto como comprobante de cada uno:
                            </p>

                            <div className="space-y-3.5">
                                {CHECKLIST_ITEMS.map((item) => {
                                    const Icon = item.icon;
                                    const checked = modalForm[item.key];
                                    const photoUrl = modalForm.checklistPhotos?.[item.photoKey];
                                    const isUploading = uploadingItemKey === item.photoKey;

                                    return (
                                        <div
                                            key={item.key}
                                            className={`p-4 rounded-xl border transition-all ${
                                                checked
                                                    ? 'bg-zinc-900/90 border-emerald-500/30'
                                                    : 'bg-zinc-900/40 border-zinc-800'
                                            }`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                {/* Identificación y toggle del ítem */}
                                                <div 
                                                    onClick={() => handleModalToggle(item.key)}
                                                    className="flex items-center gap-3.5 cursor-pointer flex-grow"
                                                >
                                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                                        checked ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-500'
                                                    }`}>
                                                        <Icon size={18} />
                                                    </div>
                                                    <div>
                                                        <span className={`text-sm font-bold block ${checked ? 'text-white' : 'text-zinc-300'}`}>
                                                            {item.label}
                                                        </span>
                                                        <span className="text-[11px] text-zinc-500 block">
                                                            {item.desc}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Botón de toggle Cuenta con él / No tiene */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleModalToggle(item.key)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all self-start sm:self-center ${
                                                        checked
                                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700/80 hover:text-white'
                                                    }`}
                                                >
                                                    {checked ? (
                                                        <>
                                                            <CheckSquare size={16} className="text-emerald-400 stroke-[2.5]" />
                                                            <span>Cuenta con él</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Square size={16} className="text-zinc-500" />
                                                            <span>No tiene</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            {/* Sección de Foto / Comprobante adjunto */}
                                            <div className="mt-3.5 pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                                    <Camera size={14} className="text-zinc-500" />
                                                    <span className="font-semibold text-[11px] uppercase tracking-wider text-zinc-400">
                                                        Foto comprobante:
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {/* Input oculto para subir archivo/foto */}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        capture="environment"
                                                        ref={el => fileInputRefs.current[item.photoKey] = el}
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handlePhotoUpload(item.photoKey, file);
                                                        }}
                                                        className="hidden"
                                                    />

                                                    {photoUrl ? (
                                                        /* Ya tiene foto cargada */
                                                        <div className="flex items-center gap-2 bg-black/40 border border-zinc-800 p-1.5 rounded-xl">
                                                            <div 
                                                                onClick={() => setLightboxPhoto({ url: photoUrl, title: `${item.label} - ${modalCar.brand} ${modalCar.name || modalCar.model}` })}
                                                                className="h-10 w-14 rounded-lg overflow-hidden border border-zinc-700 relative group/thumb cursor-pointer shrink-0"
                                                                title="Click para ver en tamaño completo"
                                                            >
                                                                <img src={photoUrl} alt={item.label} className="h-full w-full object-cover" />
                                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity text-white">
                                                                    <Eye size={14} />
                                                                </div>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => setLightboxPhoto({ url: photoUrl, title: `${item.label} - ${modalCar.brand} ${modalCar.name || modalCar.model}` })}
                                                                className="px-2 py-1 text-[11px] font-semibold text-zinc-300 hover:text-white transition-colors"
                                                            >
                                                                Ver foto
                                                            </button>

                                                            <button
                                                                type="button"
                                                                disabled={isUploading}
                                                                onClick={() => fileInputRefs.current[item.photoKey]?.click()}
                                                                className="px-2 py-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                                                            >
                                                                Cambiar
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleRemovePhoto(item.photoKey, e)}
                                                                className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                                                                title="Eliminar foto"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        /* No tiene foto cargada */
                                                        <button
                                                            type="button"
                                                            disabled={isUploading}
                                                            onClick={() => fileInputRefs.current[item.photoKey]?.click()}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 hover:text-white border border-zinc-700 transition-colors disabled:opacity-50"
                                                        >
                                                            {isUploading ? (
                                                                <>
                                                                    <RefreshCw size={13} className="animate-spin text-red-500" />
                                                                    <span>Subiendo…</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Upload size={13} className="text-zinc-400" />
                                                                    <span>Adjuntar foto</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer del modal con botones de acción */}
                        <div className="flex items-center justify-between gap-3 p-5 sm:p-6 border-t border-zinc-800 bg-zinc-900/60 shrink-0">
                            <span className="text-xs text-zinc-400">
                                {CHECKLIST_ITEMS.filter(it => modalForm[it.key]).length} de 5 elementos completos
                            </span>
                            <div className="flex items-center gap-3">
                                <CrmButton
                                    type="button"
                                    variant="ghost"
                                    disabled={modalSaving}
                                    onClick={() => setModalCar(null)}
                                >
                                    Cancelar
                                </CrmButton>
                                <CrmButton
                                    type="button"
                                    disabled={modalSaving}
                                    onClick={handleSaveModal}
                                    className="bg-red-600 hover:bg-red-500 text-white font-bold px-5"
                                >
                                    {modalSaving ? 'Guardando…' : 'Guardar Equipamiento y Fotos'}
                                </CrmButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox para ver foto en pantalla completa */}
            {lightboxPhoto && (
                <div 
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn"
                    onClick={() => setLightboxPhoto(null)}
                >
                    <div 
                        className="relative max-w-4xl max-h-[90vh] flex flex-col items-center bg-[#121215] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-full flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/80">
                            <span className="text-sm font-bold text-white truncate">
                                {lightboxPhoto.title}
                            </span>
                            <button
                                type="button"
                                onClick={() => setLightboxPhoto(null)}
                                className="text-zinc-400 hover:text-white p-1 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-2 overflow-auto max-h-[calc(90vh-60px)] flex items-center justify-center">
                            <img 
                                src={lightboxPhoto.url} 
                                alt={lightboxPhoto.title} 
                                className="max-h-[78vh] w-auto object-contain rounded-lg shadow-md"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
