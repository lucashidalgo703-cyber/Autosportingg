"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Wrench, AlertTriangle, ShieldCheck, Trash2, Edit, Save, ImageIcon, Eye, Plus, Send, Copy, Check, X, FileText, ChevronDown, ChevronUp, DollarSign, Calendar, Clock, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS, ROLES } from '../../../utils/adminPermissions';
import { workshopFetch } from '../../../utils/workshopApiClient';
import CrmButton from '../ui/CrmButton';
import CrmModal from '../ui/CrmModal';
import CrmInput from '../ui/CrmInput';
import CrmSelect from '../ui/CrmSelect';
import CrmTextarea from '../ui/CrmTextarea';
import CrmBadge from '../ui/CrmBadge';

const FieldLabel = ({ children, required = false }) => (
    <label className="mb-1 block text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider">
        {children}{required && <span className="text-crm-red"> *</span>}
    </label>
);

export default function WorkshopOrderDetail({ isOpen, onClose, orderId, onRefresh }) {
    const { token, user } = useAuth();
    const [order, setOrder] = useState(null);
    const [providers, setProviders] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [apiError, setApiError] = useState('');

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});
    const [submitLoading, setSubmitLoading] = useState(false);

    // Cancel state
    const [isCancelling, setIsCancelling] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelLoading, setCancelLoading] = useState(false);

    // Transition state
    const [transitionLoading, setTransitionLoading] = useState(false);

    // ========================================================
    // FASE 3: PRESUPUESTOS Y COTIZACIONES STATES
    // ========================================================
    const [activeTab, setActiveTab] = useState('estimates');
    const [estimates, setEstimates] = useState([]);
    const [quotes, setQuotes] = useState([]);
    const [loadingEstimates, setLoadingEstimates] = useState(false);
    const [loadingQuotes, setLoadingQuotes] = useState(false);
    const [expandedEstimates, setExpandedEstimates] = useState({});
    const [expandedQuotes, setExpandedQuotes] = useState({});

    // Modales de creación/edición
    const [isEstimateModalOpen, setIsEstimateModalOpen] = useState(false);
    const [editingEstimate, setEditingEstimate] = useState(null);
    const [estimateFormData, setEstimateFormData] = useState({
        providerQuoteId: '',
        currency: 'ARS',
        items: [{ type: 'labor', description: '', quantity: 1, providerCost: 0, clientPrice: 0 }],
        notes: ''
    });

    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [editingQuote, setEditingQuote] = useState(null);
    const [quoteFormData, setQuoteFormData] = useState({
        providerId: '',
        currency: 'ARS',
        items: [{ type: 'labor', description: '', quantity: 1, providerCost: 0 }],
        notes: ''
    });

    const hasCostsPermission = [ROLES.OWNER, ROLES.ADMIN].includes(user?.role) ||
                               hasPermission(user, PERMISSIONS.TALLER_COSTS_READ) ||
                               hasPermission(user, PERMISSIONS.TALLER_ADMIN);

    // Checkbox items for checklist
    const standardChecklistItems = [
        'Rueda de auxilio',
        'Cric y llave de rueda',
        'Balizas',
        'Matafuegos',
        'Estéreo',
        'Parlantes',
        'Antena',
        'Cables de puente',
        'Chaleco reflectivo',
        'Botiquín'
    ];

    const fetchOrderDetails = useCallback(async () => {
        if (!token || !orderId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await workshopFetch(`/api/admin/workshop/orders/${orderId}`, { token });
            if (!res.ok) {
                if (res.status === 404) throw new Error('Orden de taller no encontrada.');
                throw new Error('Error al cargar detalle de la orden.');
            }
            const data = await res.json();
            setOrder(data);

            // Map to editData
            setEditData({
                providerId: data.providerId?._id || data.providerId || '',
                assignedTo: data.assignedTo?._id || data.assignedTo || '',
                sellerId: data.sellerId?._id || data.sellerId || '',
                km: data.km || '',
                fuelLevel: data.fuelLevel || 'medio',
                checklist: data.checklist || [],
                damage: data.damage || '',
                accessories: data.accessories || '',
                requestedWork: data.requestedWork || '',
                admissionDate: data.admissionDate ? new Date(data.admissionDate).toISOString().slice(0, 10) : '',
                deliveryDate: data.deliveryDate ? new Date(data.deliveryDate).toISOString().slice(0, 10) : ''
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token, orderId]);

    const fetchEstimates = useCallback(async () => {
        if (!token || !orderId) return;
        setLoadingEstimates(true);
        try {
            const res = await workshopFetch(`/api/admin/workshop/orders/${orderId}/estimates`, { token });
            if (res.ok) {
                const data = await res.json();
                setEstimates(data);
            }
        } catch (err) {
            console.error('Error al cargar presupuestos:', err);
        } finally {
            setLoadingEstimates(false);
        }
    }, [token, orderId]);

    const fetchQuotes = useCallback(async () => {
        if (!token || !orderId) return;
        const hasCosts = [ROLES.OWNER, ROLES.ADMIN].includes(user?.role) ||
                         hasPermission(user, PERMISSIONS.TALLER_COSTS_READ) ||
                         hasPermission(user, PERMISSIONS.TALLER_ADMIN);
        if (!hasCosts) return;

        setLoadingQuotes(true);
        try {
            const res = await workshopFetch(`/api/admin/workshop/quotes?workshopOrderId=${orderId}`, { token });
            if (res.ok) {
                const data = await res.json();
                setQuotes(data);
            }
        } catch (err) {
            console.error('Error al cargar cotizaciones:', err);
        } finally {
            setLoadingQuotes(false);
        }
    }, [token, orderId, user]);

    const getEstimateStatusVariant = (status) => {
        switch (status) {
            case 'borrador': return 'info';
            case 'listo_para_enviar': return 'warning';
            case 'enviado': return 'info';
            case 'aprobado':
            case 'parcialmente_aprobado': return 'success';
            case 'rechazado':
            case 'vencido':
            case 'reemplazado': return 'danger';
            default: return 'info';
        }
    };

    const getEstimateStatusLabel = (status) => {
        const labels = {
            borrador: 'Borrador',
            listo_para_enviar: 'Listo para Enviar',
            enviado: 'Enviado',
            parcialmente_aprobado: 'Parcialmente Aprobado',
            aprobado: 'Aprobado',
            rechazado: 'Rechazado',
            vencido: 'Vencido',
            reemplazado: 'Reemplazado'
        };
        return labels[status] || status;
    };

    const handleCreateOrUpdateEstimate = async () => {
        if (!token) return;
        if (estimateFormData.items.some(i => !i.description.trim() || Number(i.quantity) <= 0 || Number(i.clientPrice) < 0)) {
            toast.error('Complete la descripción, cantidad (>0) y precio (>=0) en todos los ítems.');
            return;
        }

        try {
            const method = editingEstimate ? 'PUT' : 'POST';
            const url = editingEstimate
                ? `/api/admin/workshop/estimates/${editingEstimate.id || editingEstimate._id}`
                : `/api/admin/workshop/estimates`;

            const payload = {
                workshopOrderId: orderId,
                providerQuoteId: estimateFormData.providerQuoteId || undefined,
                currency: estimateFormData.currency,
                items: estimateFormData.items.map(i => ({
                    type: i.type,
                    description: i.description.trim(),
                    quantity: Number(i.quantity),
                    providerCost: hasCostsPermission ? Number(i.providerCost || 0) : 0,
                    clientPrice: Number(i.clientPrice)
                })),
                notes: estimateFormData.notes
            };

            const res = await workshopFetch(url, {
                method,
                token,
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Error al guardar el presupuesto comercial.');
            }

            toast.success(editingEstimate ? 'Presupuesto modificado exitosamente.' : 'Presupuesto creado exitosamente.');
            setIsEstimateModalOpen(false);
            fetchEstimates();
            fetchOrderDetails();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleCreateOrUpdateQuote = async () => {
        if (!token) return;
        if (!quoteFormData.providerId) {
            toast.error('Debe seleccionar un proveedor.');
            return;
        }
        if (quoteFormData.items.some(i => !i.description.trim() || Number(i.quantity) <= 0 || Number(i.providerCost) < 0)) {
            toast.error('Complete la descripción, cantidad (>0) y costo (>=0) en todos los ítems.');
            return;
        }

        try {
            const method = editingQuote ? 'PUT' : 'POST';
            const url = editingQuote
                ? `/api/admin/workshop/quotes/${editingQuote.id || editingQuote._id}`
                : `/api/admin/workshop/quotes`;

            const payload = {
                workshopOrderId: orderId,
                providerId: quoteFormData.providerId,
                currency: quoteFormData.currency,
                items: quoteFormData.items.map(i => ({
                    type: i.type,
                    description: i.description.trim(),
                    quantity: Number(i.quantity),
                    providerCost: Number(i.providerCost)
                })),
                notes: quoteFormData.notes
            };

            const res = await workshopFetch(url, {
                method,
                token,
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Error al guardar la cotización.');
            }

            toast.success(editingQuote ? 'Cotización modificada exitosamente.' : 'Cotización creada exitosamente.');
            setIsQuoteModalOpen(false);
            fetchQuotes();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleEstimateAction = async (id, action, additionalBody = {}) => {
        if (!token) return;
        try {
            const res = await workshopFetch(`/api/admin/workshop/estimates/${id}/${action}`, {
                method: 'POST',
                token,
                body: JSON.stringify(additionalBody)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Error al realizar acción.');
            }

            toast.success('Presupuesto actualizado.');
            fetchEstimates();
            fetchOrderDetails();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleEstimateDelete = async (id) => {
        if (!token) return;
        if (!window.confirm('¿Está seguro de eliminar este presupuesto en borrador?')) return;
        try {
            const res = await workshopFetch(`/api/admin/workshop/estimates/${id}`, {
                method: 'DELETE',
                token
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Error al eliminar el presupuesto.');
            }

            toast.success('Presupuesto eliminado.');
            fetchEstimates();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleQuoteDelete = async (id) => {
        if (!token) return;
        if (!window.confirm('¿Está seguro de eliminar esta cotización?')) return;
        try {
            const res = await workshopFetch(`/api/admin/workshop/quotes/${id}`, {
                method: 'DELETE',
                token
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Error al eliminar la cotización.');
            }

            toast.success('Cotización eliminada.');
            fetchQuotes();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleImportQuoteItems = () => {
        const selectedQuoteId = estimateFormData.providerQuoteId;
        if (!selectedQuoteId) return;
        const quote = quotes.find(q => q.id === selectedQuoteId || q._id === selectedQuoteId);
        if (!quote) return;

        const importedItems = quote.items.map(item => ({
            type: item.type,
            description: item.description,
            quantity: item.quantity,
            providerCost: item.providerCost || 0,
            clientPrice: item.providerCost ? Math.round(item.providerCost * 1.3 * 100) / 100 : 0
        }));

        setEstimateFormData(prev => ({
            ...prev,
            currency: quote.currency,
            items: importedItems
        }));
        toast.success('Items importados de la cotización. Defina precios al cliente.');
    };

    const fetchProvidersAndUsers = useCallback(async () => {
        if (!token) return;
        setApiError('');
        try {
            const [providersRes, usersRes] = await Promise.all([
                workshopFetch(`/api/admin/workshop/providers?limit=100`, { token }),
                workshopFetch(`/api/admin/users/active`, { token })
            ]);

            if (!providersRes.ok) {
                throw new Error('Error al cargar proveedores.');
            }
            if (!usersRes.ok) {
                throw new Error('Error al obtener lista de usuarios activos.');
            }

            const providersData = await providersRes.json();
            setProviders(providersData.data || []);

            const usersData = await usersRes.json();
            setUsers(usersData || []);
        } catch (err) {
            setApiError(err.message || 'Error en la conexión.');
        }
    }, [token]);

    useEffect(() => {
        if (isOpen && orderId) {
            fetchOrderDetails();
            fetchProvidersAndUsers();
            fetchEstimates();
            fetchQuotes();
            setIsEditing(false);
            setIsCancelling(false);
            setCancelReason('');
            setActiveTab('estimates');
        }
    }, [isOpen, orderId, fetchOrderDetails, fetchProvidersAndUsers, fetchEstimates, fetchQuotes]);

    const handleUpdateField = (field, value) => {
        setEditData(prev => ({ ...prev, [field]: value }));
    };

    const handleChecklistToggle = (item) => {
        setEditData(prev => {
            const currentList = prev.checklist || [];
            const newList = currentList.includes(item)
                ? currentList.filter(x => x !== item)
                : [...currentList, item];
            return { ...prev, checklist: newList };
        });
    };

    const handleSave = async () => {
        if (!token) return;
        setSubmitLoading(true);
        try {
            const payload = { ...editData };
            // Sanitize empty strings to null for objectIds
            if (!payload.providerId) payload.providerId = 'null';
            if (!payload.assignedTo) payload.assignedTo = 'null';
            if (!payload.sellerId) payload.sellerId = 'null';

            const res = await workshopFetch(`/api/admin/workshop/orders/${orderId}`, {
                method: 'PATCH',
                token,
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error al guardar cambios.');
            }

            const updatedOrder = await res.json();
            setOrder(updatedOrder);
            setIsEditing(false);
            toast.success('Orden de taller actualizada.');
            onRefresh?.();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleTransition = async (toStatus) => {
        if (!token) return;
        setTransitionLoading(true);
        try {
            const res = await workshopFetch(`/api/admin/workshop/orders/${orderId}/transition`, {
                method: 'POST',
                token,
                body: JSON.stringify({ toStatus })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error al transicionar estado.');
            }

            const updatedOrder = await res.json();
            setOrder(updatedOrder);
            toast.success(`Orden transicionada a ${toStatus}.`);
            onRefresh?.();
            fetchOrderDetails();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setTransitionLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!token) return;
        if (!cancelReason.trim()) {
            toast.error('El motivo de cancelación es obligatorio.');
            return;
        }
        setCancelLoading(true);
        try {
            const res = await workshopFetch(`/api/admin/workshop/orders/${orderId}/cancel`, {
                method: 'POST',
                token,
                body: JSON.stringify({ reason: cancelReason })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error al cancelar orden.');
            }

            const updatedOrder = await res.json();
            setOrder(updatedOrder);
            setIsCancelling(false);
            toast.success('Orden de taller cancelada.');
            onRefresh?.();
            fetchOrderDetails();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setCancelLoading(false);
        }
    };

    if (!isOpen) return null;

    const canEdit = hasPermission(user, PERMISSIONS.TALLER_WRITE);
    const canCancel = hasPermission(user, PERMISSIONS.TALLER_ADMIN);

    const getStatusVariant = (status) => {
        switch (status) {
            case 'ingresado':
            case 'cotizando':
                return 'info';
            case 'esperando_aprobacion':
                return 'warning';
            case 'aprobado':
            case 'en_trabajo':
            case 'recibido':
            case 'listo':
            case 'entregado':
                return 'success';
            case 'cancelado':
                return 'danger';
            default:
                return 'info';
        }
    };

    const getStatusLabel = (status) => {
        const labels = {
            ingresado: 'Ingresado',
            cotizando: 'Cotizando',
            esperando_aprobacion: 'Esperando Aprob.',
            aprobado: 'Aprobado',
            enviado_proveedor: 'Enviado Proveedor',
            en_trabajo: 'En Trabajo',
            terminado_proveedor: 'Terminado Proveedor',
            recibido: 'Recibido',
            listo: 'Listo',
            entregado: 'Entregado',
            cancelado: 'Cancelado',
            en_garantia: 'En Garantía'
        };
        return labels[status] || status;
    };

    const getStatusColorClass = (status) => {
        switch (status) {
            case 'ingresado': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
            case 'cotizando': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
            case 'esperando_aprobacion': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
            case 'aprobado': return 'bg-green-500/10 text-green-400 border border-green-500/20';
            case 'en_trabajo': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
            case 'listo': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
            case 'cancelado': return 'bg-red-500/10 text-red-400 border border-red-500/20';
            default: return 'bg-crm-border/15 text-crm-fg-muted border border-crm-border/30';
        }
    };

    const modalTitle = order ? (
        <div className="flex flex-wrap items-center gap-3">
            <h2 className="m-0 text-lg font-bold text-crm-fg tracking-tight">Orden #{order.orderNumber}</h2>
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusColorClass(order.status)}`}>
                {getStatusLabel(order.status)}
            </span>
        </div>
    ) : 'Cargando...';

    const modalFooter = order && (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-start w-full">
            {isEditing ? (
                <>
                    <CrmButton variant="secondary" onClick={() => setIsEditing(false)} disabled={submitLoading} className="px-5 border-crm-border bg-crm-bg text-crm-fg hover:bg-crm-surface-raised">
                        Cancelar Edición
                    </CrmButton>
                    <div className="flex-1 hidden sm:block"></div>
                    <CrmButton variant="primary" onClick={handleSave} disabled={submitLoading} className="px-5 bg-crm-red hover:bg-crm-red/90 text-white">
                        <Save size={14} className="mr-1.5" /> {submitLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </CrmButton>
                </>
            ) : (
                <>
                    <CrmButton variant="secondary" onClick={onClose} className="px-5 border-crm-border bg-crm-bg text-crm-fg hover:bg-crm-surface-raised">
                        Cerrar
                    </CrmButton>
                    <div className="flex-1 hidden sm:block"></div>
                    {canCancel && (order.status === 'ingresado' || order.status === 'cotizando') && !isCancelling && (
                        <CrmButton variant="danger" onClick={() => setIsCancelling(true)} className="px-4">
                            <Trash2 size={14} className="mr-1.5" /> Cancelar Orden
                        </CrmButton>
                    )}
                    {canEdit && !isEditing && order.status !== 'cancelado' && order.status !== 'entregado' && (
                        <CrmButton variant="secondary" onClick={() => setIsEditing(true)} className="px-4 border-crm-border bg-crm-surface hover:bg-crm-surface-raised text-crm-fg">
                            <Edit size={14} className="mr-1.5" /> Editar Datos
                        </CrmButton>
                    )}
                </>
            )}
        </div>
    );

    return (
        <CrmModal
            isOpen={isOpen}
            onClose={onClose}
            title={modalTitle}
            maxWidth="max-w-4xl"
            footer={modalFooter}
        >
            <div className="px-6 py-6 custom-scrollbar max-h-[75vh] overflow-y-auto">
                {loading ? (
                    <div className="flex h-48 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                    </div>
                ) : error ? (
                    <div className="rounded-xl border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-crm-fg flex items-center gap-2">
                        <AlertTriangle className="text-crm-red" size={16} />
                        <span>{error}</span>
                    </div>
                ) : order && (
                    <div className="space-y-6">
                        {/* Cancellation reasoning overlay/panel */}
                        {isCancelling && (
                            <div className="rounded-xl border border-crm-red/30 bg-crm-red/5 p-4 space-y-3">
                                <h4 className="text-sm font-bold text-red-400 m-0 flex items-center gap-1.5">
                                    <AlertTriangle size={15} /> Confirmación de Cancelación
                                </h4>
                                <p className="text-xs text-crm-fg-muted m-0">
                                    Esta acción cancelará permanentemente la orden #{order.orderNumber} y desvinculará el vehículo del taller.
                                </p>
                                <div className="space-y-1">
                                    <FieldLabel required>Motivo de Cancelación</FieldLabel>
                                    <CrmTextarea
                                        value={cancelReason}
                                        onChange={(e) => setCancelReason(e.target.value)}
                                        placeholder="Escribe el motivo detallado de la cancelación..."
                                        maxLength={1000}
                                        className="bg-crm-bg min-h-[80px]"
                                    />
                                    <span className="text-[10px] text-crm-fg-muted block text-right">{cancelReason.length}/1000 caracteres</span>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <CrmButton variant="secondary" size="sm" onClick={() => setIsCancelling(false)} disabled={cancelLoading} className="h-8 text-xs border-crm-border bg-transparent text-crm-fg">
                                        Volver
                                    </CrmButton>
                                    <CrmButton variant="danger" size="sm" onClick={handleCancel} disabled={cancelLoading} className="h-8 text-xs bg-crm-red text-white hover:bg-crm-red/90">
                                        {cancelLoading ? 'Cancelando...' : 'Confirmar Cancelar'}
                                    </CrmButton>
                                </div>
                            </div>
                        )}

                        {apiError && (
                            <div className="rounded-xl border border-crm-red/30 bg-crm-red/10 px-4 py-3 text-xs font-semibold text-crm-red flex items-center gap-2">
                                <AlertTriangle size={14} className="shrink-0" />
                                <span>{apiError}</span>
                            </div>
                        )}

                        {/* Top Information Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Client & Vehicle */}
                            <div className="bg-crm-surface border border-crm-border rounded-xl p-4 space-y-3">
                                <h3 className="m-0 text-xs font-black uppercase text-crm-fg-muted tracking-wider pb-1.5 border-b border-crm-border">Vehículo y Cliente</h3>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-crm-fg-muted block uppercase">Vehículo</span>
                                    <span className="text-sm font-bold text-crm-fg">{order.vehicleSnapshot?.brand} {order.vehicleSnapshot?.model}</span>
                                    <span className="text-xs font-mono text-crm-fg-muted block uppercase">Patente: {order.vehicleSnapshot?.plate}</span>
                                </div>
                                <div className="space-y-1 pt-1.5 border-t border-crm-border/40">
                                    <span className="text-[10px] font-bold text-crm-fg-muted block uppercase">Cliente</span>
                                    <span className="text-sm font-semibold text-crm-fg">{order.clientId?.name} {order.clientId?.lastName}</span>
                                    {order.clientId?.phone && <span className="text-xs text-crm-fg-muted block">Tel: {order.clientId.phone}</span>}
                                    {order.clientId?.email && <span className="text-xs text-crm-fg-muted block truncate">{order.clientId.email}</span>}
                                </div>
                            </div>

                            {/* Assignments & Providers */}
                            <div className="bg-crm-surface border border-crm-border rounded-xl p-4 space-y-3">
                                <h3 className="m-0 text-xs font-black uppercase text-crm-fg-muted tracking-wider pb-1.5 border-b border-crm-border">Asignación</h3>

                                {isEditing ? (
                                    <div className="space-y-3">
                                        <div>
                                            <FieldLabel>Proveedor / Taller</FieldLabel>
                                            <CrmSelect
                                                value={editData.providerId}
                                                onChange={(e) => handleUpdateField('providerId', e.target.value)}
                                                className="h-8 bg-crm-bg text-crm-fg text-xs py-1"
                                            >
                                                <option value="">— Sin Asignar —</option>
                                                {providers.map(p => (
                                                    <option key={p._id} value={p._id}>{p.name}</option>
                                                ))}
                                            </CrmSelect>
                                        </div>
                                        <div>
                                            <FieldLabel>Responsable Taller</FieldLabel>
                                            <CrmSelect
                                                value={editData.assignedTo}
                                                onChange={(e) => handleUpdateField('assignedTo', e.target.value)}
                                                className="h-8 bg-crm-bg text-crm-fg text-xs py-1"
                                            >
                                                <option value="">— Sin Asignar —</option>
                                                {users.map(u => (
                                                    <option key={u._id} value={u._id}>
                                                        {u.name || u.email} ({u.role || ''})
                                                    </option>
                                                ))}
                                            </CrmSelect>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-[10px] font-bold text-crm-fg-muted block uppercase">Proveedor / Taller</span>
                                            <span className="text-sm font-semibold text-crm-fg">{order.providerId?.name || 'No asignado'}</span>
                                            {order.providerId?.businessName && <span className="text-xs text-crm-fg-muted block">{order.providerId.businessName}</span>}
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-crm-fg-muted block uppercase">Responsable Operaciones</span>
                                            <span className="text-sm font-semibold text-crm-fg">{order.assignedTo?.name || 'Sin asignar'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Dates, Km and State Transition */}
                            <div className="bg-crm-surface border border-crm-border rounded-xl p-4 flex flex-col justify-between">
                                <div>
                                    <h3 className="m-0 text-xs font-black uppercase text-crm-fg-muted tracking-wider pb-1.5 border-b border-crm-border">Datos del Ingreso</h3>
                                    <div className="mt-2 space-y-1.5 text-xs text-crm-fg">
                                        <div className="flex justify-between">
                                            <span className="text-crm-fg-muted">Fecha Ingreso:</span>
                                            <span>{order.admissionDate ? new Date(order.admissionDate).toLocaleDateString() : '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-crm-fg-muted">Est. Entrega:</span>
                                            <span>{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Sin definir'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-crm-fg-muted">Combustible:</span>
                                            <span className="font-semibold capitalize">{order.fuelLevel || 'medio'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Transition to Cotizando */}
                                {order.status === 'ingresado' && canEdit && (
                                    <div className="mt-3 pt-2.5 border-t border-crm-border/40">
                                        <CrmButton
                                            variant="primary"
                                            size="sm"
                                            onClick={() => handleTransition('cotizando')}
                                            disabled={transitionLoading}
                                            className="w-full text-xs h-8 bg-yellow-500 hover:bg-yellow-600 text-black font-bold gap-1"
                                        >
                                            <Wrench size={13} />
                                            <span>{transitionLoading ? 'Procesando...' : 'Iniciar Cotización'}</span>
                                        </CrmButton>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* General details edit form / text display */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Requested Work & Damage */}
                            <div className="space-y-4">
                                <div className="bg-crm-surface border border-crm-border rounded-xl p-4 space-y-3">
                                    <h3 className="m-0 text-xs font-black uppercase text-crm-fg-muted tracking-wider pb-1.5 border-b border-crm-border">Trabajo Solicitado</h3>
                                    {isEditing ? (
                                        <CrmTextarea
                                            value={editData.requestedWork}
                                            onChange={(e) => handleUpdateField('requestedWork', e.target.value)}
                                            className="bg-crm-bg text-crm-fg min-h-[90px] text-xs"
                                        />
                                    ) : (
                                        <p className="text-xs text-crm-fg leading-relaxed m-0 whitespace-pre-wrap">
                                            {order.requestedWork || 'No se detallaron trabajos solicitados.'}
                                        </p>
                                    )}
                                </div>

                                <div className="bg-crm-surface border border-crm-border rounded-xl p-4 space-y-3">
                                    <h3 className="m-0 text-xs font-black uppercase text-crm-fg-muted tracking-wider pb-1.5 border-b border-crm-border">Daños o Detalles Visuales</h3>
                                    {isEditing ? (
                                        <CrmTextarea
                                            value={editData.damage}
                                            onChange={(e) => handleUpdateField('damage', e.target.value)}
                                            className="bg-crm-bg text-crm-fg min-h-[70px] text-xs"
                                        />
                                    ) : (
                                        <p className="text-xs text-crm-fg leading-relaxed m-0 whitespace-pre-wrap">
                                            {order.damage || 'Sin daños registrados.'}
                                        </p>
                                    )}
                                </div>

                                <div className="bg-crm-surface border border-crm-border rounded-xl p-4 space-y-3">
                                    <h3 className="m-0 text-xs font-black uppercase text-crm-fg-muted tracking-wider pb-1.5 border-b border-crm-border">Accesorios o Adicionales</h3>
                                    {isEditing ? (
                                        <CrmInput
                                            value={editData.accessories}
                                            onChange={(e) => handleUpdateField('accessories', e.target.value)}
                                            className="bg-crm-bg text-crm-fg text-xs"
                                        />
                                    ) : (
                                        <p className="text-xs text-crm-fg m-0">
                                            {order.accessories || 'Sin accesorios registrados.'}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Checklist & Photos */}
                            <div className="space-y-4">
                                <div className="bg-crm-surface border border-crm-border rounded-xl p-4 space-y-3">
                                    <h3 className="m-0 text-xs font-black uppercase text-crm-fg-muted tracking-wider pb-1.5 border-b border-crm-border">Inventario de Recepción</h3>
                                    {isEditing ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            {standardChecklistItems.map((item) => {
                                                const checked = editData.checklist?.includes(item);
                                                return (
                                                    <label key={item} className="flex items-center gap-2 cursor-pointer text-xs text-crm-fg hover:text-crm-fg py-0.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => handleChecklistToggle(item)}
                                                            className="h-3.5 w-3.5 rounded border-crm-border bg-crm-bg text-crm-red"
                                                        />
                                                        <span>{item}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            {order.checklist && order.checklist.length > 0 ? (
                                                order.checklist.map((item) => (
                                                    <div key={item} className="flex items-center gap-1.5 text-xs text-crm-fg">
                                                        <ShieldCheck className="text-green-500 shrink-0" size={14} />
                                                        <span>{item}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-xs text-crm-fg-muted col-span-2">Sin elementos inventariados.</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Photos */}
                                <div className="bg-crm-surface border border-crm-border rounded-xl p-4 space-y-3">
                                    <h3 className="m-0 text-xs font-black uppercase text-crm-fg-muted tracking-wider pb-1.5 border-b border-crm-border">Registro Fotográfico</h3>
                                    {order.photos && order.photos.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-2">
                                            {order.photos.map((photo, i) => (
                                                <a
                                                    key={photo._id || i}
                                                    href={photo.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="relative aspect-video rounded-lg overflow-hidden border border-crm-border hover:border-crm-red/50 transition-all bg-black group"
                                                >
                                                    <img
                                                        src={photo.url}
                                                        alt={photo.name}
                                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' rx='2' ry='2'/%3E%3Cpath d='m21 16-4-4-4 4-4-4-4 4'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3C/svg%3E";
                                                        }}
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                        <Eye size={16} className="text-white" />
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-6 border border-dashed border-crm-border/50 rounded-lg bg-crm-bg/10">
                                            <ImageIcon size={24} className="text-crm-fg-subtle mb-1.5" />
                                            <span className="text-[11px] text-crm-fg-muted">Sin fotos asociadas.</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ========================================== */}
                        {/* FASE 3: SECCIÓN DE PRESUPUESTOS Y COTIZACIONES */}
                        {/* ========================================== */}
                        <div className="bg-crm-surface border border-crm-border rounded-xl p-4 space-y-4">
                            <div className="flex border-b border-crm-border/60">
                                <button
                                    type="button"
                                    className={`pb-2.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                                        activeTab === 'estimates'
                                            ? 'border-crm-red text-crm-red'
                                            : 'border-transparent text-crm-fg-muted hover:text-crm-fg'
                                    }`}
                                    onClick={() => setActiveTab('estimates')}
                                >
                                    Presupuestos Comerciales
                                </button>
                                {hasCostsPermission && (
                                    <button
                                        type="button"
                                        className={`pb-2.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                                            activeTab === 'quotes'
                                                ? 'border-crm-red text-crm-red'
                                                : 'border-transparent text-crm-fg-muted hover:text-crm-fg'
                                        }`}
                                        onClick={() => setActiveTab('quotes')}
                                    >
                                        Cotizaciones Proveedor
                                    </button>
                                )}
                            </div>

                            {/* PESTAÑA PRESUPUESTOS */}
                            {activeTab === 'estimates' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-crm-fg-muted m-0">Versiones del Presupuesto Comercial</h4>
                                        {hasPermission(user, PERMISSIONS.TALLER_WRITE) && order.status !== 'cancelado' && order.status !== 'entregado' && (
                                            <CrmButton
                                                variant="secondary"
                                                size="sm"
                                                className="h-8 text-xs border-crm-border bg-crm-bg text-crm-fg hover:bg-crm-surface-raised gap-1"
                                                onClick={() => {
                                                    setEditingEstimate(null);
                                                    setEstimateFormData({
                                                        providerQuoteId: '',
                                                        currency: 'ARS',
                                                        items: [{ type: 'labor', description: '', quantity: 1, providerCost: 0, clientPrice: 0 }],
                                                        notes: ''
                                                    });
                                                    setIsEstimateModalOpen(true);
                                                }}
                                            >
                                                <Plus size={13} />
                                                <span>Nuevo Presupuesto</span>
                                            </CrmButton>
                                        )}
                                    </div>

                                    {loadingEstimates ? (
                                        <div className="text-center py-6 text-xs text-crm-fg-muted animate-pulse">Cargando presupuestos comerciales...</div>
                                    ) : estimates.length === 0 ? (
                                        <div className="text-center py-8 border border-dashed border-crm-border/60 rounded-xl bg-crm-bg/10 text-xs text-crm-fg-muted">
                                            No se crearon presupuestos comerciales para esta orden.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {estimates.map((est) => {
                                                const isExpanded = expandedEstimates[est.id || est._id];
                                                const canEditEst = ['borrador', 'listo_para_enviar'].includes(est.status) && hasPermission(user, PERMISSIONS.TALLER_WRITE);
                                                const canDeleteEst = est.status === 'borrador' && hasPermission(user, PERMISSIONS.TALLER_WRITE);

                                                return (
                                                    <div key={est.id || est._id} className="border border-crm-border rounded-xl bg-crm-bg/15 overflow-hidden transition-all hover:border-crm-border/80">
                                                        <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2 bg-crm-surface/30">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs font-black text-crm-fg uppercase tracking-wider">Versión {est.version}</span>
                                                                <span className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                                                    getEstimateStatusVariant(est.status) === 'success' ? 'bg-crm-success/15 text-crm-success' :
                                                                    getEstimateStatusVariant(est.status) === 'warning' ? 'bg-crm-warning/15 text-crm-warning' :
                                                                    getEstimateStatusVariant(est.status) === 'danger' ? 'bg-crm-red/15 text-crm-red' :
                                                                    'bg-crm-info/15 text-crm-info'
                                                                }`}>
                                                                    {getEstimateStatusLabel(est.status)}
                                                                </span>
                                                                <span className="text-[10px] text-crm-fg-muted">{new Date(est.createdAt).toLocaleString()}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                {canEditEst && (
                                                                    <CrmButton
                                                                        variant="secondary"
                                                                        size="xs"
                                                                        className="h-7 text-[10px] border-crm-border bg-crm-surface text-crm-fg px-2"
                                                                        onClick={() => {
                                                                            setEditingEstimate(est);
                                                                            setEstimateFormData({
                                                                                providerQuoteId: est.providerQuoteId || '',
                                                                                currency: est.currency,
                                                                                items: est.items.map(i => ({
                                                                                    type: i.type,
                                                                                    description: i.description,
                                                                                    quantity: i.quantity,
                                                                                    providerCost: i.providerCost || 0,
                                                                                    clientPrice: i.clientPrice
                                                                                })),
                                                                                notes: est.notes || ''
                                                                            });
                                                                            setIsEstimateModalOpen(true);
                                                                        }}
                                                                    >
                                                                        <Edit size={10} className="mr-1" /> Editar
                                                                    </CrmButton>
                                                                )}
                                                                {est.status === 'borrador' && hasPermission(user, PERMISSIONS.TALLER_WRITE) && (
                                                                    <CrmButton
                                                                        variant="secondary"
                                                                        size="xs"
                                                                        className="h-7 text-[10px] border-crm-border bg-crm-surface text-crm-fg px-2 hover:bg-crm-warning/10"
                                                                        onClick={() => handleEstimateAction(est.id || est._id, 'ready')}
                                                                    >
                                                                        <Check size={10} className="mr-1" /> Listo para Enviar
                                                                    </CrmButton>
                                                                )}
                                                                {(est.status === 'listo_para_enviar' || est.status === 'borrador') && hasPermission(user, PERMISSIONS.TALLER_WRITE) && (
                                                                    <CrmButton
                                                                        variant="secondary"
                                                                        size="xs"
                                                                        className="h-7 text-[10px] border-crm-border bg-crm-surface text-crm-fg px-2 hover:bg-crm-info/10"
                                                                        onClick={() => handleEstimateAction(est.id || est._id, 'send')}
                                                                    >
                                                                        <Send size={10} className="mr-1" /> Enviar
                                                                    </CrmButton>
                                                                )}
                                                                {est.status === 'enviado' && hasPermission(user, PERMISSIONS.TALLER_WRITE) && (
                                                                    <>
                                                                        <CrmButton
                                                                            variant="secondary"
                                                                            size="xs"
                                                                            className="h-7 text-[10px] border-crm-border bg-crm-surface text-crm-fg px-2 hover:bg-crm-success/10"
                                                                            onClick={() => handleEstimateAction(est.id || est._id, 'status', { status: 'aprobado' })}
                                                                        >
                                                                            Aprobar
                                                                        </CrmButton>
                                                                        <CrmButton
                                                                            variant="secondary"
                                                                            size="xs"
                                                                            className="h-7 text-[10px] border-crm-border bg-crm-surface text-crm-fg px-2 hover:bg-crm-red/10"
                                                                            onClick={() => handleEstimateAction(est.id || est._id, 'status', { status: 'rechazado' })}
                                                                        >
                                                                            Rechazar
                                                                        </CrmButton>
                                                                    </>
                                                                )}
                                                                {['enviado', 'aprobado', 'parcialmente_aprobado', 'rechazado'].includes(est.status) && hasPermission(user, PERMISSIONS.TALLER_WRITE) && (
                                                                    <CrmButton
                                                                        variant="secondary"
                                                                        size="xs"
                                                                        className="h-7 text-[10px] border-crm-border bg-crm-surface text-crm-fg px-2"
                                                                        onClick={() => handleEstimateAction(est.id || est._id, 'revision')}
                                                                    >
                                                                        <Copy size={10} className="mr-1" /> Revisar (Clonar)
                                                                    </CrmButton>
                                                                )}
                                                                {canDeleteEst && (
                                                                    <button
                                                                        type="button"
                                                                        className="p-1.5 text-crm-red hover:bg-crm-red/10 rounded-lg transition-all"
                                                                        onClick={() => handleEstimateDelete(est.id || est._id)}
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    className="p-1.5 text-crm-fg-muted hover:bg-crm-border/30 rounded-lg transition-all"
                                                                    onClick={() => setExpandedEstimates(prev => ({ ...prev, [est.id || est._id]: !prev[est.id || est._id] }))}
                                                                >
                                                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* EXPANDED ITEMS */}
                                                        {isExpanded && (
                                                            <div className="p-4 border-t border-crm-border space-y-4 bg-crm-bg/5">
                                                                <table className="w-full text-left text-xs border-collapse">
                                                                    <thead>
                                                                        <tr className="border-b border-crm-border/40 text-crm-fg-muted font-bold">
                                                                            <th className="pb-2">Tipo</th>
                                                                            <th className="pb-2">Descripción</th>
                                                                            <th className="pb-2 text-center">Cant.</th>
                                                                            {hasCostsPermission && <th className="pb-2 text-right">Costo Unit.</th>}
                                                                            <th className="pb-2 text-right">Precio Unit.</th>
                                                                            <th className="pb-2 text-right">Subtotal</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {est.items.map((item, idx) => (
                                                                            <tr key={idx} className="border-b border-crm-border/20 text-crm-fg">
                                                                                <td className="py-2 capitalize font-medium text-crm-fg-subtle">{item.type === 'labor' ? 'Mano de Obra' : item.type === 'part' ? 'Repuesto' : 'Tercerizado'}</td>
                                                                                <td className="py-2">{item.description}</td>
                                                                                <td className="py-2 text-center">{item.quantity}</td>
                                                                                {hasCostsPermission && <td className="py-2 text-right font-mono">{est.currency} {(item.providerCost || 0).toLocaleString()}</td>}
                                                                                <td className="py-2 text-right font-mono font-semibold">{est.currency} {item.clientPrice.toLocaleString()}</td>
                                                                                <td className="py-2 text-right font-mono font-bold text-crm-fg">{est.currency} {(item.quantity * item.clientPrice).toLocaleString()}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>

                                                                {/* Resumen Financiero */}
                                                                <div className="flex flex-wrap gap-4 items-center justify-between pt-2 border-t border-crm-border/30">
                                                                    {est.notes && (
                                                                        <div className="text-[11px] text-crm-fg-muted italic max-w-md">
                                                                            <span className="font-bold uppercase tracking-wider block text-[9px] not-italic mb-0.5">Notas del Presupuesto</span>
                                                                            "{est.notes}"
                                                                        </div>
                                                                    )}
                                                                    <div className="ml-auto space-y-1.5 text-xs text-crm-fg">
                                                                        {hasCostsPermission && (
                                                                            <>
                                                                                <div className="flex justify-between gap-12">
                                                                                    <span className="text-crm-fg-muted">Costo de Proveedor:</span>
                                                                                    <span className="font-mono">{est.currency} {est.totalCost?.toLocaleString()}</span>
                                                                                </div>
                                                                                <div className="flex justify-between gap-12 text-green-400 font-semibold">
                                                                                    <span>Ganancia Estimada:</span>
                                                                                    <span className="font-mono">{est.currency} {est.profit?.toLocaleString()}</span>
                                                                                </div>
                                                                                <div className="flex justify-between gap-12 text-yellow-500 font-semibold">
                                                                                    <span>Margen de Ganancia:</span>
                                                                                    <span className="font-mono">{est.margin}%</span>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                        <div className="flex justify-between gap-12 text-sm font-black border-t border-crm-border/60 pt-1.5">
                                                                            <span className="text-crm-fg">TOTAL CLIENTE:</span>
                                                                            <span className="font-mono text-crm-red">{est.currency} {est.totalPrice.toLocaleString()}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* PESTAÑA COTIZACIONES */}
                            {activeTab === 'quotes' && hasCostsPermission && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-crm-fg-muted m-0">Cotizaciones Recibidas de Proveedores</h4>
                                        {hasPermission(user, PERMISSIONS.TALLER_WRITE) && order.status !== 'cancelado' && order.status !== 'entregado' && (
                                            <CrmButton
                                                variant="secondary"
                                                size="sm"
                                                className="h-8 text-xs border-crm-border bg-crm-bg text-crm-fg hover:bg-crm-surface-raised gap-1"
                                                onClick={() => {
                                                    setEditingQuote(null);
                                                    setQuoteFormData({
                                                        providerId: order.providerId?._id || order.providerId || '',
                                                        currency: 'ARS',
                                                        items: [{ type: 'labor', description: '', quantity: 1, providerCost: 0 }],
                                                        notes: ''
                                                    });
                                                    setIsQuoteModalOpen(true);
                                                }}
                                            >
                                                <Plus size={13} />
                                                <span>Nueva Cotización</span>
                                            </CrmButton>
                                        )}
                                    </div>

                                    {loadingQuotes ? (
                                        <div className="text-center py-6 text-xs text-crm-fg-muted animate-pulse">Cargando cotizaciones...</div>
                                    ) : quotes.length === 0 ? (
                                        <div className="text-center py-8 border border-dashed border-crm-border/60 rounded-xl bg-crm-bg/10 text-xs text-crm-fg-muted">
                                            No se registraron cotizaciones para esta orden.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {quotes.map((q) => {
                                                const isExpanded = expandedQuotes[q.id || q._id];
                                                return (
                                                    <div key={q.id || q._id} className="border border-crm-border rounded-xl bg-crm-bg/15 overflow-hidden transition-all hover:border-crm-border/80">
                                                        <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2 bg-crm-surface/30">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs font-black text-crm-fg uppercase tracking-wider">Versión {q.version}</span>
                                                                <span className="text-xs font-semibold text-crm-fg-subtle">{q.providerId?.name || 'Proveedor'}</span>
                                                                <span className="text-[10px] text-crm-fg-muted">{new Date(q.createdAt).toLocaleString()}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-black text-crm-fg font-mono mr-2">{q.currency} {q.totalCost.toLocaleString()}</span>
                                                                {hasPermission(user, PERMISSIONS.TALLER_WRITE) && q.status !== 'aprobado' && (
                                                                    <CrmButton
                                                                        variant="secondary"
                                                                        size="xs"
                                                                        className="h-7 text-[10px] border-crm-border bg-crm-surface text-crm-fg px-2"
                                                                        onClick={() => {
                                                                            setEditingQuote(q);
                                                                            setQuoteFormData({
                                                                                providerId: q.providerId?._id || q.providerId || '',
                                                                                currency: q.currency,
                                                                                items: q.items.map(i => ({
                                                                                    type: i.type,
                                                                                    description: i.description,
                                                                                    quantity: i.quantity,
                                                                                    providerCost: i.providerCost
                                                                                })),
                                                                                notes: q.notes || ''
                                                                            });
                                                                            setIsQuoteModalOpen(true);
                                                                        }}
                                                                    >
                                                                        <Edit size={10} className="mr-1" /> Editar
                                                                    </CrmButton>
                                                                )}
                                                                {hasPermission(user, PERMISSIONS.TALLER_WRITE) && q.status !== 'aprobado' && (
                                                                    <button
                                                                        type="button"
                                                                        className="p-1.5 text-crm-red hover:bg-crm-red/10 rounded-lg transition-all"
                                                                        onClick={() => handleQuoteDelete(q.id || q._id)}
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    className="p-1.5 text-crm-fg-muted hover:bg-crm-border/30 rounded-lg transition-all"
                                                                    onClick={() => setExpandedQuotes(prev => ({ ...prev, [q.id || q._id]: !prev[q.id || q._id] }))}
                                                                >
                                                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* EXPANDED ITEMS */}
                                                        {isExpanded && (
                                                            <div className="p-4 border-t border-crm-border space-y-4 bg-crm-bg/5">
                                                                <table className="w-full text-left text-xs border-collapse">
                                                                    <thead>
                                                                        <tr className="border-b border-crm-border/40 text-crm-fg-muted font-bold">
                                                                            <th className="pb-2">Tipo</th>
                                                                            <th className="pb-2">Descripción</th>
                                                                            <th className="pb-2 text-center">Cant.</th>
                                                                            <th className="pb-2 text-right">Costo Unit.</th>
                                                                            <th className="pb-2 text-right">Subtotal Costo</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {q.items.map((item, idx) => (
                                                                            <tr key={idx} className="border-b border-crm-border/20 text-crm-fg">
                                                                                <td className="py-2 capitalize font-medium text-crm-fg-subtle">{item.type === 'labor' ? 'Mano de Obra' : item.type === 'part' ? 'Repuesto' : 'Tercerizado'}</td>
                                                                                <td className="py-2">{item.description}</td>
                                                                                <td className="py-2 text-center">{item.quantity}</td>
                                                                                <td className="py-2 text-right font-mono">{q.currency} {item.providerCost.toLocaleString()}</td>
                                                                                <td className="py-2 text-right font-mono font-bold text-crm-fg">{q.currency} {(item.quantity * item.providerCost).toLocaleString()}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>

                                                                {q.notes && (
                                                                    <div className="text-[11px] text-crm-fg-muted italic pt-2 border-t border-crm-border/30">
                                                                        <span className="font-bold uppercase tracking-wider block text-[9px] not-italic mb-0.5">Notas del Proveedor</span>
                                                                        "{q.notes}"
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* State History */}
                        <div className="bg-crm-surface border border-crm-border rounded-xl p-4 space-y-3">
                            <h3 className="m-0 text-xs font-black uppercase text-crm-fg-muted tracking-wider pb-1.5 border-b border-crm-border">Historial de Estados</h3>
                            <div className="space-y-3 relative pl-4 border-l border-crm-border ml-2 pt-1">
                                {order.stateHistory && order.stateHistory.length > 0 ? (
                                    order.stateHistory.map((history, idx) => (
                                        <div key={history._id || idx} className="relative space-y-1">
                                            {/* dot */}
                                            <div className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 bg-crm-surface ${
                                                history.status === 'cancelado' ? 'border-crm-red' : 'border-crm-red/60'
                                            }`} />
                                            <div className="flex flex-wrap items-center gap-2">
                                                <CrmBadge variant={getStatusVariant(history.status)} className="!text-[9px] !px-1.5 py-0">
                                                    {getStatusLabel(history.status)}
                                                </CrmBadge>
                                                <span className="text-[10px] text-crm-fg-muted">
                                                    por <span className="font-semibold text-crm-fg">{history.actorLabel || 'Sistema'}</span> • {new Date(history.date).toLocaleString()}
                                                </span>
                                            </div>
                                            {history.note && (
                                                <p className="text-xs text-crm-fg-muted m-0 italic pl-1 leading-relaxed">
                                                    "{history.note}"
                                                </p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-xs text-crm-fg-muted">Sin historial de estados.</span>
                                )}
                            </div>
                        </div>
                        {/* ======================================================== */}
                        {/* FASE 3: MODALES DINÁMICOS DE CREACIÓN / EDICIÓN */}
                        {/* ======================================================== */}

                        {/* MODAL PRESUPUESTO COMERCIAL */}
                        <CrmModal
                            isOpen={isEstimateModalOpen}
                            onClose={() => setIsEstimateModalOpen(false)}
                            title={editingEstimate ? `Editar Presupuesto Comercial v${editingEstimate.version}` : 'Nuevo Presupuesto Comercial'}
                            maxWidth="max-w-3xl"
                            footer={
                                <div className="flex gap-2 justify-end w-full">
                                    <CrmButton variant="secondary" size="sm" onClick={() => setIsEstimateModalOpen(false)} className="border-crm-border bg-crm-bg text-crm-fg">Cancelar</CrmButton>
                                    <CrmButton variant="primary" size="sm" onClick={handleCreateOrUpdateEstimate} className="bg-crm-red text-white hover:bg-crm-red/90">Guardar Presupuesto</CrmButton>
                                </div>
                            }
                        >
                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <FieldLabel>Moneda</FieldLabel>
                                        <CrmSelect
                                            value={estimateFormData.currency}
                                            onChange={(e) => setEstimateFormData(prev => ({ ...prev, currency: e.target.value }))}
                                            className="bg-crm-bg text-crm-fg text-xs"
                                        >
                                            <option value="ARS">ARS</option>
                                            <option value="USD">USD</option>
                                        </CrmSelect>
                                    </div>
                                    {hasCostsPermission && (
                                        <div className="sm:col-span-2">
                                            <FieldLabel>Asociar Cotización Proveedor</FieldLabel>
                                            <div className="flex gap-2">
                                                <CrmSelect
                                                    value={estimateFormData.providerQuoteId}
                                                    onChange={(e) => setEstimateFormData(prev => ({ ...prev, providerQuoteId: e.target.value }))}
                                                    className="bg-crm-bg text-crm-fg text-xs flex-1"
                                                >
                                                    <option value="">— Ninguna —</option>
                                                    {quotes.map(q => (
                                                        <option key={q.id || q._id} value={q.id || q._id}>
                                                            V{q.version} - {q.providerId?.name || 'Proveedor'} ({q.currency} {q.totalCost.toLocaleString()})
                                                        </option>
                                                    ))}
                                                </CrmSelect>
                                                {estimateFormData.providerQuoteId && (
                                                    <CrmButton
                                                        variant="secondary"
                                                        size="xs"
                                                        className="border-crm-border bg-crm-surface text-crm-fg hover:bg-crm-surface-raised shrink-0"
                                                        onClick={handleImportQuoteItems}
                                                    >
                                                        Cargar Items
                                                    </CrmButton>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between border-b border-crm-border/60 pb-1.5">
                                        <span className="text-xs font-black uppercase tracking-wider text-crm-fg-muted">Items del Presupuesto</span>
                                        <CrmButton
                                            variant="secondary"
                                            size="xs"
                                            className="h-7 text-[10px] border-crm-border bg-crm-surface text-crm-fg"
                                            onClick={() => setEstimateFormData(prev => ({
                                                ...prev,
                                                items: [...prev.items, { type: 'labor', description: '', quantity: 1, providerCost: 0, clientPrice: 0 }]
                                            }))}
                                        >
                                            <Plus size={10} className="mr-1" /> Añadir Item
                                        </CrmButton>
                                    </div>

                                    <div className="space-y-3">
                                        {estimateFormData.items.map((item, idx) => (
                                            <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-3 items-end border-b border-crm-border/30 pb-3 sm:pb-0 sm:border-0">
                                                <div className="w-full sm:w-32">
                                                    <FieldLabel>Tipo</FieldLabel>
                                                    <CrmSelect
                                                        value={item.type}
                                                        onChange={(e) => {
                                                            const newItems = [...estimateFormData.items];
                                                            newItems[idx].type = e.target.value;
                                                            setEstimateFormData(prev => ({ ...prev, items: newItems }));
                                                        }}
                                                        className="bg-crm-bg text-crm-fg text-xs"
                                                    >
                                                        <option value="labor">Mano de Obra</option>
                                                        <option value="part">Repuesto</option>
                                                        <option value="subcontracted">Tercerizado</option>
                                                    </CrmSelect>
                                                </div>

                                                <div className="flex-1 min-w-[200px]">
                                                    <FieldLabel>Descripción</FieldLabel>
                                                    <CrmInput
                                                        value={item.description}
                                                        onChange={(e) => {
                                                            const newItems = [...estimateFormData.items];
                                                            newItems[idx].description = e.target.value;
                                                            setEstimateFormData(prev => ({ ...prev, items: newItems }));
                                                        }}
                                                        className="bg-crm-bg text-crm-fg text-xs"
                                                        placeholder="Mano de obra, repuesto..."
                                                    />
                                                </div>

                                                <div className="w-20">
                                                    <FieldLabel>Cant.</FieldLabel>
                                                    <CrmInput
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const newItems = [...estimateFormData.items];
                                                            newItems[idx].quantity = e.target.value;
                                                            setEstimateFormData(prev => ({ ...prev, items: newItems }));
                                                        }}
                                                        className="bg-crm-bg text-crm-fg text-xs text-center"
                                                    />
                                                </div>

                                                {hasCostsPermission && (
                                                    <div className="w-28">
                                                        <FieldLabel>Costo Prov.</FieldLabel>
                                                        <CrmInput
                                                            type="number"
                                                            min="0"
                                                            value={item.providerCost}
                                                            onChange={(e) => {
                                                                const newItems = [...estimateFormData.items];
                                                                newItems[idx].providerCost = e.target.value;
                                                                setEstimateFormData(prev => ({ ...prev, items: newItems }));
                                                            }}
                                                            className="bg-crm-bg text-crm-fg text-xs font-mono text-right"
                                                        />
                                                    </div>
                                                )}

                                                <div className="w-28">
                                                    <FieldLabel>Precio Cliente</FieldLabel>
                                                    <CrmInput
                                                        type="number"
                                                        min="0"
                                                        value={item.clientPrice}
                                                        onChange={(e) => {
                                                            const newItems = [...estimateFormData.items];
                                                            newItems[idx].clientPrice = e.target.value;
                                                            setEstimateFormData(prev => ({ ...prev, items: newItems }));
                                                        }}
                                                        className="bg-crm-bg text-crm-fg text-xs font-mono text-right"
                                                    />
                                                </div>

                                                {estimateFormData.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        className="p-2 text-crm-red hover:bg-crm-red/10 rounded-lg shrink-0 mb-1"
                                                        onClick={() => {
                                                            const newItems = estimateFormData.items.filter((_, i) => i !== idx);
                                                            setEstimateFormData(prev => ({ ...prev, items: newItems }));
                                                        }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <FieldLabel>Notas Internas / Condiciones</FieldLabel>
                                    <CrmTextarea
                                        value={estimateFormData.notes}
                                        onChange={(e) => setEstimateFormData(prev => ({ ...prev, notes: e.target.value }))}
                                        className="bg-crm-bg text-crm-fg text-xs min-h-[60px]"
                                        placeholder="Garantía, tiempo de entrega estimado..."
                                    />
                                </div>
                            </div>
                        </CrmModal>

                        {/* MODAL COTIZACIÓN PROVEEDOR */}
                        <CrmModal
                            isOpen={isQuoteModalOpen}
                            onClose={() => setIsQuoteModalOpen(false)}
                            title={editingQuote ? `Editar Cotización Proveedor v${editingQuote.version}` : 'Nueva Cotización Proveedor'}
                            maxWidth="max-w-3xl"
                            footer={
                                <div className="flex gap-2 justify-end w-full">
                                    <CrmButton variant="secondary" size="sm" onClick={() => setIsQuoteModalOpen(false)} className="border-crm-border bg-crm-bg text-crm-fg">Cancelar</CrmButton>
                                    <CrmButton variant="primary" size="sm" onClick={handleCreateOrUpdateQuote} className="bg-crm-red text-white hover:bg-crm-red/90">Guardar Cotización</CrmButton>
                                </div>
                            }
                        >
                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="sm:col-span-2">
                                        <FieldLabel>Proveedor / Taller</FieldLabel>
                                        <CrmSelect
                                            value={quoteFormData.providerId}
                                            onChange={(e) => setQuoteFormData(prev => ({ ...prev, providerId: e.target.value }))}
                                            className="bg-crm-bg text-crm-fg text-xs"
                                        >
                                            <option value="">— Seleccionar —</option>
                                            {providers.map(p => (
                                                <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                                            ))}
                                        </CrmSelect>
                                    </div>
                                    <div>
                                        <FieldLabel>Moneda</FieldLabel>
                                        <CrmSelect
                                            value={quoteFormData.currency}
                                            onChange={(e) => setQuoteFormData(prev => ({ ...prev, currency: e.target.value }))}
                                            className="bg-crm-bg text-crm-fg text-xs"
                                        >
                                            <option value="ARS">ARS</option>
                                            <option value="USD">USD</option>
                                        </CrmSelect>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between border-b border-crm-border/60 pb-1.5">
                                        <span className="text-xs font-black uppercase tracking-wider text-crm-fg-muted">Items de la Cotización</span>
                                        <CrmButton
                                            variant="secondary"
                                            size="xs"
                                            className="h-7 text-[10px] border-crm-border bg-crm-surface text-crm-fg"
                                            onClick={() => setQuoteFormData(prev => ({
                                                ...prev,
                                                items: [...prev.items, { type: 'labor', description: '', quantity: 1, providerCost: 0 }]
                                            }))}
                                        >
                                            <Plus size={10} className="mr-1" /> Añadir Item
                                        </CrmButton>
                                    </div>

                                    <div className="space-y-3">
                                        {quoteFormData.items.map((item, idx) => (
                                            <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-3 items-end border-b border-crm-border/30 pb-3 sm:pb-0 sm:border-0">
                                                <div className="w-full sm:w-32">
                                                    <FieldLabel>Tipo</FieldLabel>
                                                    <CrmSelect
                                                        value={item.type}
                                                        onChange={(e) => {
                                                            const newItems = [...quoteFormData.items];
                                                            newItems[idx].type = e.target.value;
                                                            setQuoteFormData(prev => ({ ...prev, items: newItems }));
                                                        }}
                                                        className="bg-crm-bg text-crm-fg text-xs"
                                                    >
                                                        <option value="labor">Mano de Obra</option>
                                                        <option value="part">Repuesto</option>
                                                        <option value="subcontracted">Tercerizado</option>
                                                    </CrmSelect>
                                                </div>

                                                <div className="flex-1 min-w-[200px]">
                                                    <FieldLabel>Descripción</FieldLabel>
                                                    <CrmInput
                                                        value={item.description}
                                                        onChange={(e) => {
                                                            const newItems = [...quoteFormData.items];
                                                            newItems[idx].description = e.target.value;
                                                            setQuoteFormData(prev => ({ ...prev, items: newItems }));
                                                        }}
                                                        className="bg-crm-bg text-crm-fg text-xs"
                                                        placeholder="Mano de obra, repuesto..."
                                                    />
                                                </div>

                                                <div className="w-20">
                                                    <FieldLabel>Cant.</FieldLabel>
                                                    <CrmInput
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const newItems = [...quoteFormData.items];
                                                            newItems[idx].quantity = e.target.value;
                                                            setQuoteFormData(prev => ({ ...prev, items: newItems }));
                                                        }}
                                                        className="bg-crm-bg text-crm-fg text-xs text-center"
                                                    />
                                                </div>

                                                <div className="w-28">
                                                    <FieldLabel>Costo Prov.</FieldLabel>
                                                    <CrmInput
                                                        type="number"
                                                        min="0"
                                                        value={item.providerCost}
                                                        onChange={(e) => {
                                                            const newItems = [...quoteFormData.items];
                                                            newItems[idx].providerCost = e.target.value;
                                                            setQuoteFormData(prev => ({ ...prev, items: newItems }));
                                                        }}
                                                        className="bg-crm-bg text-crm-fg text-xs font-mono text-right"
                                                    />
                                                </div>

                                                {quoteFormData.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        className="p-2 text-crm-red hover:bg-crm-red/10 rounded-lg shrink-0 mb-1"
                                                        onClick={() => {
                                                            const newItems = quoteFormData.items.filter((_, i) => i !== idx);
                                                            setQuoteFormData(prev => ({ ...prev, items: newItems }));
                                                        }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <FieldLabel>Notas Internas</FieldLabel>
                                    <CrmTextarea
                                        value={quoteFormData.notes}
                                        onChange={(e) => setQuoteFormData(prev => ({ ...prev, notes: e.target.value }))}
                                        className="bg-crm-bg text-crm-fg text-xs min-h-[60px]"
                                        placeholder="Información adicional del taller..."
                                    />
                                </div>
                            </div>
                        </CrmModal>
                    </div>
                )}
            </div>
        </CrmModal>
    );
}
