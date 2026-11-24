// src/services/vehicleProfitabilityService.js
// Motor de cálculo de Rentabilidad Real por Vehículo para AutoSporting CRM.
// Reglas contables estrictas:
//  1. Reutiliza el motor financiero existente (saleCommercial.js, tradeInChainService.js).
//  2. Separa rigurosamente resultados realizados (Vendidos) de rentabilidad potencial (En stock).
//  3. Denominación contable precisa: Margen Comercial Neto / Margen de Contribución Directo por Unidad
//     (ingresos pactados menos costos de adquisición, reacondicionamiento, gastos comerciales directos y comisión,
//     antes de costos fijos de estructura general e impuestos).
//  4. Ventas pendientes de entrega: se presentan como "Devengado Condicional a la Entrega", distinguiéndolas
//     de las ventas "Entregadas (Definitivamente Realizadas)".
//  5. Permutas encadenadas: distinguen con precisión costo económico base, valor comercial de toma y
//     resultados ya reconocidos en la venta de origen, evitando estrictamente la duplicación de ganancias.
//  6. Separa ganancia económica devengada de efectivo cobrado / cuotas por cobrar.
//  7. No suma monedas distintas: los totales se informan en ARS y USD por separado.

import Car from '../models/Car.js';
import Sale from '../models/Sale.js';
import Transaction from '../models/Transaction.js';
import Installment from '../models/Installment.js';
import {
    roundMoney,
    normalizeCurrency,
    resolveVehicleAcquisitionCost,
    computeSaleProfit
} from '../utils/saleCommercial.js';
import { resolveOriginForCar, buildTradeInChain, CONCRETIZED_SALE_STATUSES } from './tradeInChainService.js';

const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const formatDateIso = (d) => {
    if (!d) return null;
    try {
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? null : dt.toISOString().split('T')[0];
    } catch {
        return null;
    }
};

/**
 * Calcula los días de inmovilización entre dos fechas.
 */
export function calculateDaysImmobilized(startDate, endDate = new Date()) {
    if (!startDate) return 1;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (isNaN(start) || isNaN(end)) return 1;
    const diff = Math.max(1, Math.round(Math.abs(end - start) / (1000 * 60 * 60 * 24)));
    return diff;
}

/**
 * Indicador SECUNDARIO de eficiencia del capital (ROI Anualizado proyectado):
 * ROI Anualizado (%) = (Margen Neto / Costo Total) * (365 / Días) * 100
 * Supuesto explícito: proyección teórica a 365 días bajo reinversión continua a idéntico margen.
 */
export function calculateAnnualizedRoi({ netProfit, totalCost, days }) {
    const profit = num(netProfit);
    const cost = num(totalCost);
    const d = Math.max(1, num(days));
    if (cost <= 0) return null;
    return roundMoney(((profit / cost) * (365 / d)) * 100);
}

/**
 * Carga cobros reales (efectivo) y cuotas pendientes de una venta.
 */
async function loadSaleCashMetrics(sale) {
    if (!sale?._id) return { cashCollected: { ARS: 0, USD: 0 }, pendingReceivable: { ARS: 0, USD: 0 }, txCount: 0 };

    const [txs, installments] = await Promise.all([
        Transaction.find({
            saleId: sale._id,
            type: 'Ingreso',
            status: { $in: ['activo', 'completado'] }
        }).select('amount currency date').lean(),
        Installment.find({
            saleId: sale._id,
            status: { $ne: 'anulada' }
        }).select('amount paidAmount currency status dueDate').lean()
    ]);

    const cashCollected = { ARS: 0, USD: 0 };
    const pendingReceivable = { ARS: 0, USD: 0 };

    if (num(sale.depositAppliedAmount) > 0 && sale.depositAppliedCurrency) {
        const cur = normalizeCurrency(sale.depositAppliedCurrency);
        cashCollected[cur] = roundMoney(cashCollected[cur] + num(sale.depositAppliedAmount));
    }

    for (const tx of txs) {
        const cur = normalizeCurrency(tx.currency);
        cashCollected[cur] = roundMoney(cashCollected[cur] + num(tx.amount));
    }

    for (const inst of installments) {
        if (['pagada', 'pagada_manual'].includes(inst.status)) continue;
        const pending = Math.max(0, num(inst.amount) - num(inst.paidAmount));
        if (pending > 0) {
            const cur = normalizeCurrency(inst.currency);
            pendingReceivable[cur] = roundMoney(pendingReceivable[cur] + pending);
        }
    }

    // Inferencia económica fiel cuando aún no se han creado transacciones ni cuotas en sub-colecciones
    if (txs.length === 0 && installments.length === 0) {
        const saleCur = normalizeCurrency(sale.saleCurrency || 'ARS');
        const salePrice = num(sale.salePrice);
        const tradeInAmt = num(sale.tradeInTotalAmount);

        if (sale.financingDetails?.hasFinancing) {
            const downPayment = num(sale.financingDetails.downPayment) || Math.max(0, salePrice - tradeInAmt - (num(sale.financingDetails.financedBalance) || 0));
            const pending = num(sale.financingDetails.totalFinancedWithInterest) || num(sale.financingDetails.financedBalance) || 0;
            if (cashCollected[saleCur] === 0 && downPayment > 0) {
                cashCollected[saleCur] = roundMoney(downPayment);
            }
            if (pending > 0) {
                pendingReceivable[saleCur] = roundMoney(pending);
            }
        } else if (sale.paymentMethod === 'contado' || sale.paymentMethod === 'permuta') {
            const netCashExpected = Math.max(0, salePrice - tradeInAmt);
            if (cashCollected[saleCur] === 0 && netCashExpected > 0) {
                cashCollected[saleCur] = roundMoney(netCashExpected);
            }
        }
    }

    return {
        cashCollected,
        pendingReceivable,
        txCount: txs.length,
        installmentsCount: installments.length
    };
}

