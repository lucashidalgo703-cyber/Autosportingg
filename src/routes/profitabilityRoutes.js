// src/routes/profitabilityRoutes.js
// Rutas exclusivas del módulo RENTABILIDAD para AutoSporting CRM.
// Restringido al propietario y perfiles con permiso financiero explícito.

import express from 'express';
import mongoose from 'mongoose';
import { canReadRentabilidad } from '../utils/adminPermissions.js';
import * as defaultProfitabilityService from '../services/vehicleProfitabilityService.js';

export function createProfitabilityRouter({ authenticate, service = defaultProfitabilityService } = {}) {
    const router = express.Router();
    const {
        getVehicleProfitabilityOverview,
        getVehicleDetailedProfitability
    } = service;

    // Middleware de seguridad estricto para Rentabilidad
    const requireRentabilidadPermission = (req, res, next) => {
        if (!req.user || !canReadRentabilidad(req.user)) {
            return res.status(403).json({
                ok: false,
                message: 'Acceso denegado: El módulo de Rentabilidad está reservado al propietario y perfiles con permiso financiero explícito.'
            });
        }
        next();
    };

    router.use(authenticate);
    router.use(requireRentabilidadPermission);

    // 1. Resumen ejecutivo y listados (Vendidos y En Stock) con filtros
    router.get('/', async (req, res) => {
        try {
            const {
                startDate,
                endDate,
                period,
                search,
                statusFilter,
                participationFilter,
                deliveryFilter,
                exchangeRate
            } = req.query;

            const data = await getVehicleProfitabilityOverview({
                startDate,
                endDate,
                period,
                search,
                statusFilter,
                participationFilter,
                deliveryFilter,
                exchangeRate
            });

            res.json(data);
        } catch (error) {
            console.error('Error en /api/admin/profitability:', error);
            res.status(500).json({
                ok: false,
                message: 'No se pudo cargar el análisis de rentabilidad: ' + error.message
            });
        }
    });

    // 2. Exportación a CSV con trazabilidad completa y denominación contable precisa
    router.get('/export/csv', async (req, res) => {
        try {
            const {
                startDate,
                endDate,
                period,
                search,
                statusFilter,
                participationFilter,
                deliveryFilter,
                exchangeRate,
                view = 'sold' // 'sold' o 'stock'
            } = req.query;

            const data = await getVehicleProfitabilityOverview({
                startDate,
                endDate,
                period,
                search,
                statusFilter,
                participationFilter,
                deliveryFilter,
                exchangeRate
            });

            const rows = [];
            if (view === 'sold' || view === 'all') {
                rows.push([
                    'TIPO',
                    'ESTADO ENTREGA',
                    'RECONOCIMIENTO CONTABLE',
                    'VEHICULO',
                    'PATENTE',
                    'FECHA INGRESO',
                    'FECHA VENTA',
                    'DIAS INMOVILIZACION',
                    'MONEDA',
                    'PRECIO PACTADO',
                    'COSTO ADQUISICION',
                    'ORIGEN COSTO',
                    'GASTOS UNIDAD',
                    'GASTOS VENTA',
                    'COSTO TOTAL INVERTIDO',
                    'COMISION',
                    'MARGEN COMERCIAL NETO',
                    'MARGEN % SOBRE COSTO',
                    'MARGEN % SOBRE VENTA',
                    '% AGENCIA',
                    'MARGEN NETO AGENCIA',
                    'CAPITAL PROPIO INVERTIDO',
                    'GANANCIA DIARIA ($/DIA)',
                    'ROI ANUALIZADO (SECUNDARIO) %',
                    'EFECTIVO COBRADO',
                    'SALDO POR COBRAR EN CUOTAS',
                    'TIENE PERMUTA',
                    'SOCIO / INVERSOR'
                ]);

                for (const v of (data.soldVehicles || [])) {
                    rows.push([
                        'Vendido',
                        `"${v.deliveryStatusLabel || v.saleStatus}"`,
                        v.isDelivered ? 'Definitivo (Entregado)' : 'Condicional (Pendiente Entrega)',
                        `"${v.brand} ${v.name} (${v.year})"`,
                        `"${v.plateOrVin || ''}"`,
                        v.intakeDate || '',
                        v.saleDate || '',
                        v.daysImmobilized || '',
                        v.currency,
                        v.agreedPrice || 0,
                        v.acquisitionCost || 0,
                        `"${v.acquisitionSource || 'compra'}"`,
                        v.vehicleExpensesTotal || 0,
                        v.saleExpensesTotal || 0,
                        v.totalCostWithSaleExpenses || v.totalEconomicCost || 0,
                        v.commission?.amount || 0,
                        v.netProfit !== null ? v.netProfit : 'No calculable',
                        v.marginOnCostPct !== null ? `${v.marginOnCostPct}%` : 'N/D',
                        v.marginOnSalePct !== null ? `${v.marginOnSalePct}%` : 'N/D',
                        `${v.participation?.agencyPercentage}%`,
                        v.agencyNetProfit !== null ? v.agencyNetProfit : 'N/D',
                        v.agencyCapitalInvested !== null ? v.agencyCapitalInvested : 'N/D',
                        v.capitalEfficiency?.dailyProfit !== null ? v.capitalEfficiency.dailyProfit : 'N/D',
                        v.capitalEfficiency?.annualizedRoiPct !== null ? `${v.capitalEfficiency.annualizedRoiPct}%` : 'N/D',
                        v.cashMetrics?.cashCollected[v.currency] || 0,
                        v.cashMetrics?.pendingReceivable[v.currency] || 0,
                        v.tradeIns?.hasTradeInOrigin || (v.tradeIns?.receivedTradeIns || []).length > 0 ? 'Si' : 'No',
                        v.participation?.hasPartner ? `"${v.participation.partnerName} (${v.participation.partnerPercentage}%)"` : '100% Propio'
                    ]);
                }
            }

            if (view === 'stock' || view === 'all') {
                if (rows.length === 0) {
                    rows.push([
                        'TIPO',
                        'VEHICULO',
                        'PATENTE',
                        'ESTADO SALON',
                        'FECHA INGRESO',
                        'DIAS EN STOCK',
                        'MONEDA',
                        'PRECIO LISTA',
                        'COSTO ADQUISICION',
                        'ORIGEN COSTO',
                        'GASTOS ACUMULADOS',
                        'COSTO TOTAL INMOVILIZADO',
                        'COMISION ESTIMADA (1.3%)',
                        'MARGEN POTENCIAL ESTIMADO',
                        'MARGEN POTENCIAL %',
                        '% AGENCIA',
                        'MARGEN AGENCIA POTENCIAL',
                        'CAPITAL PROPIO INMOVILIZADO',
                        'ROI ANUALIZADO (SECUNDARIO) %',
                        'TIENE PERMUTA',
                        'SOCIO / INVERSOR'
                    ]);
                }

                for (const v of (data.stockVehicles || [])) {
                    rows.push([
                        'En Stock (Estimado)',
                        `"${v.brand} ${v.name} (${v.year})"`,
                        `"${v.plateOrVin || ''}"`,
                        `"${v.status}"`,
                        v.intakeDate || '',
                        v.daysInStock || '',
                        v.currency,
                        v.listPrice || 0,
                        v.acquisitionCost || 0,
                        `"${v.acquisitionSource || 'compra'}"`,
                        v.vehicleExpensesTotal || 0,
                        v.totalEconomicCost || 0,
                        v.estimatedCommission || 0,
                        v.potentialNetProfit !== null ? v.potentialNetProfit : 'Pendiente costo',
                        v.potentialMarginPct !== null ? `${v.potentialMarginPct}%` : 'N/D',
                        `${v.participation?.agencyPercentage}%`,
                        v.potentialAgencyNetProfit !== null ? v.potentialAgencyNetProfit : 'N/D',
                        v.agencyCapitalInvested !== null ? v.agencyCapitalInvested : 'N/D',
                        v.capitalEfficiency?.potentialAnnualizedRoiPct !== null ? `${v.capitalEfficiency.potentialAnnualizedRoiPct}%` : 'N/D',
                        v.tradeIns?.hasTradeInOrigin ? 'Si' : 'No',
                        v.participation?.hasPartner ? `"${v.participation.partnerName} (${v.participation.partnerPercentage}%)"` : '100% Propio'
                    ]);
                }
            }

            const csvContent = '\uFEFF' + rows.map(r => r.join(';')).join('\r\n');
            const filename = `rentabilidad-autosporting-${view}-${new Date().toISOString().split('T')[0]}.csv`;

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(csvContent);
        } catch (error) {
            console.error('Error exportando CSV de rentabilidad:', error);
            res.status(500).json({
                ok: false,
                message: 'No se pudo exportar el informe: ' + error.message
            });
        }
    });

    // 3. Ficha individual detallada de rentabilidad por vehículo
    router.get('/:id', async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({ ok: false, message: 'ID de vehículo inválido.' });
            }

            const exchangeRate = req.query.exchangeRate ? Number(req.query.exchangeRate) : null;
            const data = await getVehicleDetailedProfitability(req.params.id, exchangeRate);

            if (!data.ok) {
                return res.status(404).json(data);
            }

            res.json(data);
        } catch (error) {
            console.error(`Error en /api/admin/profitability/${req.params.id}:`, error);
            res.status(500).json({
                ok: false,
                message: 'No se pudo cargar el detalle del vehículo: ' + error.message
            });
        }
    });

    return router;
}
