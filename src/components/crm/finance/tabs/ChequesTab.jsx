import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Plus, Search, Edit2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminChecks } from '../../../../hooks/useAdminChecks';
import CrmBadge from '../../ui/CrmBadge';
import CheckModal from '../modals/CheckModal';
import ConfirmModal from '../../ui/ConfirmModal';

export default function ChequesTab({ accounts }) {
    const { fetchChecks, createCheck, updateCheck, annulCheck, loading } = useAdminChecks();

    const [subTab, setSubTab] = useState('a_cobrar');
    const [checks, setChecks] = useState([]);

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [monthFilter, setMonthFilter] = useState('');

    // Modales
    const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
    const [selectedCheck, setSelectedCheck] = useState(null);
    const [modalMode, setModalMode] = useState('create');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ConfirmModal
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

    const loadChecks = async () => {
        try {
            const data = await fetchChecks({
                direction: subTab === 'a_cobrar' ? 'recibido' : 'emitido',
                status: statusFilter,
                month: monthFilter,
                search: searchTerm
            });
            setChecks(data);
        } catch (err) {
            toast.error(err.message || 'Error cargando cheques');
        }
    };

    useEffect(() => {
        loadChecks();
    }, [subTab, statusFilter, monthFilter, searchTerm]);

    const stats = useMemo(() => {
        let totalPendiente = 0;
        let vencidos = 0;
        let esteMes = 0;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        checks.forEach(c => {
            if (c.status !== 'anulado' && c.status !== 'depositado' && c.status !== 'cobrado') {
                totalPendiente += Number(c.amount || 0);
                const due = new Date(c.dueDate);
                if (due < now) vencidos++;
                if (due.getMonth() === currentMonth && due.getFullYear() === currentYear) {
                    esteMes += Number(c.amount || 0);
                }
            }
        });

        return { totalPendiente, vencidos, esteMes };
    }, [checks]);

    const handleSaveCheck = async (data) => {
        setIsSubmitting(true);
        try {
            if (modalMode === 'create') {
                await createCheck(data);
                toast.success('Cheque creado correctamente');
            } else {
                await updateCheck(selectedCheck._id, data);
                toast.success('Cheque actualizado');
            }
            setIsCheckModalOpen(false);
            loadChecks();
        } catch (err) {
            toast.error(err.message || 'Error guardando cheque');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusChange = (check, newStatus) => {
        let title = 'Cambiar estado del cheque';
        let message = `¿Confirmar cambio a estado ${newStatus}?`;

        if (newStatus === 'depositado' || newStatus === 'cobrado') {
            title = `Registrar ${newStatus}`;
            message = `Se registrará un movimiento financiero en la cuenta de destino. ¿Deseas continuar?`;
        }

        setConfirmConfig({
            isOpen: true,
            title,
            message,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                try {
                    await updateCheck(check._id, { status: newStatus });
                    toast.success('Estado actualizado correctamente');
                    loadChecks();
                } catch (err) {
                    toast.error(err.message || 'Error al cambiar estado');
                }
            }
        });
    };

    const handleAnnul = (check) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Anular cheque',
            message: '¿Estás seguro de anular este cheque? Esta acción no se puede deshacer.',
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                try {
                    await annulCheck(check._id);
                    toast.success('Cheque anulado');
                    loadChecks();
                } catch (err) {
                    toast.error(err.message || 'Error al anular cheque');
                }
            }
        });
    };

    const formatMoney = (amount, currency = 'ARS') => {
        return `${currency === 'USD' ? 'USD' : '$'} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    const getStatusTone = (status) => {
        switch (status) {
            case 'en_cartera': return 'warning';
            case 'depositado':
            case 'cobrado': return 'success';
            case 'rechazado':
            case 'anulado': return 'danger';
            case 'entregado_a_tercero': return 'info';
            default: return 'neutral';
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">
                        {subTab === 'a_cobrar' ? 'A COBRAR ESTE MES' : 'A PAGAR ESTE MES'}
                    </h3>
                    <p className="mt-2 text-xl font-black text-crm-fg">{formatMoney(stats.esteMes)}</p>
                </div>
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">TOTAL PENDIENTE</h3>
                    <p className="mt-2 text-xl font-black text-crm-fg">{formatMoney(stats.totalPendiente)}</p>
                </div>
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">VENCIDOS SIN RESOLVER</h3>
                    <p className="mt-2 text-xl font-black text-crm-red">{stats.vencidos}</p>
                </div>
            </div>

            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setSubTab('a_cobrar')}
                            className={`h-9 rounded-none border-b-2 px-2 text-sm font-black transition ${subTab === 'a_cobrar' ? 'border-crm-red text-crm-red' : 'border-transparent text-crm-fg-muted hover:text-crm-fg'}`}
                        >
                            A COBRAR
                        </button>
                        <button
                            type="button"
                            onClick={() => setSubTab('emitidos')}
                            className={`h-9 rounded-none border-b-2 px-2 text-sm font-black transition ${subTab === 'emitidos' ? 'border-crm-red text-crm-red' : 'border-transparent text-crm-fg-muted hover:text-crm-fg'}`}
                        >
                            EMITIDOS
                        </button>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-subtle" size={16} />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por N°, nombre, banco..."
                            className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg pl-10 pr-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-crm-border pt-4 mt-4">
                    <input
                        type="month"
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        className="h-9 rounded-lg border border-crm-border bg-crm-bg px-3 text-xs font-bold text-crm-fg outline-none transition focus:border-crm-red"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-9 rounded-lg border border-crm-border bg-crm-bg px-3 text-xs font-bold text-crm-fg outline-none transition focus:border-crm-red"
                    >
                        <option value="">Estado: Todos</option>
                        <option value="en_cartera">En Cartera</option>
                        <option value="depositado">Depositado</option>
                        <option value="cobrado">Cobrado</option>
                        <option value="rechazado">Rechazado</option>
                        <option value="entregado_a_tercero">Entregado a Tercero</option>
                        <option value="anulado">Anulado</option>
                    </select>
                    <button
                        onClick={() => {
                            setModalMode('create');
                            setSelectedCheck({ direction: subTab === 'a_cobrar' ? 'recibido' : 'emitido' });
                            setIsCheckModalOpen(true);
                        }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-crm-red-gradient px-4 text-xs font-black text-white shadow-crm-shadow-red transition hover:opacity-95 ml-auto"
                    >
                        <Plus size={14} /> Nuevo cheque
                    </button>
                </div>
            </section>

            <section className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar relative">
                    {loading && (
                        <div className="absolute inset-0 bg-crm-surface/50 backdrop-blur-sm z-10 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full border-2 border-crm-border border-t-crm-red animate-spin"></div>
                        </div>
                    )}
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-crm-surface-raised border-b border-crm-border">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Vencimiento</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Banco / N°</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">
                                    {subTab === 'a_cobrar' ? 'Librador' : 'Beneficiario'}
                                </th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Estado</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-right">Monto</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-crm-border">
                            {checks.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-crm-bg flex items-center justify-center mb-2">
                                                <FileText className="text-crm-fg-muted" size={24} />
                                            </div>
                                            <h4 className="font-bold text-crm-fg">No hay cheques</h4>
                                            <p className="text-sm text-crm-fg-muted max-w-sm">No se encontraron resultados para los filtros actuales.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                checks.map(check => (
                                    <tr key={check._id} className="hover:bg-crm-surface-raised transition-colors">
                                        <td className="px-4 py-3">
                                            <span className={`text-sm font-bold ${new Date(check.dueDate) < new Date() && check.status === 'en_cartera' ? 'text-crm-red' : 'text-crm-fg'}`}>
                                                {new Date(check.dueDate).toLocaleDateString('es-AR')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-crm-fg">{check.bank}</span>
                                                <span className="text-xs text-crm-fg-muted">N° {check.number}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-crm-fg">
                                            {subTab === 'a_cobrar' ? (check.issuerName || '-') : (check.beneficiaryName || '-')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <CrmBadge variant={getStatusTone(check.status)}>
                                                {check.status.replace('_', ' ').toUpperCase()}
                                            </CrmBadge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-sm font-black text-crm-fg">
                                                {formatMoney(check.amount, check.currency)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCheck(check);
                                                        setModalMode('edit');
                                                        setIsCheckModalOpen(true);
                                                    }}
                                                    className="w-7 h-7 flex items-center justify-center rounded bg-crm-bg text-crm-fg-muted hover:text-crm-fg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={14} />
                                                </button>

                                                {check.status === 'en_cartera' && subTab === 'a_cobrar' && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCheck({ ...check, status: 'depositado' });
                                                            setModalMode('edit');
                                                            setIsCheckModalOpen(true);
                                                        }}
                                                        className="w-7 h-7 flex items-center justify-center rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                                                        title="Depositar (Requiere cuenta)"
                                                    >
                                                        <CheckCircle2 size={14} />
                                                    </button>
                                                )}

                                                {check.status === 'en_cartera' && subTab === 'emitidos' && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCheck({ ...check, status: 'cobrado' });
                                                            setModalMode('edit');
                                                            setIsCheckModalOpen(true);
                                                        }}
                                                        className="w-7 h-7 flex items-center justify-center rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                                                        title="Marcar Cobrado (Requiere cuenta)"
                                                    >
                                                        <CheckCircle2 size={14} />
                                                    </button>
                                                )}

                                                {check.status !== 'anulado' && check.status !== 'rechazado' && !check.transactionId && (
                                                    <button
                                                        onClick={() => handleAnnul(check)}
                                                        className="w-7 h-7 flex items-center justify-center rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                                                        title="Anular"
                                                    >
                                                        <XCircle size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <CheckModal
                isOpen={isCheckModalOpen}
                onClose={() => setIsCheckModalOpen(false)}
                mode={modalMode}
                check={selectedCheck}
                onSave={handleSaveCheck}
                isSubmitting={isSubmitting}
                accounts={accounts}
            />

            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={confirmConfig.onConfirm}
            />
        </div>
    );
}