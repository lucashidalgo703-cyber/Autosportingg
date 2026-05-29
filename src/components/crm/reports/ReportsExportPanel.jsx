import React from 'react';
import { Download, FileText, BarChart3, CarFront, Target, CalendarClock } from 'lucide-react';
import { downloadCsv, formatDateForCsv, formatMoneyForCsv } from '../../../utils/csvExport';

export default function ReportsExportPanel({ data, filters }) {
    const { sales, cars, installments, tasks } = data;
    const nowStr = new Date().toISOString().split('T')[0];

    const getFilterLabel = () => {
        const period = filters.dateRange === 'all' ? 'Todo' : filters.dateRange === '30d' ? '30 días' : filters.dateRange === '90d' ? '90 días' : '1 Año';
        const curr = filters.currency === 'todos' ? 'ARS+USD' : filters.currency;
        return `Período: ${period} | Moneda: ${curr}`;
    };

    const handleExportSummary = () => {
        let stockUsd = 0;
        let stockArs = 0;
        let ventasArs = 0;
        let ventasUsd = 0;
        let deudaArs = 0;
        let deudaUsd = 0;

        cars.forEach(c => {
            if (c.status === 'Disponible') {
                if (c.currency === 'USD') stockUsd += c.price || 0;
                if (c.currency === 'ARS') stockArs += c.price || 0;
            }
        });

        const confirmadas = sales.filter(s => s.status !== 'cancelada' && s.status !== 'borrador');
        confirmadas.forEach(s => {
            if (s.saleCurrency === 'USD') ventasUsd += s.salePrice || 0;
            if (s.saleCurrency === 'ARS') ventasArs += s.salePrice || 0;
        });

        let cuotasVencidas = 0;
        installments.forEach(i => {
            if (i.status === 'pendiente') {
                const remaining = (i.amount || 0) - (i.paidAmount || 0);
                if (i.currency === 'ARS') deudaArs += remaining;
                if (i.currency === 'USD') deudaUsd += remaining;

                const due = new Date(i.dueDate).setHours(0,0,0,0);
                if (due < new Date().setHours(0,0,0,0)) cuotasVencidas++;
            }
        });

        const tareasVencidas = tasks.filter(t => t.status === 'pendiente' && new Date(t.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)).length;
        const entregasPendientes = sales.filter(s => s.deliveryStatus !== 'entregado').length;
        const incidencias = sales.filter(s => s.postSaleStatus === 'incidencia').length;

        const columns = [
            'Fecha Generación', 'Período Filtrado', 'Moneda Filtrada', 
            'Capital Stock ARS', 'Capital Stock USD', 'Unidades Stock Disp.',
            'Ventas Confirmadas', 'Volumen Ventas ARS', 'Volumen Ventas USD',
            'Deuda Pendiente ARS', 'Deuda Pendiente USD', 'Cuotas Vencidas',
            'Tareas Vencidas', 'Entregas Pendientes', 'Incidencias Postventa'
        ];

        const rows = [[
            formatDateForCsv(new Date()),
            filters.dateRange,
            filters.currency,
            formatMoneyForCsv(stockArs),
            formatMoneyForCsv(stockUsd),
            cars.filter(c => c.status === 'Disponible').length,
            confirmadas.length,
            formatMoneyForCsv(ventasArs),
            formatMoneyForCsv(ventasUsd),
            formatMoneyForCsv(deudaArs),
            formatMoneyForCsv(deudaUsd),
            cuotasVencidas,
            tareasVencidas,
            entregasPendientes,
            incidencias
        ]];

        downloadCsv(`autosporting_resumen_gerencial_${nowStr}.csv`, columns, rows);
    };

    const handleExportSales = () => {
        const columns = [
            'ID Venta', 'Fecha Operación', 'Cliente', 'Vehículo', 'Patente',
            'Estado Venta', 'Estado Doc', 'Estado Entrega', 'Estado Postventa',
            'Moneda', 'Precio Venta', 'Cobrado Neto', 'Saldo Pendiente'
        ];

        const rows = sales.map(s => {
            const client = s.clientId?.fullName || s.clientId?.firstName || 'Sin Cliente';
            const vehicle = s.vehicleId ? `${s.vehicleId.brand} ${s.vehicleId.name}` : 'Sin Vehículo';
            const plate = s.vehicleId?.plateOrVin || '';
            const fin = s.finance || { netoCobrado: 0, pendingBalance: s.salePrice || 0 };

            return [
                s._id.slice(-6).toUpperCase(),
                formatDateForCsv(s.saleDate || s.createdAt),
                client,
                vehicle,
                plate,
                s.status || 'N/A',
                s.documentationStatus || 'pendiente',
                s.deliveryStatus || 'pendiente',
                s.postSaleStatus || 'pendiente',
                s.saleCurrency || '',
                formatMoneyForCsv(s.salePrice),
                formatMoneyForCsv(fin.netoCobrado),
                formatMoneyForCsv(fin.pendingBalance)
            ];
        });

        downloadCsv(`autosporting_ventas_${nowStr}.csv`, columns, rows);
    };

    const handleExportStock = () => {
        const columns = [
            'Marca', 'Modelo', 'Versión', 'Año', 'Patente',
            'Estado', 'Visible en Web', 'Moneda', 'Precio',
            'Días en Stock', 'Observaciones'
        ];

        const now = new Date();
        const rows = cars.map(c => {
            let daysInStock = '';
            if (c.createdAt && c.status === 'Disponible') {
                const diffTime = Math.abs(now - new Date(c.createdAt));
                daysInStock = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            return [
                c.brand || '',
                c.name || '',
                c.version || '',
                c.year || '',
                c.plateOrVin || '',
                c.status || '',
                c.visible ? 'SI' : 'NO',
                c.currency || '',
                formatMoneyForCsv(c.price),
                daysInStock,
                c.description || ''
            ];
        });

        downloadCsv(`autosporting_stock_${nowStr}.csv`, columns, rows);
    };

    const handleExportCollections = () => {
        const columns = [
            'Cliente', 'Vehículo', 'Venta ID', 'Cuota Nro',
            'Vencimiento', 'Moneda', 'Importe', 'Cobrado', 'Saldo',
            'Estado Cuota', 'Vencida'
        ];

        const rows = installments.map(i => {
            const sale = i.saleId || {};
            const client = sale.clientId?.fullName || sale.clientId?.firstName || 'Sin Cliente';
            const vehicle = sale.vehicleId ? `${sale.vehicleId.brand} ${sale.vehicleId.name}` : 'Sin Vehículo';
            const saleIdStr = sale._id ? sale._id.slice(-6).toUpperCase() : '';
            
            const due = new Date(i.dueDate).setHours(0,0,0,0);
            const isVencida = i.status !== 'pagada' && due < new Date().setHours(0,0,0,0);
            const saldo = (i.amount || 0) - (i.paidAmount || 0);

            return [
                client,
                vehicle,
                saleIdStr,
                i.installmentNumber || '1',
                formatDateForCsv(i.dueDate),
                i.currency || '',
                formatMoneyForCsv(i.amount),
                formatMoneyForCsv(i.paidAmount || 0),
                formatMoneyForCsv(saldo),
                i.status || 'pendiente',
                isVencida ? 'SI' : 'NO'
            ];
        });

        downloadCsv(`autosporting_cobranzas_cuotas_${nowStr}.csv`, columns, rows);
    };

    const handleExportOperations = () => {
        const columns = [
            'Cliente', 'Vehículo', 'Venta ID',
            'Estado Doc', 'Progreso Doc (%)',
            'Estado Entrega', 'Progreso Entrega (%)',
            'Estado Postventa', 'Satisfacción',
            'Reseña Solicitada', 'Reseña Recibida',
            'Obsequio Entregado', 'Incidencia Resuelta'
        ];

        const rows = sales.map(s => {
            const client = s.clientId?.fullName || s.clientId?.firstName || 'Sin Cliente';
            const vehicle = s.vehicleId ? `${s.vehicleId.brand} ${s.vehicleId.name}` : 'Sin Vehículo';
            const saleIdStr = s._id.slice(-6).toUpperCase();

            // Calculo rápido progreso doc
            const docChk = s.documentationChecklist || [];
            const docTotal = docChk.length;
            const docOk = docChk.filter(c => c.completed).length;
            const docPct = docTotal > 0 ? Math.round((docOk/docTotal)*100) : 0;

            const delChk = s.deliveryChecklist || [];
            const delTotal = delChk.length;
            const delOk = delChk.filter(c => c.completed).length;
            const delPct = delTotal > 0 ? Math.round((delOk/delTotal)*100) : 0;

            const pChk = s.postSaleChecklist || {};

            return [
                client,
                vehicle,
                saleIdStr,
                s.documentationStatus || 'pendiente',
                docPct,
                s.deliveryStatus || 'pendiente',
                delPct,
                s.postSaleStatus || 'pendiente',
                s.satisfactionRating || 0,
                pChk.resenaSolicitada ? 'SI' : 'NO',
                pChk.resenaRecibida ? 'SI' : 'NO',
                pChk.obsequioEntregado ? 'SI' : 'NO',
                pChk.incidenciaResuelta ? 'SI' : 'NO'
            ];
        });

        downloadCsv(`autosporting_operaciones_${nowStr}.csv`, columns, rows);
    };

    const handleExportTasks = () => {
        const columns = [
            'Título', 'Tipo', 'Origen', 'Estado', 'Prioridad',
            'Vencimiento', 'Hora', 'Cliente', 'Vehículo', 'Venta ID', 'Notas'
        ];

        const rows = tasks.map(t => {
            const client = t.clientId?.fullName || t.clientId?.firstName || '';
            const vehicle = t.vehicleId ? `${t.vehicleId.brand} ${t.vehicleId.name}` : '';
            const saleIdStr = t.saleId ? (typeof t.saleId === 'object' ? t.saleId._id.slice(-6).toUpperCase() : t.saleId.slice(-6).toUpperCase()) : '';

            return [
                t.title || '',
                t.type || 'general',
                t.source || 'manual',
                t.status || 'pendiente',
                t.priority || 'media',
                formatDateForCsv(t.dueDate),
                t.dueTime || '',
                client,
                vehicle,
                saleIdStr,
                t.description || ''
            ];
        });

        downloadCsv(`autosporting_tareas_${nowStr}.csv`, columns, rows);
    };

    return (
        <div className="bg-[#161619] border border-[#33333A] rounded-2xl p-5 mb-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Download size={16} className="text-pink-500" />
                        Exportaciones Gerenciales
                    </h3>
                    <p className="text-[10px] text-neutral-400 mt-1 uppercase font-bold tracking-wider">
                        Las exportaciones son de solo lectura y respetan los filtros actuales ({getFilterLabel()}).
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
                <button 
                    onClick={handleExportSummary}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 rounded-xl text-xs font-bold transition-colors"
                >
                    <BarChart3 size={14} /> Resumen Gerencial
                </button>
                <button 
                    onClick={handleExportSales}
                    className="flex items-center gap-2 px-3 py-2 bg-[#1E1E24] hover:bg-neutral-800 border border-[#33333A] text-white rounded-xl text-xs font-bold transition-colors"
                >
                    <FileText size={14} /> Ventas
                </button>
                <button 
                    onClick={handleExportStock}
                    className="flex items-center gap-2 px-3 py-2 bg-[#1E1E24] hover:bg-neutral-800 border border-[#33333A] text-white rounded-xl text-xs font-bold transition-colors"
                >
                    <CarFront size={14} /> Stock
                </button>
                <button 
                    onClick={handleExportCollections}
                    className="flex items-center gap-2 px-3 py-2 bg-[#1E1E24] hover:bg-neutral-800 border border-[#33333A] text-white rounded-xl text-xs font-bold transition-colors"
                >
                    <Target size={14} /> Cobranzas / Cuotas
                </button>
                <button 
                    onClick={handleExportOperations}
                    className="flex items-center gap-2 px-3 py-2 bg-[#1E1E24] hover:bg-neutral-800 border border-[#33333A] text-white rounded-xl text-xs font-bold transition-colors"
                >
                    <FileText size={14} /> Doc / Entrega / Postventa
                </button>
                <button 
                    onClick={handleExportTasks}
                    className="flex items-center gap-2 px-3 py-2 bg-[#1E1E24] hover:bg-neutral-800 border border-[#33333A] text-white rounded-xl text-xs font-bold transition-colors"
                >
                    <CalendarClock size={14} /> Tareas
                </button>
            </div>
        </div>
    );
}
