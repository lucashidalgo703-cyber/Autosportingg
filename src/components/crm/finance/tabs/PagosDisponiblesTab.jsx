import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { CreditCard, Search, DollarSign, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFinancePayables } from '../../../../hooks/useFinancePayables';
import CrmBadge from '../../ui/CrmBadge';
import OwnerPaymentModal from '../modals/OwnerPaymentModal';
import {useAuth} from '../../../../context/AuthContext';
import {hasPermission,PERMISSIONS} from '../../../../utils/adminPermissions';

export default function PagosDisponiblesTab({ accounts = [] }) {
    const {token,user}=useAuth(); const canWrite=hasPermission(user,PERMISSIONS.FINANZAS_WRITE); const revision=useRef(0); const [loadError,setLoadError]=useState('');
    const { fetchPayables, registerOwnerPayment, loading } = useFinancePayables();
    const [payables, setPayables] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('todos');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSaleId, setSelectedSaleId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        const current=++revision.current; setLoadError('');
        try {
            const data = await fetchPayables({ status: statusFilter, search: searchTerm });
            if(current===revision.current&&localStorage.getItem('token')===token)setPayables(data);
        } catch (err) {
            if(current===revision.current&&err.name!=='AbortError'){setPayables([]);setLoadError(err.message||'No se pudieron consultar los pagos.');}
        }
    }, [fetchPayables, statusFilter, searchTerm,token]);

    useEffect(() => {
        void loadData(); return()=>{revision.current++;};
    }, [loadData]);

    const handlePaymentSubmit = async (payload) => {
        if (!selectedSaleId) return;
        setIsSubmitting(true);
        try {
            await registerOwnerPayment(selectedSaleId, payload);
            toast.success('Pago registrado correctamente');
            setIsModalOpen(false);
            loadData();
        } catch (err) {
            toast.error(err.message || 'Error al registrar pago'); throw err;
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatMoney = (amount, currency = 'USD') => {
        return `${currency === 'USD' ? 'USD' : '$'} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    const metrics = useMemo(() => {
        let abonadoUSD = 0;
        let abonadoARS = 0;
        let pendientes = 0;

        payables.forEach(p => {
            if (p.paidToOwnerUSD > 0) abonadoUSD += p.paidToOwnerUSD;
            if (p.paidToOwnerARS > 0) abonadoARS += p.paidToOwnerARS;
            if (p.status === 'sin_pagos') pendientes++;
        });

        return { abonadoUSD, abonadoARS, pendientes };
    }, [payables]);

    return (
        <div className="space-y-4">{loadError&&<p role="alert" className="text-sm text-red-300">{loadError} <button type="button" onClick={loadData} className="underline">Reintentar</button></p>}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">⏳ VENTAS PENDIENTES DE PAGO</h3>
                    <p className="mt-2 text-xl font-black text-crm-fg">{loadError?'—':metrics.pendientes}</p>
                </div>
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">✅ YA ABONADO A PROPIETARIOS</h3>
                    <p className="mt-2 text-xl font-black text-crm-fg">{loadError?'—':formatMoney(metrics.abonadoUSD, 'USD')+' / '+formatMoney(metrics.abonadoARS, 'ARS')}</p>
                </div>
            </div>

            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-1">
                        {['todos', 'sin_pagos', 'con_pagos'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setStatusFilter(filter)}
                                className={`h-9 rounded-none border-b-2 px-2 text-sm font-black transition ${
                                    statusFilter === filter
                                        ? 'border-crm-red text-crm-red'
                                        : 'border-transparent text-crm-fg-muted hover:text-crm-fg'
                                }`}
                            >
                                {filter === 'todos' ? 'TODOS' : filter === 'sin_pagos' ? 'SIN PAGOS' : 'CON PAGOS'}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar propietario o vehículo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-9 w-full rounded-lg border border-crm-border bg-crm-bg pl-9 pr-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none"
                        />
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-crm-surface-raised border-b border-crm-border">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Propietario / Vehículo</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Venta (Ref)</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Ref. Costo (Informativo)</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Abonado ARS/USD</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Estado</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-crm-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-sm text-crm-fg-muted">Cargando...</td>
                                </tr>
                            ) : payables.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-crm-bg flex items-center justify-center mb-2">
                                                <CreditCard className="text-crm-fg-muted" size={24} />
                                            </div>
                                            <h4 className="font-bold text-crm-fg">Aún no hay pagos disponibles</h4>
                                            <p className="text-sm text-crm-fg-muted max-w-sm">No se encontraron ventas activas con propietarios asociados.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                payables.map(p => (
                                    <tr key={p.saleId} className="hover:bg-crm-surface-raised transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-crm-fg text-sm">{p.ownerName}</div>
                                            <div className="text-xs text-crm-fg-muted">{p.vehicle?.name || p.vehicle?.brand || 'Sin vehículo'} {p.vehicle?.plateOrVin ? `(${p.vehicle.plateOrVin})` : ''}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-crm-fg text-sm">{formatMoney(p.salePrice, p.saleCurrency)}</div>
                                            <div className="text-xs text-crm-fg-muted text-[10px]">{p.saleId.slice(-6)}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {p.purchasePrice ? (
                                                <div className="text-sm text-crm-fg-subtle">{formatMoney(p.purchasePrice, p.purchaseCurrency)}</div>
                                            ) : (
                                                <span className="text-xs text-crm-fg-muted">N/D</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-crm-success">
                                                {p.paidToOwnerARS > 0 ? `${formatMoney(p.paidToOwnerARS, 'ARS')} ` : ''}
                                                {p.paidToOwnerUSD > 0 ? `${formatMoney(p.paidToOwnerUSD, 'USD')}` : ''}
                                                {p.paidToOwnerARS === 0 && p.paidToOwnerUSD === 0 ? '-' : ''}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <CrmBadge variant={p.status === 'con_pagos' ? 'success' : 'warning'}>
                                                {p.status === 'con_pagos' ? 'CON PAGOS' : 'SIN PAGOS'}
                                            </CrmBadge>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                disabled={!canWrite} onClick={() => {
                                                    setSelectedSaleId(p.saleId);
                                                    setIsModalOpen(true);
                                                }}
                                                className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-crm-fg/10 px-3 text-xs font-black text-crm-fg hover:bg-crm-fg/20 transition"
                                            >
                                                <DollarSign size={12} /> Pagar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <OwnerPaymentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handlePaymentSubmit}
                accounts={accounts}
                isSubmitting={isSubmitting}
            />
        </div>
    );
}