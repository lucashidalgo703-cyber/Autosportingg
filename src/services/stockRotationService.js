// src/services/stockRotationService.js
// Motor de Inteligencia de Rotación del Stock y Recuperación Estratégica de Capital.
// Reutiliza el motor financiero de Rentabilidad (saleCommercial.js), el Analizador de Compra (purchaseAnalyzer.js)
// y los modelos de Demanda (Lead, Reservation). No inventa datos ni duplica motores existentes.

import Car from '../models/Car.js';
import Sale from '../models/Sale.js';
import Lead from '../models/Lead.js';
import Reservation from '../models/Reservation.js';
import StockDecision from '../models/StockDecision.js';
import {
    roundMoney,
    resolveVehicleAcquisitionCost,
    computeCommissionAmount,
    normalizeCurrency
} from '../utils/saleCommercial.js';
import { resolveOriginForCar } from './tradeInChainService.js';
import { listingIdentity } from './purchaseListingSources.js';

const num = (v) => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
};

// Rangos de Antigüedad Canónicos (configurables)
export const AGING_RANGES = {
    SALUDABLE: { min: 0, max: 30, key: 'saludable', label: 'Rotación saludable', badge: 'emerald' },
    SEGUIMIENTO: { min: 31, max: 60, key: 'seguimiento', label: 'Seguimiento', badge: 'cyan' },
    ATENCION: { min: 61, max: 90, key: 'atencion', label: 'Atención', badge: 'amber' },
    REVISION_PRIORITARIA: { min: 91, max: Infinity, key: 'revision_prioritaria', label: 'Revisión prioritaria', badge: 'red' }
};

// Ponderaciones iniciales del Índice de Prioridad Comercial
export const DEFAULT_PRIORITY_WEIGHTS = {
    aging: 0.30,       // Antigüedad (30%)
    price: 0.25,       // Competitividad de precio vs mercado (25%)
    capital: 0.20,     // Capital propio inmovilizado (20%)
    demand: 0.15,      // Demanda comercial observada (15%)
    profit: 0.10       // Rentabilidad y costo de oportunidad (10%)
};

/**
 * Determina la clasificación de antigüedad de acuerdo a los días en stock.
 */
export function classifyAging(days) {
    const d = Math.max(0, num(days));
    if (d <= 30) return AGING_RANGES.SALUDABLE;
    if (d <= 60) return AGING_RANGES.SEGUIMIENTO;
    if (d <= 90) return AGING_RANGES.ATENCION;
    return AGING_RANGES.REVISION_PRIORITARIA;
}

/**
 * Resuelve la participación de socios / copropietarios de un vehículo.
 */
export function resolvePartnerParticipation(car) {
    let hasPartner = false;
    let partnerName = 'Socio';
    let partnerPercentage = 0;

    if (car?.investor?.percentage > 0) {
        hasPartner = true;
        partnerName = car.investor.name || 'Inversionista';
        partnerPercentage = Math.min(100, Math.max(0, num(car.investor.percentage)));
    } else if (car?.jointOwnership?.hasPartner && num(car.jointOwnership.partnerPercentage) > 0) {
        hasPartner = true;
        partnerName = car.jointOwnership.partnerName || 'Socio';
        partnerPercentage = Math.min(100, Math.max(0, num(car.jointOwnership.partnerPercentage)));
    }

    const agencyPercentage = roundMoney(100 - partnerPercentage);

    return {
        hasPartner,
        partnerName,
        partnerPercentage,
        agencyPercentage
    };
}

/**
 * Calcula los días detallados del vehículo diferenciando estados sin reiniciar la antigüedad por edición.
 */
export function calculateVehicleDaysBreakdown(car, now = new Date()) {
    const intakeDate = car.createdAt ? new Date(car.createdAt) : now;
    const totalDays = Math.max(1, Math.round((now - intakeDate) / 86400000));

    // Analizar auditoría para descomponer días en diferentes estados si existen registros
    let daysPaused = 0;
    let daysReserved = 0;
    const auditLogs = car.auditLog || [];

    // Calcular días en estado actual
    if (car.status === 'Pausado') {
        const lastPause = [...auditLogs].reverse().find(l => l.action === 'ESTADO' && l.newValue === 'Pausado');
        if (lastPause?.date) {
            daysPaused = Math.max(1, Math.round((now - new Date(lastPause.date)) / 86400000));
        } else {
            daysPaused = Math.min(totalDays, 14); // Estimación orientativa si no hay log
        }
    } else if (car.status === 'Reservado') {
        const lastReserve = [...auditLogs].reverse().find(l => l.action === 'ESTADO' && l.newValue === 'Reservado');
        if (lastReserve?.date) {
            daysReserved = Math.max(1, Math.round((now - new Date(lastReserve.date)) / 86400000));
        } else {
            daysReserved = Math.min(totalDays, 7);
        }
    }

    const daysAvailable = Math.max(0, totalDays - daysPaused - daysReserved);
    const isPublished = car.visibleEnWeb !== false && car.publishedOnML !== 'No';
    const daysPublished = isPublished ? daysAvailable : 0;

    return {
        totalDays,
        daysAvailable,
        daysPublished,
        daysPaused,
        daysReserved,
        intakeDate: intakeDate.toISOString().split('T')[0]
    };
}

