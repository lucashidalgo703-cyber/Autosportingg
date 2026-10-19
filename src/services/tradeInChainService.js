// Trazabilidad de vehículos recibidos en parte de pago (cadenas de permutas) y rentabilidad acumulada.
// Reglas:
//  - La recepción de una permuta NO es dinero ingresado a caja: se informa aparte como "valor de toma".
//  - El costo del vehículo recibido es el valor de toma acordado (+ sus gastos); el precio de la venta que lo originó
//    ya incluye ese valor, por lo que no se cuenta dos veces.
//  - No se suman monedas distintas: cada total se informa por moneda.
//  - Solo las ventas concretadas entran en la ganancia acumulada; los vehículos sin vender se muestran aparte
//    con su costo y un margen ESTIMADO.
import Car from '../models/Car.js';
import Sale from '../models/Sale.js';
import Installment from '../models/Installment.js';
import Transaction from '../models/Transaction.js';
import {
    roundMoney,
    normalizeCurrency,
    resolveVehicleAcquisitionCost,
    computeSaleProfit
} from '../utils/saleCommercial.js';

export const CONCRETIZED_SALE_STATUSES = ['confirmada', 'pendiente_entrega', 'entregada'];
const MAX_DEPTH = 50;

const carCurrency = (code) => normalizeCurrency(code);
const addTo = (bag, currency, amount) => {
    const cur = normalizeCurrency(currency);
    bag[cur] = roundMoney((bag[cur] || 0) + (Number(amount) || 0));
};

// Resuelve el origen de toma de un vehículo: prioriza car.tradeInOrigin y, para datos históricos previos,
// consulta si alguna venta activa lo tiene referenciado en tradeIns.linkedStockCarId.
export async function resolveOriginForCar(car) {
    if (!car) return null;
    if (car.tradeInOrigin?.saleId) {
        return {
            saleId: car.tradeInOrigin.saleId,
            value: car.tradeInOrigin.value,
            currency: car.tradeInOrigin.currency
        };
    }
    const legacySale = await Sale.findOne({
        'tradeIns.linkedStockCarId': car._id,
        status: { $ne: 'cancelada' }
    }).select('_id saleCurrency tradeIns').lean();
    if (!legacySale) return null;
    const matchedTradeIn = (legacySale.tradeIns || []).find(
        (t) => t.linkedStockCarId && String(t.linkedStockCarId) === String(car._id)
    );
    return {
        saleId: legacySale._id,
        value: matchedTradeIn?.estimatedValue ?? car.purchasePrice,
        currency: matchedTradeIn?.currency || legacySale.saleCurrency || carCurrency(car.purchaseCurrency)
    };
}

// Sube por la cadena: vehículo -> venta de origen -> vehículo vendido en esa venta -> ...
export async function getAncestorCarIds(carId) {
    const ancestors = [];
    const seen = new Set([String(carId)]);
    let current = await Car.findById(carId).select('tradeInOrigin purchasePrice purchaseCurrency').lean();
    let origin = await resolveOriginForCar(current);
    for (let depth = 0; origin?.saleId && depth < MAX_DEPTH; depth++) {
        const originSale = await Sale.findById(origin.saleId).select('vehicleId').lean();
        const parentId = originSale?.vehicleId ? String(originSale.vehicleId) : null;
        if (!parentId || seen.has(parentId)) break;
        seen.add(parentId);
        ancestors.push(parentId);
        current = await Car.findById(parentId).select('tradeInOrigin purchasePrice purchaseCurrency').lean();
        origin = await resolveOriginForCar(current);
    }
    return ancestors;
}

// Valida un vínculo vehículo <- venta de origen. Devuelve { ok, code, message }.
export async function validateTradeInLink({ carId, saleId }) {
    const car = await Car.findById(carId).select('tradeInOrigin purchasePrice purchaseCurrency').lean();
    if (!car) return { ok: false, code: 'CAR_NOT_FOUND', message: 'Vehículo no encontrado.' };
    const existingOrigin = await resolveOriginForCar(car);
    if (existingOrigin?.saleId) {
        return { ok: false, code: 'ALREADY_LINKED', message: 'Este vehículo ya está vinculado a una venta de origen. Desvinculalo antes de cambiarlo.' };
    }
    const sale = await Sale.findById(saleId).select('vehicleId status').lean();
    if (!sale) return { ok: false, code: 'SALE_NOT_FOUND', message: 'Venta de origen no encontrada.' };
    if (sale.status === 'cancelada') return { ok: false, code: 'SALE_CANCELLED', message: 'La venta de origen está anulada.' };
    if (!sale.vehicleId) return { ok: false, code: 'SALE_WITHOUT_VEHICLE', message: 'La venta de origen no tiene vehículo vinculado.' };
    if (String(sale.vehicleId) === String(carId)) {
        return { ok: false, code: 'CIRCULAR', message: 'Un vehículo no puede haber sido recibido en la venta de sí mismo.' };
    }
    const ancestorsOfSaleVehicle = await getAncestorCarIds(sale.vehicleId);
    if (ancestorsOfSaleVehicle.includes(String(carId))) {
        return { ok: false, code: 'CIRCULAR', message: 'El vínculo crearía una relación circular en la cadena de permutas.' };
    }
    return { ok: true };
}

