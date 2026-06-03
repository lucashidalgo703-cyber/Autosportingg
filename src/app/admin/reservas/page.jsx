"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { CalendarClock, ShieldAlert } from 'lucide-react';
import { useAdminReservations } from '../../../hooks/useAdminReservations';
import ReservationsSummaryCards from '../../../components/crm/reservations/ReservationsSummaryCards';
import ReservationsFilters from '../../../components/crm/reservations/ReservationsFilters';
import ReservationsTable from '../../../components/crm/reservations/ReservationsTable';
import ReservationMobileCards from '../../../components/crm/reservations/ReservationMobileCards';
import ReservationCancelModal from '../../../components/crm/reservations/ReservationCancelModal';
import ConvertReservationToSaleModal from '../../../components/crm/reservations/ConvertReservationToSaleModal';

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
        dateRange: 'todas'
    });

    const loadData = async () => {
        // Fetch all reservations without status filter to do frontend filtering
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
        return allReservations.filter(res => {
            // 1. Search filter
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

            // 2. Status filter
            if (filters.status !== 'todas' && res.status !== filters.status) {
                return false;
            }

            // 3. Currency filter
            if (filters.currency !== 'todas' && res.depositCurrency !== filters.currency) {
                return false;
            }

            // 4. Date range filter
            if (filters.dateRange !== 'todas') {
                if (filters.dateRange === 'vencidas') {
                    if (!getIsOverdue(res)) return false;
                } else if (filters.dateRange === 'hoy') {
                    if (!res.expiresAt) return false;
                    const expiry = new Date(res.expiresAt);
                    const today = new Date();
                    if (expiry.setHours(0,0,0,0) !== today.setHours(0,0,0,0)) return false;
                } else if (filters.dateRange === 'proximos_7') {
                    if (!getIsExpiringNext7Days(res)) return false;
                }
            }

            return true;
        });
    }, [allReservations, filters]);

    const handleLiberarClick = (reservation) => {
        setSelectedReservation(reservation);
        setIsCancelModalOpen(true);
    };

    const handleConvertirClick = (reservation) => {
        setSelectedReservationForSale(reservation);
        setIsConvertModalOpen(true);
    };

    return (
        <div className="mx-auto w-full max-w-7xl p-4 md:p-6 flex flex-col h-full min-h-[85vh]">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-crm-fg tracking-tight m-0 mb-1">Gestión de Reservas</h1>
                    <p className="text-sm text-crm-fg-muted mt-0.5 m-0">Control de señas y vencimientos</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-center gap-3">
                    <ShieldAlert size={20} />
                    {error}
                </div>
            )}

            {loading && allReservations.length === 0 ? (
                <div className="flex-1 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
            ) : (
                <>
                    <ReservationsSummaryCards reservations={allReservations} />
                    <ReservationsFilters filters={filters} setFilters={setFilters} />
                    
                    <div className="flex justify-between items-center mb-4 mt-6">
                        <h2 className="text-lg font-bold text-crm-fg m-0">
                            Resultados <span className="text-crm-fg-muted font-normal">({filteredReservations.length})</span>
                        </h2>
                    </div>

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

            {/* Modal de Cancelación / Liberación */}
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
                        loadData(); // Refrescar datos automáticamente
                    }}
                    reservation={selectedReservation}
                />
            )}

            {/* Modal de Conversión a Venta */}
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
                        loadData(); // Refrescar datos automáticamente (reserva convertida desaparece o cambia badge)
                    }}
                    reservation={selectedReservationForSale}
                />
            )}
        </div>
    );
}
