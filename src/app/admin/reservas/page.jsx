"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCcw, ShieldAlert } from 'lucide-react';
import { useAdminReservations } from '../../../hooks/useAdminReservations';
import ReservationsFilters from '../../../components/crm/reservations/ReservationsFilters';
import ReservationsTable from '../../../components/crm/reservations/ReservationsTable';
import ReservationMobileCards from '../../../components/crm/reservations/ReservationMobileCards';
import ReservationCancelModal from '../../../components/crm/reservations/ReservationCancelModal';
import ConvertReservationToSaleModal from '../../../components/crm/reservations/ConvertReservationToSaleModal';
import CrmButton from '../../../components/crm/ui/CrmButton';

export default function ReservasPage() {
    const { fetchReservations, loading, error } = useAdminReservations();
    const [allReservations, setAllReservations] = useState([]);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
    const [selectedReservationForSale, setSelectedReservationForSale] = useState(null);

    const [filters, setFilters] = useState({
        search: '',
        status: 'todas',
        currency: 'todas',
        dateRange: 'todas',
        dateFrom: '',
        dateTo: ''
    });

    const loadData = async () => {
        const data = await fetchReservations();
        setAllReservations(data || []);
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getIsOverdue = (res) => {
        if (!res.expiresAt) return false;
        const expiry = new Date(res.expiresAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return expiry <= today;
    };

    const getIsExpiringNext7Days = (res) => {
        if (!res.expiresAt) return false;
        const expiry = new Date(res.expiresAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        nextWeek.setHours(23, 59, 59, 999);
        return expiry > today && expiry <= nextWeek;
    };

    const filteredReservations = useMemo(() => {
        return allReservations.filter((res) => {
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const clientName = (res.clientId?.fullName || res.clientId?.firstName || '').toLowerCase();
                const leadName = (res.leadId?.name || '').toLowerCase();
                const vehicleBrand = (res.vehicleId?.brand || '').toLowerCase();
                const vehicleName = (res.vehicleId?.name || '').toLowerCase();
                const vehicleVin = (res.vehicleId?.plateOrVin || '').toLowerCase();
                const phone = (res.clientId?.phone || res.leadId?.phone || '').toLowerCase();

                const matchSearch =
                    clientName.includes(searchLower) ||
                    leadName.includes(searchLower) ||
                    vehicleBrand.includes(searchLower) ||
                    vehicleName.includes(searchLower) ||
                    vehicleVin.includes(searchLower) ||
                    phone.includes(searchLower);

                if (!matchSearch) return false;
            }

            if (filters.status !== 'todas' && res.status !== filters.status) return false;
            if (filters.currency !== 'todas' && res.depositCurrency !== filters.currency) return false;

            if (filters.dateRange !== 'todas') {
                if (filters.dateRange === 'vencidas' && !getIsOverdue(res)) return false;
                if (filters.dateRange === 'hoy') {
                    if (!res.expiresAt) return false;
                    const expiry = new Date(res.expiresAt);
                    const today = new Date();
                    if (expiry.setHours(0, 0, 0, 0) !== today.setHours(0, 0, 0, 0)) return false;
                }
                if (filters.dateRange === 'proximos_7' && !getIsExpiringNext7Days(res)) return false;
            }

            const createdAt = new Date(res.createdAt);
            if (filters.dateFrom) {
                const from = new Date(`${filters.dateFrom}T00:00:00`);
                if (createdAt < from) return false;
            }
            if (filters.dateTo) {
                const to = new Date(`${filters.dateTo}T23:59:59`);
                if (createdAt > to) return false;
            }

            return true;
        });
    }, [allReservations, filters]);

    const totals = useMemo(() => ({
        total: allReservations.length,
        active: allReservations.filter((res) => res.status === 'activa').length,
        converted: allReservations.filter((res) => res.status === 'convertida').length,
        closed: allReservations.filter((res) => ['cancelada', 'devuelta', 'retenida', 'vencida'].includes(res.status)).length
    }), [allReservations]);

    const handleLiberarClick = (reservation) => {
        setSelectedReservation(reservation);
        setIsCancelModalOpen(true);
    };

    const handleConvertirClick = (reservation) => {
        setSelectedReservationForSale(reservation);
        setIsConvertModalOpen(true);
    };

    const handleExport = () => {
        const headers = ['Fecha', 'Cliente', 'Vehiculo', 'Estado', 'Moneda sena', 'Monto sena', 'Vencimiento'];
        const rows = filteredReservations.map((res) => ([
            new Date(res.createdAt).toLocaleDateString('es-AR'),
            res.clientId?.fullName || res.clientId?.firstName || res.leadId?.name || '',
            res.vehicleId ? `${res.vehicleId.brand || ''} ${res.vehicleId.name || ''}`.trim() : '',
            res.status || '',
            res.depositCurrency || '',
            res.depositAmount || 0,
            res.expiresAt ? new Date(res.expiresAt).toLocaleDateString('es-AR') : ''
        ]));
        const csv = [headers, ...rows]
            .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `autosporting_reservas_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="mx-auto flex min-h-[85vh] w-full max-w-7xl flex-col gap-5 p-4 pb-24 md:p-6">
            <div className="flex flex-col gap-4 border-b border-crm-border pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="m-0 text-[26px] font-bold leading-tight text-crm-fg">Reservas</h1>
                    <p className="m-0 mt-1 text-sm font-medium text-crm-fg-muted">
                        {totals.total} reservas · {totals.active} activas · {totals.converted} convertidas · {totals.closed} cerradas
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <CrmButton
                        variant="secondary"
                        size="sm"
                        onClick={handleExport}
                        disabled={filteredReservations.length === 0}
                        className="h-9"
                    >
                        <Download size={14} />
                        Exportar
                    </CrmButton>
                    <CrmButton
                        variant="secondary"
                        size="sm"
                        onClick={loadData}
                        disabled={loading}
                        className="h-9"
                    >
                        <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
                        Actualizar
                    </CrmButton>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 rounded-xl border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-red-300">
                    <ShieldAlert size={20} />
                    {error}
                </div>
            )}

            {loading && allReservations.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-xl border border-crm-border bg-crm-surface">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                        <span className="text-sm text-crm-fg-muted">Cargando reservas...</span>
                    </div>
                </div>
            ) : (
                <>
                    <ReservationsFilters filters={filters} setFilters={setFilters} />

                    <ReservationsTable
                        reservations={filteredReservations}
                        onLiberar={handleLiberarClick}
                        onConvertir={handleConvertirClick}
                        getIsOverdue={getIsOverdue}
                    />

                    <ReservationMobileCards
                        reservations={filteredReservations}
                        onLiberar={handleLiberarClick}
                        onConvertir={handleConvertirClick}
                        getIsOverdue={getIsOverdue}
                    />
                </>
            )}

            {selectedReservation && (
                <ReservationCancelModal
                    isOpen={isCancelModalOpen}
                    onClose={() => {
                        setIsCancelModalOpen(false);
                        setSelectedReservation(null);
                    }}
                    onSuccess={() => {
                        setIsCancelModalOpen(false);
                        setSelectedReservation(null);
                        loadData();
                    }}
                    reservation={selectedReservation}
                />
            )}

            {selectedReservationForSale && (
                <ConvertReservationToSaleModal
                    isOpen={isConvertModalOpen}
                    onClose={() => {
                        setIsConvertModalOpen(false);
                        setSelectedReservationForSale(null);
                    }}
                    onSuccess={() => {
                        setIsConvertModalOpen(false);
                        setSelectedReservationForSale(null);
                        loadData();
                    }}
                    reservation={selectedReservationForSale}
                />
            )}
        </div>
    );
}
