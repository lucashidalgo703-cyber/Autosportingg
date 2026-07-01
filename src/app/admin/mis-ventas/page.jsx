"use client";
import toast from 'react-hot-toast';
import React, { useEffect, useMemo, useState } from 'react';
import { Download, Plus, ShieldAlert } from 'lucide-react';
import { useAdminSales } from '../../../hooks/useAdminSales';
import { useAdminReservations } from '../../../hooks/useAdminReservations';
import { useAuth } from '../../../context/AuthContext';
import SalesFilters from '../../../components/crm/sales/SalesFilters';
import SalesTable from '../../../components/crm/sales/SalesTable';
import SaleMobileCards from '../../../components/crm/sales/SaleMobileCards';
import SaleDetailDrawer from '../../../components/crm/sales/SaleDetailDrawer';
import SaleCreateModal from '../../../components/crm/sales/SaleCreateModal';
import ReservationsTable from '../../../components/crm/reservations/ReservationsTable';
import ReservationMobileCards from '../../../components/crm/reservations/ReservationMobileCards';
import ReservationCancelModal from '../../../components/crm/reservations/ReservationCancelModal';
import ConvertReservationToSaleModal from '../../../components/crm/reservations/ConvertReservationToSaleModal';
import CrmButton from '../../../components/crm/ui/CrmButton';
import ConfirmModal from '../../../components/crm/ui/ConfirmModal';
import SalesPerformanceDashboard from '../../../components/crm/sales/SalesPerformanceDashboard';

