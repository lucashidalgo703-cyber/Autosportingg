"use client";
import toast from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, FileSignature, DollarSign, Calendar, CarFront, User, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useGestoria } from '../../../hooks/useGestoria';
import { useAdminSales } from '../../../hooks/useAdminSales';
import CrmButton from '../../../components/crm/ui/CrmButton';
import ConfirmModal from '../../../components/crm/ui/ConfirmModal';
import BuyerPortalAccessPanel from '../../../components/buyer-portal/BuyerPortalAccessPanel';
import GestoriaStatusEmailNotice from '../../../components/buyer-portal/GestoriaStatusEmailNotice';
import BuyerDocumentsPanel from '../../../components/buyer-portal/BuyerDocumentsPanel';
import BuyerDeliveryDocumentsPanel from '../../../components/buyer-portal/BuyerDeliveryDocumentsPanel';
import { withCrmReturn } from '../../../utils/crmReturnNavigation';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { gestoriaDocumentTarget } from '../../../utils/gestoriaDocumentLink';

const statusToast = { id: 'gestoria-status-email' };

export default function GestoriaPage() {
    const { user } = useAuth();
    const canReadEmailHistory = hasPermission(user, PERMISSIONS.GESTORIA_READ);
    const canRetryEmail = hasPermission(user, PERMISSIONS.GESTORIA_WRITE);
    const { tramites, loading, error, fetchTramites, createTramite, updateTramite, deleteTramite, retryStatusEmail, fetchStatusEmail } = useGestoria();
    const { sales, fetchSales } = useAdminSales();
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTramite, setEditingTramite] = useState(null);
    const [documentsSaleId, setDocumentsSaleId] = useState('');
    const [deliverySaleId, setDeliverySaleId] = useState('');
    const canReadDocuments = hasPermission(user, PERMISSIONS.GESTORIA_READ);
    useEffect(() => {
        if (!canReadDocuments) return;
        const target = gestoriaDocumentTarget(window.location.pathname + window.location.search);
        if (target) setDocumentsSaleId(new URL(target, window.location.origin).searchParams.get('documentos'));
    }, [canReadDocuments]);
    useEffect(() => {
        if (!documentsSaleId && !deliverySaleId) return;
        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const handleKey = event => {
            if (document.querySelector('[data-private-document-viewer]')) return;
            if (event.key === 'Escape') { event.preventDefault(); setDocumentsSaleId(''); setDeliverySaleId(''); }
            if (event.key !== 'Tab') return;
            const dialog = document.querySelector(deliverySaleId ? '[data-gestoria-delivery-documents]' : '[data-gestoria-buyer-documents]');
            const controls = [...(dialog?.querySelectorAll('a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), summary') || [])].filter(element => element.offsetParent !== null);
            const first = controls[0], last = controls.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        };
        document.addEventListener('keydown', handleKey);
        return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', handleKey); previousFocus?.focus?.(); };
    }, [documentsSaleId, deliverySaleId]);
    const [printModal, setPrintModal] = useState({ isOpen: false, type: '', tramite: null });
    const [formData, setFormData] = useState({
        title: '', type: 'Transferencia Ingreso', vehiclePlate: '', gestorName: '',
        status: 'Pendiente', cost: '', currency: 'ARS', estimatedEndDate: '', notes: '',
        saleId: '', organismo: '', clientChargeAmount: '', chargedAmount: '', collectionRevision: 0, clientId: '', sellerId: '', documents: []
    });
    const [confirmDeleteModal, setConfirmDeleteModal] = useState({ isOpen: false, id: null });
    const [clients, setClients] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [emailNotice, setEmailNotice] = useState(null);
    const [retryingEmail, setRetryingEmail] = useState(false);
    const [retryError, setRetryError] = useState('');
    const [modalEmailHistory, setModalEmailHistory] = useState(null);

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setIsUploading(true);
        const uploadToastId = toast.loading('Subiendo imágenes...');

        try {
            const formData = new FormData();
            files.forEach(file => {
                formData.append('files', file);
            });

            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Error al subir los archivos');
            }

            const data = await res.json();
            const newDocuments = data.uploadedFiles.map(file => ({
                name: file.name,
                url: file.url,
                type: 'imagen'
            }));

            setFormData(prev => ({
                ...prev,
                documents: [...(prev.documents || []), ...newDocuments]
            }));

            toast.success('Imágenes subidas correctamente', { id: uploadToastId });
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(error.message || 'Ocurrió un error al subir las imágenes', { id: uploadToastId });
        } finally {
            setIsUploading(false);
            e.target.value = ''; // Reset input
        }
    };

    const removeDocument = (indexToRemove) => {
        setFormData(prev => ({
            ...prev,
            documents: prev.documents.filter((_, index) => index !== indexToRemove)
        }));
    };

    useEffect(() => {
        fetchTramites();
        fetchSales({ scope: 'gestoria' });
        const token = localStorage.getItem('token');
        if (token) {
            fetch('/api/admin/clients', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(data => setClients(Array.isArray(data) ? data : []))
                .catch(err => console.error(err));
        }
    }, [fetchTramites, fetchSales]);

    const editingId = editingTramite?._id;
    useEffect(() => {
        if (!isModalOpen || !editingId || !canReadEmailHistory) return;
        let active = true;
        fetchStatusEmail(editingId).then(notification => {
            if (active) setModalEmailHistory({ tramiteId: editingId, notification });
        }).catch(() => {
            if (active) setModalEmailHistory({ tramiteId: editingId, error: 'No se pudo consultar el último aviso por correo. Podés seguir editando el trámite.' });
        });
        return () => { active = false; };
    }, [isModalOpen, editingId, fetchStatusEmail, canReadEmailHistory]);

    const filteredTramites = tramites.filter(t => 
        t.title?.toLowerCase().includes(search.toLowerCase()) || 
        t.type?.toLowerCase().includes(search.toLowerCase()) ||
        t.vehiclePlate?.toLowerCase().includes(search.toLowerCase()) ||
        t.gestorName?.toLowerCase().includes(search.toLowerCase())
    );

    const handleOpenModal = (tramite = null) => {
        setModalEmailHistory(null);
        setRetryError('');
        if (tramite) {
            setEditingTramite(tramite);
            setFormData({ 
                title: tramite.title, type: tramite.type, 
                vehiclePlate: tramite.vehiclePlate || '', gestorName: tramite.gestorName || '',
                status: tramite.status || 'Pendiente', cost: tramite.cost || '', 
                currency: tramite.currency || 'ARS', 
                estimatedEndDate: tramite.estimatedEndDate ? new Date(tramite.estimatedEndDate).toISOString().split('T')[0] : '', 
                notes: tramite.notes || '',
                saleId: tramite.saleId || '',
                organismo: tramite.organismo || '',
                clientChargeAmount: tramite.clientChargeAmount || '',
                collectionRevision: tramite.collectionRevision || 0,
                chargedAmount: tramite.chargedAmount || '',
                clientId: tramite.clientId?._id || tramite.clientId || '',
                sellerId: tramite.sellerId?._id || tramite.sellerId || '',
                documents: tramite.documents || []
            });
        } else {
            setEditingTramite(null);
            setFormData({ 
                title: '', type: 'Transferencia Ingreso', vehiclePlate: '', gestorName: '',
                status: 'Pendiente', cost: '', currency: 'ARS', estimatedEndDate: '', notes: '',
                saleId: '', organismo: '', clientChargeAmount: '', chargedAmount: '', collectionRevision: 0, clientId: '', sellerId: '', documents: []
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTramite(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        setIsSaving(true);
        try {
            if (editingTramite) {
                const result = await updateTramite(editingTramite._id, formData);
                const notification = result.emailNotification;
                if (notification && notification.status !== 'not_needed') {
                    setEmailNotice({ tramiteId: editingTramite._id, notification });
                    setRetryError('');
                    if (notification.status === 'sent') toast.success('Estado actualizado y aviso enviado al cliente', statusToast);
                    else if (['delivery_uncertain', 'confirmation_pending'].includes(notification.reason)) toast('Estado actualizado. Falta confirmar el resultado del aviso.', statusToast);
                    else if (notification.status === 'failed') toast.error('Estado actualizado. No se pudo enviar el aviso al cliente.', statusToast);
                    else if (notification.status === 'pending') toast.success('Estado actualizado. El aviso al cliente está pendiente.', statusToast);
                    else toast.success('Estado actualizado. Revisá el aviso de correo.', statusToast);
                } else toast.success('Trámite actualizado', statusToast);
            } else {
                await createTramite(formData);
                toast.success('Trámite creado', statusToast);
            }
            handleCloseModal();
            fetchTramites();
        } catch (err) {
            toast.error(err.message, statusToast);
        } finally { setIsSaving(false); }
    };

    const handleRetryEmail = async (source) => {
        if (retryingEmail || !canRetryEmail || !source?.notification?.id) return;
        setRetryingEmail(true); setRetryError('');
        try {
            const notification = await retryStatusEmail(source.tramiteId, source.notification.id);
            setEmailNotice({ tramiteId: source.tramiteId, notification });
            setModalEmailHistory(previous => previous?.tramiteId === source.tramiteId ? { ...previous, notification } : previous);
            if (notification.status === 'sent') toast.success('Aviso enviado al cliente', statusToast);
        } catch (err) { setRetryError(err.message); }
        finally { setRetryingEmail(false); }
    };

    const handleDelete = (id) => {
        setConfirmDeleteModal({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        const id = confirmDeleteModal.id;
        if (!id) return;
        try {
            await deleteTramite(id);
            fetchTramites();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pendiente': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
            case 'Documentación': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
            case 'Presentado': return 'text-orange-400 border-orange-400/30 bg-orange-400/10';
            case 'Observado': return 'text-red-400 border-red-400/30 bg-red-400/10';
            case 'Transferido': return 'text-purple-400 border-purple-400/30 bg-purple-400/10';
            case 'Finalizado': return 'text-green-400 border-green-400/30 bg-green-400/10';
            case 'Cancelado': return 'text-gray-400 border-gray-400/30 bg-gray-400/10';
            default: return 'text-crm-fg-muted border-crm-border bg-crm-bg';
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 pb-24 md:p-6">
            <div className="flex flex-col gap-4 border-b border-crm-border pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="m-0 text-[26px] font-bold leading-tight text-crm-fg flex items-center gap-2">
                        <FileSignature size={28} className="text-crm-red" />
                        Gestoría
                    </h1>
                    <p className="m-0 mt-1 text-sm font-medium text-crm-fg-muted">
                        Seguimiento de trámites, transferencias e inscripciones.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar trámite, patente..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9 w-64 rounded-lg border border-crm-border bg-crm-surface pl-9 pr-3 text-sm text-crm-fg placeholder-crm-fg-muted focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red"
                        />
                    </div>
                    <CrmButton variant="primary" size="sm" onClick={() => handleOpenModal()} className="h-9 shadow-[0_0_28px_rgba(239,51,41,0.45)]">
                        <Plus size={14} />
                        Nuevo Trámite
                    </CrmButton>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-red-300">
                    {error}
                </div>
            )}

            <GestoriaStatusEmailNotice notification={emailNotice?.notification} retrying={retryingEmail} retryError={retryError} onRetry={canRetryEmail ? () => handleRetryEmail(emailNotice) : undefined}/>

            {loading && tramites.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-xl border border-crm-border bg-crm-surface">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {filteredTramites.map(tramite => (
                        <div key={tramite._id} className="flex flex-col rounded-xl border border-crm-border bg-crm-surface p-5 transition-all hover:border-crm-red/50">
                            <div className="mb-4 flex items-start justify-between border-b border-crm-border pb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white leading-tight">
                                        {tramite.title}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-crm-bg border border-crm-border text-crm-fg-muted">
                                            {tramite.type}
                                        </span>
                                        <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(tramite.status)}`}>
                                            {tramite.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" aria-label={`Editar trámite ${tramite.title}`} onClick={() => handleOpenModal(tramite)} className="inline-flex min-h-11 min-w-11 items-center justify-center text-crm-fg-muted hover:text-crm-fg transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(tramite._id)} className="text-crm-fg-muted hover:text-crm-red transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-y-3 text-sm text-crm-fg-muted">
                                <div className="flex items-center gap-2">
                                    <CarFront size={14} className="text-crm-fg opacity-70" />
                                    <span className="font-medium text-crm-fg uppercase">{tramite.vehiclePlate || 'S/D'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <User size={14} className="text-crm-fg opacity-70" />
                                    <span className="truncate">{tramite.gestorName || 'Gestor no asignado'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-crm-fg opacity-70" />
                                    <span>
                                        Iniciado: {new Date(tramite.startDate).toLocaleDateString('es-AR', {day: '2-digit', month: '2-digit', year: '2-digit'})}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <DollarSign size={14} className="text-crm-fg opacity-70" />
                                    <span className="font-medium text-crm-fg">{tramite.currency} {tramite.cost?.toLocaleString('es-AR') || '0'}</span>
                                    {tramite.clientChargeAmount > 0 && (
                                        <div className="text-xs text-crm-fg-muted">Pendiente de gestoría: {tramite.currency} {Math.max(0, tramite.clientChargeAmount - (tramite.chargedAmount || 0)).toLocaleString('es-AR')}</div>
                                    )}
                                    {tramite.chargedAmount > 0 && (
                                        <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase">
                                            Cobrado: {tramite.currency} {tramite.chargedAmount.toLocaleString('es-AR')}
                                        </span>
                                    )}
                                </div>
                                {tramite.saleId && (
                                    <div className="col-span-full mt-2 space-y-3 border-t border-crm-border pt-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="text-xs text-crm-fg-muted">Expediente Vinculado:</span>
                                        <a href={withCrmReturn(`/admin/expedientes/${tramite.saleId?._id || tramite.saleId}`, '/admin/gestoria')} className="inline-flex min-h-11 items-center text-xs font-bold text-crm-red hover:text-red-400 uppercase">
                                            Ir al Expediente
                                        </a>
                                        </div>
                                        {hasPermission(user, PERMISSIONS.GESTORIA_READ) && <button type="button" onClick={() => setDocumentsSaleId(String(tramite.saleId?._id || tramite.saleId))} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-solid border-blue-400/30 bg-blue-500/10 px-3 text-xs font-bold text-blue-300"><FileSignature size={16}/>Ver documentación del cliente</button>}
                                        {tramite.type === 'Transferencia Egreso' && hasPermission(user, PERMISSIONS.GESTORIA_READ) && <button type="button" onClick={() => setDeliverySaleId(String(tramite.saleId?._id || tramite.saleId))} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-solid border-red-400/40 bg-red-500/10 px-3 text-xs font-bold text-red-200"><FileSignature size={16}/>Documentación para el comprador</button>}
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 flex gap-2 border-t border-crm-border pt-4">
                                <button className="flex-1 rounded border border-crm-border bg-crm-bg py-1.5 text-xs font-bold text-white transition-colors hover:border-crm-red hover:text-crm-red" onClick={(e) => { e.stopPropagation(); setPrintModal({ isOpen: true, type: 'Recibo', tramite }); }}>
                                    Nuevo Recibo
                                </button>
                                <button className="flex-1 rounded border border-crm-border bg-crm-bg py-1.5 text-xs font-bold text-white transition-colors hover:border-crm-red hover:text-crm-red" onClick={(e) => { e.stopPropagation(); setPrintModal({ isOpen: true, type: 'Boleto', tramite }); }}>
                                    Nuevo Boleto
                                </button>
                            </div>

                            {tramite.notes && (
                                <div className="mt-4 rounded-lg bg-crm-bg p-3 text-xs italic text-crm-fg-muted border border-crm-border/50">
                                    {tramite.notes}
                                </div>
                            )}
                        </div>
                    ))}
                    {filteredTramites.length === 0 && (
                        <div className="col-span-full py-12 text-center text-crm-fg-muted">
                            No se encontraron trámites de gestoría.
                        </div>
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="gestoria-edit-title">
                    <div className="w-full max-w-2xl rounded-2xl border border-crm-border bg-crm-surface shadow-2xl my-auto">
                        <div className="flex items-center justify-between border-b border-crm-border px-6 py-4 sticky top-0 bg-crm-surface z-10 rounded-t-2xl">
                            <h2 id="gestoria-edit-title" className="text-lg font-bold text-white">{editingTramite ? 'Editar Trámite' : 'Nuevo Trámite'}</h2>
                            <button type="button" aria-label="Cerrar trámite" onClick={handleCloseModal} className="inline-flex min-h-11 min-w-11 items-center justify-center text-crm-fg-muted hover:text-white text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <BuyerPortalAccessPanel key={formData.saleId || 'unlinked'} saleId={formData.saleId}/>
                            {formData.saleId && hasPermission(user, PERMISSIONS.GESTORIA_READ) && <button type="button" onClick={() => setDocumentsSaleId(formData.saleId)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-solid border-blue-400/30 bg-blue-500/10 px-4 text-sm font-bold text-blue-300"><FileSignature size={17}/>Ver documentación del cliente</button>}
                            {editingId && canReadEmailHistory && <div className="min-w-0 space-y-2" aria-label="Último aviso por correo">
                                {!modalEmailHistory ? <p role="status" className="text-xs text-crm-fg-muted">Consultando el último aviso por correo…</p> : modalEmailHistory.error ? <p role="alert" className="text-xs text-amber-300">{modalEmailHistory.error}</p> : <GestoriaStatusEmailNotice notification={modalEmailHistory.notification} historical retrying={retryingEmail} retryError={retryError} onRetry={canRetryEmail ? () => handleRetryEmail(modalEmailHistory) : undefined}/>}
                            </div>}
                            
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-crm-red border-b border-crm-border/50 pb-2 uppercase tracking-wider">Identificación del Trámite</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-full">
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Título Corto *</label>
                                        <input required type="text" placeholder="Ej: Transferencia Hilux SRV" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Tipo de Trámite</label>
                                        <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red appearance-none">
                                            <option value="Transferencia Ingreso">Transferencia Ingreso (Permuta/Compra)</option>
                                            <option value="Transferencia Egreso">Transferencia Egreso (Venta)</option>
                                            <option value="08 Blanco">Firma 08 en Blanco</option>
                                            <option value="Informe Dominio">Informe de Dominio</option>
                                            <option value="Alta Patente">Alta Patente</option>
                                            <option value="Baja Patente">Baja Patente</option>
                                            <option value="Duplicado Título">Duplicado de Título</option>
                                            <option value="Cédula Azul">Cédula Azul / Autorizado</option>
                                            <option value="Otro">Otro Trámite</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Patente del Vehículo</label>
                                        <input type="text" placeholder="Ej: AB123CD" value={formData.vehiclePlate} onChange={e => setFormData({...formData, vehiclePlate: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg uppercase focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Vincular Expediente (Venta)</label>
                                        <select value={formData.saleId} onChange={e => {
                                            const selectedSale = sales.find(s => s._id === e.target.value);
                                            setFormData({
                                                ...formData, 
                                                saleId: e.target.value,
                                                vehiclePlate: selectedSale?.vehicleId?.plateOrVin || formData.vehiclePlate
                                            });
                                        }} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red appearance-none">
                                            <option value="">Ninguno</option>
                                            {sales.filter(s => s.status !== 'cancelada' && s.status !== 'borrador').map(s => (
                                                <option key={s._id} value={s._id}>
                                                    {(s.clientId?.fullName || s.clientId?.firstName)} - {s.vehicleId?.brand} {s.vehicleId?.name} ({s.vehicleId?.plateOrVin})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Comprador (Cliente)</label>
                                        <select value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red appearance-none">
                                            <option value="">Ninguno</option>
                                            {clients.map(c => <option key={c._id} value={c._id}>{c.fullName || c.firstName + ' ' + c.lastName}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Propietario / Vendedor</label>
                                        <select value={formData.sellerId} onChange={e => setFormData({...formData, sellerId: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red appearance-none">
                                            <option value="">Ninguno</option>
                                            {clients.map(c => <option key={c._id} value={c._id}>{c.fullName || c.firstName + ' ' + c.lastName}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-crm-red border-b border-crm-border/50 pb-2 uppercase tracking-wider">Seguimiento y Costos</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Gestor Asignado</label>
                                        <input type="text" placeholder="Nombre del gestor/estudio" value={formData.gestorName} onChange={e => setFormData({...formData, gestorName: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Fecha Estimada de Finalización</label>
                                        <input type="date" value={formData.estimatedEndDate} onChange={e => setFormData({...formData, estimatedEndDate: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red [color-scheme:dark]" />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="w-1/3">
                                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Moneda</label>
                                            <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red appearance-none">
                                                <option value="ARS">ARS</option>
                                                <option value="USD">USD</option>
                                            </select>
                                        </div>
                                        <div className="w-2/3">
                                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Costo / Arancel</label>
                                            <input type="number" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Organismo Registral</label>
                                        <input type="text" placeholder="Ej: RNPA Seccional 2" value={formData.organismo} onChange={e => setFormData({...formData, organismo: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Monto a cobrar al comprador</label>
                                        <input type="number" min="0" step="0.01" placeholder="Total acordado de gestoría" value={formData.clientChargeAmount} onChange={e => setFormData({...formData, clientChargeAmount: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                        <p className="mt-1 text-xs text-crm-fg-muted">El portal muestra este total menos lo ya cobrado. Cargar un comprobante no modifica lo recibido.</p>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Monto Cobrado al Cliente</label>
                                        <input type="number" placeholder="Ej: 50000" value={formData.chargedAmount} onChange={e => setFormData({...formData, chargedAmount: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-crm-red border-b border-crm-border/50 pb-2 uppercase tracking-wider">Estado y Observaciones</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Estado del Trámite</label>
                                        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-white font-bold focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red appearance-none">
                                            <option value="Pendiente">Pendiente</option>
                                            <option value="Documentación">Documentación</option>
                                            <option value="Presentado">Presentado</option>
                                            <option value="Observado">Observado (Con Problemas)</option>
                                            <option value="Transferido">Transferido</option>
                                            <option value="Finalizado">Finalizado</option>
                                            <option value="Cancelado">Cancelado</option>
                                        </select>
                                        <p className="mt-2 text-xs leading-relaxed text-crm-fg-muted">Al cambiar el estado se avisa por correo al comprador registrado.</p>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Observaciones</label>
                                        <textarea rows="2" placeholder="Firma pendiente de la esposa, falta libre deuda..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red resize-none"></textarea>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-crm-red border-b border-crm-border/50 pb-2 uppercase tracking-wider">Documentos Adjuntos</h3>
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-4">
                                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-crm-border bg-crm-surface px-4 py-2 text-sm font-bold text-crm-fg transition-colors hover:bg-crm-surface-raised">
                                            <Upload size={16} className="text-crm-fg-muted" />
                                            {isUploading ? 'Subiendo...' : 'Subir Imágenes'}
                                            <input 
                                                type="file" 
                                                multiple 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={handleFileUpload} 
                                                disabled={isUploading}
                                            />
                                        </label>
                                        <span className="text-xs text-crm-fg-muted">Fotos del 08, comprobantes, etc.</span>
                                    </div>
                                    
                                    {formData.documents && formData.documents.length > 0 && (
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mt-2">
                                            {formData.documents.map((doc, idx) => (
                                                <div key={idx} className="group relative aspect-video overflow-hidden rounded-lg border border-crm-border bg-crm-surface">
                                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
                                                        <img 
                                                            src={doc.url} 
                                                            alt={doc.name} 
                                                            className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100" 
                                                        />
                                                    </a>
                                                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => { e.preventDefault(); removeDocument(idx); }}
                                                        className="absolute right-1.5 top-1.5 rounded-full bg-red-500/80 p-1 text-white opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100 z-10"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                    <div className="pointer-events-none absolute bottom-1.5 left-1.5 right-1.5 truncate text-[10px] text-white/80 opacity-0 transition-opacity group-hover:opacity-100">
                                                        {doc.name}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-crm-border">
                                <CrmButton type="button" variant="secondary" onClick={handleCloseModal} disabled={isSaving}>Cancelar</CrmButton>
                                <CrmButton type="submit" variant="primary" disabled={isSaving}>{isSaving ? 'Guardando…' : 'Guardar Trámite'}</CrmButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {documentsSaleId && <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/85 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="gestoria-documents-title" data-gestoria-buyer-documents>
                <div className="mx-auto w-full max-w-4xl space-y-3 rounded-2xl border border-solid border-crm-border bg-crm-surface p-3 sm:p-5">
                    <div className="flex items-center justify-between gap-3"><h2 id="gestoria-documents-title" className="text-lg font-bold text-crm-fg">Documentación del cliente</h2><button type="button" autoFocus onClick={() => setDocumentsSaleId('')} aria-label="Cerrar documentación del cliente" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-solid border-crm-border text-crm-fg"><X size={20}/></button></div>
                    <BuyerDocumentsPanel key={documentsSaleId} saleId={documentsSaleId} initiallyOpen readOnly title="Archivos del vehículo recibido"/>
                </div>
            </div>}
            {deliverySaleId && <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/85 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="gestoria-delivery-documents-title" data-gestoria-delivery-documents>
                <div className="mx-auto w-full max-w-4xl space-y-3 rounded-2xl border border-solid border-crm-border bg-crm-surface p-3 sm:p-5">
                    <div className="flex items-center justify-between gap-3"><h2 id="gestoria-delivery-documents-title" className="text-lg font-bold text-crm-fg">Documentación para el comprador</h2><button type="button" autoFocus onClick={() => setDeliverySaleId('')} aria-label="Cerrar documentación para el comprador" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-solid border-crm-border text-crm-fg"><X size={20}/></button></div>
                    <BuyerDeliveryDocumentsPanel key={deliverySaleId} saleId={deliverySaleId}/>
                </div>
            </div>}

            <ConfirmModal
                isOpen={confirmDeleteModal.isOpen}
                onClose={() => setConfirmDeleteModal({ isOpen: false, id: null })}
                onConfirm={confirmDelete}
                title="Eliminar Trámite"
                message="¿Seguro que deseas eliminar este trámite de gestoría? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                isDestructive={true}
            />
        </div>
    );
}