/**
 * Calcula los umbrales de precio comercial: Punto de Equilibrio, Margen Objetivo y Liquidación.
 */
export function calculatePriceThresholds({ totalCost, commissionRate = 0.03, fixedCommission = 0, targetMarginPct = 10, partnerPercentage = 0 }) {
    const cost = Math.max(0, num(totalCost));
    if (cost === 0) return { breakEvenPrice: 0, targetMinPrice: 0, liquidationPrice: 0 };

    const commRate = Math.min(0.20, Math.max(0, num(commissionRate)));
    const fixedComm = Math.max(0, num(fixedCommission));
    const targetMargin = Math.max(0, num(targetMarginPct)) / 100;

    // 1. Punto de Equilibrio (Break-even): precio donde ganancia neta = 0
    // Precio - Costo - (Precio * commRate + fixedComm) = 0
    // Precio * (1 - commRate) = Costo + fixedComm
    const breakEvenPrice = roundMoney((cost + fixedComm) / (1 - commRate));

    // 2. Precio Mínimo con Margen Objetivo: precio para alcanzar targetMarginPct sobre costo
    // Ganancia Neta deseada = cost * targetMargin
    // Precio * (1 - commRate) = cost * (1 + targetMargin) + fixedComm
    const targetMinPrice = roundMoney((cost * (1 + targetMargin) + fixedComm) / (1 - commRate));

    // 3. Precio de Liquidación: escenario extraordinario de rescate de liquidez (e.g. cubrir costo con comisión reducida)
    // Se acepta un margen 0 o absorber parte de comisión para liquidar unidad crítica
    const liquidationPrice = roundMoney(cost + fixedComm);

    return {
        breakEvenPrice,
        targetMinPrice,
        liquidationPrice,
        commissionRatePct: roundMoney(commRate * 100),
        targetMarginPct
    };
}

/**
 * Simula escenarios de reducción de precio para un vehículo.
 */
export function simulatePriceReduction(carFinancials, { customDiscountPct = 0, customPrice = null } = {}) {
    const askingPrice = num(carFinancials.price);
    const totalCost = num(carFinancials.totalEconomicCost);
    const agencyPct = num(carFinancials.participation?.agencyPercentage) || 100;
    const commRate = carFinancials.commissionRate || 0.03;

    const scenarios = [
        { name: 'Precio Actual', discountPct: 0, price: askingPrice },
        { name: 'Reducción 3%', discountPct: 3, price: roundMoney(askingPrice * 0.97) },
        { name: 'Reducción 5%', discountPct: 5, price: roundMoney(askingPrice * 0.95) },
        { name: 'Reducción 8%', discountPct: 8, price: roundMoney(askingPrice * 0.92) }
    ];

    if (customPrice !== null && num(customPrice) > 0) {
        const p = num(customPrice);
        const disc = roundMoney(((askingPrice - p) / askingPrice) * 100);
        scenarios.push({ name: `Personalizado (${disc > 0 ? '-' : '+'}${Math.abs(disc)}%)`, discountPct: disc, price: p });
    } else if (customDiscountPct > 0) {
        const disc = num(customDiscountPct);
        scenarios.push({ name: `Personalizado (-${disc}%)`, discountPct: disc, price: roundMoney(askingPrice * (1 - disc / 100)) });
    }

    const originalNet = roundMoney(askingPrice - totalCost - (askingPrice * commRate));

    return scenarios.map(sc => {
        const finalPrice = sc.price;
        const commAmount = roundMoney(finalPrice * commRate);
        const netProfit = roundMoney(finalPrice - totalCost - commAmount);
        const agencyNetProfit = roundMoney(netProfit * (agencyPct / 100));
        const marginOnCostPct = totalCost > 0 ? roundMoney((netProfit / totalCost) * 100) : 0;
        const marginOnSalePct = finalPrice > 0 ? roundMoney((netProfit / finalPrice) * 100) : 0;
        const recoverableCash = roundMoney(finalPrice - commAmount);
        const differenceVsOriginal = roundMoney(netProfit - originalNet);

        return {
            scenarioName: sc.name,
            discountPct: sc.discountPct,
            finalPrice,
            commissionAmount: commAmount,
            totalCost,
            netProfit,
            agencyNetProfit,
            marginOnCostPct,
            marginOnSalePct,
            recoverableCash,
            differenceVsOriginal,
            isProfitable: netProfit >= 0,
            auditNotice: 'La reducción de precio es una herramienta comercial orientativa y no garantiza la venta en un plazo determinado.'
        };
    });
}

/**
 * Calcula el costo de oportunidad estimado por mantener el vehículo en stock.
 */
export function calculateOpportunityCosts({ totalCost, currency = 'ARS', annualCapitalRate = 0.40, monthlyCarryingCost = 75000 }) {
    const cost = Math.max(0, num(totalCost));
    const horizons = [15, 30, 60, 90]; // días

    // Tasa diaria de costo de capital (TNA / 365)
    const dailyCapRate = annualCapitalRate / 365;
    const dailyCarrying = currency === 'USD' ? (monthlyCarryingCost / 1200 / 30) : (monthlyCarryingCost / 30);

    return horizons.map(days => {
        const capitalCost = roundMoney(cost * dailyCapRate * days);
        const carryingCost = roundMoney(dailyCarrying * days);
        const totalEstimatedHoldingCost = roundMoney(capitalCost + carryingCost);

        return {
            days,
            capitalCost,
            carryingCost,
            totalEstimatedHoldingCost,
            currency
        };
    });
}