async function loadSaleFinancials(sale) {
    const [txs, installments] = await Promise.all([
        Transaction.find({ saleId: sale._id, type: 'Ingreso', status: 'activo' }).select('amount currency').lean(),
        Installment.find({ saleId: sale._id, status: { $ne: 'anulada' } }).select('amount paidAmount currency status').lean()
    ]);
    const cashCollected = {};
    if (sale.depositAppliedAmount > 0 && sale.depositAppliedCurrency) {
        addTo(cashCollected, sale.depositAppliedCurrency, sale.depositAppliedAmount);
    }
    for (const t of txs) addTo(cashCollected, t.currency, t.amount);
    const receivable = {};
    for (const i of installments) {
        if (['pagada', 'pagada_manual'].includes(i.status)) continue;
        const pending = (Number(i.amount) || 0) - (Number(i.paidAmount) || 0);
        if (pending > 0) addTo(receivable, i.currency, pending);
    }
    return { cashCollected, receivable };
}

function costBasis(car, resolvedOrigin = null) {
    const resolved = resolveVehicleAcquisitionCost(car, resolvedOrigin);
    return {
        amount: resolved.hasCost ? resolved.amount : null,
        hasCost: resolved.hasCost,
        currency: resolved.currency || carCurrency(car?.purchaseCurrency || car?.currency),
        source: resolved.source || 'compra',
        mismatch: resolved.mismatch
    };
}