/**
 * Resuelve la participación de socios / copropietarios de un vehículo.
 */
function resolvePartnerParticipation(car) {
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
 * Procesa un vehículo vendido con su venta concretada.
 */
async function processSoldVehicle(car, sale, referenceExchangeRate = null) {
    const saleCurrency = normalizeCurrency(sale?.saleCurrency || 'ARS');
    const saleRate = num(sale?.exchangeRate) > 0 ? num(sale.exchangeRate) : referenceExchangeRate;
    const resolvedOrigin = await resolveOriginForCar(car);
    const participation = resolvePartnerParticipation(car);

    // Política de Reconocimiento Contable de Entrega
    const isDelivered = sale.status === 'entregada';
    const deliveryRecognition = isDelivered ? 'definitiva' : 'condicional';
    const deliveryStatusLabel = isDelivered 
        ? 'Entregada (Definitivamente Realizada)' 
        : 'Pendiente de Entrega (Devengado Condicional)';

    // Días de inmovilización
    const intakeDate = car.createdAt || sale.saleDate;
    const saleDate = sale.saleDate || car.soldAt || new Date();
    const daysImmobilized = calculateDaysImmobilized(intakeDate, saleDate);

    // Comisión pactada
    const isPercentComm = sale.commissionSettings?.mode === 'percent' &&
        sale.commissionSettings?.percent !== undefined &&
        sale.commissionSettings?.percent !== null &&
        String(sale.commissionSettings.percent).trim() !== '';
    const commissionAmount = isPercentComm
        ? roundMoney(((num(sale.salePrice) || 0) * num(sale.commissionSettings.percent)) / 100)
        : (num(sale.commissionSettings?.extraAmount) || 0);
    const commissionCurrency = isPercentComm
        ? saleCurrency
        : (commissionAmount > 0 ? normalizeCurrency(sale.commissionSettings?.extraCurrency || saleCurrency) : saleCurrency);

    // Motor financiero canónico
    const commercialProfit = computeSaleProfit({
        salePrice: sale.salePrice,
        saleCurrency: sale.saleCurrency,
        vehicle: car,
        legacyTradeInOrigin: resolvedOrigin,
        vehicleExpenses: car.expenses || [],
        saleExpenses: sale.saleExpenses || [],
        commissionSettings: sale.commissionSettings,
        commissionAmount,
        commissionCurrency,
        exchangeRate: saleRate,
        investorPercentage: participation.partnerPercentage
    });

    // Cobros reales vs cuotas pendientes
    const cashMetrics = await loadSaleCashMetrics(sale);

    // Costo económico total en moneda de la venta
    const acquisitionCost = commercialProfit.acquisitionCost;
    const vehicleExpensesTotal = commercialProfit.vehicleExpensesTotal;
    const saleExpensesTotal = commercialProfit.saleExpensesTotal;
    const totalExpenses = commercialProfit.totalExpenses;
    const totalEconomicCost = acquisitionCost !== null ? roundMoney(acquisitionCost + vehicleExpensesTotal) : null;
    const totalCostWithSaleExpenses = acquisitionCost !== null ? roundMoney(acquisitionCost + totalExpenses) : null;

    // Capital invertido propio y del socio
    const agencyCapitalInvested = totalEconomicCost !== null
        ? roundMoney(totalEconomicCost * (participation.agencyPercentage / 100))
        : null;
    const partnerCapitalInvested = totalEconomicCost !== null && participation.hasPartner
        ? roundMoney(totalEconomicCost * (participation.partnerPercentage / 100))
        : 0;

    // Márgenes y rendimiento
    const agreedPrice = commercialProfit.agreedPrice;
    const netProfit = commercialProfit.netProfit;
    const agencyNetProfit = commercialProfit.agencyNetProfit;
    const partnerNetProfit = commercialProfit.investorProfitShare;

    const marginOnCostPct = totalCostWithSaleExpenses > 0 && netProfit !== null
        ? roundMoney((netProfit / totalCostWithSaleExpenses) * 100)
        : null;
    const marginOnSalePct = agreedPrice > 0 && netProfit !== null
        ? roundMoney((netProfit / agreedPrice) * 100)
        : null;
    const agencyMarginOnCostPct = agencyCapitalInvested > 0 && agencyNetProfit !== null
        ? roundMoney((agencyNetProfit / agencyCapitalInvested) * 100)
        : null;

    // Ganancia diaria y ROI Anualizado (indicador secundario)
    const dailyProfit = netProfit !== null ? roundMoney(netProfit / daysImmobilized) : null;
    const agencyDailyProfit = agencyNetProfit !== null ? roundMoney(agencyNetProfit / daysImmobilized) : null;
    const annualizedRoiPct = calculateAnnualizedRoi({
        netProfit,
        totalCost: totalCostWithSaleExpenses,
        days: daysImmobilized
    });
    const agencyAnnualizedRoiPct = calculateAnnualizedRoi({
        netProfit: agencyNetProfit,
        totalCost: agencyCapitalInvested,
        days: daysImmobilized
    });

    // Permutas recibidas en la venta actual
    const tradeInsReceived = (sale.tradeIns || []).map(t => ({
        brand: t.brand,
        model: t.model,
        year: t.year,
        plate: t.plate,
        estimatedValue: num(t.estimatedValue),
        currency: normalizeCurrency(t.currency || saleCurrency),
        linkedStockCarId: t.linkedStockCarId ? String(t.linkedStockCarId) : null
    }));

    // Trazabilidad y no-duplicación de permutas encadenadas
    const hasTradeInOrigin = Boolean(resolvedOrigin?.saleId);
    let originSaleInfo = null;

    if (hasTradeInOrigin) {
        try {
            const originSale = await Sale.findById(resolvedOrigin.saleId).select('saleDate salePrice saleCurrency vehicleId status commissionSettings saleExpenses').lean();
            if (originSale && originSale.vehicleId) {
                const parentCar = await Car.findById(originSale.vehicleId).select('name brand year plateOrVin purchasePrice purchaseCurrency expenses investor jointOwnership').lean();
                if (parentCar) {
                    const parentProfit = computeSaleProfit({
                        salePrice: originSale.salePrice,
                        saleCurrency: originSale.saleCurrency,
                        vehicle: parentCar,
                        vehicleExpenses: parentCar.expenses || [],
                        saleExpenses: originSale.saleExpenses || [],
                        commissionSettings: originSale.commissionSettings
                    });
                    originSaleInfo = {
                        saleId: String(originSale._id),
                        saleDate: formatDateIso(originSale.saleDate),
                        status: originSale.status,
                        parentCarName: `${parentCar.brand} ${parentCar.name} (${parentCar.year})`,
                        parentCarPlate: parentCar.plateOrVin || '',
                        salePrice: originSale.salePrice,
                        currency: originSale.saleCurrency,
                        tradeInAgreedValue: resolvedOrigin.value,
                        recognizedProfitOnOriginSale: parentProfit?.netProfit !== null ? parentProfit.netProfit : null,
                        agencyRecognizedProfitOnOriginSale: parentProfit?.agencyNetProfit !== null ? parentProfit.agencyNetProfit : null,
                        auditNotice: 'El valor de toma acordado es el costo económico base de este vehículo. No se duplicó como ganancia en la venta de origen.'
                    };
                }
            }
        } catch (err) {
            console.error('Error cargando venta de origen para trazabilidad de permuta:', err);
        }
    }

    // Trazabilidad de cálculo (auditoría paso a paso con denominación contable precisa)
    const calculationSteps = [
        { label: 'Precio total pactado de venta', amount: agreedPrice, currency: saleCurrency, type: 'base' },
        {
            label: `Costo económico de adquisición (${commercialProfit.acquisitionSource === 'valor_de_toma' ? 'Valor comercial de toma en permuta' : 'Compra directa'})`,
            amount: acquisitionCost !== null ? -acquisitionCost : null,
            rawAmount: commercialProfit.rawAcquisitionCost,
            rawCurrency: commercialProfit.rawAcquisitionCurrency,
            currency: saleCurrency,
            type: 'cost'
        },
        {
            label: `Gastos de preparación / taller (${(car.expenses || []).length} conceptos)`,
            amount: -vehicleExpensesTotal,
            currency: saleCurrency,
            type: 'expense'
        },
        {
            label: `Gastos comerciales directos de la venta (${(sale.saleExpenses || []).length} conceptos)`,
            amount: -saleExpensesTotal,
            currency: saleCurrency,
            type: 'expense'
        },
        {
            label: `Comisión pactada (${commercialProfit.commissionMode === 'percent' ? commercialProfit.commissionPercent + '%' : 'fija'})`,
            amount: -commercialProfit.commissionAmount,
            currency: saleCurrency,
            type: 'commission'
        },
        {
            label: 'Margen Comercial Neto de la Operación (Devengado)',
            amount: netProfit,
            currency: saleCurrency,
            type: 'total',
            description: 'Margen de contribución directo antes de costos fijos de estructura general e impuestos'
        },
        {
            label: `Parte de la Agencia (${participation.agencyPercentage}%)`,
            amount: agencyNetProfit,
            currency: saleCurrency,
            type: 'share_agency'
        }
    ];

    if (participation.hasPartner && partnerNetProfit !== null) {
        calculationSteps.push({
            label: `Parte de ${participation.partnerName} (${participation.partnerPercentage}%)`,
            amount: partnerNetProfit,
            currency: saleCurrency,
            type: 'share_partner'
        });
    }

    return {
        vehicleType: 'sold',
        carId: String(car._id),
        name: car.name,
        brand: car.brand,
        year: car.year,
        plateOrVin: car.plateOrVin || '',
        color: car.color || '',
        km: car.km || 0,
        status: car.status || 'Vendido',
        intakeDate: formatDateIso(intakeDate),
        saleDate: formatDateIso(saleDate),
        daysImmobilized,

        // Reconocimiento y Estado de Entrega
        isDelivered,
        deliveryRecognition,
        deliveryStatusLabel,

        // Venta
        saleId: String(sale._id),
        saleStatus: sale.status,
        salesperson: sale.salesperson || '',
        paymentMethod: sale.paymentMethod || 'contado',
        currency: saleCurrency,
        agreedPrice,
        exchangeRateUsed: commercialProfit.exchangeRateUsed,
        convertedWithExchangeRate: commercialProfit.convertedWithExchangeRate,

        // Costo y Gastos
        hasCost: commercialProfit.calculable,
        acquisitionSource: commercialProfit.acquisitionSource,
        acquisitionCost,
        rawAcquisitionCost: commercialProfit.rawAcquisitionCost,
        rawAcquisitionCurrency: commercialProfit.rawAcquisitionCurrency,
        vehicleExpensesTotal,
        saleExpensesTotal,
        totalExpenses,
        totalEconomicCost,
        totalCostWithSaleExpenses,
        carExpensesList: car.expenses || [],
        saleExpensesList: sale.saleExpenses || [],

        // Comisión
        commission: {
            amount: commercialProfit.commissionAmount,
            currency: saleCurrency,
            mode: commercialProfit.commissionMode,
            percent: commercialProfit.commissionPercent
        },

        // Denominación Contable Precisa: Margen Comercial Neto
        calculable: commercialProfit.calculable,
        missingReasons: commercialProfit.missingReasons,
        profitBeforeCommission: commercialProfit.profitBeforeCommission,
        commercialNetProfit: netProfit,
        netProfit, // retrocompatibilidad
        agencyCommercialNetProfit: agencyNetProfit,
        agencyNetProfit, // retrocompatibilidad
        partnerCommercialNetProfit: partnerNetProfit,
        partnerNetProfit,

        // Márgenes porcentuales
        marginOnCostPct,
        marginOnSalePct,
        agencyMarginOnCostPct,

        // Participación y Capital
        participation,
        agencyCapitalInvested,
        partnerCapitalInvested,

        // Eficiencia del Capital (Primaria: Margen y Ganancia Diaria; Secundaria: ROI Anualizado)
        capitalEfficiency: {
            dailyProfit,
            agencyDailyProfit,
            annualizedRoiPct,
            agencyAnnualizedRoiPct,
            daysImmobilized,
            roiNote: 'El ROI anualizado es un indicador secundario y proyección teórica a 365 días.'
        },

        // Financiación
        financing: {
            hasFinancing: Boolean(sale.financingDetails?.hasFinancing || sale.installmentsCount > 0),
            downPayment: num(sale.financingDetails?.downPayment),
            installmentsCount: sale.financingDetails?.installmentsCount || sale.installmentsCount || 0,
            interestRate: num(sale.financingDetails?.interestRate),
            interestAmount: num(sale.financingDetails?.interestAmount),
            financedBalance: num(sale.financingDetails?.financedBalance),
            totalFinancedWithInterest: num(sale.financingDetails?.totalFinancedWithInterest),
            installmentAmount: num(sale.financingDetails?.installmentAmount),
            totalOperationPrice: num(sale.financingDetails?.totalOperationPrice || agreedPrice)
        },

        // Dinero Cobrado Real vs Por Cobrar (separado de devengado)
        cashMetrics,

        // Permutas con no-duplicación explícita
        tradeIns: {
            hasTradeInOrigin,
            originSaleId: resolvedOrigin?.saleId ? String(resolvedOrigin.saleId) : null,
            originTradeInValue: resolvedOrigin?.value || null,
            originTradeInCurrency: resolvedOrigin?.currency || null,
            originSaleInfo,
            receivedTradeIns: tradeInsReceived,
            tradeInTotalAmount: num(sale.tradeInTotalAmount)
        },

        // Trazabilidad de Auditoría
        traceability: {
            accountingConcept: 'Margen Comercial Neto / Margen de Contribución por Unidad (antes de costos fijos de estructura general e impuestos)',
            deliveryPolicy: isDelivered 
                ? 'Operación entregada físicamente al cliente: resultado definitivamente realizado.'
                : 'Operación confirmada pendiente de entrega física: devengado condicional a la entrega y transferencia.',
            calculationSteps,
            assumptions: [
                `Inmovilización: ${daysImmobilized} días desde ${formatDateIso(intakeDate)} hasta venta ${formatDateIso(saleDate)}.`,
                `Capital propio inmovilizado: ${saleCurrency} ${(agencyCapitalInvested || 0).toLocaleString('es-AR')}.`,
                `Ganancia diaria: ${saleCurrency} ${(agencyDailyProfit || 0).toLocaleString('es-AR')}/día inmovilizado.`,
                `ROI Anualizado (indicador secundario): ${agencyAnnualizedRoiPct !== null ? agencyAnnualizedRoiPct + '%' : 'N/D'} (fórmula: (Margen / Inversión) × (365 / Días)).`,
                `El efectivo cobrado (${saleCurrency} ${(cashMetrics.cashCollected[saleCurrency] || 0).toLocaleString('es-AR')}) es independiente del margen devengado.`
            ]
        }
    };
}

/**
 * Procesa un vehículo en stock (rentabilidad potencial / estimada).
 */
async function processStockVehicle(car, referenceExchangeRate = null) {
    const listCurrency = normalizeCurrency(car.currency || '$');
    const resolvedOrigin = await resolveOriginForCar(car);
    const participation = resolvePartnerParticipation(car);

    // Costo de compra o toma
    const resolvedCost = resolveVehicleAcquisitionCost(car, resolvedOrigin);
    const hasCost = resolvedCost.hasCost && num(resolvedCost.amount) > 0;
    const rawCost = hasCost ? resolvedCost.amount : null;
    const rawCostCurrency = resolvedCost.currency || listCurrency;

    // Días en stock
    const intakeDate = car.createdAt || new Date();
    const daysInStock = calculateDaysImmobilized(intakeDate, new Date());

    // Gastos acumulados hasta hoy
    let vehicleExpensesTotal = 0;
    const expensesList = Array.isArray(car.expenses) ? car.expenses : [];
    for (const exp of expensesList) {
        const amt = num(exp.amount);
        if (amt > 0) {
            const expCur = exp.currency ? normalizeCurrency(exp.currency) : rawCostCurrency;
            if (expCur === rawCostCurrency) {
                vehicleExpensesTotal = roundMoney(vehicleExpensesTotal + amt);
            } else if (referenceExchangeRate) {
                const converted = expCur === 'USD'
                    ? roundMoney(amt * referenceExchangeRate)
                    : roundMoney(amt / referenceExchangeRate);
                vehicleExpensesTotal = roundMoney(vehicleExpensesTotal + converted);
            }
        }
    }

    const totalEconomicCost = hasCost ? roundMoney(rawCost + vehicleExpensesTotal) : null;
    const agencyCapitalInvested = totalEconomicCost !== null
        ? roundMoney(totalEconomicCost * (participation.agencyPercentage / 100))
        : null;
    const partnerCapitalInvested = totalEconomicCost !== null && participation.hasPartner
        ? roundMoney(totalEconomicCost * (participation.partnerPercentage / 100))
        : 0;

    const listPrice = num(car.price) || 0;
    const isSameCurrency = hasCost && listCurrency === rawCostCurrency;

    // Estimación comercial estándar de comisión (1.3%)
    const estimatedCommission = listPrice > 0 ? roundMoney(listPrice * 0.013) : 0;

    let potentialNetProfit = null;
    let potentialAgencyNetProfit = null;
    let potentialMarginPct = null;
    let potentialAnnualizedRoiPct = null;
    let potentialDailyProfit = null;

    if (hasCost && isSameCurrency && listPrice > 0) {
        potentialNetProfit = roundMoney(listPrice - totalEconomicCost - estimatedCommission);
        potentialAgencyNetProfit = roundMoney(potentialNetProfit * (participation.agencyPercentage / 100));
        potentialMarginPct = totalEconomicCost > 0 ? roundMoney((potentialNetProfit / totalEconomicCost) * 100) : null;
        potentialDailyProfit = roundMoney(potentialNetProfit / daysInStock);
        potentialAnnualizedRoiPct = calculateAnnualizedRoi({
            netProfit: potentialAgencyNetProfit,
            totalCost: agencyCapitalInvested,
            days: daysInStock
        });
    }

    // Trazabilidad de origen de permuta si aplica
    const hasTradeInOrigin = Boolean(resolvedOrigin?.saleId);
    let originSaleInfo = null;

    if (hasTradeInOrigin) {
        try {
            const originSale = await Sale.findById(resolvedOrigin.saleId).select('saleDate salePrice saleCurrency vehicleId status').lean();
            if (originSale && originSale.vehicleId) {
                const parentCar = await Car.findById(originSale.vehicleId).select('name brand year plateOrVin').lean();
                if (parentCar) {
                    originSaleInfo = {
                        saleId: String(originSale._id),
                        saleDate: formatDateIso(originSale.saleDate),
                        status: originSale.status,
                        parentCarName: `${parentCar.brand} ${parentCar.name} (${parentCar.year})`,
                        parentCarPlate: parentCar.plateOrVin || '',
                        tradeInAgreedValue: resolvedOrigin.value,
                        currency: resolvedOrigin.currency
                    };
                }
            }
        } catch (e) {
            console.error('Error cargando origen de permuta en stock:', e);
        }
    }

    return {
        vehicleType: 'stock',
        carId: String(car._id),
        name: car.name,
        brand: car.brand,
        year: car.year,
        plateOrVin: car.plateOrVin || '',
        color: car.color || '',
        km: car.km || 0,
        status: car.status || 'Disponible',
        intakeDate: formatDateIso(intakeDate),
        daysInStock,
        isAging: daysInStock >= 60,
        isCriticalAging: daysInStock >= 90,

        // Precio y Moneda
        currency: listCurrency,
        listPrice,

        // Costo y Gastos
        hasCost,
        acquisitionSource: resolvedCost.source || 'compra',
        acquisitionCost: rawCost,
        acquisitionCurrency: rawCostCurrency,
        vehicleExpensesTotal,
        totalEconomicCost,
        carExpensesList: expensesList,

        // Estimaciones Potenciales (NO REALIZADAS)
        isEstimate: true,
        estimatedCommission,
        commercialNetProfit: potentialNetProfit,
        potentialNetProfit,
        potentialAgencyNetProfit,
        potentialMarginPct,

        // Participación y Capital Inmovilizado
        participation,
        agencyCapitalInvested,
        partnerCapitalInvested,

        // Eficiencia del Capital Potencial
        capitalEfficiency: {
            potentialDailyProfit,
            potentialAnnualizedRoiPct,
            daysInStock,
            roiNote: 'El ROI anualizado es un indicador secundario y proyección teórica a 365 días.'
        },

        // Trazabilidad de Origen de Permuta
        tradeIns: {
            hasTradeInOrigin,
            originSaleId: resolvedOrigin?.saleId ? String(resolvedOrigin.saleId) : null,
            originTradeInValue: resolvedOrigin?.value || null,
            originTradeInCurrency: resolvedOrigin?.currency || null,
            originSaleInfo
        },

        // Trazabilidad de Supuestos
        traceability: {
            accountingConcept: 'Margen Comercial Potencial Estimado (sobre precio de lista, no realizado)',
            assumptions: [
                `Rentabilidad POTENCIAL basada en precio de lista actual (${listCurrency} ${listPrice.toLocaleString('es-AR')}).`,
                `Inmovilización acumulada: ${daysInStock} días desde el ingreso al inventario (${formatDateIso(intakeDate)}).`,
                `Capital propio inmovilizado en stock: ${rawCostCurrency} ${(agencyCapitalInvested || 0).toLocaleString('es-AR')}.`,
                `Comisión proyectada estimada: 1.3% (${listCurrency} ${estimatedCommission.toLocaleString('es-AR')}).`,
                `Alerta de rotación: ${daysInStock >= 90 ? 'Crítica (+90 días)' : daysInStock >= 60 ? 'Atención (+60 días)' : 'Normal (<60 días)'}.`
            ]
        }
    };
}

/**
 * Agrega métricas ejecutivas por período y moneda, discriminando entregas definitivas vs pendientes.
 */
function computeExecutiveSummary(soldVehicles, stockVehicles) {
    const summary = {
        // 1. RESULTADOS REALIZADOS (VENDIDOS)
        realized: {
            totalCount: soldVehicles.length,
            deliveredCount: soldVehicles.filter(v => v.isDelivered).length,
            pendingDeliveryCount: soldVehicles.filter(v => !v.isDelivered).length,
            calculableCount: soldVehicles.filter(v => v.calculable).length,
            nonCalculableCount: soldVehicles.filter(v => !v.calculable).length,

            // Volúmenes y márgenes globales
            totalSalesVolume: { ARS: 0, USD: 0 },
            totalCostVolume: { ARS: 0, USD: 0 },
            totalRealizedNetProfit: { ARS: 0, USD: 0 },
            totalRealizedAgencyNetProfit: { ARS: 0, USD: 0 },
            averageMarginOnSalePct: { ARS: 0, USD: 0 },
            averageMarginOnCostPct: { ARS: 0, USD: 0 },

            // Discriminación por política de entrega
            deliveredNetProfit: { ARS: 0, USD: 0 }, // Definitivamente realizado
            deliveredAgencyNetProfit: { ARS: 0, USD: 0 },
            pendingDeliveryNetProfit: { ARS: 0, USD: 0 }, // Devengado condicional a la entrega
            pendingDeliveryAgencyNetProfit: { ARS: 0, USD: 0 },

            // Control de efectivo y cuentas por cobrar
            totalCashCollected: { ARS: 0, USD: 0 },
            totalPendingReceivable: { ARS: 0, USD: 0 },
            totalExpenses: { ARS: 0, USD: 0 },
            totalCommissions: { ARS: 0, USD: 0 },

            averageMarginPct: 0,
            averageDaysImmobilized: 0
        },

        // 2. RENTABILIDAD POTENCIAL (EN STOCK)
        inStock: {
            totalCount: stockVehicles.length,
            totalListVolume: { ARS: 0, USD: 0 },
            totalImmobilizedCost: { ARS: 0, USD: 0 },
            totalAgencyCapitalImmobilized: { ARS: 0, USD: 0 },
            totalPotentialNetProfit: { ARS: 0, USD: 0 },
            totalPotentialAgencyProfit: { ARS: 0, USD: 0 },
            averagePotentialMarginPct: 0,
            averageDaysInStock: 0,
            agingVehiclesCount: stockVehicles.filter(v => v.daysInStock >= 60).length,
            criticalAgingCount: stockVehicles.filter(v => v.daysInStock >= 90).length
        }
    };

    // Agregar vendidos
    let totalMarginSum = 0;
    let marginCount = 0;
    let totalDaysSold = 0;

    for (const v of soldVehicles) {
        const cur = v.currency;
        summary.realized.totalSalesVolume[cur] = roundMoney((summary.realized.totalSalesVolume[cur] || 0) + (v.agreedPrice || 0));

        if (v.calculable && v.netProfit !== null) {
            summary.realized.totalRealizedNetProfit[cur] = roundMoney((summary.realized.totalRealizedNetProfit[cur] || 0) + v.netProfit);
            summary.realized.totalRealizedAgencyNetProfit[cur] = roundMoney((summary.realized.totalRealizedAgencyNetProfit[cur] || 0) + (v.agencyNetProfit || 0));

            if (v.isDelivered) {
                summary.realized.deliveredNetProfit[cur] = roundMoney((summary.realized.deliveredNetProfit[cur] || 0) + v.netProfit);
                summary.realized.deliveredAgencyNetProfit[cur] = roundMoney((summary.realized.deliveredAgencyNetProfit[cur] || 0) + (v.agencyNetProfit || 0));
            } else {
                summary.realized.pendingDeliveryNetProfit[cur] = roundMoney((summary.realized.pendingDeliveryNetProfit[cur] || 0) + v.netProfit);
                summary.realized.pendingDeliveryAgencyNetProfit[cur] = roundMoney((summary.realized.pendingDeliveryAgencyNetProfit[cur] || 0) + (v.agencyNetProfit || 0));
            }
        }

        if (v.marginOnSalePct !== null) {
            totalMarginSum += v.marginOnSalePct;
            marginCount++;
        }

        if (v.totalCostWithSaleExpenses !== null) {
            summary.realized.totalCostVolume[cur] = roundMoney((summary.realized.totalCostVolume[cur] || 0) + v.totalCostWithSaleExpenses);
        }
        totalDaysSold += v.daysImmobilized || 0;

        summary.realized.totalExpenses[cur] = roundMoney((summary.realized.totalExpenses[cur] || 0) + (v.totalExpenses || 0));
        summary.realized.totalCommissions[cur] = roundMoney((summary.realized.totalCommissions[cur] || 0) + (v.commission?.amount || 0));

        // Efectivo y pendientes
        for (const [c, amt] of Object.entries(v.cashMetrics?.cashCollected || {})) {
            summary.realized.totalCashCollected[c] = roundMoney((summary.realized.totalCashCollected[c] || 0) + (amt || 0));
        }
        for (const [c, amt] of Object.entries(v.cashMetrics?.pendingReceivable || {})) {
            summary.realized.totalPendingReceivable[c] = roundMoney((summary.realized.totalPendingReceivable[c] || 0) + (amt || 0));
        }
    }

    summary.realized.averageMarginPct = marginCount > 0 ? roundMoney(totalMarginSum / marginCount) : 0;
    summary.realized.averageDaysImmobilized = soldVehicles.length > 0 ? Math.round(totalDaysSold / soldVehicles.length) : 0;

    for (const c of ['ARS', 'USD']) {
        const salesVol = summary.realized.totalSalesVolume[c] || 0;
        const profit = summary.realized.totalRealizedNetProfit[c] || 0;
        const costVol = summary.realized.totalCostVolume[c] || 0;
        summary.realized.averageMarginOnSalePct[c] = salesVol > 0 ? roundMoney((profit / salesVol) * 100) : (marginCount > 0 ? roundMoney(totalMarginSum / marginCount) : 0);
        summary.realized.averageMarginOnCostPct[c] = costVol > 0 ? roundMoney((profit / costVol) * 100) : 0;
    }

    // Agregar en stock
    let totalPotentialMarginSum = 0;
    let potentialMarginCount = 0;
    let totalDaysStock = 0;

    for (const v of stockVehicles) {
        const cur = v.currency;
        summary.inStock.totalListVolume[cur] = roundMoney((summary.inStock.totalListVolume[cur] || 0) + (v.listPrice || 0));

        const costCur = v.acquisitionCurrency || cur;
        if (v.totalEconomicCost !== null) {
            summary.inStock.totalImmobilizedCost[costCur] = roundMoney((summary.inStock.totalImmobilizedCost[costCur] || 0) + v.totalEconomicCost);
        }
        if (v.agencyCapitalInvested !== null) {
            summary.inStock.totalAgencyCapitalImmobilized[costCur] = roundMoney((summary.inStock.totalAgencyCapitalImmobilized[costCur] || 0) + v.agencyCapitalInvested);
        }

        if (v.potentialNetProfit !== null) {
            summary.inStock.totalPotentialNetProfit[cur] = roundMoney((summary.inStock.totalPotentialNetProfit[cur] || 0) + v.potentialNetProfit);
            summary.inStock.totalPotentialAgencyProfit[cur] = roundMoney((summary.inStock.totalPotentialAgencyProfit[cur] || 0) + (v.potentialAgencyNetProfit || 0));
        }

        if (v.potentialMarginPct !== null) {
            totalPotentialMarginSum += v.potentialMarginPct;
            potentialMarginCount++;
        }

        totalDaysStock += v.daysInStock || 0;
    }

    summary.inStock.averagePotentialMarginPct = potentialMarginCount > 0 ? roundMoney(totalPotentialMarginSum / potentialMarginCount) : 0;
    summary.inStock.averageDaysInStock = stockVehicles.length > 0 ? Math.round(totalDaysStock / stockVehicles.length) : 0;

    return summary;
}

/**
 * Consulta integral de rentabilidad con filtros de fecha, modelo, estado y participación.
 */
export async function getVehicleProfitabilityOverview({
    startDate = null,
    endDate = null,
    period = null, // YYYY-MM
    search = '',
    statusFilter = 'all', // 'all', 'disponible', 'vendido', 'reservado', 'entregada', 'pendiente_entrega'
    participationFilter = 'all', // 'all', 'agency', 'shared'
    deliveryFilter = 'all', // 'all', 'delivered', 'pending_delivery'
    exchangeRate = null
} = {}) {
        // Resolver rango de fechas con límites UTC exactos para evitar desfases de huso horario
    let start = null;
    let end = null;

    if (period && /^\d{4}-\d{2}$/.test(period)) {
        const [year, month] = period.split('-').map(Number);
        start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    } else {
        if (startDate) {
            const parts = String(startDate).split('-').map(Number);
            if (parts.length === 3) {
                start = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0));
            } else {
                start = new Date(startDate);
            }
        }
        if (endDate) {
            const parts = String(endDate).split('-').map(Number);
            if (parts.length === 3) {
                end = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999));
            } else {
                end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
            }
        }
    }

    // 1. Obtener todas las ventas concretadas en el período (o históricas)
    const saleQuery = {
        status: { $in: CONCRETIZED_SALE_STATUSES }
    };

    if (deliveryFilter === 'delivered') {
        saleQuery.status = 'entregada';
    } else if (deliveryFilter === 'pending_delivery') {
        saleQuery.status = { $in: ['pendiente_entrega', 'confirmada'] };
    }

    if (start && end) {
        saleQuery.$or = [
            { saleDate: { $gte: start, $lte: end } },
            { saleDate: null, createdAt: { $gte: start, $lte: end } },
            { saleDate: { $exists: false }, createdAt: { $gte: start, $lte: end } }
        ];
    } else if (start) {
        saleQuery.$or = [
            { saleDate: { $gte: start } },
            { saleDate: null, createdAt: { $gte: start } },
            { saleDate: { $exists: false }, createdAt: { $gte: start } }
        ];
    } else if (end) {
        saleQuery.$or = [
            { saleDate: { $lte: end } },
            { saleDate: null, createdAt: { $lte: end } },
            { saleDate: { $exists: false }, createdAt: { $lte: end } }
        ];
    }

    const sales = await Sale.find(saleQuery)
        .populate('vehicleId')
        .sort({ saleDate: -1, createdAt: -1 })
        .lean();

    const soldVehicles = [];
    const soldCarIds = new Set();

    for (const sale of sales) {
        const car = sale.vehicleId;
        if (!car) continue;
        soldCarIds.add(String(car._id));

        // Filtro por modelo / marca / patente
        if (search) {
            const term = search.trim().toLowerCase();
            const text = `${car.brand || ''} ${car.name || ''} ${car.plateOrVin || ''}`.toLowerCase();
            if (!text.includes(term)) continue;
        }

        // Filtro por participación
        if (participationFilter === 'agency') {
            const part = resolvePartnerParticipation(car);
            if (part.hasPartner) continue;
        } else if (participationFilter === 'shared') {
            const part = resolvePartnerParticipation(car);
            if (!part.hasPartner) continue;
        }

        const processed = await processSoldVehicle(car, sale, exchangeRate);
        soldVehicles.push(processed);
    }

    // 2. Obtener vehículos en stock (no vendidos)
    const stockQuery = {
        _id: { $nin: Array.from(soldCarIds) },
        status: { $ne: 'Vendido' }
    };

    if (statusFilter && statusFilter !== 'all' && !['entregada', 'pendiente_entrega', 'vendido'].includes(statusFilter.toLowerCase())) {
        stockQuery.status = new RegExp(`^${statusFilter}$`, 'i');
    }

    const stockCars = await Car.find(stockQuery)
        .sort({ order: 1, createdAt: -1 })
        .lean();

    const stockVehicles = [];

    for (const car of stockCars) {
        // Filtro por búsqueda
        if (search) {
            const term = search.trim().toLowerCase();
            const text = `${car.brand || ''} ${car.name || ''} ${car.plateOrVin || ''}`.toLowerCase();
            if (!text.includes(term)) continue;
        }

        // Filtro por participación
        if (participationFilter === 'agency') {
            const part = resolvePartnerParticipation(car);
            if (part.hasPartner) continue;
        } else if (participationFilter === 'shared') {
            const part = resolvePartnerParticipation(car);
            if (!part.hasPartner) continue;
        }

        const processed = await processStockVehicle(car, exchangeRate);
        stockVehicles.push(processed);
    }

    // 3. Resumen Ejecutivo
    const summary = computeExecutiveSummary(soldVehicles, stockVehicles);

    return {
        ok: true,
        summary,
        soldVehicles,
        stockVehicles,
        filters: {
            startDate: formatDateIso(start),
            endDate: formatDateIso(end),
            period,
            search,
            statusFilter,
            participationFilter,
            deliveryFilter,
            exchangeRate: num(exchangeRate) > 0 ? num(exchangeRate) : null
        },
        metadata: {
            generatedAt: new Date().toISOString(),
            accountingStandard: 'Margen Comercial Neto / Margen de Contribución por Unidad (antes de costos fijos de estructura general e impuesto a las ganancias)',
            deliveryPolicy: {
                delivered: 'Ventas con entrega física completada: margen definitivamente realizado.',
                pendingDelivery: 'Ventas confirmadas pendientes de entrega física: devengado condicional a la entrega y transferencia.'
            },
            notes: {
                tradeInPrinciple: 'El valor comercial de toma pactado en una permuta es el costo económico base del vehículo recibido; no se computa como ganancia en la venta de origen ni se duplica en la posterior venta del vehículo tomado.',
                cashSeparation: 'El efectivo cobrado y los saldos por cobrar se informan en métricas separadas sin alterar el margen económico.'
            }
        }
    };
}