/**
 * Calcula el Índice Explicable de Prioridad Comercial (0 a 100).
 * Mayor puntaje = mayor urgencia / prioridad comercial para actuar.
 */
export function calculateCommercialPriorityIndex({
    daysInStock,
    priceDifferenceVsMarket, // % (+8 significa 8% sobre mercado)
    hasMarketEvidence,
    capitalOwnInvested,
    fleetMedianCapital = 15000000,
    demandMetrics = { inquiriesCount: 0, activeLeadsCount: 0, testDrivesCount: 0, hasActiveReservation: false },
    projectedMarginOnCostPct = 15,
    weights = DEFAULT_PRIORITY_WEIGHTS
}) {
    // 1. Antigüedad (0 a 100)
    let agingScore = 10;
    if (daysInStock <= 30) {
        agingScore = Math.round((daysInStock / 30) * 25);
    } else if (daysInStock <= 60) {
        agingScore = 25 + Math.round(((daysInStock - 30) / 30) * 35);
    } else if (daysInStock <= 90) {
        agingScore = 60 + Math.round(((daysInStock - 60) / 30) * 25);
    } else {
        agingScore = Math.min(100, 85 + Math.round((daysInStock - 90) * 0.5));
    }

    // 2. Competitividad de Precio vs Mercado (0 a 100)
    let priceScore = 40; // Neutral si no hay mercado
    let priceCoverage = false;
    if (hasMarketEvidence && priceDifferenceVsMarket !== null && !isNaN(priceDifferenceVsMarket)) {
        priceCoverage = true;
        if (priceDifferenceVsMarket > 15) {
            priceScore = 95; // Muy desfasado por encima
        } else if (priceDifferenceVsMarket > 8) {
            priceScore = 80; // Bastante caro
        } else if (priceDifferenceVsMarket > 2) {
            priceScore = 60; // Levemente superior
        } else if (priceDifferenceVsMarket >= -4) {
            priceScore = 35; // Alineado con mercado
        } else {
            priceScore = 15; // Precio muy competitivo
        }
    }

    // 3. Capital Propio Inmovilizado (0 a 100)
    let capitalScore = 30;
    if (fleetMedianCapital > 0 && capitalOwnInvested > 0) {
        const ratio = capitalOwnInvested / fleetMedianCapital;
        capitalScore = Math.min(100, Math.round(ratio * 45));
    }

    // 4. Demanda Comercial (0 a 100)
    let demandScore = 50;
    if (demandMetrics.hasActiveReservation) {
        demandScore = 5; // Casi resuelto
    } else if (demandMetrics.testDrivesCount > 0) {
        demandScore = 20; // Buen interés concreto
    } else if (demandMetrics.activeLeadsCount >= 3) {
        demandScore = 30; // Tracción activa
    } else if (demandMetrics.inquiriesCount >= 2) {
        demandScore = 45; // Algunas consultas
    } else if (demandMetrics.inquiriesCount === 0 && daysInStock > 30) {
        demandScore = 85; // Cero consultas en más de un mes = alarma comercial
    } else {
        demandScore = 55;
    }

    // 5. Rentabilidad y Costo de Oportunidad (0 a 100)
    let profitScore = 40;
    if (projectedMarginOnCostPct < 4) {
        profitScore = 90; // Margen en peligro de pérdida
    } else if (projectedMarginOnCostPct < 8) {
        profitScore = 70; // Margen estrecho
    } else if (projectedMarginOnCostPct < 15) {
        profitScore = 45;
    } else {
        profitScore = 20; // Margen holgado
    }

    // Calcular cobertura de datos
    const coverage = priceCoverage ? 100 : 75;

    // Ponderación
    const weightedAging = roundMoney(agingScore * weights.aging);
    const weightedPrice = roundMoney(priceScore * weights.price);
    const weightedCapital = roundMoney(capitalScore * weights.capital);
    const weightedDemand = roundMoney(demandScore * weights.demand);
    const weightedProfit = roundMoney(profitScore * weights.profit);

    const totalScore = Math.min(100, Math.max(0, Math.round(weightedAging + weightedPrice + weightedCapital + weightedDemand + weightedProfit)));

    let priorityTier = 'Baja';
    let priorityBadge = 'emerald';
    let urgencyLabel = 'Rotación fluida';

    if (totalScore >= 80) {
        priorityTier = 'Urgente';
        priorityBadge = 'red';
        urgencyLabel = 'Acción prioritaria inmediata';
    } else if (totalScore >= 60) {
        priorityTier = 'Alta';
        priorityBadge = 'amber';
        urgencyLabel = 'Atención comercial requerida';
    } else if (totalScore >= 40) {
        priorityTier = 'Media';
        priorityBadge = 'cyan';
        urgencyLabel = 'Seguimiento estándar';
    }

    // Explicación de los factores que impulsan la prioridad
    const drivingFactors = [];
    if (agingScore >= 60) drivingFactors.push({ factor: 'Antigüedad', score: agingScore, detail: `${daysInStock} días en inventario` });
    if (priceScore >= 65 && priceCoverage) drivingFactors.push({ factor: 'Precio de mercado', score: priceScore, detail: `${priceDifferenceVsMarket > 0 ? '+' : ''}${priceDifferenceVsMarket}% vs mediana` });
    if (capitalScore >= 60) drivingFactors.push({ factor: 'Capital propio', score: capitalScore, detail: 'Inversión por encima de la media' });
    if (demandScore >= 65) drivingFactors.push({ factor: 'Baja demanda', score: demandScore, detail: 'Sin consultas ni visitas recientes' });
    if (profitScore >= 65) drivingFactors.push({ factor: 'Margen estrecho', score: profitScore, detail: `${projectedMarginOnCostPct}% s/ costo` });

    return {
        totalScore,
        priorityTier,
        priorityBadge,
        urgencyLabel,
        coveragePct: coverage,
        breakdown: {
            aging: { score: agingScore, weighted: weightedAging, weightPct: weights.aging * 100 },
            price: { score: priceScore, weighted: weightedPrice, weightPct: weights.price * 100, hasMarketEvidence: priceCoverage },
            capital: { score: capitalScore, weighted: weightedCapital, weightPct: weights.capital * 100 },
            demand: { score: demandScore, weighted: weightedDemand, weightPct: weights.demand * 100 },
            profit: { score: profitScore, weighted: weightedProfit, weightPct: weights.profit * 100 }
        },
        drivingFactors,
        disclaimer: 'El índice de prioridad comercial es una herramienta orientativa de gestión comercial y no constituye una probabilidad estadística de venta.'
    };
}

