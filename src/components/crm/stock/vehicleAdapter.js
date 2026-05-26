export const mapRealCarToCRM = (car) => {
    const costoTotal = (car.purchasePrice || 0) + 0; // gastos: 0 by default for now
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
        version: car.description?.slice(0,20) || '1.0', // Fallback as version isn't explicit
        año: car.year || new Date().getFullYear(),
        kilometraje: car.km || 0,
        color: car.color || 'No definido',
        dominio: car.plateOrVin || 'S/D',
        origen: car.agencyOwned ? 'propio' : (car.consignedBy ? 'consignación' : 'tercero'),
        moneda: car.currency === 'U$S' || car.currency === 'USD' ? 'USD' : 'ARS',
        precioCompra: car.purchasePrice || 0,
        gastos: 0,
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
        visibleEnWeb: true, // Default to true if in catalog
        fotos: car.images || []
    };
};
