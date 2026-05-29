"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAdminSales } from '../../../../hooks/useAdminSales';
import { useAdminCars } from '../../../../hooks/useAdminCars';
import { useAdminInstallments } from '../../../../hooks/useAdminInstallments';
import { useAdminCrmTasks } from '../../../../hooks/useAdminCrmTasks';
import PermissionGuard from '../../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS } from '../../../../utils/adminPermissions';

export default function PrintableReportPage() {
    const searchParams = useSearchParams();
    const period = searchParams.get('period') || 'all';
    const currency = searchParams.get('currency') || 'todos';

    const { fetchSales } = useAdminSales();
    const { refresh: fetchCars } = useAdminCars();
    const { fetchInstallments } = useAdminInstallments();
    const { fetchTasks } = useAdminCrmTasks();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ sales: [], cars: [], installments: [], tasks: [] });

    useEffect(() => {
        const loadAll = async () => {
            try {
                const [salesData, carsData, instData, tasksData] = await Promise.all([
                    fetchSales(), fetchCars(), fetchInstallments(), fetchTasks()
                ]);
                setData({
                    sales: salesData || [],
                    cars: carsData || [],
                    installments: instData || [],
                    tasks: tasksData || []
                });
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        let { sales, cars, installments, tasks } = data;

        if (period !== 'all') {
            const limit = new Date();
            if (period === '30d') limit.setDate(limit.getDate() - 30);
            if (period === '90d') limit.setDate(limit.getDate() - 90);
            if (period === 'year') limit.setFullYear(limit.getFullYear() - 1);

            sales = sales.filter(s => new Date(s.saleDate) >= limit);
            tasks = tasks.filter(t => new Date(t.createdAt) >= limit);
        }

        if (currency !== 'todos') {
            sales = sales.filter(s => s.saleCurrency === currency);
            installments = installments.filter(i => i.currency === currency);
        }

        return { sales, cars, installments, tasks };
    }, [data, period, currency]);

    // Métricas Resumen Ejecutivo
    const stockDisp = filtered.cars.filter(c => c.status === 'Disponible');
    let stockUsd = 0; let stockArs = 0;
    stockDisp.forEach(c => {
        if (c.currency === 'USD') stockUsd += c.price || 0;
        if (c.currency === 'ARS') stockArs += c.price || 0;
    });

    const confirmadas = filtered.sales.filter(s => s.status !== 'cancelada' && s.status !== 'borrador');
    let ventasArs = 0; let ventasUsd = 0;
    confirmadas.forEach(s => {
        if (s.saleCurrency === 'USD') ventasUsd += s.salePrice || 0;
        if (s.saleCurrency === 'ARS') ventasArs += s.salePrice || 0;
    });

    let deudaArs = 0; let deudaUsd = 0; let cuotasVencidas = 0;
    filtered.installments.forEach(i => {
        if (i.status === 'pendiente') {
            const rem = (i.amount || 0) - (i.paidAmount || 0);
            if (i.currency === 'ARS') deudaArs += rem;
            if (i.currency === 'USD') deudaUsd += rem;
            if (new Date(i.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)) cuotasVencidas++;
        }
    });

    const tareasVencidas = filtered.tasks.filter(t => t.status === 'pendiente' && new Date(t.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)).length;
    const entregasPendientes = filtered.sales.filter(s => s.deliveryStatus !== 'entregado').length;
    const incidencias = filtered.sales.filter(s => s.postSaleStatus === 'incidencia').length;

    const formatMoney = (val, cur) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(val);

    if (loading) {
        return <div className="p-10 font-sans">Generando reporte para imprimir...</div>;
    }

    return (
        <PermissionGuard permission={PERMISSIONS.REPORTES_EXPORT}>
        <div className="font-sans text-black bg-white min-h-screen">
            
            {/* Controles solo pantalla */}
            <div className="print:hidden p-4 bg-gray-100 border-b border-gray-300 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-700">Vista previa de impresión</span>
                <button 
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm shadow hover:bg-blue-700"
                >
                    Imprimir / Guardar PDF
                </button>
            </div>

            <div className="max-w-[800px] mx-auto p-8" id="printable-area">
                
                {/* Header */}
                <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter">AUTOSPORTING</h1>
                        <h2 className="text-xl font-bold text-gray-600 mt-1">Reporte Gerencial</h2>
                    </div>
                    <div className="text-right text-sm">
                        <div><span className="font-bold">Fecha:</span> {new Date().toLocaleDateString('es-AR')}</div>
                        <div><span className="font-bold">Filtro Período:</span> {period === 'all' ? 'Todo' : period === '30d' ? '30 Días' : period === '90d' ? '90 Días' : '1 Año'}</div>
                        <div><span className="font-bold">Filtro Moneda:</span> {currency === 'todos' ? 'ARS + USD' : currency}</div>
                    </div>
                </div>

                {/* Resumen Ejecutivo */}
                <div className="mb-8 break-inside-avoid">
                    <h3 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3 uppercase tracking-wider">Resumen Ejecutivo</h3>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <div className="flex justify-between pr-4"><span className="font-bold">Unidades en Stock:</span> <span>{stockDisp.length}</span></div>
                        <div className="flex justify-between pl-4"><span className="font-bold">Ventas Confirmadas:</span> <span>{confirmadas.length}</span></div>
                        
                        <div className="flex justify-between pr-4"><span className="font-bold">Capital Stock USD:</span> <span>{formatMoney(stockUsd, 'USD')}</span></div>
                        <div className="flex justify-between pl-4"><span className="font-bold">Volumen Ventas USD:</span> <span>{formatMoney(ventasUsd, 'USD')}</span></div>
                        
                        <div className="flex justify-between pr-4"><span className="font-bold">Capital Stock ARS:</span> <span>{formatMoney(stockArs, 'ARS')}</span></div>
                        <div className="flex justify-between pl-4"><span className="font-bold">Volumen Ventas ARS:</span> <span>{formatMoney(ventasArs, 'ARS')}</span></div>
                        
                        <div className="flex justify-between pr-4 mt-2"><span className="font-bold text-red-600">Deuda Pdte USD:</span> <span className="text-red-600">{formatMoney(deudaUsd, 'USD')}</span></div>
                        <div className="flex justify-between pl-4 mt-2"><span className="font-bold text-red-600">Deuda Pdte ARS:</span> <span className="text-red-600">{formatMoney(deudaArs, 'ARS')}</span></div>
                        
                        <div className="flex justify-between pr-4"><span className="font-bold text-red-600">Cuotas Vencidas:</span> <span className="text-red-600">{cuotasVencidas}</span></div>
                        <div className="flex justify-between pl-4"><span className="font-bold text-orange-600">Tareas Vencidas:</span> <span className="text-orange-600">{tareasVencidas}</span></div>
                        
                        <div className="flex justify-between pr-4"><span className="font-bold">Entregas Pdtes:</span> <span>{entregasPendientes}</span></div>
                        <div className="flex justify-between pl-4"><span className="font-bold text-red-600">Incidencias Abiertas:</span> <span className="text-red-600">{incidencias}</span></div>
                    </div>
                </div>

                {/* Desglose Ventas */}
                <div className="mb-8 break-inside-avoid">
                    <h3 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3 uppercase tracking-wider">Ventas</h3>
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-gray-300 p-2 font-bold">Estado</th>
                                <th className="border border-gray-300 p-2 font-bold text-right">Cantidad</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-gray-300 p-2">Entregadas</td>
                                <td className="border border-gray-300 p-2 text-right">{filtered.sales.filter(s => s.status === 'entregada').length}</td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 p-2">Pendientes de Entrega</td>
                                <td className="border border-gray-300 p-2 text-right">{filtered.sales.filter(s => s.status === 'pendiente_entrega').length}</td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 p-2">Confirmadas (Iniciadas)</td>
                                <td className="border border-gray-300 p-2 text-right">{filtered.sales.filter(s => s.status === 'confirmada').length}</td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 p-2">Borradores / Canceladas</td>
                                <td className="border border-gray-300 p-2 text-right">{filtered.sales.filter(s => s.status === 'borrador' || s.status === 'cancelada').length}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Desglose Stock */}
                <div className="mb-8 break-inside-avoid">
                    <h3 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3 uppercase tracking-wider">Stock</h3>
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-gray-300 p-2 font-bold">Estado</th>
                                <th className="border border-gray-300 p-2 font-bold text-right">Cantidad</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-gray-300 p-2">Disponibles</td>
                                <td className="border border-gray-300 p-2 text-right">{stockDisp.length}</td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 p-2">Reservados</td>
                                <td className="border border-gray-300 p-2 text-right">{filtered.cars.filter(c => c.status === 'Reservado').length}</td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 p-2">Vendidos (Histórico)</td>
                                <td className="border border-gray-300 p-2 text-right">{filtered.cars.filter(c => c.status === 'Vendido').length}</td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 p-2">Pausados / Ocultos</td>
                                <td className="border border-gray-300 p-2 text-right">{filtered.cars.filter(c => c.status === 'Pausado' || c.status === 'Oculto').length}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Tareas */}
                <div className="mb-8 break-inside-avoid">
                    <h3 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3 uppercase tracking-wider">Productividad & Tareas</h3>
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-gray-300 p-2 font-bold">Métrica</th>
                                <th className="border border-gray-300 p-2 font-bold text-right">Cantidad</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-gray-300 p-2">Tareas Pendientes (Total)</td>
                                <td className="border border-gray-300 p-2 text-right">{filtered.tasks.filter(t => t.status === 'pendiente').length}</td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 p-2 text-red-600 font-bold">Tareas Vencidas</td>
                                <td className="border border-gray-300 p-2 text-right text-red-600 font-bold">{tareasVencidas}</td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 p-2">Tareas Completadas</td>
                                <td className="border border-gray-300 p-2 text-right">{filtered.tasks.filter(t => t.status === 'completada').length}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div className="text-center text-xs text-gray-400 mt-12 pt-4 border-t border-gray-200">
                    Reporte confidencial generado por el sistema AutoSporting CRM.
                </div>

            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { margin: 1.5cm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
                }
            `}} />
        </div>
        </PermissionGuard>
    );
}
