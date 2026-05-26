"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CrmShell from '../../../../components/crm/layout/CrmShell';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { stockDemoData, calculateVehicleMetrics } from '../../../../components/crm/demo/stockDemoData';
import VehicleDetailHeader from '../../../../components/crm/stock/VehicleDetailHeader';
import VehicleFinancialSummary from '../../../../components/crm/stock/VehicleFinancialSummary';
import VehicleInfoPanel from '../../../../components/crm/stock/VehicleInfoPanel';
import VehicleHistoryTimeline from '../../../../components/crm/stock/VehicleHistoryTimeline';
import VehicleDocumentsDemo from '../../../../components/crm/stock/VehicleDocumentsDemo';
import VehicleActionsPanel from '../../../../components/crm/stock/VehicleActionsPanel';

export default function VehicleDetailPage({ params }) {
    const [vehicle, setVehicle] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulamos fetch de datos
        const timer = setTimeout(() => {
            const found = stockDemoData.find(v => v.id === params.id);
            if (found) {
                setVehicle(calculateVehicleMetrics(found));
            }
            setLoading(false);
        }, 300); // 300ms delay para simular red y skeleton
        
        return () => clearTimeout(timer);
    }, [params.id]);

    if (loading) {
        return (
            <ProtectedRoute>
                <CrmShell>
                    <div className="flex items-center justify-center h-[50vh]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E63027]"></div>
                    </div>
                </CrmShell>
            </ProtectedRoute>
        );
    }

    if (!vehicle) {
        return (
            <ProtectedRoute>
                <CrmShell>
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
                </CrmShell>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <CrmShell>
                <div className="flex flex-col gap-6">
                    <VehicleDetailHeader vehicle={vehicle} />
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Columna Principal (2/3) */}
                        <div className="lg:col-span-2 flex flex-col gap-6">
                            <VehicleFinancialSummary vehicle={vehicle} />
                            <VehicleInfoPanel vehicle={vehicle} />
                            <VehicleHistoryTimeline vehicle={vehicle} />
                        </div>
                        
                        {/* Columna Lateral (1/3) */}
                        <div className="flex flex-col gap-6">
                            <VehicleActionsPanel vehicle={vehicle} />
                            <VehicleDocumentsDemo vehicle={vehicle} />
                        </div>
                    </div>
                </div>
            </CrmShell>
        </ProtectedRoute>
    );
}
