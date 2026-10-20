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
            total: 0,
            stockTotal: 0,
            disponibles: 0,
            reservados: 0,
            vendidos: 0,
            vendidosHistoricos: 0,
            pausados: 0,
            visibles: 0,
            ocultos: 0,
            totalCatalogo: cars.length
        },

        consignaciones: {
            mes: 0,
            target: 10
        },

        alertas: {
            alerta60: [],
            alerta90: []
        },

        patentesPendientes: [],
        topInmovilizado: [],
        topAntiguos: [],
        auditGlobal: [],
        dolarBlue: null,
        sales2025Audit: null,
        annualSummary: {},
        historicalTotal: { 
            carsCount: 0, 
            totalARS: 0, 
            totalUSD: 0, 
            equivalentUSD: null,
            avgTicketARS: 0,
            avgTicketUSD: null,
            startYear: targetYear, 
            sales: [] 
        }
    };

    const activeStatuses = ['disponible', 'reservado', 'pausado'];
    let allAudits = [];

    cars.forEach(car => {
        // --- 1. Counts ---
        const status = (car.status || 'disponible').toLowerCase().trim();
        const isSold = car.sold === true || status === 'vendido';
        const isCancelled = status === 'cancelado' || status === 'anulado';

        if (status === 'disponible' && !isSold && !isCancelled) metrics.counts.disponibles++;
        else if (status === 'reservado' && !isSold && !isCancelled) metrics.counts.reservados++;
        else if (status === 'pausado' && !isSold && !isCancelled) metrics.counts.pausados++;

        if (isSold) metrics.counts.vendidosHistoricos++;

        if (!isSold && !isCancelled) {
            metrics.counts.stockTotal++;
        }

        if (car.visibleEnWeb !== false) metrics.counts.visibles++;
        else metrics.counts.ocultos++;

        // --- 2. Active Capital ---
        // Match stock section logic: only 'disponible' and discount investor percentage
        const isDisponible = status === 'disponible' && !isSold && !isCancelled;
        const isActive = activeStatuses.includes(status) && !isSold && !isCancelled;
        const isAgencyOwned = car.agencyOwned !== false;
        
        if (isDisponible && isAgencyOwned) {
            let agencyPercentage = 100;
            if (car.isSharedInvestment && car.investor && car.investor.percentage) {
                agencyPercentage = 100 - Number(car.investor.percentage);
            }

            // Price
            if (car.price !== undefined && car.price !== null && car.price > 0) {
                const currency = (car.currency === 'U$S' || car.currency === 'USD') ? 'USD' : (car.currency === '$' || car.currency === 'ARS') ? 'ARS' : car.currency;
                const valueToAdd = Number(car.price) * (agencyPercentage / 100);

                if (currency === 'USD') metrics.capitalPublicado.USD += valueToAdd;
                else if (currency === 'ARS') metrics.capitalPublicado.ARS += valueToAdd;
                else {
                    metrics.capitalPublicado.NONE += valueToAdd;
                    metrics.unidadesSinMoneda++;
                }
            }

            // Purchase Price
            if (car.purchasePrice !== undefined && car.purchasePrice !== null && car.purchasePrice > 0) {
                const purchaseCurrency = (car.purchaseCurrency === 'U$S' || car.purchaseCurrency === 'USD') ? 'USD' : (car.purchaseCurrency === '$' || car.purchaseCurrency === 'ARS') ? 'ARS' : car.purchaseCurrency;
                const costToAdd = Number(car.purchasePrice) * (agencyPercentage / 100);

                if (purchaseCurrency === 'USD') metrics.capitalCosto.USD += costToAdd;
                else if (purchaseCurrency === 'ARS') metrics.capitalCosto.ARS += costToAdd;
                else metrics.capitalCosto.NONE += costToAdd;
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

        // --- Patentes pendientes (Libre deuda) en stock ---
        const doc = car.documentation || {};
        if (isActive && (doc.libreDeudaPatentes === 'pendiente' || doc.patentes === 'pendiente')) {
            metrics.patentesPendientes.push({
                id: car._id,
                brand: car.brand,
                name: car.name || car.model,
                plate: car.plateOrVin || car.plate || 'S/D',
                year: car.year,
                status: car.status
            });
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
    metrics.counts.total = metrics.counts.stockTotal;
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
        metrics.historicalSalesARS = Array(12).fill(0);

        const currentYear = new Date().getFullYear();
        const annualSummary = {};
        const historicalTotal = {
            carsCount: 0,
            totalARS: 0,
            totalUSD: 0,
            startYear: currentYear,
            earliestSaleDate: null,
            sales: []
        };

        const salesDetails = [];

        // Parámetro de cotización del Dólar Blue (Ámbito Financiero)
        const dolarBlue = arguments.length > 6 && arguments[6] ? arguments[6] : null;
        const blueRate = (dolarBlue && dolarBlue.rate && Number(dolarBlue.rate) > 0) ? Number(dolarBlue.rate) : null;
        metrics.dolarBlue = dolarBlue;

        sales.forEach(sale => {
            // Priorizar siempre la fecha comercial de la venta sobre createdAt
            const saleDateRaw = sale.saleDate || sale.createdAt;
            const saleDate = saleDateRaw ? new Date(saleDateRaw) : new Date();
            
            // Permitir todas las ventas válidas (excluir canceladas y borradores)
            const status = (sale.status || '').toLowerCase();
            const isValidStatus = status !== 'cancelada' && status !== 'borrador';

            if (isValidStatus) {
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
                    } else if (normalizedSaleCurrency === 'ARS' && normalizedPurchaseCurrency === 'ARS') {
                        profitARS = price - cost;
                    }
                }

                // Registro en resumen anual e histórico
                const sYear = saleDate.getFullYear();
                const sPrice = Number(sale.salePrice) || 0;
                const sCurrency = (sale.saleCurrency === 'U$S' || sale.saleCurrency === 'USD') ? 'USD' : 'ARS';

                if (!annualSummary[sYear]) {
                    annualSummary[sYear] = {
                        year: sYear,
                        carsCount: 0,
                        totalARS: 0,
                        totalUSD: 0,
                        profitARS: 0,
                        profitUSD: 0,
                        sales: []
                    };
                }

                annualSummary[sYear].carsCount++;
                if (sCurrency === 'USD') annualSummary[sYear].totalUSD += sPrice;
                else annualSummary[sYear].totalARS += sPrice;
                annualSummary[sYear].profitARS += profitARS;
                annualSummary[sYear].profitUSD += profitUSD;

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

                const fullSaleDetail = {
                    id: sale._id,
                    carName: displayCarName,
                    plate: carData?.plateOrVin || '',
                    salePrice: sPrice,
                    saleCurrency: sCurrency,
                    purchasePrice: carData ? Number(carData.purchasePrice) || 0 : 0,
                    purchaseCurrency: carData ? carData.purchaseCurrency : null,
                    profitUSD,
                    profitARS,
                    paymentMethod: sale.paymentMethod || 'Contado',
                    clientName: sale.clientId?.fullName || sale.clientId?.name || sale.buyerName || 'Cliente',
                    salesperson: sale.salesperson || 'Ventas',
                    date: saleDate,
                    saleDateRaw: sale.saleDate,
                    createdAtRaw: sale.createdAt,
                    financingDetails: sale.financingDetails
                };

                annualSummary[sYear].sales.push(fullSaleDetail);

                // Auditoría de la venta de 2025 solicitada por el usuario
                if (sYear === 2025 && !metrics.sales2025Audit) {
                    metrics.sales2025Audit = {
                        ...fullSaleDetail,
                        hasExplicitSaleDate: Boolean(sale.saleDate)
                    };
                }

                historicalTotal.carsCount++;
                if (sCurrency === 'USD') historicalTotal.totalUSD += sPrice;
                else historicalTotal.totalARS += sPrice;
                historicalTotal.sales.push(fullSaleDetail);

                if (!historicalTotal.earliestSaleDate || saleDate < historicalTotal.earliestSaleDate) {
                    historicalTotal.earliestSaleDate = saleDate;
                    historicalTotal.startYear = sYear;
                }

                if (saleDate.getMonth() === targetMonth && saleDate.getFullYear() === targetYear) {
                    metrics.counts.vendidos++;
                    realMarginUSD += profitUSD;
                    realMarginARS += profitARS;

                    salesDetails.push(fullSaleDetail);
                }
                
                // Cálculo para el array histórico de 12 meses
                const monthDiff = (targetYear - saleDate.getFullYear()) * 12 + (targetMonth - saleDate.getMonth());
                if (monthDiff >= 0 && monthDiff < 12) {
                    const arrayIndex = 11 - monthDiff;
                    const saleCurrency = (sale.saleCurrency === 'U$S' || sale.saleCurrency === 'USD') ? 'USD' : 'ARS';
                    let priceInARS = Number(sale.salePrice) || 0;
                    
                    if (saleCurrency === 'USD') {
                        priceInARS = priceInARS * (blueRate || 1540);
                    }
                    
                    metrics.historicalSalesARS[arrayIndex] += priceInARS;
                }
            }
        });

        // Si no hay ventas en ningún año, mostrar solo el año en curso (nunca inventar 2024 ni años vacíos)
        if (Object.keys(annualSummary).length === 0) {
            annualSummary[currentYear] = {
                year: currentYear,
                carsCount: 0,
                totalARS: 0,
                totalUSD: 0,
                profitARS: 0,
                profitUSD: 0,
                sales: []
            };
        }

        // Calcular equivalentes USD al Blue del día e indicadores para cada año
        const MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const MONTH_NAMES_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        Object.values(annualSummary).forEach(y => {
            y.equivalentUSD = (blueRate && y.totalARS > 0) ? (y.totalARS / blueRate) : null;
            y.avgTicketARS = y.carsCount > 0 ? Math.round(y.totalARS / y.carsCount) : 0;
            y.avgTicketUSD = (blueRate && y.avgTicketARS > 0) ? (y.avgTicketARS / blueRate) : null;

            // Desglose mensual para gráficos
            y.monthlyBreakdown = Array.from({ length: 12 }, (_, monthIdx) => {
                const mSales = y.sales.filter(s => new Date(s.date).getMonth() === monthIdx);
                const mARS = mSales.filter(s => s.saleCurrency === 'ARS').reduce((acc, s) => acc + (Number(s.salePrice) || 0), 0);
                const mUSD_orig = mSales.filter(s => s.saleCurrency === 'USD').reduce((acc, s) => acc + (Number(s.salePrice) || 0), 0);
                const mUSD_equiv = (blueRate && mARS > 0) ? (mARS / blueRate) : 0;

                return {
                    monthIndex: monthIdx,
                    name: MONTH_NAMES_SHORT[monthIdx],
                    fullName: MONTH_NAMES_FULL[monthIdx],
                    year: y.year,
                    carsCount: mSales.length,
                    amountARS: mARS,
                    amountUSD_orig: mUSD_orig,
                    amountUSD_equiv: mUSD_equiv,
                    hasSales: mSales.length > 0,
                    sales: mSales
                };
            });

            y.sales.sort((a, b) => new Date(b.date) - new Date(a.date));
        });

        // Indicadores acumulados históricos
        historicalTotal.equivalentUSD = (blueRate && historicalTotal.totalARS > 0) ? (historicalTotal.totalARS / blueRate) : null;
        historicalTotal.avgTicketARS = historicalTotal.carsCount > 0 ? Math.round(historicalTotal.totalARS / historicalTotal.carsCount) : 0;
        historicalTotal.avgTicketUSD = (blueRate && historicalTotal.avgTicketARS > 0) ? (historicalTotal.avgTicketARS / blueRate) : null;
        historicalTotal.sales.sort((a, b) => new Date(b.date) - new Date(a.date));

        metrics.annualSummary = annualSummary;
        metrics.historicalTotal = historicalTotal;
        
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
