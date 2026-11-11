import { getCarPurchasePaymentSummary } from '../../../utils/carPurchasePayment';
import { resolveVehicleAcquisitionCost } from '../../../utils/saleCommercial';
import { stockDays } from '../../../utils/stockFilters.js';
import { getVehicleFinancialDisplay } from '../../../utils/vehicleFinancialDisplay.js';
import { stockIsAgencyOwned } from '../../../utils/stockOwnership.js';

export const mapRealCarToCRM = (car) => {
    const financialDisplay = getVehicleFinancialDisplay(car);
    const acq = resolveVehicleAcquisitionCost(car);
    const resolvedCost = acq.hasCost && acq.amount !== null && acq.amount > 0 
        ? acq.amount 
        : (car.purchasePrice || car.tradeInOrigin?.value || 0);
    const resolvedCurrency = acq.currency || car.purchaseCurrency || car.tradeInOrigin?.currency || (car.currency === 'U$S' || car.currency === 'USD' ? 'USD' : 'ARS');

    // Calculamos el costo total sumando el costo base de adquisición (compra o toma) + gastos en la MISMA moneda.
    const gastosTotales = financialDisplay.purchase.currency ? financialDisplay.expenses[financialDisplay.purchase.currency] : null;
    const costoTotal = financialDisplay.margin.calculable ? financialDisplay.costs[financialDisplay.sale.currency] : null;
    
    const margenEstimado = financialDisplay.margin.amount;
    const margenPorcentual = financialDisplay.margin.percent;
    
    const diasEnStock = stockDays(car);
    
    let alertaRotacion = "normal";
    if (diasEnStock >= 90) alertaRotacion = "+90 días";
    else if (diasEnStock >= 60) alertaRotacion = "+60 días";

    return {
        id: car._id,
        marca: car.brand || 'No definido',
        modelo: car.name || 'No definido',
        version: car.version || car.description || 'N/A',
        transmission: car.transmission || '',
        bodyType: car.bodyType || '',
        doors: car.doors ?? null,
        engine: car.engine || '',
        technicalVersion: car.version || '',
        año: car.year || new Date().getFullYear(),
        kilometraje: car.km || 0,
        combustible: car.fuel || 'Nafta',
        condicion: car.condition || 'Usado',
        color: car.color || 'No definido',
        dominio: car.plateOrVin || 'S/D',
        origen: (car.investor && car.investor.percentage > 0) ? 'compartido' : (stockIsAgencyOwned(car) ? 'propio' : (car.consignedBy || car.ownerName || car.tradeInOrigin?.consigned ? 'consignación' : 'tercero')),
        investor: car.investor || null,
        moneda: car.currency === 'U$S' || car.currency === 'USD' ? 'USD' : 'ARS',
        monedaCompra: financialDisplay.purchase.currency || resolvedCurrency || null,
        precioCompra: resolvedCost,
        acquisitionSource: acq.source || (car.tradeInOrigin?.saleId ? 'valor_de_toma' : 'compra'),
        gastos: gastosTotales,
        expensesList: car.expenses || [],
        costoTotal,
        precioPublicado: car.price || 0,
        precioMinimo: null,
        margenEstimado,
        margenPorcentual,
        fechaIngreso: car.createdAt || null,
        estado: car.status ? car.status.toLowerCase() : 'disponible',
        observaciones: car.notes || 'Sin observaciones.',
        diasEnStock,
        alertaRotacion,
        visibleEnWeb: car.visibleEnWeb !== false,
        fotos: (Array.isArray(car.images) && car.images.length > 0) ? car.images : (car.coverImage ? [car.coverImage] : []),
        documentation: car.documentation || {},
        documentationFiles: car.documentationFiles || {},
        infoAuto: car.infoAuto || null,
        tradeInOrigin: car.tradeInOrigin || (acq.source === 'valor_de_toma' && acq.originSaleId ? { saleId: acq.originSaleId, value: resolvedCost, currency: resolvedCurrency } : null),
        agencyOwned: stockIsAgencyOwned(car),
        purchasePaymentState: car.purchasePaymentState || null,
        purchasePaymentSummary: getCarPurchasePaymentSummary({ ...car, purchasePrice: resolvedCost, purchaseCurrency: resolvedCurrency }),
        auditLog: car.auditLog || [],
        financialDisplay,
        _original: car
    };
};