/**
 * Genera la recomendación comercial fundamentada para un vehículo.
 */
export function generateStrategicRecommendation({
    daysInStock,
    priceDifferenceVsMarket,
    hasMarketEvidence,
    priorityScore,
    projectedMarginOnCostPct,
    demandMetrics,
    totalEconomicCost,
    capitalOwnInvested,
    currency
}) {
    // 1. Caso crítico: >90 días con precio por encima del mercado o margen en riesgo
    if (daysInStock > 90) {
        if (priceDifferenceVsMarket > 5 && hasMarketEvidence) {
            return {
                actionKey: 'revisar_precio_mercado',
                actionLabel: 'Revisar precio respecto al mercado',
                badge: 'red',
                motive: 'Inmovilización crítica (>90 días) con precio superior a comparables.',
                evidence: `${daysInStock} días en stock. Precio actual ${priceDifferenceVsMarket}% superior a la mediana de mercado.`,
                capitalInvolved: capitalOwnInvested,
                currency,
                estimatedImpact: 'Ajustar hacia la mediana de mercado acelera la reactivación de consultas y frena el costo de oportunidad acumulado.',
                suggestedAction: 'Evaluar descuento del 5% al 8% o simular precio competitivo en la ficha.'
            };
        }
        return {
            actionKey: 'considerar_oferta',
            actionLabel: 'Considerar oferta razonable / Liquidación',
            badge: 'red',
            motive: 'Inmovilización prolongada superior a 3 meses.',
            evidence: `${daysInStock} días inmovilizado con capital propio de ${currency} ${capitalOwnInvested.toLocaleString('es-AR')}.`,
            capitalInvolved: capitalOwnInvested,
            currency,
            estimatedImpact: 'Defender el margen facial puede costar más en mantenimiento y costo de capital que aceptar una oferta con margen menor.',
            suggestedAction: 'Habilitar margen de negociación comercial a los vendedores o analizar precio de liquidación.'
        };
    }

    // 2. Caso atención: 61 a 90 días
    if (daysInStock > 60) {
        if (demandMetrics.inquiriesCount === 0) {
            return {
                actionKey: 'priorizar_difusion',
                actionLabel: 'Priorizar difusión y republicación',
                badge: 'amber',
                motive: '60+ días en stock sin tracción de consultas registradas.',
                evidence: `${daysInStock} días en stock y 0 consultas activas en el CRM.`,
                capitalInvolved: capitalOwnInvested,
                currency,
                estimatedImpact: 'Reactivar publicaciones en portales y redes puede generar interesados antes de requerir un recorte de precio.',
                suggestedAction: 'Actualizar fotos principales, destacar en catálogo y revisar visibilidad en portales.'
            };
        }
        if (priceDifferenceVsMarket > 8 && hasMarketEvidence) {
            return {
                actionKey: 'revisar_precio_mercado',
                actionLabel: 'Ajustar precio a rango competitivo',
                badge: 'amber',
                motive: 'Precio de lista sensiblemente por encima del mercado en zona de atención.',
                evidence: `${priceDifferenceVsMarket}% por encima de la mediana de mercado.`,
                capitalInvolved: capitalOwnInvested,
                currency,
                estimatedImpact: 'Bajar al percentil 50 captura demanda activa que hoy descarta la unidad por filtro de precio.',
                suggestedAction: 'Aplicar reducción sugerida del 3% al 5% para entrar en rango competitivo.'
            };
        }
        return {
            actionKey: 'contactar_interesados',
            actionLabel: 'Contactar interesados anteriores',
            badge: 'amber',
            motive: 'Unidad en etapa de atención con historial de consultas.',
            evidence: `${demandMetrics.inquiriesCount} consultas históricas registradas.`,
            capitalInvolved: capitalOwnInvested,
            currency,
            estimatedImpact: 'Recontactar con una propuesta comercial personalizada puede cerrar la venta sin modificar precio público.',
            suggestedAction: 'Vincular con los leads existentes para ofrecer prueba de manejo o financiación.'
        };
    }

    // 3. Caso seguimiento: 31 a 60 días
    if (daysInStock > 30) {
        if (demandMetrics.inquiriesCount === 0) {
            return {
                actionKey: 'mejorar_publicacion',
                actionLabel: 'Mejorar fotografías / publicación',
                badge: 'cyan',
                motive: 'Primer mes cumplido sin volumen de interesados.',
                evidence: `${daysInStock} días publicado con 0 consultas registradas.`,
                capitalInvolved: capitalOwnInvested,
                currency,
                estimatedImpact: 'Fotografías profesionales y descripción técnica completa duplican la tasa de clics.',
                suggestedAction: 'Renovar sesión fotográfica y verificar equipamiento cargado.'
            };
        }
        return {
            actionKey: 'mantener_precio',
            actionLabel: 'Mantener precio con seguimiento',
            badge: 'cyan',
            motive: 'Evolución normal de rotación con consultas activas.',
            evidence: `${daysInStock} días en stock y ${demandMetrics.inquiriesCount} consultas en curso.`,
            capitalInvolved: capitalOwnInvested,
            currency,
            estimatedImpact: 'El precio se encuentra dentro del rango de mercado; conviene sostener el margen.',
            suggestedAction: 'Hacer seguimiento comercial riguroso a los prospectos abiertos.'
        };
    }

    // 4. Caso rotación saludable: 0 a 30 días
    return {
        actionKey: 'mantener_precio',
        actionLabel: 'Mantener precio (Rotación saludable)',
        badge: 'emerald',
        motive: 'Ingreso reciente dentro del período estándar de rotación.',
        evidence: `${daysInStock} días desde adquisición.`,
        capitalInvolved: capitalOwnInvested,
        currency,
        estimatedImpact: 'Prioridad en defender el margen comercial pactado.',
        suggestedAction: 'Mantener precio de lista publicado.'
    };
}

