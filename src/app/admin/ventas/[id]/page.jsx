"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminSales } from '../../../../hooks/useAdminSales';
import SaleDetailHeader from '../../../../components/crm/sales/detail/SaleDetailHeader';
import SaleCommercialPanel from '../../../../components/crm/sales/detail/SaleCommercialPanel';
import SaleLinkedEntitiesPanel from '../../../../components/crm/sales/detail/SaleLinkedEntitiesPanel';
import SaleChecklistPanel from '../../../../components/crm/sales/detail/SaleChecklistPanel';
import SaleNotesPanel from '../../../../components/crm/sales/detail/SaleNotesPanel';
import SaleStatusPanel from '../../../../components/crm/sales/detail/SaleStatusPanel';
import SaleAuditTimeline from '../../../../components/crm/sales/detail/SaleAuditTimeline';
import SaleFinancePanel from '../../../../components/crm/sales/detail/SaleFinancePanel';
import SaleInstallmentsPanel from '../../../../components/crm/sales/detail/SaleInstallmentsPanel';
import { ShieldAlert } from 'lucide-react';

export default function SaleDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { fetchSaleById, updateSale, loading, error } = useAdminSales();
    const [sale, setSale] = useState(null);

    useEffect(() => {
        if (id) {
            loadSale();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadSale = async () => {
        const data = await fetchSaleById(id);
        if (data) {
            setSale(data);
        }
    };

    const handleSave = async (payload) => {
        const updatedSale = await updateSale(id, payload);
        if (updatedSale) {
            setSale(updatedSale);
        }
    };

    if (loading && !sale) {
        return (
            <div className="flex-1 flex justify-center items-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error || !sale) {
        return (
            <div className="max-w-7xl mx-auto p-4">
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl flex flex-col items-center justify-center gap-4 text-center">
                    <ShieldAlert size={48} />
                    <div>
                        <h2 className="text-xl font-bold mb-2">Error al cargar la venta</h2>
                        <p>{error || 'Venta no encontrada'}</p>
                    </div>
                    <button 
                        onClick={() => router.push('/admin/ventas')}
                        className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors mt-4"
                    >
                        Volver a Ventas
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto flex flex-col h-full min-h-[85vh] pb-12">
            
            <SaleDetailHeader sale={sale} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Columna Izquierda: Entidades y Resumen Comercial */}
                <div className="flex flex-col gap-6 lg:col-span-1">
                    <div className="h-auto">
                        <SaleLinkedEntitiesPanel sale={sale} />
                    </div>
                    <div className="h-auto">
                        <SaleCommercialPanel sale={sale} />
                    </div>
                    <div className="h-[300px]">
                        <SaleStatusPanel sale={sale} onSave={handleSave} />
                    </div>
                </div>

                {/* Columna Central: Checklists */}
                <div className="flex flex-col gap-6 lg:col-span-1">
                    <div className="h-[400px]">
                        <SaleChecklistPanel 
                            sale={sale} 
                            type="documentation" 
                            onSave={handleSave} 
                        />
                    </div>
                    <div className="h-[400px]">
                        <SaleChecklistPanel 
                            sale={sale} 
                            type="delivery" 
                            onSave={handleSave} 
                        />
                    </div>
                </div>

                {/* Columna Derecha: Notas y Auditoría */}
                <div className="flex flex-col gap-6 lg:col-span-1">
                    <div className="h-[300px]">
                        <SaleNotesPanel sale={sale} onSave={handleSave} />
                    </div>
                    <div className="h-[500px]">
                        <SaleAuditTimeline sale={sale} />
                    </div>
                </div>

            </div>

            {/* Panel de Movimientos Financieros (Ancho completo) */}
            <div className="mt-6">
                <SaleFinancePanel sale={sale} />
            </div>

            {/* Panel de Cuotas Manuales (Ancho completo) */}
            <div className="mt-6">
                <SaleInstallmentsPanel sale={sale} saleFinanceData={sale.finance} />
            </div>

        </div>
    );
}
