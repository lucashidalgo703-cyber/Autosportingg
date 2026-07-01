export function calculateDashboardMetrics(cars = []) {
    const selectedDate = arguments.length > 2 && arguments[2] ? new Date(arguments[2]) : new Date();
    const targetMonth = selectedDate.getMonth();
    const targetYear = selectedDate.getFullYear();

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

        consignaciones: {
            mes: 0,
            target: 10
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
        const isAgencyOwned = car.agencyOwned !== false;
        if (isActive && isAgencyOwned) {
            // Price
            if (car.price !== undefined && car.price !== null && car.price > 0) {
                const currency = (car.currency === 'U$S' || car.currency === 'USD') ? 'USD' : (car.currency === '$' || car.currency === 'ARS') ? 'ARS' : car.currency;

                if (currency === 'USD') metrics.capitalPublicado.USD += Number(car.price);
                else if (currency === 'ARS') metrics.capitalPublicado.ARS += Number(car.price);
                else {
                    metrics.capitalPublicado.NONE += Number(car.price);
                    metrics.unidadesSinMoneda++;
                }
            }

            // Purchase Price
            if (car.purchasePrice !== undefined && car.purchasePrice !== null && car.purchasePrice > 0) {
                const purchaseCurrency = (car.purchaseCurrency === 'U$S' || car.purchaseCurrency === 'USD') ? 'USD' : (car.purchaseCurrency === '$' || car.purchaseCurrency === 'ARS') ? 'ARS' : car.purchaseCurrency;

                if (purchaseCurrency === 'USD') metrics.capitalCosto.USD += Number(car.purchasePrice);
                else if (purchaseCurrency === 'ARS') metrics.capitalCosto.ARS += Number(car.purchasePrice);
                else metrics.capitalCosto.NONE += Number(car.purchasePrice);
            }
        }

        // --- 3. Expenses (All cars or active?) Usually expenses are costs, active only for margin?
        // Let's count expenses for active cars to calculate active margin.
        if (isActive && isAgencyOwned && car.expenses && Array.isArray(car.expenses)) {
            car.expenses.forEach(exp => {
                if (exp.amount) {
                    if (exp.currency === 'USD') metrics.gastosTotales.USD += Number(exp.amount);
                    else if (exp.currency === 'ARS') metrics.gastosTotales.ARS += Number(exp.amount);
                    else metrics.gastosTotales.NONE += Number(exp.amount);
                }
            });
        }

        // --- 4. Rotation / Days in Stock & Consignaciones ---
        let daysInStock = null;
        let baseDateStr = car.fechaIngresoStock || car.createdAt;
        if (baseDateStr) {
            const baseDate = new Date(baseDateStr);
            if (!isNaN(baseDate.getTime())) {
                const diffTime = Math.abs(Date.now() - baseDate.getTime());
                daysInStock = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                // Consignaciones del mes
                if (car.consignedBy && car.consignedBy !== '') {
                    if (baseDate.getMonth() === targetMonth && baseDate.getFullYear() === targetYear) {
                        metrics.consignaciones.mes++;
                    }
                }
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

        const salesDetails = [];

        sales.forEach(sale => {
            const saleDate = new Date(sale.saleDate || sale.createdAt || new Date());
            
            // Allow all valid sales (ignore only purely cancelled ones for the count)
            const status = (sale.status || '').toLowerCase();
            const isValidStatus = status !== 'cancelada' && status !== 'borrador';

            if (saleDate.getMonth() === targetMonth && saleDate.getFullYear() === targetYear) {
                if (isValidStatus) {
                    metrics.counts.vendidos++;
                    
                    // Si vehicleId es un objeto (populate), usar sus datos directo
                    const isPopulated = sale.vehicleId && typeof sale.vehicleId === 'object';
                    const carIdStr = isPopulated ? sale.vehicleId._id : sale.vehicleId;
                    // Buscar en stock por si necesitamos datos que no vinieron populados
                    const carFromStock = carIdStr ? cars.find(c => String(c._id) === String(carIdStr)) : null;
                    
                    const carData = isPopulated ? sale.vehicleId : carFromStock;
                    
                    let profitUSD = 0;
                    let profitARS = 0;

                    if (carData && carData.purchasePrice) {
                        const cost = Number(carData.purchasePrice);
                        const price = Number(sale.salePrice);
                        
                        // Simple exact currency margin
                        const normalizedSaleCurrency = (sale.saleCurrency === 'U$S' || sale.saleCurrency === 'USD') ? 'USD' : (sale.saleCurrency === '$' || sale.saleCurrency === 'ARS') ? 'ARS' : sale.saleCurrency;
                        const normalizedPurchaseCurrency = (carData.purchaseCurrency === 'U$S' || carData.purchaseCurrency === 'USD') ? 'USD' : (carData.purchaseCurrency === '$' || carData.purchaseCurrency === 'ARS') ? 'ARS' : carData.purchaseCurrency;

                        if (normalizedSaleCurrency === 'USD' && normalizedPurchaseCurrency === 'USD') {
                            profitUSD = price - cost;
                            realMarginUSD += profitUSD;
                        } else if (normalizedSaleCurrency === 'ARS' && normalizedPurchaseCurrency === 'ARS') {
                            profitARS = price - cost;
                            realMarginARS += profitARS;
                        }
                    }

                    // Determinar el nombre a mostrar
                    let displayCarName = 'Vehículo sin especificar';
                    if (carData) {
                        const brand = carData.brand || '';
                        const name = carData.name || '';
                        const year = carData.year ? `(${carData.year})` : '';
                        const fullName = `${brand} ${name} ${year}`.trim();
                        if (fullName) displayCarName = fullName;
                    } else if (sale.vehicleOwnerName) {
                        displayCarName = `Manual: ${sale.vehicleOwnerName}`;
                    } else if (sale.notes) {
                        displayCarName = `Venta s/ Vehículo`;
                    }

                    salesDetails.push({
                        id: sale._id,
                        carName: displayCarName,
                        salePrice: Number(sale.salePrice) || 0,
                        saleCurrency: sale.saleCurrency,
                        purchasePrice: carData ? Number(carData.purchasePrice) || 0 : 0,
                        purchaseCurrency: carData ? carData.purchaseCurrency : null,
                        profitUSD,
                        profitARS,
                        date: saleDate
                    });
                }
            }
        });
        
        metrics.margenEstimado.ARS = realMarginARS;
        metrics.margenEstimado.USD = realMarginUSD;
        metrics.salesDetails = salesDetails;
        
        // --- Transacciones (Cash Flow) ---
        const transactions = arguments.length > 3 && arguments[3] ? arguments[3] : [];
        const installments = arguments.length > 4 && arguments[4] ? arguments[4] : [];

        metrics.finanzas = {
            ingresosUSD: 0, ingresosARS: 0,
            egresosUSD: 0, egresosARS: 0,
            saldos: { USD: 0, ARS: 0 }
        };

        transactions.forEach(t => {
            const tDate = new Date(t.date || t.createdAt);
            if (tDate.getMonth() === targetMonth && tDate.getFullYear() === targetYear) {
                const amount = Number(t.amount) || 0;
                const currency = (t.currency === 'ARS' || t.currency === '$') ? 'ARS' : 'USD';
                
                if (t.type === 'ingreso') {
                    if (currency === 'USD') metrics.finanzas.ingresosUSD += amount;
                    else metrics.finanzas.ingresosARS += amount;
                } else if (t.type === 'egreso') {
                    if (currency === 'USD') metrics.finanzas.egresosUSD += amount;
                    else metrics.finanzas.egresosARS += amount;
                }
            }
        });
        metrics.finanzas.saldos.USD = metrics.finanzas.ingresosUSD - metrics.finanzas.egresosUSD;
        metrics.finanzas.saldos.ARS = metrics.finanzas.ingresosARS - metrics.finanzas.egresosARS;

        // --- Cuotas (Installments) ---
        metrics.cuotas = {
            totalMontoUSD: 0, totalMontoARS: 0,
            cantidadMes: 0, vencidas: 0
        };

        const today = new Date();
        today.setHours(0,0,0,0);

        installments.forEach(inst => {
            const dueDate = new Date(inst.dueDate);
            const status = (inst.status || '').toLowerCase();
            
            // Ignorar pagadas o anuladas
            if (status === 'pagada' || status === 'anulada' || status === 'cancelada') return;

            if (dueDate.getMonth() === targetMonth && dueDate.getFullYear() === targetYear) {
                metrics.cuotas.cantidadMes++;
                const amount = Number(inst.amount) || 0;
                const currency = (inst.currency === 'ARS' || inst.currency === '$') ? 'ARS' : 'USD';

                if (currency === 'USD') metrics.cuotas.totalMontoUSD += amount;
                else metrics.cuotas.totalMontoARS += amount;

                if (dueDate < today) {
                    metrics.cuotas.vencidas++;
                }
            }
        });

        // --- Tu Operación (Métricas del usuario) ---
        const user = arguments.length > 5 && arguments[5] ? arguments[5] : null;
        
        metrics.tuOperacion = {
            ventasUsuarioAno: 0,
            ventasTotalesAno: 0,
            autos100Tuyo: 0,
            ganancia100TuyoUSD: 0
        };

        if (user) {
            const userId = String(user._id);
            const userName = (user.name || '').toLowerCase();
            
            sales.forEach(s => {
                const sDate = new Date(s.saleDate || s.createdAt);
                if (sDate.getFullYear() === targetYear && (s.status === 'confirmada' || s.status === 'entregada')) {
                    metrics.tuOperacion.ventasTotalesAno++;
                    
                    const isSeller = (s.salesperson || '').toLowerCase() === userName || String(s.assignedTo) === userId || (s.createdBy || '').toLowerCase() === userName;
                    if (isSeller) {
                        metrics.tuOperacion.ventasUsuarioAno++;
                    }
                    
                    // ¿Es 100% de él? (Lo trajo y lo vendió)
                    const isCreator = (s.createdBy || '').toLowerCase() === userName || (s.consignationOwnerId && String(s.consignationOwnerId) === userId);
                    if (isSeller && isCreator) {
                        metrics.tuOperacion.autos100Tuyo++;
                        const detail = salesDetails.find(d => d.id === s._id);
                        if (detail && detail.profitUSD > 0) {
                            metrics.tuOperacion.ganancia100TuyoUSD += detail.profitUSD;
                        }
                    }
                }
            });
        }
    }

    return metrics;
}
