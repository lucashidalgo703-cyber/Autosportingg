"use client";
import toast from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, AlertTriangle, DollarSign, MapPin, Calendar, Receipt } from 'lucide-react';
import { useInfracciones } from '../../../hooks/useInfracciones';
import { useAdminSales } from '../../../hooks/useAdminSales';
import { useAdminUsers } from '../../../hooks/useAdminUsers';
import CrmButton from '../../../components/crm/ui/CrmButton';
import ConfirmModal from '../../../components/crm/ui/ConfirmModal';

export default function InfraccionesPage() {
    const { infracciones, loading, error, fetchInfracciones, createInfraccion, updateInfraccion, deleteInfraccion } = useInfracciones();
    const { sales, fetchSales } = useAdminSales();
    const { users, fetchUsers } = useAdminUsers();
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('lista'); // 'lista' or 'liquidacion'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInfraccion, setEditingInfraccion] = useState(null);
    const [formData, setFormData] = useState({
        plate: '', issueDate: '', jurisdiction: '', reason: '',
        actNumber: '', amount: '', cost: '', chargedToClient: false,
        chargedAmount: '', grossProfit: 0, agencyPercentage: 100, paymentStatus: 'Pendiente', receiptImage: '',
        currency: 'ARS', status: 'detectada', dueDate: '', notes: '',
        saleId: '', responsible: ''
    });
    const [confirmDeleteModal, setConfirmDeleteModal] = useState({ isOpen: false, id: null });

    useEffect(() => {
        fetchInfracciones();
        fetchSales();
        fetchUsers();
    }, [fetchInfracciones, fetchSales, fetchUsers]);

    const filteredInfracciones = infracciones.filter(i => 
        i.plate?.toLowerCase().includes(search.toLowerCase()) || 
        i.reason?.toLowerCase().includes(search.toLowerCase()) ||
        i.jurisdiction?.toLowerCase().includes(search.toLowerCase())
    );

    const handleOpenModal = (infraccion = null) => {
        if (infraccion) {
            setEditingInfraccion(infraccion);
            setFormData({ 
                plate: infraccion.plate, 
                issueDate: infraccion.issueDate ? new Date(infraccion.issueDate).toISOString().split('T')[0] : '', 
                jurisdiction: infraccion.jurisdiction || '', 
                reason: infraccion.reason || '',
                actNumber: infraccion.actNumber || '',
                amount: infraccion.amount || '', 
                cost: infraccion.cost || '',
                chargedToClient: infraccion.chargedToClient || false,
                chargedAmount: infraccion.chargedAmount || '',
                grossProfit: infraccion.grossProfit || 0,
                agencyPercentage: infraccion.agencyPercentage || 100,
                paymentStatus: infraccion.paymentStatus || 'Pendiente',
                receiptImage: infraccion.receiptImage || '',
                currency: infraccion.currency || 'ARS', 
                status: infraccion.status || 'detectada', 
                dueDate: infraccion.dueDate ? new Date(infraccion.dueDate).toISOString().split('T')[0] : '', 
                notes: infraccion.notes || '',
                saleId: infraccion.saleId?._id || infraccion.saleId || '',
                responsible: infraccion.responsible?._id || infraccion.responsible || ''
            });
        } else {
            setEditingInfraccion(null);
            setFormData({ 
                plate: '', issueDate: '', jurisdiction: '', reason: '',
                actNumber: '', amount: '', cost: '', chargedToClient: false, 
                chargedAmount: '', grossProfit: 0, agencyPercentage: 100, paymentStatus: 'Pendiente', receiptImage: '',
                currency: 'ARS', status: 'detectada', dueDate: '', notes: '',
                saleId: '', responsible: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingInfraccion(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingInfraccion) {
                await updateInfraccion(editingInfraccion._id, formData);
            } else {
                await createInfraccion(formData);
            }
            handleCloseModal();
            fetchInfracciones();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleDelete = (id) => {
        setConfirmDeleteModal({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        const id = confirmDeleteModal.id;
        if (!id) return;
        try {
            await deleteInfraccion(id);
            fetchInfracciones();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'detectada': return 'text-red-400 border-red-400/30 bg-red-400/10';
            case 'informada': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
            case 'en_gestion': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
            case 'pagada': return 'text-green-400 border-green-400/30 bg-green-400/10';
            case 'resuelta': return 'text-purple-400 border-purple-400/30 bg-purple-400/10';
            case 'cancelada': return 'text-gray-400 border-gray-400/30 bg-gray-400/10';
            default: return 'text-crm-fg-muted border-crm-border bg-crm-bg';
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 pb-24 md:p-6">
            <div className="flex flex-col gap-4 border-b border-crm-border pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="m-0 text-[26px] font-bold leading-tight text-crm-fg flex items-center gap-2">
                        <AlertTriangle size={28} className="text-crm-red" />
                        Infracciones
                    </h1>
                    <p className="m-0 mt-1 text-sm font-medium text-crm-fg-muted">
                        Registro y control de multas asociadas a vehículos de la agencia.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar patente, motivo..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9 w-64 rounded-lg border border-crm-border bg-crm-surface pl-9 pr-3 text-sm text-crm-fg placeholder-crm-fg-muted focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red"
                        />
                    </div>
                    <CrmButton variant="primary" size="sm" onClick={() => handleOpenModal()} className="h-9 shadow-[0_0_28px_rgba(239,51,41,0.45)]">
                        <Plus size={14} />
                        Cargar Multa
                    </CrmButton>
                </div>
            </div>

            <div className="flex space-x-1 border-b border-crm-border mt-2">
                <button
                    onClick={() => setActiveTab('lista')}
                    className={`px-4 py-2 text-sm font-semibold transition-colors relative ${activeTab === 'lista' ? 'text-white' : 'text-crm-fg-muted hover:text-white'}`}
                >
                    Listado de Multas
                    {activeTab === 'lista' && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-crm-red" />}
                </button>
                <button
                    onClick={() => setActiveTab('liquidacion')}
                    className={`px-4 py-2 text-sm font-semibold transition-colors relative ${activeTab === 'liquidacion' ? 'text-white' : 'text-crm-fg-muted hover:text-white'}`}
                >
                    Liquidación
                    {activeTab === 'liquidacion' && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-crm-red" />}
                </button>
            </div>

            {error && (
                <div className="rounded-xl border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-red-300">
                    {error}
                </div>
            )}

            {loading && infracciones.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-xl border border-crm-border bg-crm-surface">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {filteredInfracciones.map(infraccion => (
                        <div key={infraccion._id} className="flex flex-col rounded-xl border border-crm-border bg-crm-surface p-5 transition-all hover:border-crm-red/50">
                            <div className="mb-4 flex items-start justify-between border-b border-crm-border pb-4">
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-widest bg-crm-bg border border-crm-border inline-block px-3 py-1 rounded-lg">
                                        {infraccion.plate}
                                    </h3>
                                    <div className="mt-2">
                                        <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(infraccion.status)}`}>
                                            {infraccion.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenModal(infraccion)} className="text-crm-fg-muted hover:text-crm-fg transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(infraccion._id)} className="text-crm-fg-muted hover:text-crm-red transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-3 text-sm text-crm-fg-muted">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle size={14} className="text-crm-red shrink-0 mt-0.5" />
                                    <span className="font-bold text-crm-fg leading-tight">{infraccion.reason}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin size={14} className="text-crm-fg opacity-70" />
                                    <span>{infraccion.jurisdiction || 'Jurisdicción no informada'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-crm-fg opacity-70" />
                                    <span>
                                        Acta: {infraccion.issueDate ? new Date(infraccion.issueDate).toLocaleDateString('es-AR') : 'S/F'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Receipt size={14} className="text-crm-fg opacity-70" />
                                    <span>Acta Nº: {infraccion.actNumber || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 pt-3 border-t border-crm-border/50">
                                    <DollarSign size={16} className="text-white" />
                                    <div className="flex flex-col">
                                        <span className="font-black text-white text-lg leading-tight">
                                            {infraccion.currency} {infraccion.amount?.toLocaleString('es-AR') || '0'}
                                        </span>
                                        <span className="text-[10px] text-crm-fg-muted font-bold uppercase">Multa Original</span>
                                    </div>
                                    <div className="ml-auto text-right flex flex-col">
                                        <span className="font-black text-crm-red text-sm leading-tight">
                                            - {infraccion.currency} {infraccion.cost?.toLocaleString('es-AR') || '0'}
                                        </span>
                                        <span className="text-[10px] text-crm-fg-muted font-bold uppercase">Costo Pago</span>
                                    </div>
                                </div>
                                {infraccion.chargedAmount > 0 && (
                                    <div className="flex flex-col gap-1 rounded bg-green-500/10 border border-green-500/20 px-3 py-2 mt-2 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-green-400 uppercase tracking-wider">Cobrado al Cliente:</span>
                                            <span className="font-black text-green-400 text-sm">{infraccion.currency} {infraccion.chargedAmount?.toLocaleString('es-AR')}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-green-400/80">
                                            <span>Estado del Pago: {infraccion.paymentStatus}</span>
                                            <span>Ganancia: {infraccion.currency} {infraccion.grossProfit?.toLocaleString('es-AR') || ((infraccion.chargedAmount || 0) - (infraccion.cost || 0)).toLocaleString('es-AR')}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {infraccion.notes && (
                                <div className="mt-4 rounded-lg bg-crm-bg p-3 text-xs italic text-crm-fg-muted border border-crm-border/50">
                                    {infraccion.notes}
                                </div>
                            )}

                            {infraccion.saleId && (
                                <div className="mt-4 pt-3 border-t border-crm-border/50 flex justify-between items-center">
                                    <span className="text-xs text-crm-fg-muted">Operación Vinculada:</span>
                                    <a href={`/admin/ventas/${infraccion.saleId._id || infraccion.saleId}`} className="text-xs font-bold text-crm-red hover:text-red-400 uppercase">
                                        Ver Venta
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                    {filteredInfracciones.length === 0 && (
                        <div className="col-span-full py-12 text-center text-crm-fg-muted">
                            No se encontraron registros de infracciones.
                        </div>
                    )}
                </div>
            ) : activeTab === 'liquidacion' ? (
                <div className="rounded-xl border border-crm-border bg-crm-surface overflow-hidden">
                    <div className="p-5 border-b border-crm-border">
                        <h2 className="text-lg font-bold text-white">Liquidaciones de Infracciones</h2>
                        <p className="text-sm text-crm-fg-muted mt-1">Detalle de las infracciones cobradas y ganancias netas generadas.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-crm-fg">
                            <thead className="bg-crm-bg text-xs font-bold uppercase tracking-wider text-crm-fg-muted">
                                <tr>
                                    <th className="px-6 py-4 border-b border-crm-border">Patente</th>
                                    <th className="px-6 py-4 border-b border-crm-border">Venta</th>
                                    <th className="px-6 py-4 border-b border-crm-border">Multa Original</th>
                                    <th className="px-6 py-4 border-b border-crm-border">Costo Real</th>
                                    <th className="px-6 py-4 border-b border-crm-border text-green-400">Cobrado al Cliente</th>
                                    <th className="px-6 py-4 border-b border-crm-border text-green-400">Ganancia Bruta</th>
                                    <th className="px-6 py-4 border-b border-crm-border">% AutoSporting</th>
                                    <th className="px-6 py-4 border-b border-crm-border text-blue-400">Estado Pago</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInfracciones.filter(i => i.chargedAmount > 0).map(inf => {
                                    const gp = inf.grossProfit || (inf.chargedAmount - (inf.cost || 0));
                                    return (
                                        <tr key={inf._id} className="border-b border-crm-border hover:bg-crm-bg/50 transition-colors">
                                            <td className="px-6 py-4 font-black uppercase text-white">{inf.plate}</td>
                                            <td className="px-6 py-4 text-xs font-medium text-crm-red">{inf.saleId ? 'VINCULADA' : 'S/V'}</td>
                                            <td className="px-6 py-4">{inf.currency} {inf.amount?.toLocaleString('es-AR') || '0'}</td>
                                            <td className="px-6 py-4">{inf.currency} {inf.cost?.toLocaleString('es-AR') || '0'}</td>
                                            <td className="px-6 py-4 font-bold text-green-400">{inf.currency} {inf.chargedAmount?.toLocaleString('es-AR')}</td>
                                            <td className="px-6 py-4 font-bold text-green-400">{inf.currency} {gp.toLocaleString('es-AR')}</td>
                                            <td className="px-6 py-4">{inf.agencyPercentage}%</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${inf.paymentStatus === 'Pagado' ? 'text-green-400 border-green-400/30 bg-green-400/10' : 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'}`}>
                                                    {inf.paymentStatus}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="w-full max-w-2xl rounded-2xl border border-crm-border bg-crm-surface shadow-2xl my-auto">
                        <div className="flex items-center justify-between border-b border-crm-border px-6 py-4 sticky top-0 bg-crm-surface z-10 rounded-t-2xl">
                            <h2 className="text-lg font-bold text-white">{editingInfraccion ? 'Editar Infracción' : 'Cargar Multa'}</h2>
                            <button type="button" onClick={handleCloseModal} className="text-crm-fg-muted hover:text-white text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-crm-red border-b border-crm-border/50 pb-2 uppercase tracking-wider">Datos Principales</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Patente Afectada *</label>
                                        <input required type="text" placeholder="Ej: AB123CD" value={formData.plate} onChange={e => setFormData({...formData, plate: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg uppercase focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                    <div className="col-span-full">
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Motivo de la infracción *</label>
                                        <input required type="text" placeholder="Ej: Exceso de velocidad en ruta nacional 3" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-crm-red border-b border-crm-border/50 pb-2 uppercase tracking-wider">Ubicación y Fechas</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Jurisdicción / Municipio</label>
                                        <input type="text" placeholder="Ej: Comodoro Rivadavia, Chubut" value={formData.jurisdiction} onChange={e => setFormData({...formData, jurisdiction: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Número de Acta / Boleta</label>
                                        <input type="text" placeholder="Ej: 0001-45678" value={formData.actNumber} onChange={e => setFormData({...formData, actNumber: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                    <div className="col-span-full">
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Vincular a Venta</label>
                                        <select value={formData.saleId} onChange={e => {
                                            const selectedSale = sales.find(s => s._id === e.target.value);
                                            setFormData({
                                                ...formData, 
                                                saleId: e.target.value,
                                                plate: selectedSale?.vehicleId?.plateOrVin || formData.plate
                                            });
                                        }} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red appearance-none">
                                            <option value="">Ninguna</option>
                                            {sales.filter(s => s.status !== 'cancelada' && s.status !== 'borrador').map(s => (
                                                <option key={s._id} value={s._id}>
                                                    {(s.clientId?.fullName || s.clientId?.firstName)} - {s.vehicleId?.brand} {s.vehicleId?.name} ({s.vehicleId?.plateOrVin})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Fecha de la Infracción</label>
                                        <input type="date" value={formData.issueDate} onChange={e => setFormData({...formData, issueDate: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red [color-scheme:dark]" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Fecha de Vencimiento</label>
                                        <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red [color-scheme:dark]" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-crm-red border-b border-crm-border/50 pb-2 uppercase tracking-wider">Montos y Estado</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex gap-2">
                                        <div className="w-1/3">
                                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Moneda</label>
                                            <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red appearance-none">
                                                <option value="ARS">ARS</option>
                                                <option value="USD">USD</option>
                                            </select>
                                        </div>
                                        <div className="w-1/4">
                                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Valor Boleta</label>
                                            <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                        </div>
                                        <div className="w-1/4">
                                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Costo Real</label>
                                            <input type="number" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                        </div>
                                        <div className="w-1/4">
                                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Cobrado Cliente</label>
                                            <input type="number" value={formData.chargedAmount} onChange={e => setFormData({...formData, chargedAmount: e.target.value, grossProfit: e.target.value - (formData.cost || 0)})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Estado del Pago (Cliente)</label>
                                            <select value={formData.paymentStatus} onChange={e => setFormData({...formData, paymentStatus: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red appearance-none">
                                                <option value="Pendiente">Pendiente</option>
                                                <option value="Pagado">Pagado</option>
                                                <option value="Parcial">Parcial</option>
                                            </select>
                                        </div>
                                        <div className="flex-1">
                                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">% AutoSporting (Liquidación)</label>
                                            <input type="number" value={formData.agencyPercentage} onChange={e => setFormData({...formData, agencyPercentage: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Estado Actual</label>
                                        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-white font-bold focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red appearance-none">
                                            <option value="detectada">Detectada</option>
                                            <option value="informada">Informada</option>
                                            <option value="en_gestion">En Gestión</option>
                                            <option value="pagada">Pagada</option>
                                            <option value="resuelta">Resuelta</option>
                                            <option value="cancelada">Cancelada</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Responsable Gestión</label>
                                        <select value={formData.responsible} onChange={e => setFormData({...formData, responsible: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red appearance-none">
                                            <option value="">Sin Asignar</option>
                                            {users.map(u => (
                                                <option key={u._id} value={u._id}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-full">
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Observaciones Internas</label>
                                        <textarea rows="2" placeholder="Pago voluntario disponible, a cargo del cliente anterior..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red resize-none"></textarea>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-crm-border">
                                <CrmButton type="button" variant="secondary" onClick={handleCloseModal}>Cancelar</CrmButton>
                                <CrmButton type="submit" variant="primary">Guardar Infracción</CrmButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmDeleteModal.isOpen}
                onClose={() => setConfirmDeleteModal({ isOpen: false, id: null })}
                onConfirm={confirmDelete}
                title="Eliminar Infracción"
                message="¿Seguro que deseas eliminar este registro de infracción? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                isDestructive={true}
            />
        </div>
    );
}
