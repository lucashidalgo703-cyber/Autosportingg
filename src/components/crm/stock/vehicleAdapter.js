export const mapRealCarToCRM = (car) => {
    // Calculamos el costo total sumando el precio de compra original + gastos en la MISMA moneda.
    // Asumiremos que los gastos se guardaron en la moneda principal.
    const gastosTotales = (car.expenses || []).reduce((acc, gasto) => acc + gasto.amount, 0);
    const costoTotal = (car.purchasePrice || 0) + gastosTotales;
    
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
        version: car.description || 'N/A', // Usamos description completa para CRM o truncado? El CRM lo usa para mostrar
        año: car.year || new Date().getFullYear(),
        kilometraje: car.km || 0,
        combustible: car.fuel || 'Nafta',
        condicion: car.condition || 'Usado',
        color: car.color || 'No definido',
        dominio: car.plateOrVin || 'S/D',
        origen: (car.investor && car.investor.percentage > 0) ? 'compartido' : (car.agencyOwned ? 'propio' : (car.consignedBy ? 'consignación' : 'tercero')),
        investor: car.investor || null,
        moneda: car.currency === 'U$S' || car.currency === 'USD' ? 'USD' : 'ARS',
        monedaCompra: ((car.purchaseCurrency || car.currency) === 'USD' || (car.purchaseCurrency || car.currency) === 'U$S') && car.purchasePrice > 200000 ? 'ARS' : (car.purchaseCurrency || (car.currency === 'U$S' || car.currency === 'USD' ? 'USD' : 'ARS')),
        precioCompra: car.purchasePrice || 0,
        gastos: gastosTotales,
        expensesList: car.expenses || [],
        costoTotal,
        precioPublicado: car.price || 0,
        precioMinimo: car.purchasePrice ? car.purchasePrice * 1.05 : 0, // Fallback demo margin
        margenEstimado,
        margenPorcentual,
        fechaIngreso: car.createdAt || new Date().toISOString(),
        estado: car.status ? car.status.toLowerCase() : 'disponible',
        observaciones: car.notes || 'Sin observaciones.',
        diasEnStock,
        alertaRotacion,
        visibleEnWeb: car.visibleEnWeb !== false, // Default true
        fotos: car.images || [],
        documentation: car.documentation || {},
        auditLog: car.auditLog || [], // Nuevo campo de auditoría
        _original: car // Mantenemos el original para enviar al PATCH sin perder campos
    };
};