export default function MisVentasPage() {
    const { user } = useAuth();
    const { fetchSales, loading, error, deleteSale } = useAdminSales();
    const {
        fetchReservations,
        deleteReservation,
        loading: reservationsLoading,
        error: reservationsError
    } = useAdminReservations();

    const [allSales, setAllSales] = useState([]);
    const [allReservations, setAllReservations] = useState([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
    const [selectedReservationForSale, setSelectedReservationForSale] = useState(null);
    const [confirmDeleteSaleModal, setConfirmDeleteSaleModal] = useState({ isOpen: false, sale: null });
    const [confirmDeleteReservationModal, setConfirmDeleteReservationModal] = useState({ isOpen: false, reservation: null });

    const [goalData, setGoalData] = useState(null);
    const [goalLoading, setGoalLoading] = useState(true);

    const [filters, setFilters] = useState({
        search: '',
        seller: '',
        status: 'todas',
        currency: 'todas',
        paymentMethod: 'todas',
        documentationStatus: 'todas',
        deliveryStatus: 'todas',
        collectionStatus: 'todas',
        dateFrom: '',
        dateTo: '',
        month: '',
        tradeInOnly: false
    });

    const isReservationsTab = filters.status === 'reservas';
    const pageLoading = isReservationsTab ? reservationsLoading : loading;
    const pageError = isReservationsTab ? reservationsError : error;

    const loadData = async () => {
        const [salesData, reservationsData] = await Promise.all([
            fetchSales(),
            fetchReservations()
        ]);
        setAllSales(salesData || []);
        setAllReservations(reservationsData || []);

        try {
            setGoalLoading(true);
            const token = localStorage.getItem('token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : API_URL;
            const res = await fetch(`${baseUrl}/api/admin/team-goals/progress`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setGoalData(data);
            } else {
                setGoalData(null);
            }
        } catch (e) {
            setGoalData(null);
        } finally {
            setGoalLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getIsOverdue = (reservation) => {
        if (!reservation.expiresAt) return false;
        const expiry = new Date(reservation.expiresAt);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        return expiry <= todayDate;
    };

    const isMyRecord = (record) => {
        if (!user) return false;
        const userEmail = (user.email || '').toLowerCase();
        const userName = (user.name || user.displayName || '').toLowerCase();
        const sellerInfo = `${record.salesperson || ''} ${record.assignedTo?.name || ''} ${record.assignedTo?.email || ''}`.toLowerCase();
        
        return (userEmail && sellerInfo.includes(userEmail)) || 
               (userName && sellerInfo.includes(userName)) || 
               (record.assignedTo?._id === user.id || record.assignedTo?._id === user._id) || 
               (record.salespersonId === user.id || record.salespersonId === user._id);
    };

    const mySales = useMemo(() => allSales.filter(isMyRecord), [allSales, user]);
    const myReservations = useMemo(() => allReservations.filter(isMyRecord), [allReservations, user]);

    const filteredSales = useMemo(() => {
        return mySales.filter((sale) => {
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const clientName = (sale.clientId?.fullName || sale.clientId?.firstName || '').toLowerCase();
                const quoteName = (sale.leadId?.name || '').toLowerCase();
                const vehicleBrand = (sale.vehicleId?.brand || '').toLowerCase();
                const vehicleName = (sale.vehicleId?.name || '').toLowerCase();
                const vehicleVin = (sale.vehicleId?.plateOrVin || '').toLowerCase();
                const phone = (sale.clientId?.phone || sale.leadId?.phone || '').toLowerCase();
                const dni = (sale.clientId?.dni || sale.leadId?.dni || '').toLowerCase();

                const matchSearch =
                    clientName.includes(searchLower) ||
                    quoteName.includes(searchLower) ||
                    vehicleBrand.includes(searchLower) ||
                    vehicleName.includes(searchLower) ||
                    vehicleVin.includes(searchLower) ||
                    phone.includes(searchLower) ||
                    dni.includes(searchLower);

                if (!matchSearch) return false;
            }

            if (filters.seller) {
                const sellerLower = filters.seller.toLowerCase();
                const seller = `${sale.salesperson || ''} ${sale.assignedTo?.name || ''} ${sale.assignedTo?.email || ''}`.toLowerCase();
                if (!seller.includes(sellerLower)) return false;
            }

            if (filters.status !== 'todas' && filters.status !== 'reservas' && sale.status !== filters.status) return false;
            if (filters.currency !== 'todas' && sale.saleCurrency !== filters.currency) return false;
            if (filters.paymentMethod !== 'todas' && sale.paymentMethod !== filters.paymentMethod) return false;
            if (filters.documentationStatus && filters.documentationStatus !== 'todas' && (sale.documentationStatus || 'pendiente') !== filters.documentationStatus) return false;
            if (filters.deliveryStatus && filters.deliveryStatus !== 'todas' && (sale.deliveryStatus || 'pendiente') !== filters.deliveryStatus) return false;
            if (filters.collectionStatus && filters.collectionStatus !== 'todas' && (sale.finance?.collectionStatus || 'sin_cobro') !== filters.collectionStatus) return false;
            if (filters.tradeInOnly && (!sale.tradeIns || sale.tradeIns.length === 0)) return false;

            const saleDate = new Date(sale.saleDate || sale.createdAt);
            if (filters.dateFrom) {
                const from = new Date(`${filters.dateFrom}T00:00:00`);
                if (saleDate < from) return false;
            }
            if (filters.dateTo) {
                const to = new Date(`${filters.dateTo}T23:59:59`);
                if (saleDate > to) return false;
            }
            if (filters.month) {
                const saleMonth = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
                if (saleMonth !== filters.month) return false;
            }

            return true;
        });
    }, [mySales, filters]);

    const filteredReservations = useMemo(() => {
        return myReservations.filter((reservation) => {
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const clientName = (reservation.clientId?.fullName || reservation.clientId?.firstName || '').toLowerCase();
                const leadName = (reservation.leadId?.name || '').toLowerCase();
                const vehicleBrand = (reservation.vehicleId?.brand || '').toLowerCase();
                const vehicleName = (reservation.vehicleId?.name || '').toLowerCase();
                const vehicleVin = (reservation.vehicleId?.plateOrVin || '').toLowerCase();
                const phone = (reservation.clientId?.phone || reservation.leadId?.phone || '').toLowerCase();

                const matchSearch =
                    clientName.includes(searchLower) ||
                    leadName.includes(searchLower) ||
                    vehicleBrand.includes(searchLower) ||
                    vehicleName.includes(searchLower) ||
                    vehicleVin.includes(searchLower) ||
                    phone.includes(searchLower);

                if (!matchSearch) return false;
            }

            if (filters.currency !== 'todas' && reservation.depositCurrency !== filters.currency && reservation.agreedCurrency !== filters.currency) return false;

            const reservationDate = new Date(reservation.createdAt);
            if (filters.dateFrom) {
                const from = new Date(`${filters.dateFrom}T00:00:00`);
                if (reservationDate < from) return false;
            }
            if (filters.dateTo) {
                const to = new Date(`${filters.dateTo}T23:59:59`);
                if (reservationDate > to) return false;
            }
            if (filters.month) {
                const reservationMonth = `${reservationDate.getFullYear()}-${String(reservationDate.getMonth() + 1).padStart(2, '0')}`;
                if (reservationMonth !== filters.month) return false;
            }

            return true;
        });
    }, [myReservations, filters]);

    const handleViewDetail = (sale) => {
        setSelectedSale(sale);
        setIsDrawerOpen(true);
    };

    const handleDeleteSale = (sale) => {
        if (sale.status !== 'cancelada') return;
        setConfirmDeleteSaleModal({ isOpen: true, sale });
    };

    const executeDeleteSale = async () => {
        const sale = confirmDeleteSaleModal.sale;
        if (!sale) return;
        try {
            await deleteSale(sale._id);
            loadData();
        } catch (err) {
            toast.error(err.message || 'Error al eliminar la venta');
        }
    };

    const handleDeleteReservation = (reservation) => {
        if (reservation.status !== 'cancelada' && reservation.status !== 'convertida') return;
        setConfirmDeleteReservationModal({ isOpen: true, reservation });
    };

    const executeDeleteReservation = async () => {
        const reservation = confirmDeleteReservationModal.reservation;
        if (!reservation) return;
        try {
            await deleteReservation(reservation._id);
            loadData();
        } catch (err) {
            toast.error(err.message || 'Error al eliminar la reserva');
        }
    };

    const handleLiberarClick = (reservation) => {
        setSelectedReservation(reservation);
        setIsCancelModalOpen(true);
    };

    const handleConvertirClick = (reservation) => {
        setSelectedReservationForSale(reservation);
        setIsConvertModalOpen(true);
    };

    const totals = useMemo(() => {
        const activeSales = mySales.filter((sale) => ['borrador', 'confirmada', 'pendiente_entrega'].includes(sale.status));
        return {
            total: mySales.length,
            active: activeSales.length,
            closed: mySales.filter((sale) => ['entregada', 'cancelada'].includes(sale.status)).length
        };
    }, [mySales]);

    const handleExport = () => {
        const headers = isReservationsTab
            ? ['Fecha', 'Cliente', 'Vehiculo', 'Estado', 'Moneda sena', 'Monto sena', 'Vencimiento']
            : ['Fecha', 'Cliente', 'Vehiculo', 'Estado', 'Metodo', 'Moneda', 'Precio'];

        const rows = isReservationsTab
            ? filteredReservations.map((reservation) => ([
                new Date(reservation.createdAt).toLocaleDateString('es-AR'),
                reservation.clientId?.fullName || reservation.clientId?.firstName || reservation.leadId?.name || '',
                reservation.vehicleId ? `${reservation.vehicleId.brand || ''} ${reservation.vehicleId.name || ''}`.trim() : '',
                reservation.status || '',
                reservation.depositCurrency || '',
                reservation.depositAmount || 0,
                reservation.expiresAt ? new Date(reservation.expiresAt).toLocaleDateString('es-AR') : ''
            ]))
            : filteredSales.map((sale) => ([
                new Date(sale.saleDate || sale.createdAt).toLocaleDateString('es-AR'),
                sale.clientId?.fullName || sale.clientId?.firstName || sale.leadId?.name || '',
                sale.vehicleId ? `${sale.vehicleId.brand || ''} ${sale.vehicleId.name || ''}`.trim() : '',
                sale.status || '',
                sale.paymentMethod || '',
                sale.saleCurrency || '',
                sale.salePrice || 0
            ]));

        const csv = [headers, ...rows]
            .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mis_ventas_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const activeRowsCount = isReservationsTab ? filteredReservations.length : filteredSales.length;

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 pb-24 md:p-6">
            <div className="flex flex-col gap-4 border-b border-crm-border pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="m-0 text-[26px] font-bold leading-tight text-crm-fg">Mis Ventas <span className="text-xl">🏆</span></h1>
                    <p className="m-0 mt-1 text-sm font-medium text-crm-fg-muted">
                        {totals.total} ventas · {totals.active} en curso · {totals.closed} cerradas
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <CrmButton
                        variant="secondary"
                        size="sm"
                        onClick={handleExport}
                        disabled={activeRowsCount === 0}
                        className="h-9"
                    >
                        <Download size={14} />
                        Exportar
                    </CrmButton>
                    <CrmButton
                        variant="primary"
                        size="sm"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="h-9 shadow-[0_0_28px_rgba(239,51,41,0.45)]"
                    >
                        <Plus size={14} />
                        Nueva venta
                    </CrmButton>
                </div>
            </div>

            {pageError && (
                <div className="flex items-center gap-3 rounded-xl border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-red-300">
                    <ShieldAlert size={20} />
                    {pageError}
                </div>
            )}

            {pageLoading && mySales.length === 0 && myReservations.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-xl border border-crm-border bg-crm-surface">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                        <span className="text-sm text-crm-fg-muted">Cargando mis ventas...</span>
                    </div>
                </div>
            ) : (
                <>
                    <SalesPerformanceDashboard 
                        goalData={goalData}
                        goalLoading={goalLoading}
                        currentUser={user}
                        totals={totals}
                        mySales={mySales}
                        myReservations={myReservations}
                    />

                    <SalesFilters filters={filters} setFilters={setFilters} onRefresh={loadData} loading={loading || reservationsLoading} />

                    {isReservationsTab ? (
                        <>
                            <ReservationsTable
                                reservations={filteredReservations}
                                onLiberar={handleLiberarClick}
                                onConvertir={handleConvertirClick}
                                getIsOverdue={getIsOverdue}
                                onDelete={handleDeleteReservation}
                            />
                            <ReservationMobileCards
                                reservations={filteredReservations}
                                onLiberar={handleLiberarClick}
                                onConvertir={handleConvertirClick}
                                getIsOverdue={getIsOverdue}
                                onDelete={handleDeleteReservation}
                            />
                        </>
                    ) : (
                        <>
                            <SalesTable sales={filteredSales} onViewDetail={handleViewDetail} onDeleteSale={handleDeleteSale} />
                            <SaleMobileCards sales={filteredSales} onViewDetail={handleViewDetail} onDeleteSale={handleDeleteSale} />
                        </>
                    )}
                </>
            )}

            <SaleCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={loadData}
            />

            <SaleDetailDrawer
                isOpen={isDrawerOpen}
                onClose={() => {
                    setIsDrawerOpen(false);
                    setSelectedSale(null);
                }}
                sale={selectedSale}
            />

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

            <ConfirmModal
                isOpen={confirmDeleteSaleModal.isOpen}
                onClose={() => setConfirmDeleteSaleModal({ isOpen: false, sale: null })}
                onConfirm={executeDeleteSale}
                title="Eliminar Venta Cancelada"
                message="¿Estás seguro de que quieres eliminar permanentemente esta venta cancelada? Esta acción es irreversible."
                confirmText="Eliminar permanentemente"
                isDestructive={true}
            />

            <ConfirmModal
                isOpen={confirmDeleteReservationModal.isOpen}
                onClose={() => setConfirmDeleteReservationModal({ isOpen: false, reservation: null })}
                onConfirm={executeDeleteReservation}
                title={`Eliminar Reserva ${confirmDeleteReservationModal.reservation?.status}`}
                message={`¿Estás seguro de que quieres eliminar permanentemente esta reserva ${confirmDeleteReservationModal.reservation?.status}? Esta acción es irreversible.`}
                confirmText="Eliminar permanentemente"
                isDestructive={true}
            />
        </div>
    );
}
