"use client";
import CrmShell from '../../components/crm/layout/CrmShell';
import CrmStatCard from '../../components/crm/ui/CrmStatCard';
import CrmCard from '../../components/crm/ui/CrmCard';
import CrmBadge from '../../components/crm/ui/CrmBadge';
import ProtectedRoute from '../../components/ProtectedRoute';
import { dashboardKpis } from '../../components/crm/demo/crmDemoData';

export default function AdminDashboardPage() {
    return (
        <ProtectedRoute>
            <CrmShell>
                <div className="flex flex-col gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white m-0 mb-1">Dashboard</h1>
                        <p className="text-sm text-[#A1A1AA] m-0">Resumen general de AutoSporting</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <CrmStatCard 
                            title="Capital Total (Demo)" 
                            value={dashboardKpis.capitalTotal.toLocaleString('es-AR')} 
                            prefix="$" 
                            trend="up" 
                            trendValue="+5.2%" 
                        />
                        <CrmStatCard 
                            title="Vehículos en Stock" 
                            value={dashboardKpis.unidadesStock} 
                            trend="up" 
                            trendValue="+2" 
                        />
                        <CrmStatCard 
                            title="Ventas del Mes" 
                            value={dashboardKpis.ventasMes} 
                            trend="up" 
                            trendValue="+15%" 
                        />
                        <CrmStatCard 
                            title="Reservas Activas" 
                            value={dashboardKpis.reservasActivas} 
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <CrmCard>
                            <h3 className="text-white font-semibold m-0 mb-4 text-lg">Alertas Operativas (Demo)</h3>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between p-3 bg-[#24242B] rounded-lg border border-[#33333A]">
                                    <div>
                                        <p className="text-sm text-white font-medium m-0">Vehículos con +90 días</p>
                                        <p className="text-xs text-[#A1A1AA] m-0">Requieren acción inmediata</p>
                                    </div>
                                    <CrmBadge variant="danger">{dashboardKpis.alertas90Dias} unidades</CrmBadge>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-[#24242B] rounded-lg border border-[#33333A]">
                                    <div>
                                        <p className="text-sm text-white font-medium m-0">Vehículos con +60 días</p>
                                        <p className="text-xs text-[#A1A1AA] m-0">Requieren revisión de estrategia</p>
                                    </div>
                                    <CrmBadge variant="warning">{dashboardKpis.alertas60Dias} unidades</CrmBadge>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-[#24242B] rounded-lg border border-[#33333A]">
                                    <div>
                                        <p className="text-sm text-white font-medium m-0">Cuotas Pendientes Vencidas</p>
                                        <p className="text-xs text-[#A1A1AA] m-0">Llamado de cobranza sugerido</p>
                                    </div>
                                    <CrmBadge variant="danger">{dashboardKpis.cuotasPendientes} cuotas</CrmBadge>
                                </div>
                            </div>
                        </CrmCard>
                        
                        <CrmCard>
                            <h3 className="text-white font-semibold m-0 mb-4 text-lg">Actividad Reciente (Demo)</h3>
                            <div className="flex flex-col gap-4">
                                <div className="flex gap-3">
                                    <div className="w-2 h-2 mt-1.5 rounded-full bg-[#E63027] shrink-0"></div>
                                    <div>
                                        <p className="text-sm text-white m-0">Reserva ingresada: Toyota Hilux 2021</p>
                                        <p className="text-xs text-[#A1A1AA] m-0">Hace 2 horas por Vendedor 1</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-2 h-2 mt-1.5 rounded-full bg-[#22C55E] shrink-0"></div>
                                    <div>
                                        <p className="text-sm text-white m-0">Entrega completada: Ford Ranger 2020</p>
                                        <p className="text-xs text-[#A1A1AA] m-0">Hace 5 horas por Gestoría</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-2 h-2 mt-1.5 rounded-full bg-[#3B82F6] shrink-0"></div>
                                    <div>
                                        <p className="text-sm text-white m-0">Nuevo Lead Digital: WhatsApp</p>
                                        <p className="text-xs text-[#A1A1AA] m-0">Ayer a las 18:30</p>
                                    </div>
                                </div>
                            </div>
                        </CrmCard>
                    </div>
                </div>
            </CrmShell>
        </ProtectedRoute>
    );
}
