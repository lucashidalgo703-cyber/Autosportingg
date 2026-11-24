// src/routes/stockRotationRoutes.js
// Rutas de la API de Inteligencia de Rotación del Stock y Recuperación Estratégica de Capital.
// Acceso completo restringido al propietario y perfiles financieros autorizados.

import express from 'express';
import mongoose from 'mongoose';
import Car from '../models/Car.js';
import StockDecision from '../models/StockDecision.js';
import * as defaultStockRotationService from '../services/stockRotationService.js';
import { listingIdentity } from '../services/purchaseListingSources.js';
import { canReadRentabilidad } from '../utils/adminPermissions.js';

export function createStockRotationRouter({ authenticate, service = defaultStockRotationService } = {}) {
    const router = express.Router();
    const {
        getStrategicRotationOverview,
        simulatePriceReduction,
        calculateLiquidityRecoveryPlan
    } = service;

    // Middleware de autenticación global para este router
    if (authenticate) {
        router.use(authenticate);
    }

    // Helper de permiso financiero completo
    const isOwnerOrFinancialProfile = (user) => {
        if (!user) return false;
        if (user.role === 'owner') return true;
        return canReadRentabilidad(user);
    };

    // 1. Tablero principal de Rotación Estratégica
    router.get('/', async (req, res) => {
        try {
            const { search, brandFilter, statusFilter, agingFilter, currencyFilter } = req.query;
            const user = req.user;

            const overview = await getStrategicRotationOverview({
                user,
                search,
                brandFilter,
                statusFilter,
                agingFilter,
                currencyFilter
            });

            res.json(overview);
        } catch (error) {
            console.error('Error en GET /api/admin/stock/rotation:', error);
            res.status(500).json({
                ok: false,
                message: error.message || 'Error al obtener rotación estratégica'
            });
        }
    });

    // 2. Vista restringida exclusiva para vendedores
    router.get('/seller-priority', async (req, res) => {
        try {
            const { search, brandFilter } = req.query;
            // Forzar vista de vendedor para garantizar sanitización
            const overview = await getStrategicRotationOverview({
                user: { role: 'ventas', permissions: [] },
                search,
                brandFilter
            });

            res.json({
                ok: true,
                summary: overview.summary,
                vehicles: overview.vehicles
            });
        } catch (error) {
            console.error('Error en GET /api/admin/stock/rotation/seller-priority:', error);
            res.status(500).json({
                ok: false,
                message: error.message || 'Error al obtener prioridades de venta'
            });
        }
    });

    // 3. Simulador de reducción de precio (Requiere permiso financiero)
    router.post('/simulate', async (req, res) => {
        try {
            if (!isOwnerOrFinancialProfile(req.user)) {
                return res.status(403).json({
                    ok: false,
                    message: 'Acceso denegado: El simulador de precios está reservado al propietario y perfiles financieros.'
                });
            }

            const { carId, customDiscountPct, customPrice } = req.body;
            if (!carId) {
                return res.status(400).json({ ok: false, message: 'ID de vehículo inválido' });
            }

            // Si se pasa un servicio mockeado con getVehicleFinancials
            if (service.getVehicleFinancials) {
                const vehicleData = await service.getVehicleFinancials(carId);
                const scenarios = simulatePriceReduction(vehicleData, {
                    customDiscountPct: Number(customDiscountPct) || 0,
                    customPrice: customPrice !== null ? Number(customPrice) : null
                });
                return res.json({
                    ok: true,
                    carId,
                    scenarios
                });
            }

            const car = await Car.findById(carId).lean();
            if (!car) {
                return res.status(404).json({ ok: false, message: 'Vehículo no encontrado' });
            }

            const overview = await getStrategicRotationOverview({ user: req.user, search: car.plateOrVin || car.name });
            const vehicleData = overview.vehicles?.find(v => v.carId === carId);

            if (!vehicleData) {
                return res.status(404).json({ ok: false, message: 'No se pudieron calcular los datos financieros del vehículo' });
            }

            const scenarios = simulatePriceReduction(vehicleData, {
                customDiscountPct: Number(customDiscountPct) || 0,
                customPrice: customPrice !== null ? Number(customPrice) : null
            });

            res.json({
                ok: true,
                carId,
                vehicleName: `${car.brand} ${car.name} (${car.year})`,
                currentPrice: car.price,
                currency: car.currency || 'ARS',
                scenarios
            });
        } catch (error) {
            console.error('Error en POST /api/admin/stock/rotation/simulate:', error);
            res.status(500).json({ ok: false, message: error.message || 'Error en la simulación' });
        }
    });

    // 4. Plan de recuperación de liquidez (Requiere permiso financiero)
    router.post('/liquidity-plan', async (req, res) => {
        try {
            if (!isOwnerOrFinancialProfile(req.user)) {
                return res.status(403).json({
                    ok: false,
                    message: 'Acceso denegado: El plan de recuperación de liquidez está reservado al propietario y perfiles financieros.'
                });
            }

            const { targetAmount, currency = 'ARS', strategy = 'balanced' } = req.body;
            if (!targetAmount || Number(targetAmount) <= 0) {
                return res.status(400).json({ ok: false, message: 'Ingresá un objetivo de liquidez positivo' });
            }

            const overview = await getStrategicRotationOverview({ user: req.user });
            const plan = calculateLiquidityRecoveryPlan(overview.vehicles, {
                targetAmount: Number(targetAmount),
                currency,
                strategy
            });

            res.json({
                ok: true,
                plan
            });
        } catch (error) {
            console.error('Error en POST /api/admin/stock/rotation/liquidity-plan:', error);
            res.status(500).json({ ok: false, message: error.message || 'Error calculando plan de liquidez' });
        }
    });

    // 5. Registrar decisión comercial del propietario (Solo Propietario o Admin con finanzas)
    router.post('/decision', async (req, res) => {
        try {
            if (!isOwnerOrFinancialProfile(req.user)) {
                return res.status(403).json({
                    ok: false,
                    message: 'Acceso denegado: Solo el propietario o perfiles autorizados pueden asentar decisiones comerciales.'
                });
            }

            const {
                carId,
                decisionType,
                previousPrice,
                newAuthorizedPrice,
                currency = 'ARS',
                reason,
                marketEvidence,
                projectedResult
            } = req.body;

            if (!carId || !decisionType || !reason) {
                return res.status(400).json({ ok: false, message: 'Faltan campos obligatorios para registrar la decisión' });
            }

            // Si hay mock en servicio
            if (service.saveDecision) {
                const decision = await service.saveDecision(req.body);
                return res.json({ ok: true, message: 'Decisión comercial registrada exitosamente', decision });
            }

            const decision = await StockDecision.create({
                carId,
                user: req.user.name || 'Propietario',
                userRole: req.user.role || 'owner',
                decisionType,
                previousPrice: Number(previousPrice) || 0,
                newAuthorizedPrice: newAuthorizedPrice !== null ? Number(newAuthorizedPrice) : null,
                currency,
                reason,
                marketEvidence: marketEvidence || {},
                projectedResult: projectedResult || {}
            });

            // Si es un ajuste de precio y se autorizó expresamente, se registra en el auditLog del Car
            if (decisionType === 'ajuste_precio' && newAuthorizedPrice) {
                await Car.findByIdAndUpdate(carId, {
                    $push: {
                        auditLog: {
                            action: 'PRECIO',
                            field: 'price',
                            oldValue: previousPrice,
                            newValue: newAuthorizedPrice,
                            justification: `Decisión estratégica de rotación: ${reason}`,
                            date: new Date(),
                            user: req.user.name || 'Propietario',
                            source: 'CRM_ROTACION'
                        }
                    }
                });
            }

            res.json({
                ok: true,
                message: 'Decisión comercial registrada exitosamente',
                decision
            });
        } catch (error) {
            console.error('Error en POST /api/admin/stock/rotation/decision:', error);
            res.status(500).json({ ok: false, message: error.message || 'Error al guardar decisión' });
        }
    });

    // 6. Consultar historial de decisiones de un vehículo
    router.get('/decision/:carId', async (req, res) => {
        try {
            if (!isOwnerOrFinancialProfile(req.user)) {
                return res.status(403).json({
                    ok: false,
                    message: 'Acceso denegado: El historial de decisiones comerciales está reservado al propietario y finanzas.'
                });
            }

            const { carId } = req.params;

            if (service.getDecisions) {
                const decisions = await service.getDecisions(carId);
                return res.json({ ok: true, carId, decisions });
            }

            const decisions = await StockDecision.find({ carId }).sort({ date: -1 }).lean();

            res.json({
                ok: true,
                carId,
                decisions
            });
        } catch (error) {
            console.error('Error en GET /api/admin/stock/rotation/decision/:carId:', error);
            res.status(500).json({ ok: false, message: error.message || 'Error al obtener historial de decisiones' });
        }
    });

    // 7. Carga manual o verificación de publicación comparable de mercado
    router.post('/comparables/:carId', async (req, res) => {
        try {
            if (!isOwnerOrFinancialProfile(req.user)) {
                return res.status(403).json({
                    ok: false,
                    message: 'Acceso denegado: La carga de comparables está reservada al propietario.'
                });
            }

            const { carId } = req.params;
            const { url, title, price, currency = 'ARS' } = req.body;

            const car = await Car.findById(carId);
            if (!car) {
                return res.status(404).json({ ok: false, message: 'Vehículo no encontrado' });
            }

            let sourceName = 'Manual Verificado';
            if (url) {
                const identity = listingIdentity(url);
                if (identity) {
                    sourceName = identity.source;
                }
            }

            if (price && Number(price) > 0) {
                car.infoAuto = {
                    codia: car.infoAuto?.codia || '',
                    brandName: car.brand,
                    modelName: car.name,
                    year: car.year,
                    valor: Number(price),
                    currency,
                    lastSyncAt: new Date(),
                    notes: `Comparable cargado (${sourceName}): ${title || ''} - ${url || ''}`
                };
                await car.save();
            }

            res.json({
                ok: true,
                message: 'Comparable de mercado registrado y vinculado al vehículo',
                infoAuto: car.infoAuto
            });
        } catch (error) {
            console.error('Error en POST /api/admin/stock/rotation/comparables/:carId:', error);
            res.status(500).json({ ok: false, message: error.message || 'Error al registrar comparable' });
        }
    });

    return router;
}

export default createStockRotationRouter;