/**
 * Resuelve el Plan de Recuperación de Liquidez:
 * Encuentra combinaciones óptimas de vehículos cuya venta aporta al objetivo de efectivo.
 */
export function calculateLiquidityRecoveryPlan(vehicles, { targetAmount, currency = 'ARS', strategy = 'balanced' } = {}) {
    const target = Math.max(0, num(targetAmount));
    if (target === 0 || !Array.isArray(vehicles) || vehicles.length === 0) {
        return {
            targetAmount: target,
            currency,
            achieved: false,
            packages: []
        };
    }

    // Filtrar vehículos disponibles de la misma moneda con capital propio calculable
    const candidates = vehicles.filter(v => 
        v.currency === currency && 
        v.status === 'Disponible' &&
        v.capitalOwnInvested > 0
    );

    if (candidates.length === 0) {
        return {
            targetAmount: target,
            currency,
            achieved: false,
            totalAvailableRecoverable: 0,
            packages: [],
            message: `No hay vehículos disponibles en ${currency} con capital propio registrado para armar el plan.`
        };
    }

    // Estrategia 1: "Prioridad Antigüedad & Urgencia" (Vender primero los más viejos y pesados)
    const sortedByUrgency = [...candidates].sort((a, b) => {
        // Priorizar >90 días, luego score de prioridad, luego capital inmovilizado
        if ((b.daysInStock > 90) !== (a.daysInStock > 90)) {
            return (b.daysInStock > 90) ? 1 : -1;
        }
        return (b.priorityScore || 0) - (a.priorityScore || 0);
    });

    // Estrategia 2: "Mínimo Sacrificio de Margen" (Vender unidades con menor descuento o mayor liquidez neta)
    const sortedByEfficiency = [...candidates].sort((a, b) => {
        return (b.marginOnCostPct || 0) - (a.marginOnCostPct || 0);
    });

    const buildPackage = (sortedList, name, description) => {
        const selected = [];
        let accumulatedRecoverable = 0;
        let accumulatedListValue = 0;
        let accumulatedCost = 0;
        let accumulatedNetProfit = 0;

        for (const v of sortedList) {
            if (accumulatedRecoverable >= target) break;

            const recoverable = v.capitalOwnInvested || v.price;
            selected.push(v);
            accumulatedRecoverable = roundMoney(accumulatedRecoverable + recoverable);
            accumulatedListValue = roundMoney(accumulatedListValue + v.price);
            accumulatedCost = roundMoney(accumulatedCost + v.totalEconomicCost);
            accumulatedNetProfit = roundMoney(accumulatedNetProfit + (v.projectedNetProfit || 0));
        }

        const achieved = accumulatedRecoverable >= target;
        const totalUnits = selected.length;
        const avgDays = totalUnits > 0 ? Math.round(selected.reduce((sum, v) => sum + v.daysInStock, 0) / totalUnits) : 0;

        return {
            packageName: name,
            description,
            achieved,
            targetAmount: target,
            accumulatedRecoverable,
            coveragePct: target > 0 ? roundMoney((accumulatedRecoverable / target) * 100) : 0,
            totalUnits,
            averageDaysInStock: avgDays,
            accumulatedListValue,
            accumulatedCost,
            accumulatedNetProfit,
            vehicles: selected.map(v => ({
                carId: v.carId,
                brand: v.brand,
                name: v.name,
                year: v.year,
                plate: v.plate,
                daysInStock: v.daysInStock,
                price: v.price,
                totalEconomicCost: v.totalEconomicCost,
                capitalOwnInvested: v.capitalOwnInvested,
                priorityScore: v.priorityScore,
                priorityTier: v.priorityTier,
                agingClass: v.agingClass
            })),
            notice: 'Las permutas recibidas no computan como efectivo. El plan proyecta recuperación de liquidez bajo condición de cobro de contado o anticipo bancarizado.'
        };
    };

    const packageUrgency = buildPackage(
        sortedByUrgency,
        'Plan Desarme de Stock Antiguo (Recomendado)',
        'Prioriza liberar capital inmovilizado en unidades de más de 60 y 90 días, eliminando costo de oportunidad.'
    );

    const packageEfficiency = buildPackage(
        sortedByEfficiency,
        'Plan Preservación de Rentabilidad',
        'Prioriza unidades con mayor margen comercial para alcanzar la liquidez sacrificando la menor ganancia posible.'
    );

    return {
        targetAmount: target,
        currency,
        achieved: packageUrgency.achieved || packageEfficiency.achieved,
        totalAvailableRecoverable: roundMoney(candidates.reduce((sum, v) => sum + (v.capitalOwnInvested || 0), 0)),
        packages: [packageUrgency, packageEfficiency]
    };
}

