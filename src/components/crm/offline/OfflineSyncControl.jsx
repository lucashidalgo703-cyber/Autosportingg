"use client";
import React, { useState, useEffect, useCallback } from 'react';
import {
    Wifi,
    WifiOff,
    RefreshCw,
    Download,
    CheckCircle2,
    AlertTriangle,
    Trash2,
    X,
    FileText,
    UserPlus,
    Wrench,
    DollarSign,
    Clock,
    ShieldCheck,
    Car,
    Users
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
    prepareDeviceForOffline,
    getOfflineSnapshot,
    enqueueOfflineOperation,
    syncOfflineOutbox,
    clearOfflineData
} from '../../../services/offlineSyncService';
import toast from 'react-hot-toast';

export default function OfflineSyncControl() {
    const { user } = useAuth();
    const userId = user?.id || user?._id || user?.username;

    const [isOnline, setIsOnline] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState('resumen'); // 'resumen' | 'cargar' | 'cola' | 'explorar'
    const [includePhotos, setIncludePhotos] = useState(true);
    const [isPreparing, setIsPreparing] = useState(false);
    const [prepareProgress, setPrepareProgress] = useState({ percent: 0, label: '' });
    const [isSyncing, setIsSyncing] = useState(false);
    const [snapshot, setSnapshot] = useState(null);

    // Formulario rápido para encolar operaciones sin conexión
    const [opType, setOpType] = useState('observation');
    const [selectedVehicleId, setSelectedVehicleId] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [noteText, setNoteText] = useState('');
    const [valuationAmount, setValuationAmount] = useState('');
    const [clientFullName, setClientFullName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [expenseConcept, setExpenseConcept] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseCurrency, setExpenseCurrency] = useState('ARS');

    const refreshLocalSnapshot = useCallback(() => {
        if (!userId) return;
        const data = getOfflineSnapshot(userId);
        setSnapshot(data);
    }, [userId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setIsOnline(navigator.onLine);

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
        }

        const handleOnline = () => {
            setIsOnline(true);
            toast.success('Conexión restablecida. Podés sincronizar los cambios pendientes.');
        };
        const handleOffline = () => {
            setIsOnline(false);
            toast('Modo sin conexión activo. Los cambios se guardarán en la cola del dispositivo.', { icon: '📡' });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        refreshLocalSnapshot();
    }, [refreshLocalSnapshot, showModal]);

    if (!userId) return null;

    const pendingOutboxCount = snapshot?.outbox?.length || 0;
    const conflictsCount = snapshot?.conflicts?.length || 0;
    const pendingConfirmationsCount = snapshot?.pendingConfirmations?.length || 0;

    const handlePrepareDevice = async () => {
        if (!isOnline) {
            toast.error('Necesitás conexión a internet para preparar el dispositivo.');
            return;
        }
        setIsPreparing(true);
        setPrepareProgress({ percent: 10, label: 'Iniciando descarga segura…' });
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            await prepareDeviceForOffline({
                userId,
                token,
                includePhotos,
                onProgress: (prog) => setPrepareProgress(prog)
            });
            refreshLocalSnapshot();
            toast.success('Dispositivo preparado para trabajar sin conexión.');
        } catch (err) {
            toast.error(err.message || 'No se pudo preparar el dispositivo.');
        } finally {
            setIsPreparing(false);
        }
    };

    const handleSyncNow = async () => {
        if (!isOnline) {
            toast.error('Todavía estás sin conexión. La cola se enviará al recuperar señal.');
            return;
        }
        setIsSyncing(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const res = await syncOfflineOutbox({ userId, token });
            refreshLocalSnapshot();
            if (res.summary?.conflictCount > 0) {
                toast.error(`Sincronización con ${res.summary.conflictCount} conflicto(s) detectado(s). Revisá la pestaña Cola.`);
            } else if (res.summary?.pendingConfirmationCount > 0) {
                toast.success(`Sincronizado: ${res.summary.appliedCount} aplicados y ${res.summary.pendingConfirmationCount} borrador(es) pendientes de confirmación.`);
            } else {
                toast.success('Cola offline sincronizada correctamente.');
            }
        } catch (err) {
            toast.error(err.message || 'Error al sincronizar cambios.');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleEnqueueForm = (e) => {
        e.preventDefault();
        try {
            if (opType === 'observation') {
                if (!selectedVehicleId && !selectedClientId) {
                    toast.error('Seleccioná un vehículo o un cliente.');
                    return;
                }
                if (!noteText.trim()) {
                    toast.error('Escribí la observación.');
                    return;
                }
                const targetCar = snapshot?.data?.vehicles?.find(v => String(v._id) === String(selectedVehicleId));
                enqueueOfflineOperation(userId, {
                    operationType: 'observation',
                    entityType: selectedVehicleId ? 'Car' : 'Client',
                    entityId: selectedVehicleId || selectedClientId,
                    expectedUpdatedAt: targetCar?.updatedAt || null,
                    payload: {
                        vehicleId: selectedVehicleId || null,
                        clientId: selectedClientId || null,
                        note: noteText.trim()
                    }
                });
                setNoteText('');
            } else if (opType === 'appraisal') {
                if (!noteText.trim() && !valuationAmount) {
                    toast.error('Completá la valuación o las notas del peritaje.');
                    return;
                }
                const targetCar = snapshot?.data?.vehicles?.find(v => String(v._id) === String(selectedVehicleId));
                enqueueOfflineOperation(userId, {
                    operationType: 'appraisal',
                    entityType: selectedVehicleId ? 'Car' : 'AppraisalRecord',
                    entityId: selectedVehicleId || null,
                    expectedUpdatedAt: targetCar?.updatedAt || null,
                    payload: {
                        vehicleId: selectedVehicleId || null,
                        valuation: Number(valuationAmount || 0),
                        currency: expenseCurrency,
                        conditionNotes: noteText.trim()
                    }
                });
                setValuationAmount('');
                setNoteText('');
            } else if (opType === 'client_draft') {
                if (!clientFullName.trim()) {
                    toast.error('El nombre completo del cliente es obligatorio.');
                    return;
                }
                enqueueOfflineOperation(userId, {
                    operationType: 'client_draft',
                    entityType: 'Client',
                    payload: {
                        fullName: clientFullName.trim(),
                        phone: clientPhone.trim(),
                        notes: noteText.trim()
                    }
                });
                setClientFullName('');
                setClientPhone('');
                setNoteText('');
            } else if (opType === 'expense') {
                if (!expenseConcept.trim() || Number(expenseAmount) <= 0) {
                    toast.error('Indicá concepto e importe mayor a cero.');
                    return;
                }
                enqueueOfflineOperation(userId, {
                    operationType: 'expense',
                    entityType: selectedVehicleId ? 'Car' : 'Transaction',
                    entityId: selectedVehicleId || null,
                    payload: {
                        vehicleId: selectedVehicleId || null,
                        concept: expenseConcept.trim(),
                        amount: Number(expenseAmount),
                        currency: expenseCurrency,
                        notes: noteText.trim()
                    }
                });
                setExpenseConcept('');
                setExpenseAmount('');
                setNoteText('');
            }

            refreshLocalSnapshot();
            toast.success('Guardado en la cola offline del dispositivo.');
            setActiveTab('cola');
        } catch (err) {
            toast.error(err.message || 'No se pudo guardar en la cola.');
        }
    };

    const handleClearOffline = () => {
        clearOfflineData(userId);
        refreshLocalSnapshot();
        toast.success('Datos offline de este usuario eliminados del dispositivo.');
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setShowModal(true)}
                className={`relative m-0 flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                    !isOnline
                        ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                        : conflictsCount > 0
                        ? 'border-red-500/40 bg-red-500/15 text-red-300'
                        : pendingOutboxCount > 0
                        ? 'border-blue-500/40 bg-blue-500/15 text-blue-300'
                        : 'border-crm-border bg-crm-surface text-crm-fg-muted hover:text-white'
                }`}
                title="Modo Offline y Sincronización"
            >
                {isOnline ? <Wifi size={14} className="text-emerald-400" /> : <WifiOff size={14} className="text-amber-400" />}
                <span className="hidden md:inline">
                    {!isOnline ? 'Sin conexión' : pendingOutboxCount > 0 ? `Pendientes (${pendingOutboxCount})` : 'Offline'}
                </span>
                {(pendingOutboxCount > 0 || conflictsCount > 0) && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-crm-red-brand px-1 text-[10px] font-bold text-white">
                        {pendingOutboxCount + conflictsCount}
                    </span>
                )}
            </button>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
                    <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-crm-border bg-crm-surface shadow-2xl">
                        {/* Encabezado */}
                        <div className="flex items-center justify-between border-b border-crm-border bg-crm-topbar px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                                    isOnline ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                                }`}>
                                    {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
                                </div>
                                <div>
                                    <h2 className="m-0 text-base font-bold text-white">
                                        Modo Offline y Sincronización del Dispositivo
                                    </h2>
                                    <p className="m-0 text-xs text-crm-fg-muted">
                                        {isOnline ? 'Conectado al servidor' : 'Trabajando sin conexión — usando caché local aislada'}
                                        {snapshot?.syncedAt ? ` · Última preparación: ${new Date(snapshot.syncedAt).toLocaleString('es-AR')}` : ' · Dispositivo aún no preparado'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="rounded-lg p-1.5 text-crm-fg-muted hover:bg-crm-surface-raised hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Pestañas */}
                        <div className="flex border-b border-crm-border bg-crm-bg px-5">
                            {[
                                { id: 'resumen', label: 'Preparar Dispositivo' },
                                { id: 'explorar', label: `Datos Offline (${snapshot?.summary?.vehiclesCount || 0})` },
                                { id: 'cargar', label: 'Carga Rápida Offline' },
                                { id: 'cola', label: `Cola y Conflictos (${pendingOutboxCount + conflictsCount})` }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
                                        activeTab === tab.id
                                            ? 'border-crm-red text-white'
                                            : 'border-transparent text-crm-fg-muted hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Cuerpo */}
                        <div className="flex-1 overflow-y-auto p-5 text-sm text-crm-fg">
                            {activeTab === 'resumen' && (
                                <div className="space-y-4">
                                    <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                            <div>
                                                <h3 className="m-0 text-sm font-bold text-white">Preparar este dispositivo para salir a calle o depósito</h3>
                                                <p className="m-0 mt-1 text-xs text-crm-fg-muted">
                                                    Descarga el catálogo de vehículos, clientes, ventas, planes de cuotas y gastos según tus permisos.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={isPreparing || !isOnline}
                                                onClick={handlePrepareDevice}
                                                className="flex shrink-0 items-center gap-2 rounded-xl bg-crm-red-brand px-4 py-2.5 text-xs font-bold text-white transition hover:bg-crm-red-hover disabled:opacity-50"
                                            >
                                                {isPreparing ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                                                {isPreparing ? 'Preparando…' : 'Preparar para uso sin conexión'}
                                            </button>
                                        </div>

                                        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-crm-fg-muted">
                                            <input
                                                type="checkbox"
                                                checked={includePhotos}
                                                onChange={(e) => setIncludePhotos(e.target.checked)}
                                                className="rounded border-crm-border bg-crm-surface"
                                            />
                                            Guardar también fotos principales comprimidas del stock disponible
                                        </label>

                                        {isPreparing && (
                                            <div className="mt-3">
                                                <div className="flex justify-between text-xs text-crm-fg-muted">
                                                    <span>{prepareProgress.label}</span>
                                                    <span>{prepareProgress.percent}%</span>
                                                </div>
                                                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-crm-surface">
                                                    <div
                                                        className="h-full bg-crm-red-brand transition-all"
                                                        style={{ width: `${prepareProgress.percent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {snapshot ? (
                                        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                                            <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                                                <div className="text-[11px] text-crm-fg-muted">Vehículos</div>
                                                <div className="mt-1 text-lg font-bold text-white">{snapshot.summary?.vehiclesCount || 0}</div>
                                                <div className="text-[10px] text-emerald-400">{snapshot.summary?.availableStockCount || 0} disponibles</div>
                                            </div>
                                            <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                                                <div className="text-[11px] text-crm-fg-muted">Clientes</div>
                                                <div className="mt-1 text-lg font-bold text-white">{snapshot.summary?.clientsCount || 0}</div>
                                            </div>
                                            <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                                                <div className="text-[11px] text-crm-fg-muted">Ventas</div>
                                                <div className="mt-1 text-lg font-bold text-white">{snapshot.summary?.salesCount || 0}</div>
                                            </div>
                                            <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                                                <div className="text-[11px] text-crm-fg-muted">Cuotas</div>
                                                <div className="mt-1 text-lg font-bold text-white">{snapshot.summary?.installmentsCount || 0}</div>
                                                <div className="text-[10px] text-amber-400">{snapshot.summary?.pendingInstallmentsCount || 0} exigibles</div>
                                            </div>
                                            <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                                                <div className="text-[11px] text-crm-fg-muted">Gastos</div>
                                                <div className="mt-1 text-lg font-bold text-white">{snapshot.summary?.expensesCount || 0}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-dashed border-crm-border p-6 text-center text-xs text-crm-fg-muted">
                                            Todavía no descargaste una copia local en este dispositivo.
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between rounded-xl border border-crm-border bg-crm-bg p-3 text-xs">
                                        <div className="flex items-center gap-2 text-crm-fg-muted">
                                            <ShieldCheck size={16} className="text-emerald-400" />
                                            <span>
                                                Espacio aislado por usuario (<code className="text-white">{snapshot?.userScope?.username || user?.username}</code>). Tesorería Estratégica privada nunca se guarda en caché pública.
                                            </span>
                                        </div>
                                        {snapshot && (
                                            <button
                                                type="button"
                                                onClick={handleClearOffline}
                                                className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                                            >
                                                <Trash2 size={13} /> Limpiar caché
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'explorar' && (
                                <div className="space-y-4">
                                    {!snapshot ? (
                                        <div className="p-6 text-center text-xs text-crm-fg-muted">
                                            Prepará el dispositivo primero para consultar el catálogo y clientes sin conexión.
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-crm-fg-muted">
                                                    <Car size={14} /> Stock en caché ({snapshot.data?.vehicles?.length || 0})
                                                </h4>
                                                <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                                                    {(snapshot.data?.vehicles || []).slice(0, 30).map(v => {
                                                        const photoSrc = v.coverImage || (Array.isArray(v.images) && v.images[0]) || null;
                                                        return (
                                                            <div key={v._id} className="flex items-center justify-between gap-3 rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-xs">
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    {photoSrc ? (
                                                                        <img
                                                                            src={photoSrc}
                                                                            alt={`${v.brand} ${v.name}`}
                                                                            className="h-10 w-14 shrink-0 rounded border border-crm-border object-cover"
                                                                            data-offline-photo="true"
                                                                        />
                                                                    ) : (
                                                                        <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded border border-crm-border bg-crm-surface text-[10px] text-crm-fg-muted">
                                                                            Sin foto
                                                                        </div>
                                                                    )}
                                                                    <div className="truncate">
                                                                        <div className="font-bold text-white truncate">{v.brand} {v.name}</div>
                                                                        <div className="text-crm-fg-muted">{v.year} · {v.plateOrVin || 'S/D'} · {v.status}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="shrink-0 font-bold text-emerald-400">
                                                                    {v.currency} {Number(v.price || 0).toLocaleString('es-AR')}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-crm-fg-muted">
                                                    <Users size={14} /> Clientes en caché ({snapshot.data?.clients?.length || 0})
                                                </h4>
                                                <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1">
                                                    {(snapshot.data?.clients || []).slice(0, 25).map(c => (
                                                        <div key={c._id} className="flex items-center justify-between rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-xs">
                                                            <span className="font-bold text-white">{c.fullName}</span>
                                                            <span className="text-crm-fg-muted">{c.phone || c.email || 'Sin teléfono'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                                <div>
                                                    <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-crm-fg-muted">
                                                        <FileText size={14} /> Ventas ({snapshot.data?.sales?.length || 0})
                                                    </h4>
                                                    <div className="max-h-32 space-y-1.5 overflow-y-auto pr-1">
                                                        {(snapshot.data?.sales || []).slice(0, 15).map(s => (
                                                            <div key={s._id} className="rounded-lg border border-crm-border bg-crm-bg px-2.5 py-1.5 text-[11px]">
                                                                <div className="font-bold text-white">{s.saleCurrency} {Number(s.salePrice || 0).toLocaleString('es-AR')}</div>
                                                                <div className="text-crm-fg-muted">{s.paymentMethod} · {s.status}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-crm-fg-muted">
                                                        <Clock size={14} /> Cuotas ({snapshot.data?.installments?.length || 0})
                                                    </h4>
                                                    <div className="max-h-32 space-y-1.5 overflow-y-auto pr-1">
                                                        {(snapshot.data?.installments || []).slice(0, 15).map(inst => (
                                                            <div key={inst._id} className="rounded-lg border border-crm-border bg-crm-bg px-2.5 py-1.5 text-[11px]">
                                                                <div className="font-bold text-amber-400">Cuota #{inst.installmentNumber} · {inst.currency} {Number(inst.amount || 0).toLocaleString('es-AR')}</div>
                                                                <div className="text-crm-fg-muted">{inst.status}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-crm-fg-muted">
                                                        <DollarSign size={14} /> Gastos ({snapshot.data?.expenses?.length || 0})
                                                    </h4>
                                                    <div className="max-h-32 space-y-1.5 overflow-y-auto pr-1">
                                                        {(snapshot.data?.expenses || []).slice(0, 15).map(exp => (
                                                            <div key={exp._id} className="rounded-lg border border-crm-border bg-crm-bg px-2.5 py-1.5 text-[11px]">
                                                                <div className="font-bold text-white truncate">{exp.concept || exp.description || exp.category}</div>
                                                                <div className="text-crm-fg-muted">{exp.currency} {Number(exp.amount || 0).toLocaleString('es-AR')}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {activeTab === 'cargar' && (
                                <form onSubmit={handleEnqueueForm} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                        {[
                                            { id: 'observation', label: 'Observación / Nota', icon: FileText },
                                            { id: 'appraisal', label: 'Peritaje / Tasación', icon: Wrench },
                                            { id: 'client_draft', label: 'Nuevo Cliente', icon: UserPlus },
                                            { id: 'expense', label: 'Registrar Gasto', icon: DollarSign }
                                        ].map(t => {
                                            const Icon = t.icon;
                                            return (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => setOpType(t.id)}
                                                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition ${
                                                        opType === t.id
                                                            ? 'border-crm-red bg-crm-red/15 text-white'
                                                            : 'border-crm-border bg-crm-bg text-crm-fg-muted hover:text-white'
                                                    }`}
                                                >
                                                    <Icon size={14} />
                                                    {t.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {(opType === 'observation' || opType === 'appraisal' || opType === 'expense') && (
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-crm-fg-muted">Vehículo vinculado (opcional en peritaje/gasto)</label>
                                            <select
                                                value={selectedVehicleId}
                                                onChange={(e) => setSelectedVehicleId(e.target.value)}
                                                className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-xs text-white"
                                            >
                                                <option value="">-- Seleccionar vehículo en caché --</option>
                                                {(snapshot?.data?.vehicles || []).map(v => (
                                                    <option key={v._id} value={v._id}>
                                                        {v.brand} {v.name} ({v.year}) - {v.plateOrVin || v.status}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {opType === 'observation' && !selectedVehicleId && (
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-crm-fg-muted">O vincular a un cliente</label>
                                            <select
                                                value={selectedClientId}
                                                onChange={(e) => setSelectedClientId(e.target.value)}
                                                className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-xs text-white"
                                            >
                                                <option value="">-- Seleccionar cliente en caché --</option>
                                                {(snapshot?.data?.clients || []).map(c => (
                                                    <option key={c._id} value={c._id}>
                                                        {c.fullName} ({c.phone || 'S/T'})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {opType === 'appraisal' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="mb-1 block text-xs font-semibold text-crm-fg-muted">Valuación estimada de toma</label>
                                                <input
                                                    type="number"
                                                    value={valuationAmount}
                                                    onChange={(e) => setValuationAmount(e.target.value)}
                                                    placeholder="Importe"
                                                    className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-xs text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-semibold text-crm-fg-muted">Moneda</label>
                                                <select
                                                    value={expenseCurrency}
                                                    onChange={(e) => setExpenseCurrency(e.target.value)}
                                                    className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-xs text-white"
                                                >
                                                    <option value="ARS">ARS</option>
                                                    <option value="USD">USD</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {opType === 'client_draft' && (
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                            <div>
                                                <label className="mb-1 block text-xs font-semibold text-crm-fg-muted">Nombre y apellido *</label>
                                                <input
                                                    type="text"
                                                    value={clientFullName}
                                                    onChange={(e) => setClientFullName(e.target.value)}
                                                    placeholder="Nombre completo"
                                                    className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-xs text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-semibold text-crm-fg-muted">Teléfono / WhatsApp</label>
                                                <input
                                                    type="text"
                                                    value={clientPhone}
                                                    onChange={(e) => setClientPhone(e.target.value)}
                                                    placeholder="Teléfono"
                                                    className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-xs text-white"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {opType === 'expense' && (
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                            <div>
                                                <label className="mb-1 block text-xs font-semibold text-crm-fg-muted">Concepto del gasto *</label>
                                                <input
                                                    type="text"
                                                    value={expenseConcept}
                                                    onChange={(e) => setExpenseConcept(e.target.value)}
                                                    placeholder="Ej. Lavado, gestoría, traslado"
                                                    className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-xs text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-semibold text-crm-fg-muted">Importe *</label>
                                                <input
                                                    type="number"
                                                    value={expenseAmount}
                                                    onChange={(e) => setExpenseAmount(e.target.value)}
                                                    placeholder="Monto"
                                                    className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-xs text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-semibold text-crm-fg-muted">Moneda</label>
                                                <select
                                                    value={expenseCurrency}
                                                    onChange={(e) => setExpenseCurrency(e.target.value)}
                                                    className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-xs text-white"
                                                >
                                                    <option value="ARS">ARS</option>
                                                    <option value="USD">USD</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-crm-fg-muted">Detalle / Observaciones</label>
                                        <textarea
                                            rows={3}
                                            value={noteText}
                                            onChange={(e) => setNoteText(e.target.value)}
                                            placeholder="Ingresá los detalles operativos..."
                                            className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-xs text-white"
                                        />
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            className="rounded-xl bg-crm-red-brand px-4 py-2 text-xs font-bold text-white hover:bg-crm-red-hover"
                                        >
                                            Guardar en cola offline
                                        </button>
                                    </div>
                                </form>
                            )}

                            {activeTab === 'cola' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-crm-fg-muted">
                                            {pendingOutboxCount} operación(es) listas para enviar · {conflictsCount} conflicto(s) · {pendingConfirmationsCount} borrador(es) contable(s)
                                        </span>
                                        <button
                                            type="button"
                                            disabled={isSyncing || pendingOutboxCount === 0 || !isOnline}
                                            onClick={handleSyncNow}
                                            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                                        >
                                            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                                            {isSyncing ? 'Sincronizando…' : 'Sincronizar ahora'}
                                        </button>
                                    </div>

                                    {pendingOutboxCount > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-white">Cola pendiente de envío</h4>
                                            {snapshot.outbox.map((item) => (
                                                <div key={item.idempotencyKey} className="flex items-center justify-between rounded-xl border border-crm-border bg-crm-bg p-3 text-xs">
                                                    <div>
                                                        <span className="font-bold uppercase text-blue-400">{item.operationType}</span>
                                                        <span className="ml-2 text-crm-fg-muted">Clave: {item.idempotencyKey}</span>
                                                    </div>
                                                    <span className="flex items-center gap-1 text-amber-400">
                                                        <Clock size={12} /> En cola
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {conflictsCount > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                                                <AlertTriangle size={14} /> Conflictos detectados al sincronizar (no se sobrescribió el servidor)
                                            </h4>
                                            {snapshot.conflicts.map((conf) => (
                                                <div key={conf.idempotencyKey} className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
                                                    <div className="font-bold">{conf.conflictDetails?.message || 'Conflicto de edición en el servidor'}</div>
                                                    <div className="mt-1 text-[11px] opacity-80">
                                                        Operación: {conf.operationType} · Motivo: {conf.conflictDetails?.reason}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {pendingConfirmationsCount > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                                                <CheckCircle2 size={14} /> Borradores contables recibidos (pendientes de confirmación en servidor)
                                            </h4>
                                            {snapshot.pendingConfirmations.map((pc) => (
                                                <div key={pc.idempotencyKey} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                                                    <div className="font-bold">{pc.message}</div>
                                                    <div className="mt-1 text-[11px] opacity-80">ID Borrador: {pc.draftId || pc.idempotencyKey}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {pendingOutboxCount === 0 && conflictsCount === 0 && pendingConfirmationsCount === 0 && (
                                        <div className="rounded-xl border border-dashed border-crm-border p-6 text-center text-xs text-crm-fg-muted">
                                            No hay operaciones pendientes ni conflictos en este dispositivo.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
