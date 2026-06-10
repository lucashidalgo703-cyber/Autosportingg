export function calculateDashboardMetrics(cars = []) {
    const metrics = {
        capitalPublicado: { ARS: 0, USD: 0, NONE: 0 },
        capitalCosto: { ARS: 0, USD: 0, NONE: 0 },
        gastosTotales: { ARS: 0, USD: 0, NONE: 0 },
        margenEstimado: { ARS: 0, USD: 0 },
        unidadesSinMoneda: 0,
        
        counts: {
            total: cars.length,
            disponibles: 0,
            reservados: 0,
            vendidos: 0,
            pausados: 0,
            visibles: 0,
            ocultos: 0
        },

        alertas: {
            alerta60: [],
            alerta90: []
        },

        topInmovilizado: [],
        topAntiguos: [],
        auditGlobal: []
    };

    const activeStatuses = ['disponible', 'reservado', 'pausado'];
    let allAudits = [];

    cars.forEach(car => {
        // --- 1. Counts ---
        const status = (car.status || 'disponible').toLowerCase();
        if (status === 'disponible') metrics.counts.disponibles++;
        if (status === 'reservado') metrics.counts.reservados++;
        if (status === 'vendido') metrics.counts.vendidos++;
        if (status === 'pausado') metrics.counts.pausados++;

        if (car.visibleEnWeb !== false) metrics.counts.visibles++;
        else metrics.counts.ocultos++;

        // --- 2. Active Capital ---
        const isActive = activeStatuses.includes(status);
        if (isActive) {
            // Price
            if (car.price !== undefined && car.price !== null && car.price > 0) {
                if (car.currency === 'USD') metrics.capitalPublicado.USD += Number(car.price);
                else if (car.currency === 'ARS') metrics.capitalPublicado.ARS += Number(car.price);
                else {
                    metrics.capitalPublicado.NONE += Number(car.price);
                    metrics.unidadesSinMoneda++;
                }
            }

            // Purchase Price
            if (car.purchasePrice !== undefined && car.purchasePrice !== null && car.purchasePrice > 0) {
                if (car.purchaseCurrency === 'USD') metrics.capitalCosto.USD += Number(car.purchasePrice);
                else if (car.purchaseCurrency === 'ARS') metrics.capitalCosto.ARS += Number(car.purchasePrice);
                else metrics.capitalCosto.NONE += Number(car.purchasePrice);
            }
        }

        // --- 3. Expenses (All cars or active?) Usually expenses are costs, active only for margin?
        // Let's count expenses for active cars to calculate active margin.
        if (isActive && car.expenses && Array.isArray(car.expenses)) {
            car.expenses.forEach(exp => {
                if (exp.amount) {
                    if (exp.currency === 'USD') metrics.gastosTotales.USD += Number(exp.amount);
                    else if (exp.currency === 'ARS') metrics.gastosTotales.ARS += Number(exp.amount);
                    else metrics.gastosTotales.NONE += Number(exp.amount);
                }
            });
        }

        // --- 4. Rotation / Days in Stock ---
        let daysInStock = null;
        let baseDateStr = car.fechaIngresoStock || car.createdAt;
        if (baseDateStr) {
            const baseDate = new Date(baseDateStr);
            if (!isNaN(baseDate.getTime())) {
                const diffTime = Math.abs(Date.now() - baseDate.getTime());
                daysInStock = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            }
        }

        const carData = {
            id: car._id,
            brand: car.brand,
            name: car.name,
            price: car.price,
            currency: car.currency,
            purchasePrice: car.purchasePrice,
            purchaseCurrency: car.purchaseCurrency,
            daysInStock,
            status,
            coverImage: car.coverImage
        };

        if (isActive && daysInStock !== null) {
            if (daysInStock >= 90) metrics.alertas.alerta90.push(carData);
            else if (daysInStock >= 60) metrics.alertas.alerta60.push(carData);
            
            metrics.topAntiguos.push(carData);
        }

        if (isActive && car.purchasePrice > 0) {
            metrics.topInmovilizado.push(carData);
        }

        // --- 5. Audit Log Global ---
        if (car.auditLog && Array.isArray(car.auditLog)) {
            car.auditLog.forEach(log => {
                allAudits.push({
                    ...log,
                    carId: car._id,
                    carTitle: `${car.brand} ${car.name}`
                });
            });
        }
    });

    // --- Margins ---
    metrics.margenEstimado.ARS = metrics.capitalPublicado.ARS - metrics.capitalCosto.ARS - metrics.gastosTotales.ARS;
    metrics.margenEstimado.USD = metrics.capitalPublicado.USD - metrics.capitalCosto.USD - metrics.gastosTotales.USD;

    // --- Sorting ---
    metrics.alertas.alerta90.sort((a, b) => b.daysInStock - a.daysInStock);
    metrics.alertas.alerta60.sort((a, b) => b.daysInStock - a.daysInStock);
    
    metrics.topAntiguos.sort((a, b) => b.daysInStock - a.daysInStock);
    metrics.topAntiguos = metrics.topAntiguos.slice(0, 5);

    metrics.topInmovilizado.sort((a, b) => {
        // Convert vaguely to compare? No, just sort by value if same currency. Let's prioritize USD.
        const aVal = a.purchaseCurrency === 'USD' ? a.purchasePrice * 1000 : a.purchasePrice;
        const bVal = b.purchaseCurrency === 'USD' ? b.purchasePrice * 1000 : b.purchasePrice;
        return bVal - aVal;
    });
    metrics.topInmovilizado = metrics.topInmovilizado.slice(0, 5);

    metrics.auditGlobal = allAudits
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 15);

    // --- Real Sales Data Overrides ---
    // If sales data is provided, use it to compute REAL monthly profit and sales counts
    if (arguments.length > 1 && arguments[1] && Array.isArray(arguments[1])) {
        const sales = arguments[1];
        metrics.counts.vendidos = 0;
        let realMarginARS = 0;
        let realMarginUSD = 0;
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        sales.forEach(sale => {
            const saleDate = new Date(sale.saleDate || sale.createdAt);
            // Only count sales from the current month
            if (saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear) {
                if (['confirmada', 'pendiente_entrega', 'entregada'].includes(sale.status)) {
                    metrics.counts.vendidos++;
                    
                    // Match with car to get purchase price
                    const carIdStr = typeof sale.vehicleId === 'object' ? sale.vehicleId?._id : sale.vehicleId;
                    const car = cars.find(c => c._id === carIdStr);
                    
                    if (car && car.purchasePrice) {
                        const cost = Number(car.purchasePrice);
                        const price = Number(sale.salePrice);
                        
                        // Simple exact currency margin
                        if (sale.saleCurrency === 'USD' && car.purchaseCurrency === 'USD') {
                            realMarginUSD += (price - cost);
                        } else if (sale.saleCurrency === 'ARS' && car.purchaseCurrency === 'ARS') {
                            realMarginARS += (price - cost);
                        }
                    }
                }
            }
        });
        
        metrics.margenEstimado.ARS = realMarginARS;
        metrics.margenEstimado.USD = realMarginUSD;
    }

    return metrics;
}
