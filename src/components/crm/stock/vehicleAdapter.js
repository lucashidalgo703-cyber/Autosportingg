import { getCarPurchasePaymentSummary } from '../../../utils/carPurchasePayment';
import { resolveVehicleAcquisitionCost } from '../../../utils/saleCommercial';
import { stockValuation, stockStatus } from '../../../utils/inventoryStock';

export const mapRealCarToCRM = (car) => {
    const acq = resolveVehicleAcquisitionCost(car);
    const valuation = stockValuation(car);
    const costIssues = (valuation.missingFields || []).filter(issue => ['cost', 'ownership'].includes(issue.scope));
    const resolvedCost = valuation.purchase || 0;
    const resolvedCurrency = valuation.purchaseCurrency;
    const gastosTotales = valuation.expenses[resolvedCurrency];
    const costoTotal = valuation.cost[resolvedCurrency];
    const hasMixedCurrencyCost = valuation.cost[resolvedCurrency === 'ARS' ? 'USD' : 'ARS'] !== 0;
    const comparable = valuation.hasCost && valuation.hasPrice && !costIssues.length && !hasMixedCurrencyCost && resolvedCurrency === valuation.askingCurrency;
    const margenEstimado = comparable ? valuation.asking - costoTotal : null;
    const margenPorcentual = comparable && costoTotal > 0 ? ((margenEstimado / costoTotal) * 100).toFixed(1) : null;

    const ingresoDate = new Date(car.createdAt || Date.now());
    const now = new Date();
    const diffTime = Math.abs(now - ingresoDate);
    const diasEnStock = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let alertaRotacion = "normal";
    if (diasEnStock >= 90) alertaRotacion = "+90 días";
    else if (diasEnStock >= 60) alertaRotacion = "+60 días";

    return {
        id: car._id,
        marca: car.brand || 'No definido',
        modelo: car.name || 'No definido',
        version: car.infoAuto?.versionName || car.version || car.description || 'Sin versión informada',
        año: car.year || null,
        kilometraje: car.km || 0,
        combustible: car.fuel || 'Nafta',
        condicion: car.condition || 'Usado',
        color: car.color || 'No definido',
        dominio: car.plateOrVin || 'S/D',
        origen: valuation.type === 'consignacion' ? 'consignación' : valuation.type === 'inversor' ? 'compartido' : valuation.type,
        ownership: valuation,
        financialAccess: car.financialAccess !== false,
        hasAcquisitionCost: valuation.hasCost,
        valuationIssues: valuation.missingFields || [],
        costComplete: costIssues.length === 0,
        costByCurrency: valuation.cost,
        ownCostByCurrency: valuation.ownCost,
        expensesByCurrency: valuation.expenses,
        investor: car.investor || null,
        moneda: valuation.askingCurrency,
        monedaCompra: resolvedCurrency,
        precioCompra: resolvedCost,
        acquisitionSource: acq.source || (car.tradeInOrigin?.saleId ? 'valor_de_toma' : 'compra'),
        gastos: gastosTotales,
        expensesList: car.expenses || [],
        costoTotal,
        precioPublicado: valuation.asking ?? null,
        precioMinimo: resolvedCost ? resolvedCost * 1.05 : 0,
        margenEstimado,
        margenPorcentual,
        fechaIngreso: car.createdAt || new Date().toISOString(),
        estado: stockStatus(car),
        observaciones: car.notes || 'Sin observaciones.',
        diasEnStock,
        alertaRotacion,
        visibleEnWeb: car.visibleEnWeb !== false,
        fotos: (Array.isArray(car.images) && car.images.length > 0) ? car.images : (car.coverImage ? [car.coverImage] : []),
        hasManuals: car.hasManuals || 'No',
        hasDuplicateKeys: car.hasDuplicateKeys || 'No',
        hasCricket: car.hasCricket || 'No',
        hasWheelWrench: car.hasWheelWrench || 'No',
        hasOfficialServices: car.hasOfficialServices || 'No',
        documentation: car.documentation || {},
        documentationFiles: car.documentationFiles || {},
        infoAuto: car.infoAuto || null,
        tradeInOrigin: car.tradeInOrigin || (acq.source === 'valor_de_toma' && acq.originSaleId ? { saleId: acq.originSaleId, value: resolvedCost, currency: resolvedCurrency } : null),
        agencyOwned: Boolean(car.agencyOwned),
        purchasePaymentState: car.purchasePaymentState || null,
        purchasePaymentSummary: getCarPurchasePaymentSummary({ ...car, purchasePrice: resolvedCost, purchaseCurrency: resolvedCurrency }),
        auditLog: car.auditLog || [],
        _original: car
    };
};
