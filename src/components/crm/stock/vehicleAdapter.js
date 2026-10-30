import { getCarPurchasePaymentSummary } from '../../../utils/carPurchasePayment';
import { resolveVehicleAcquisitionCost } from '../../../utils/saleCommercial';

export const mapRealCarToCRM = (car) => {
    const acq = resolveVehicleAcquisitionCost(car);
    const resolvedCost = acq.hasCost && acq.amount !== null && acq.amount > 0 
        ? acq.amount 
        : (car.purchasePrice || car.tradeInOrigin?.value || 0);
    const resolvedCurrency = acq.currency || car.purchaseCurrency || car.tradeInOrigin?.currency || (car.currency === 'U$S' || car.currency === 'USD' ? 'USD' : 'ARS');

    // Calculamos el costo total sumando el costo base de adquisición (compra o toma) + gastos en la MISMA moneda.
    const gastosTotales = (car.expenses || []).reduce((acc, gasto) => acc + gasto.amount, 0);
    const costoTotal = resolvedCost + gastosTotales;
    
    const margenEstimado = (car.price || 0) - costoTotal;
    const margenPorcentual = costoTotal > 0 ? ((margenEstimado / costoTotal) * 100).toFixed(1) : 0;
    
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
        version: car.description || 'N/A',
        año: car.year || new Date().getFullYear(),
        kilometraje: car.km || 0,
        combustible: car.fuel || 'Nafta',
        condicion: car.condition || 'Usado',
        color: car.color || 'No definido',
        dominio: car.plateOrVin || 'S/D',
        origen: (car.investor && car.investor.percentage > 0) ? 'compartido' : (car.agencyOwned ? 'propio' : (car.consignedBy ? 'consignación' : 'tercero')),
        investor: car.investor || null,
        moneda: car.currency === 'U$S' || car.currency === 'USD' ? 'USD' : 'ARS',
        monedaCompra: ((resolvedCurrency || car.currency) === 'USD' || (resolvedCurrency || car.currency) === 'U$S') && resolvedCost > 200000 ? 'ARS' : (resolvedCurrency || 'ARS'),
        precioCompra: resolvedCost,
        acquisitionSource: acq.source || (car.tradeInOrigin?.saleId ? 'valor_de_toma' : 'compra'),
        gastos: gastosTotales,
        expensesList: car.expenses || [],
        costoTotal,
        precioPublicado: car.price || 0,
        precioMinimo: resolvedCost ? resolvedCost * 1.05 : 0,
        margenEstimado,
        margenPorcentual,
        fechaIngreso: car.createdAt || new Date().toISOString(),
        estado: car.status ? car.status.toLowerCase() : 'disponible',
        observaciones: car.notes || 'Sin observaciones.',
        diasEnStock,
        alertaRotacion,
        visibleEnWeb: car.visibleEnWeb !== false,
        fotos: (Array.isArray(car.images) && car.images.length > 0) ? car.images : (car.coverImage ? [car.coverImage] : []),
        documentation: car.documentation || {},
        documentationFiles: car.documentationFiles || {},
        tradeInOrigin: car.tradeInOrigin || (acq.source === 'valor_de_toma' && acq.originSaleId ? { saleId: acq.originSaleId, value: resolvedCost, currency: resolvedCurrency } : null),
        agencyOwned: Boolean(car.agencyOwned),
        purchasePaymentState: car.purchasePaymentState || null,
        purchasePaymentSummary: getCarPurchasePaymentSummary({ ...car, purchasePrice: resolvedCost, purchaseCurrency: resolvedCurrency }),
        auditLog: car.auditLog || [],
        _original: car
    };
};