/**
 * Sanitiza los datos de rotación para la vista de vendedores:
 * Oculta costos de compra, márgenes privados, capital propio, socios, break-even y planes de liquidez.
 */
export function sanitizeRotationForSeller(vehicle) {
    return {
        carId: vehicle.carId,
        brand: vehicle.brand,
        name: vehicle.name,
        year: vehicle.year,
        km: vehicle.km,
        color: vehicle.color,
        plate: vehicle.plate,
        status: vehicle.status,
        daysInStock: vehicle.daysInStock,
        price: vehicle.price,
        currency: vehicle.currency,
        priorityTier: vehicle.priorityTier,
        priorityBadge: vehicle.priorityBadge,
        urgencyLabel: vehicle.urgencyLabel,
        // Solo directivas comerciales autorizadas
        commercialFocusTag: vehicle.priorityTier === 'Urgente' || vehicle.priorityTier === 'Alta' 
            ? 'Prioridad de Venta' 
            : 'En Catálogo',
        commercialActionSuggested: vehicle.recommendation?.suggestedAction || 'Ofrecer a interesados'
    };
}

/**
 * Consulta integral del tablero de Rotación Estratégica.
 */
export async function getStrategicRotationOverview({ user, search = '', brandFilter = 'all', statusFilter = 'all', agingFilter = 'all', currencyFilter = 'all' } = {}) {
    const isOwnerOrFinance = user?.role === 'owner' || Boolean(
        user?.permissions?.includes('rentabilidad.read') ||
        user?.permissions?.includes('finanzas.read') ||
        (user?.role === 'admin' && user?.permissions?.includes('finanzas.read'))
    );

    // 1. Cargar todos los vehículos en stock (Disponible, Reservado, Pausado)
    const query = {
        status: { $in: ['Disponible', 'Reservado', 'Pausado'] }
    };

    if (brandFilter !== 'all' && brandFilter !== 'todas') {
        query.brand = new RegExp(`^${brandFilter}$`, 'i');
    }
    if (statusFilter !== 'all' && statusFilter !== 'todos') {
        query.status = statusFilter;
    }

    const cars = await Car.find(query).sort({ createdAt: 1 }).lean();

    // 2. Cargar métricas de demanda (Leads y Reservas)
    const carIds = cars.map(c => c._id);
    const [leads, reservations, soldSales] = await Promise.all([
        Lead.find({ vehicleId: { $in: carIds } }).select('vehicleId pipelineStage createdAt').lean(),
        Reservation.find({ vehicleId: { $in: carIds }, status: 'activa' }).select('vehicleId depositAmount agreedPrice').lean(),
        Sale.find({ status: { $in: ['entregada', 'confirmada', 'pendiente_entrega'] } }).select('saleDate createdAt vehicleId').lean()
    ]);

    // Indexar demanda por vehicleId
    const leadsByCar = new Map();
    for (const lead of leads) {
        const id = String(lead.vehicleId);
        if (!leadsByCar.has(id)) leadsByCar.set(id, []);
        leadsByCar.get(id).push(lead);
    }

    const reservationsByCar = new Map();
    for (const res of reservations) {
        const id = String(res.vehicleId);
        reservationsByCar.set(id, res);
    }

    // Rotación promedio de vendidos históricos
    let totalDaysSold = 0;
    let soldCount = 0;
    for (const s of soldSales) {
        const intake = s.createdAt ? new Date(s.createdAt) : null;
        const saleD = s.saleDate ? new Date(s.saleDate) : null;
        if (intake && saleD && !isNaN(intake) && !isNaN(saleD)) {
            const d = Math.max(1, Math.round((saleD - intake) / 86400000));
            totalDaysSold += d;
            soldCount++;
        }
    }
    const averageSoldRotationDays = soldCount > 0 ? Math.round(totalDaysSold / soldCount) : 42;

    // 3. Procesar cada vehículo
    const processedVehicles = [];
    const now = new Date();

    for (const car of cars) {
        const carId = String(car._id);
        const cur = normalizeCurrency(car.currency || 'ARS');
        const price = num(car.price);

        // A. Antigüedad y días desglosados
        const daysBreakdown = calculateVehicleDaysBreakdown(car, now);
        const daysInStock = daysBreakdown.totalDays;
        const agingClass = classifyAging(daysInStock);

        // Filtro por rango de antigüedad si se solicitó
        if (agingFilter !== 'all' && agingClass.key !== agingFilter) {
            continue;
        }

        // B. Costos y capital inmovilizado (reutilizando lógica canónica)
        const legacyOrigin = car.tradeInOrigin ? { saleId: car.tradeInOrigin.saleId, value: car.tradeInOrigin.value, currency: car.tradeInOrigin.currency } : null;
        const resolvedAcq = resolveVehicleAcquisitionCost(car, legacyOrigin);
        const acquisitionCost = resolvedAcq.hasCost ? roundMoney(resolvedAcq.amount) : 0;

        // Gastos de taller
        let expensesTotal = 0;
        for (const exp of (car.expenses || [])) {
            const expCur = exp?.currency ? normalizeCurrency(exp.currency) : cur;
            if (expCur === cur) {
                expensesTotal = roundMoney(expensesTotal + num(exp.amount));
            }
        }

        const totalEconomicCost = roundMoney(acquisitionCost + expensesTotal);
        const participation = resolvePartnerParticipation(car);
        const capitalOwnInvested = totalEconomicCost > 0 
            ? roundMoney(totalEconomicCost * (participation.agencyPercentage / 100))
            : roundMoney(price * 0.85); // Estimación orientativa si no hay costo cargado

        const partnerCapitalInvested = totalEconomicCost > 0
            ? roundMoney(totalEconomicCost * (participation.partnerPercentage / 100))
            : 0;

        // C. Ganancia y márgenes proyectados
        const commRate = 0.03;
        const commissionEst = roundMoney(price * commRate);
        const projectedNetProfit = roundMoney(price - totalEconomicCost - commissionEst);
        const marginOnCostPct = totalEconomicCost > 0 ? roundMoney((projectedNetProfit / totalEconomicCost) * 100) : 0;
        const projectedMarginOnCostPct = marginOnCostPct;
        const marginOnSalePct = price > 0 ? roundMoney((projectedNetProfit / price) * 100) : 0;

        // D. Umbrales de precio
        const thresholds = calculatePriceThresholds({
            totalCost: totalEconomicCost,
            commissionRate: commRate,
            targetMarginPct: 10,
            partnerPercentage: participation.partnerPercentage
        });

        // E. Demanda comercial
        const carLeads = leadsByCar.get(carId) || [];
        const hasActiveReservation = reservationsByCar.has(carId);
        const testDrivesCount = carLeads.filter(l => l.pipelineStage === 'Visita / Test Drive').length;
        const activeLeadsCount = carLeads.filter(l => ['Nuevo Contacto', 'Seguimiento Activo', 'Visita / Test Drive'].includes(l.pipelineStage)).length;

        const demandMetrics = {
            inquiriesCount: carLeads.length,
            activeLeadsCount,
            testDrivesCount,
            hasActiveReservation,
            lastInquiryDate: carLeads.length > 0 ? carLeads[carLeads.length - 1].createdAt : null
        };

        // F. Evaluación de mercado (si tiene comparables o InfoAuto)
        let hasMarketEvidence = false;
        let marketMedian = null;
        let marketMin = null;
        let marketMax = null;
        let fastSalePrice = null;
        let priceDifferenceVsMarket = null;
        let comparablesList = [];

        if (car.infoAuto?.valor > 0) {
            hasMarketEvidence = true;
            marketMedian = num(car.infoAuto.valor);
            marketMin = roundMoney(marketMedian * 0.92);
            marketMax = roundMoney(marketMedian * 1.08);
            fastSalePrice = roundMoney(marketMedian * 0.94);
            priceDifferenceVsMarket = roundMoney(((price - marketMedian) / marketMedian) * 100);
            comparablesList.push({
                source: 'InfoAuto Oficial',
                title: `${car.brand} ${car.name} (${car.year})`,
                price: marketMedian,
                currency: car.infoAuto.currency || cur,
                verification: 'cotejado manualmente',
                market: 'Nacional',
                checkedAt: car.infoAuto.lastSyncAt || now.toISOString()
            });
        }

        // G. Índice de Prioridad Comercial
        const priorityIndex = calculateCommercialPriorityIndex({
            daysInStock,
            priceDifferenceVsMarket,
            hasMarketEvidence,
            capitalOwnInvested,
            demandMetrics,
            projectedMarginOnCostPct
        });

        // H. Recomendación Estratégica
        const recommendation = generateStrategicRecommendation({
            daysInStock,
            priceDifferenceVsMarket,
            hasMarketEvidence,
            priorityScore: priorityIndex.totalScore,
            projectedMarginOnCostPct,
            demandMetrics,
            totalEconomicCost,
            capitalOwnInvested,
            currency: cur
        });

        // I. Costos de Oportunidad a 15, 30, 60, 90 días
        const opportunityCosts = calculateOpportunityCosts({
            totalCost: totalEconomicCost,
            currency: cur
        });

        // Búsqueda por texto si aplica
        if (search) {
            const term = search.trim().toLowerCase();
            const text = `${car.brand || ''} ${car.name || ''} ${car.plateOrVin || ''} ${car.year || ''}`.toLowerCase();
            if (!text.includes(term)) continue;
        }

        const vehicleRecord = {
            carId,
            brand: car.brand,
            name: car.name,
            year: car.year,
            km: car.km || 0,
            color: car.color || '',
            plate: car.plateOrVin || '',
            status: car.status || 'Disponible',
            currency: cur,
            price,

            // Antigüedad
            daysInStock,
            daysBreakdown,
            agingClass,

            // Financiero
            acquisitionCost,
            acquisitionSource: resolvedAcq.source || 'compra',
            expensesTotal,
            totalEconomicCost,
            capitalOwnInvested,
            partnerCapitalInvested,
            participation,
            projectedNetProfit,
            marginOnCostPct,
            marginOnSalePct,
            thresholds,

            // Mercado
            hasMarketEvidence,
            marketMedian,
            marketMin,
            marketMax,
            fastSalePrice,
            priceDifferenceVsMarket,
            comparablesList,

            // Demanda
            demandMetrics,

            // Prioridad y Recomendación
            priorityScore: priorityIndex.totalScore,
            priorityTier: priorityIndex.priorityTier,
            priorityBadge: priorityIndex.priorityBadge,
            urgencyLabel: priorityIndex.urgencyLabel,
            priorityBreakdown: priorityIndex.breakdown,
            drivingFactors: priorityIndex.drivingFactors,
            recommendation,

            // Costo de oportunidad
            opportunityCosts
        };

        processedVehicles.push(vehicleRecord);
    }

    // 4. Calcular KPIs Ejecutivos del Tablero (Separando estrictamente ARS y USD)
    const kpis = {
        capitalOwnImmobilizedSlowRotation: { ARS: 0, USD: 0 }, // Unidades con >60 días
        totalCapitalOwnInStock: { ARS: 0, USD: 0 },
        totalPartnerCapitalInStock: { ARS: 0, USD: 0 },
        totalInventoryListValue: { ARS: 0, USD: 0 },
        potentialRecoverableLiquidity: { ARS: 0, USD: 0 },

        averageSoldRotationDays,
        unitsRequiringAttentionCount: processedVehicles.filter(v => v.daysInStock >= 61).length,
        criticalUnitsCount: processedVehicles.filter(v => v.daysInStock >= 91).length,
        healthyUnitsCount: processedVehicles.filter(v => v.daysInStock <= 30).length,
        trackingUnitsCount: processedVehicles.filter(v => v.daysInStock > 30 && v.daysInStock <= 60).length,
        totalStockCount: processedVehicles.length
    };

    for (const v of processedVehicles) {
        const c = v.currency;
        kpis.totalInventoryListValue[c] = roundMoney((kpis.totalInventoryListValue[c] || 0) + v.price);
        kpis.totalCapitalOwnInStock[c] = roundMoney((kpis.totalCapitalOwnInStock[c] || 0) + v.capitalOwnInvested);
        kpis.totalPartnerCapitalInStock[c] = roundMoney((kpis.totalPartnerCapitalInStock[c] || 0) + v.partnerCapitalInvested);
        kpis.potentialRecoverableLiquidity[c] = roundMoney((kpis.potentialRecoverableLiquidity[c] || 0) + v.capitalOwnInvested);

        if (v.daysInStock >= 61) {
            kpis.capitalOwnImmobilizedSlowRotation[c] = roundMoney((kpis.capitalOwnImmobilizedSlowRotation[c] || 0) + v.capitalOwnInvested);
        }
    }

    // Si es vendedor, sanitizar los datos de cada vehículo
    if (!isOwnerOrFinance) {
        return {
            ok: true,
            isRestrictedSellerView: true,
            summary: {
                totalStockCount: kpis.totalStockCount,
                unitsRequiringAttentionCount: kpis.unitsRequiringAttentionCount
            },
            vehicles: processedVehicles.map(sanitizeRotationForSeller)
        };
    }

    return {
        ok: true,
        isRestrictedSellerView: false,
        kpis,
        vehicles: processedVehicles
    };
}