// Calcula un nodo (vehículo + su venta, si la hay)
async function buildNode(car, role, rate = null) {
    const resolvedOrigin = await resolveOriginForCar(car);
    const cost = costBasis(car, resolvedOrigin);
    const carExpenses = {};
    for (const e of car.expenses || []) addTo(carExpenses, e.currency || cost.currency, e.amount);

    const sales = await Sale.find({ vehicleId: car._id, status: { $ne: 'cancelada' } }).sort({ saleDate: -1 }).lean();
    const sale = sales[0] || null;
    const investorPct = Number(
        (car.investor?.percentage > 0 ? car.investor.percentage : 0) ||
        (car.jointOwnership?.hasPartner && car.jointOwnership?.partnerPercentage > 0 ? car.jointOwnership.partnerPercentage : 0) ||
        0
    );
    const agencySharePct = Math.max(0, 100 - investorPct);

    const node = {
        carId: String(car._id),
        label: car.name,
        plate: car.plateOrVin || null,
        role,
        originSaleId: resolvedOrigin?.saleId ? String(resolvedOrigin.saleId) : null,
        cost,
        carExpenses,
        investorPercentage: investorPct,
        agencySharePercentage: agencySharePct,
        multipleActiveSales: sales.length > 1,
        sale: null,
        concretized: false,
        calculable: cost.hasCost,
        missingReasons: cost.hasCost ? [] : ['Falta registrar el costo de compra/toma del vehículo vinculado.'],
        profitBeforeCommission: null,
        netProfit: null,
        agencyNetProfit: null,
        comparable: cost.hasCost,
        profitBreakdown: null,
        inStock: null
    };

    if (!sale) {
        const asking = Number(car.price) || 0;
        const askingCurrency = carCurrency(car.currency);
        const sameCur = cost.hasCost && askingCurrency === cost.currency;
        node.inStock = {
            cost: cost.hasCost ? cost.amount : null,
            costMissing: !cost.hasCost,
            costCurrency: cost.currency,
            expenses: carExpenses,
            askingPrice: asking,
            askingCurrency,
            // Margen ESTIMADO (no es ganancia concretada; nunca asume costo 0 si falta el costo)
            estimatedMargin: sameCur && asking > 0
                ? roundMoney(asking - cost.amount - (carExpenses[cost.currency] || 0))
                : null
        };
        return node;
    }

    const { cashCollected, receivable } = await loadSaleFinancials(sale);
    const saleExpenses = {};
    for (const e of sale.saleExpenses || []) addTo(saleExpenses, e.currency || sale.saleCurrency, e.amount);

    const isPercentComm = sale.commissionSettings?.mode === 'percent' &&
        sale.commissionSettings?.percent !== undefined &&
        sale.commissionSettings?.percent !== null &&
        String(sale.commissionSettings.percent).trim() !== '';
    const commissionAmount = isPercentComm
        ? roundMoney(((Number(sale.salePrice) || 0) * Number(sale.commissionSettings.percent)) / 100)
        : (Number(sale.commissionSettings?.extraAmount) || 0);
    const commissionCurrency = isPercentComm
        ? sale.saleCurrency
        : (commissionAmount > 0 ? (sale.commissionSettings?.extraCurrency || sale.saleCurrency) : sale.saleCurrency);

    const tradeInValueReceived = {};
    for (const t of sale.tradeIns || []) addTo(tradeInValueReceived, t.currency || sale.saleCurrency, t.estimatedValue);

    node.concretized = CONCRETIZED_SALE_STATUSES.includes(sale.status);
    node.sale = {
        saleId: String(sale._id),
        status: sale.status,
        date: sale.saleDate,
        price: Number(sale.salePrice) || 0,
        currency: sale.saleCurrency,
        commission: {
            amount: commissionAmount,
            currency: commissionCurrency,
            mode: isPercentComm ? 'percent' : 'fixed',
            percent: isPercentComm ? Number(sale.commissionSettings.percent) : null
        },
        saleExpenses,
        tradeInValueReceived, // valor tomado: NO es dinero cobrado
        cashCollected,
        receivable
    };

    const baseProfit = computeSaleProfit({
        salePrice: sale.salePrice,
        saleCurrency: sale.saleCurrency,
        vehicle: car,
        legacyTradeInOrigin: resolvedOrigin,
        vehicleExpenses: car.expenses || [],
        saleExpenses: sale.saleExpenses || [],
        commissionSettings: sale.commissionSettings,
        commissionAmount,
        commissionCurrency,
        exchangeRate: Number(sale.exchangeRate) > 0 ? Number(sale.exchangeRate) : null,
        investorPercentage: investorPct
    });

    node.calculable = baseProfit.calculable;
    node.comparable = baseProfit.calculable;
    node.missingReasons = baseProfit.missingReasons;
    node.profitBreakdown = baseProfit;

    if (node.concretized && baseProfit.calculable) {
        node.profitBeforeCommission = baseProfit.profitBeforeCommission;
        node.netProfit = baseProfit.netProfit;
        node.agencyNetProfit = baseProfit.agencyNetProfit;
    } else if (node.concretized && !baseProfit.calculable && Number(rate) > 0) {
        const convertedProfit = computeSaleProfit({
            salePrice: sale.salePrice,
            saleCurrency: sale.saleCurrency,
            vehicle: car,
            legacyTradeInOrigin: resolvedOrigin,
            vehicleExpenses: car.expenses || [],
            saleExpenses: sale.saleExpenses || [],
            commissionSettings: sale.commissionSettings,
            commissionAmount,
            commissionCurrency,
            exchangeRate: Number(rate),
            investorPercentage: investorPct
        });
        if (convertedProfit.calculable) {
            node.convertedWithRate = {
                exchangeRate: Number(rate),
                currency: sale.saleCurrency,
                profitBeforeCommission: convertedProfit.profitBeforeCommission,
                netProfit: convertedProfit.netProfit,
                agencyNetProfit: convertedProfit.agencyNetProfit,
                criterion: `Calculado en ${sale.saleCurrency} aplicando cotización registrada 1 USD = $${Number(rate).toLocaleString('es-AR')} ARS`
            };
            node.profitBreakdown = convertedProfit;
        }
    }
    return node;
}

