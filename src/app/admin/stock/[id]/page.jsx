"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { mapRealCarToCRM } from '../../../../components/crm/stock/vehicleAdapter';
import VehicleDetailHeader from '../../../../components/crm/stock/VehicleDetailHeader';
import VehicleFinancialSummary from '../../../../components/crm/stock/VehicleFinancialSummary';
import VehicleInfoPanel from '../../../../components/crm/stock/VehicleInfoPanel';
import VehicleHistoryTimeline from '../../../../components/crm/stock/VehicleHistoryTimeline';
import VehicleDocumentsDemo from '../../../../components/crm/stock/VehicleDocumentsDemo';
import VehicleActionsPanel from '../../../../components/crm/stock/VehicleActionsPanel';
import VehicleImagesPanel from '../../../../components/crm/stock/VehicleImagesPanel';
import VehicleWebStatusPanel from '../../../../components/crm/stock/VehicleWebStatusPanel';
import VehicleEditModal from '../../../../components/crm/stock/VehicleEditModal';
import VehicleDeleteModal from '../../../../components/crm/stock/VehicleDeleteModal';
import ExpenseAddModal from '../../../../components/crm/stock/ExpenseAddModal';
import ReservationModal from '../../../../components/crm/reservations/ReservationModal';
import ReservationCancelModal from '../../../../components/crm/reservations/ReservationCancelModal';
import { useAdminReservations } from '../../../../hooks/useAdminReservations';

export default function VehicleDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [vehicle, setVehicle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isExpenseOpen, setIsExpenseOpen] = useState(false);
    const [isReservationOpen, setIsReservationOpen] = useState(false);
    const [isCancelReservationOpen, setIsCancelReservationOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [activeReservation, setActiveReservation] = useState(null);
    const { fetchReservations } = useAdminReservations();

    const fetchCar = async () => {
        if (!params?.id) return;
        try {
            setLoading(true);
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            
            const response = await fetch(`${baseUrl}/api/admin/cars/${params.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    setVehicle(null);
                } else {
                    throw new Error('Error al obtener datos');
                }
            } else {
                const data = await response.json();
                const mappedCar = mapRealCarToCRM(data);
                setVehicle(mappedCar);
                
                // Fetch active reservations
                if (mappedCar?.id) {
                    const reservations = await fetchReservations({ vehicleId: mappedCar.id, status: 'activa' });
                    if (reservations && reservations.length > 0) {
                        setActiveReservation(reservations[0]);
                    } else {
                        setActiveReservation(null);
                    }
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCar();
    }, [params?.id]);

    const handleSaveVehicle = async (payload) => {
        const API_URL = process.env.NEXT_PUBLIC_API_URL;
        const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        
        const response = await fetch(`${baseUrl}/api/admin/cars/${params.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'Error al actualizar');
        }

        await fetchCar(); // Refrescar los datos localmente
    };

    const handleSaveExpense = async (expensePayload) => {
        // Obtenemos los expenses actuales y añadimos el nuevo
        const currentExpenses = vehicle.expensesList || [];
        const newExpenses = [...currentExpenses, expensePayload];
        
        await handleSaveVehicle({ expenses: newExpenses });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E63027]"></div>
                    <span className="text-[#A1A1AA] text-sm">Cargando datos reales del vehículo...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="flex flex-col items-center gap-3 text-center">
                    <span className="text-[#EF3329] font-bold">Error de conexión</span>
                    <span className="text-[#A1A1AA] text-sm">{error}</span>
                </div>
            </div>
        );
    }

    if (!vehicle) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-white mb-2">Vehículo no encontrado</h2>
                    <p className="text-[#A1A1AA] text-sm">El vehículo con ID "{params.id}" no existe en la base de datos de demostración.</p>
                </div>
                <Link 
                    href="/admin/stock"
                    className="flex items-center gap-2 px-4 py-2 bg-[#E63027] text-white rounded-lg hover:bg-[#C42620] transition-colors font-medium text-sm"
                >
                    <ArrowLeft size={16} />
                    Volver al Stock
                </Link>
            </div>
        );
    }

    return (
        <>
                <div className="flex flex-col gap-6">
                    <VehicleDetailHeader vehicle={vehicle} activeReservation={activeReservation} />
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Columna Principal (2/3) */}
                        <div className="lg:col-span-2 flex flex-col gap-6">
                            <VehicleFinancialSummary vehicle={vehicle} />
                            <VehicleImagesPanel vehicle={vehicle} onSaveComplete={fetchCar} />
                            <VehicleInfoPanel vehicle={vehicle} />
                            <VehicleHistoryTimeline vehicle={vehicle} />
                        </div>
                        
                        {/* Columna Lateral (1/3) */}
                        <div className="flex flex-col gap-6">
                            <VehicleWebStatusPanel vehicle={vehicle} onSaveComplete={fetchCar} />
                            <VehicleActionsPanel 
                                vehicle={vehicle} 
                                onEdit={() => setIsEditOpen(true)}
                                onAddExpense={() => setIsExpenseOpen(true)}
                                onReserve={() => setIsReservationOpen(true)}
                                onCancelReserve={() => setIsCancelReservationOpen(true)}
                                onDelete={() => setIsDeleteOpen(true)}
                                activeReservation={activeReservation}
                            />
                            <VehicleDocumentsDemo vehicle={vehicle} />
                        </div>
                    </div>
                </div>

                <VehicleEditModal 
                    isOpen={isEditOpen} 
                    onClose={() => setIsEditOpen(false)} 
                    onSave={handleSaveVehicle} 
                    vehicleData={vehicle} 
                />
                
                <ExpenseAddModal 
                    isOpen={isExpenseOpen} 
                    onClose={() => setIsExpenseOpen(false)} 
                    onSave={handleSaveExpense} 
                    vehicleCurrency={vehicle.monedaCompra || 'USD'} 
                />

                <ReservationModal
                    isOpen={isReservationOpen}
                    onClose={() => setIsReservationOpen(false)}
                    onSuccess={() => {
                        setIsReservationOpen(false);
                        fetchCar();
                    }}
                    initialData={{
                        vehicleId: vehicle?.id,
                        vehicleName: `${vehicle?.marca} ${vehicle?.modelo} ${vehicle?.version || ''} ${vehicle?.year || ''}`.trim(),
                        agreedPrice: vehicle?.precio,
                        agreedCurrency: vehicle?.monedaCompra || 'USD'
                    }}
                />

                {activeReservation?._id && (
                    <ReservationCancelModal
                        isOpen={isCancelReservationOpen}
                        onClose={() => setIsCancelReservationOpen(false)}
                        onSuccess={() => {
                            setIsCancelReservationOpen(false);
                            fetchCar();
                        }}
                        reservation={activeReservation}
                    />
                )}

                <VehicleDeleteModal
                    isOpen={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    vehicle={vehicle}
                    onSuccess={() => {
                        setIsDeleteOpen(false);
                        router.push('/admin/stock');
                    }}
                />
        </>
    );
}
