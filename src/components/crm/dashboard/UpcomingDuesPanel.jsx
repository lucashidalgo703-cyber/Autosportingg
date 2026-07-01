import { useEffect, useState } from 'react';
import CrmCard from '../ui/CrmCard';
import { Calendar, AlertCircle, Clock, DollarSign } from 'lucide-react';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';

export default function UpcomingDuesPanel({ user, hideAmounts }) {
    const [dues, setDues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const hasFinanzasRead = hasPermission(user, PERMISSIONS.FINANZAS_READ);

    useEffect(() => {
        if (!hasFinanzasRead) {
            setLoading(false);
            return;
        }

        const fetchUpcomingDues = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('No token found');

                const res = await fetch('/api/admin/dashboard/upcoming-dues', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (res.status === 403) {
                    setError('Sin permisos para ver vencimientos');
                    return;
                }

                if (!res.ok) {
                    throw new Error('Error al consultar el servidor');
                }

                const data = await res.json();
                setDues(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error fetching upcoming dues:', err);
                setError('No se pudieron cargar los vencimientos próximos');
            } finally {
                setLoading(false);
            }
        };

        fetchUpcomingDues();
    }, [hasFinanzasRead]);

    if (!hasFinanzasRead) {
        return null; // Don't render anything if the user has no permissions, matching the pattern
    }

    const formatCurrency = (amount, currency) => {
        if (amount === undefined || amount === null) return '';
        const formatted = new Intl.NumberFormat('es-AR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
        return `${currency === 'USD' ? 'u$s' : '$'} ${formatted}`;
    };

    const getDueDateBadge = (dueDateString) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(dueDateString);
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            const days = Math.abs(diffDays);
            return {
                label: `Vencido hace ${days} ${days === 1 ? 'día' : 'días'}`,
                classes: "bg-red-500/10 text-red-500 border border-red-500/20"
            };
        } else if (diffDays === 0) {
            return {
                label: "Vence hoy",
                classes: "bg-orange-500/10 text-orange-500 border border-orange-500/20 font-bold"
            };
        } else if (diffDays === 1) {
            return {
                label: "Vence mañana",
                classes: "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-semibold"
            };
        } else {
            return {
                label: `Vence en ${diffDays} días`,
                classes: "bg-blue-500/10 text-blue-500 border border-blue-500/20"
            };
        }
    };

    return (
        <CrmCard className="h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                    Vencimientos Próximos
                    {dues.length > 0 && !loading && !error && (
                        <span className="bg-crm-red text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            {dues.length}
                        </span>
                    )}
                </h3>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-[200px]">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-crm-red"></div>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-center border border-dashed border-red-500/20 bg-red-500/5 rounded-xl p-4">
                    <AlertCircle className="text-red-500 mb-2" size={24} />
                    <p className="text-sm text-red-400 font-medium">{error}</p>
                </div>
            ) : dues.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-center border border-dashed border-crm-border rounded-xl p-4">
                    <Clock size={24} className="text-[#22C55E] mb-2" />
                    <p className="text-sm text-crm-fg-muted font-medium">Al día</p>
                    <p className="text-xs text-[#666]">No hay vencimientos pendientes para los próximos 7 días.</p>
                </div>
            ) : (
                <div className="overflow-y-auto max-h-[400px] pr-2 custom-scrollbar space-y-3">
                    {dues.map((due) => {
                        const badge = getDueDateBadge(due.dueDate);
                        const clientName = due.clientId?.fullName || due.clientId?.name || due.customerName || 'Cliente no especificado';
                        const vehicleLabel = due.vehicleId ? `${due.vehicleId.marca} ${due.vehicleId.modelo} (${due.vehicleId.year})` : null;
                        const remaining = due.amount - (due.paidAmount || 0);

                        return (
                            <div 
                                key={due._id} 
                                className="p-3.5 rounded-lg border border-crm-border bg-crm-surface-raised hover:brightness-105 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-semibold text-white">
                                            {clientName}
                                        </span>
                                        {due.status === 'parcial' && (
                                            <span className="text-[10px] px-1 bg-yellow-500/20 text-yellow-500 rounded border border-yellow-500/20 uppercase font-medium">
                                                Pago Parcial
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-crm-fg-muted">
                                        {due.concept || 'Compromiso de pago'} {due.installmentNumber ? `(Cuota #${due.installmentNumber})` : ''}
                                    </p>
                                    {vehicleLabel && (
                                        <p className="text-[11px] text-crm-fg-muted flex items-center gap-1 mt-0.5">
                                            <span className="shrink-0 bg-crm-surface px-1.5 py-0.5 rounded border border-crm-border text-[9px] uppercase font-bold text-crm-fg">Vehículo</span>
                                            <span className="truncate max-w-[200px] sm:max-w-xs">{vehicleLabel}</span>
                                        </p>
                                    )}
                                </div>
                                <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-2 border-t border-crm-border sm:border-t-0 pt-2 sm:pt-0 shrink-0">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${badge.classes}`}>
                                        {badge.label}
                                    </span>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-white">
                                            {hideAmounts ? '*****' : formatCurrency(remaining, due.currency)}
                                        </p>
                                        <p className="text-[10px] text-crm-fg-subtle">
                                            Vence: {new Date(due.dueDate).toLocaleDateString('es-AR')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </CrmCard>
    );
}