/**
 * Obtiene la ficha detallada de rentabilidad de un vehículo individual.
 */
export async function getVehicleDetailedProfitability(carId, exchangeRate = null) {
    const car = await Car.findById(carId).lean();
    if (!car) return { ok: false, code: 'CAR_NOT_FOUND', message: 'Vehículo no encontrado.' };

    const sales = await Sale.find({ vehicleId: car._id, status: { $ne: 'cancelada' } })
        .sort({ saleDate: -1 })
        .lean();

    const sale = sales[0] || null;
    const isSold = Boolean(sale && CONCRETIZED_SALE_STATUSES.includes(sale.status));

    let processed;
    if (isSold) {
        processed = await processSoldVehicle(car, sale, exchangeRate);
    } else {
        processed = await processStockVehicle(car, exchangeRate);
    }

    // Trazabilidad de permutas completa
    let tradeInChainData = null;
    try {
        tradeInChainData = await buildTradeInChain({ carId, exchangeRate, canViewCostAndProfit: true });
    } catch (err) {
        console.error('Error calculando árbol de permutas para rentabilidad:', err);
    }

    return {
        ok: true,
        vehicle: processed,
        isSold,
        tradeInChain: tradeInChainData,
        rawCar: {
            _id: car._id,
            name: car.name,
            brand: car.brand,
            year: car.year,
            plateOrVin: car.plateOrVin,
            purchasePrice: car.purchasePrice,
            purchaseCurrency: car.purchaseCurrency,
            expenses: car.expenses || [],
            investor: car.investor,
            jointOwnership: car.jointOwnership,
            tradeInOrigin: car.tradeInOrigin
        }
    };
}