// Cadena completa a partir de cualquier vehículo o venta de la cadena.
export async function buildTradeInChain({ carId, exchangeRate = null, canViewCostAndProfit = true }) {
    const ancestors = await getAncestorCarIds(carId);
    const rootId = ancestors.length ? ancestors[ancestors.length - 1] : String(carId);
    const validRate = Number(exchangeRate) > 0 ? Number(exchangeRate) : null;

    const nodes = [];
    const seen = new Set();
    const queue = [{ id: rootId, role: 'origin' }];
    while (queue.length && nodes.length < 200) {
        const { id, role } = queue.shift();
        if (seen.has(id)) continue; // protege de datos circulares heredados
        seen.add(id);
        const car = await Car.findById(id).lean();
        if (!car) continue;
        const node = await buildNode(car, role, validRate);
        nodes.push(node);
        if (node.sale) {
            const sale = await Sale.findById(node.sale.saleId).select('tradeIns').lean();
            const childIds = new Set();
            for (const t of sale?.tradeIns || []) if (t.linkedStockCarId) childIds.add(String(t.linkedStockCarId));
            const linkedFromCar = await Car.find({ 'tradeInOrigin.saleId': node.sale.saleId }).select('_id').lean();
            for (const c of linkedFromCar) childIds.add(String(c._id));
            for (const childId of childIds) queue.push({ id: childId, role: 'received' });
        }
    }

    const totals = {
        netProfitByCurrency: {},       // ventas concretadas, ganancia de la operación (devengada)
        agencyNetProfitByCurrency: {}, // parte de la agencia (descontando socios/inversores)
        cashCollectedByCurrency: {},   // dinero efectivamente cobrado
        receivableByCurrency: {},      // saldos por cobrar (cuotas pendientes)
        stockCostByCurrency: {},       // vehículos aún en stock (costo)
        estimatedMarginByCurrency: {}, // estimado, NO concretado
        nonComparableSales: 0,
        referenceConverted: null
    };
    for (const n of nodes) {
        if (n.sale) {
            for (const [c, v] of Object.entries(n.sale.cashCollected)) addTo(totals.cashCollectedByCurrency, c, v);
            for (const [c, v] of Object.entries(n.sale.receivable)) addTo(totals.receivableByCurrency, c, v);
            if (canViewCostAndProfit) {
                if (n.concretized && n.netProfit !== null) {
                    addTo(totals.netProfitByCurrency, n.sale.currency, n.netProfit);
                    addTo(totals.agencyNetProfitByCurrency, n.sale.currency, n.agencyNetProfit);
                } else if (n.concretized && n.convertedWithRate) {
                    addTo(totals.netProfitByCurrency, n.convertedWithRate.currency, n.convertedWithRate.netProfit);
                    addTo(totals.agencyNetProfitByCurrency, n.convertedWithRate.currency, n.convertedWithRate.agencyNetProfit);
                } else if (n.concretized && !n.comparable) {
                    totals.nonComparableSales += 1;
                }
            }
        } else if (n.inStock && canViewCostAndProfit) {
            if (n.inStock.cost !== null) {
                addTo(totals.stockCostByCurrency, n.inStock.costCurrency, n.inStock.cost + (n.inStock.expenses[n.inStock.costCurrency] || 0));
            }
            if (n.inStock.estimatedMargin !== null) addTo(totals.estimatedMarginByCurrency, n.inStock.costCurrency, n.inStock.estimatedMargin);
        }
    }

    if (canViewCostAndProfit && validRate) {
        const arsNet = (totals.netProfitByCurrency.ARS || 0) + ((totals.netProfitByCurrency.USD || 0) * validRate);
        const usdNet = (totals.netProfitByCurrency.USD || 0) + ((totals.netProfitByCurrency.ARS || 0) / validRate);
        totals.referenceConverted = {
            exchangeRate: validRate,
            equivalentInARS: roundMoney(arsNet),
            equivalentInUSD: roundMoney(usdNet),
            criterion: `Equivalencia referencial usando cotización registrada 1 USD = $${validRate.toLocaleString('es-AR')} ARS. Los saldos originales por moneda se conservan sin mezclar.`
        };
    }

    const sanitizedNodes = canViewCostAndProfit
        ? nodes
        : nodes.map((n) => ({
            ...n,
            cost: { amount: null, hasCost: false, currency: n.cost?.currency || 'ARS', source: n.cost?.source || 'compra', restricted: true },
            carExpenses: {},
            profitBeforeCommission: null,
            netProfit: null,
            agencyNetProfit: null,
            profitBreakdown: null,
            convertedWithRate: null,
            inStock: n.inStock
                ? {
                    ...n.inStock,
                    cost: null,
                    expenses: {},
                    estimatedMargin: null,
                    restricted: true
                }
                : null
        }));

    return {
        rootCarId: rootId,
        requestedCarId: String(carId),
        restrictedCostAndProfit: !canViewCostAndProfit,
        nodes: sanitizedNodes,
        totals,
        notes: {
            currencyCriterion: validRate
                ? `Las monedas se informan por separado en su moneda original. Se muestra equivalencia referencial con cotización registrada (1 USD = $${validRate.toLocaleString('es-AR')} ARS).`
                : 'Las monedas no se suman entre sí: cada total se informa en su moneda de origen, sin conversión.',
            cashCriterion: 'El valor de un vehículo recibido en parte de pago no es dinero cobrado. El dinero cobrado surge solo de movimientos registrados.',
            profitCriterion: 'La ganancia acumulada incluye solo ventas concretadas. La ganancia de la operación no equivale a caja cobrada si hay cuotas pendientes.'
        }
    };
}


