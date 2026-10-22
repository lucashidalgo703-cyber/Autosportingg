import { computeSaleProfit } from '../../../utils/saleCommercial.js';
import {
    buildSaleGainState,
    computeGainEvents,
    isActiveTransaction,
    isIncomeTransaction,
    isExpenseTransaction,
    toArsUsd
} from './gainsCalculations.js';

export function resolveHistoricalRateMeta(date, historyObj, rateType = 'venta') {
    if (!historyObj) {
        return {
            rate: null,
            rateDate: null,
            isExactDate: false,
            isSubstituted: false,
            substitutedFromDate: null,
            rateType: `Dólar blue (${rateType})`,
            source: 'Ámbito Financiero — dólar blue',
            note: 'Sin histórico de Ámbito disponible'
        };
    }
    const series = historyObj.series || historyObj;
    if (!series || typeof series !== 'object') {
        return {
            rate: null,
            rateDate: null,
            isExactDate: false,
            isSubstituted: false,
            substitutedFromDate: null,
            rateType: `Dólar blue (${rateType})`,
            source: 'Ámbito Financiero — dólar blue',
            note: 'Serie histórica de Ámbito no inicializada'
        };
    }
    const ym = getArgentinaYearMonth(date);
    if (!ym || ym.year === null || ym.month === null || ym.day === null) {
        return {
            rate: null,
            rateDate: null,
            isExactDate: false,
            isSubstituted: false,
            substitutedFromDate: null,
            rateType: `Dólar blue (${rateType})`,
            source: 'Ámbito Financiero — dólar blue',
            note: 'Fecha inválida'
        };
    }
    const iso = `${ym.year}-${String(ym.month + 1).padStart(2, '0')}-${String(ym.day).padStart(2, '0')}`;
    if (series[iso] && Number(series[iso]) > 0) {
        return {
            rate: Number(series[iso]),
            rateDate: iso,
            isExactDate: true,
            isSubstituted: false,
            substitutedFromDate: null,
            rateType: `Dólar blue (${rateType})`,
            source: 'Ámbito Financiero — dólar blue',
            note: `Cotización exacta del día de la operación (${iso})`
        };
    }
    const baseDate = new Date(`${iso}T12:00:00Z`);
    if (!isNaN(baseDate.getTime())) {
        for (let offset = 1; offset <= 10; offset++) {
            const prev = new Date(baseDate.getTime() - offset * 24 * 60 * 60 * 1000);
            const prevIso = prev.toISOString().slice(0, 10);
            if (series[prevIso] && Number(series[prevIso]) > 0) {
                return {
                    rate: Number(series[prevIso]),
                    rateDate: prevIso,
                    isExactDate: false,
                    isSubstituted: true,
                    substitutedFromDate: prevIso,
                    rateType: `Dólar blue (${rateType})`,
                    source: 'Ámbito Financiero — dólar blue',
                    note: `Sustitución por último día hábil anterior disponible (${prevIso}) para operación del ${iso}`
                };
            }
        }
    }
    return {
        rate: null,
        rateDate: null,
        isExactDate: false,
        isSubstituted: false,
        substitutedFromDate: null,
        rateType: `Dólar blue (${rateType})`,
        source: 'Ámbito Financiero — dólar blue',
        note: `Sin cotización histórica anterior disponible en Ámbito para ${iso}`
    };
}

export function resolveHistoricalRateFromSeries(date, historyObj, rateType = 'venta') {
    const meta = resolveHistoricalRateMeta(date, historyObj, rateType);
    return meta.rate;
}

export function getArgentinaYearMonth(date) {
    if (!date) return { year: null, month: null, day: null, key: null };
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return { year: null, month: null, day: null, key: null };
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    }).formatToParts(d);
    let year = 0, month = 0, day = 0;
    for (const p of parts) {
        if (p.type === 'year') year = parseInt(p.value, 10);
        if (p.type === 'month') month = parseInt(p.value, 10);
        if (p.type === 'day') day = parseInt(p.value, 10);
    }
    return { year, month: month - 1, day, key: `${year}-${String(month).padStart(2, '0')}` };
}

export function formatArgentinaDate(date) {
    if (!date) return '—';
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(d);
}

export function calculateDashboardMetrics(cars = []) {
    const selectedDate = arguments.length > 2 && arguments[2] ? new Date(arguments[2]) : new Date();
    const targetArgYM = getArgentinaYearMonth(selectedDate);
    const targetMonth = targetArgYM.month ?? selectedDate.getMonth();
    const targetYear = targetArgYM.year ?? selectedDate.getFullYear();
    const currentArgYM = getArgentinaYearMonth(new Date());
    const isCurrentMonth = targetArgYM.year === currentArgYM.year && targetArgYM.month === currentArgYM.month;
    const isPastMonth = (targetArgYM.year < currentArgYM.year) || (targetArgYM.year === currentArgYM.year && targetArgYM.month < currentArgYM.month);

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
        },

        monthlyBilling: {
            targetYear,
            targetMonth,
            targetLabel: new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' }).format(selectedDate),
            isCurrentMonth,
            isPastMonth,
            salesCount: 0,
            totalOriginalARS: 0,
            totalOriginalUSD: 0,
            otherCurrencies: [],
            blueRateVenta: null,
            blueRateCompra: null,
            blueData: null,
            conversionAvailable: false,
            totalEquivARS: null,
            totalEquivUSD: null,
            totalEquivARSCompra: null,
            totalEquivUSDCompra: null,
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
        const monthlyBillingSales = [];
        let billingTotalARS = 0;
        let billingTotalUSD = 0;
        const billingOtherCurrencies = {};

        // Parámetros completos extraídos
        const transactions = arguments.length > 3 && arguments[3] ? arguments[3] : [];
        const installments = arguments.length > 4 && arguments[4] ? arguments[4] : [];
        // user ya extraido arriba
        const dolarBlue = arguments.length > 6 && arguments[6] ? arguments[6] : null;
        const blueRate = (dolarBlue && dolarBlue.rate && Number(dolarBlue.rate) > 0) ? Number(dolarBlue.rate) : null;
        const dolarBlueHistory = arguments.length > 7 && arguments[7] ? arguments[7] : null;
        const cockpitTargetUSD = (arguments.length > 8 && arguments[8] && Number(arguments[8]) > 0) ? Number(arguments[8]) : 110000;
        metrics.dolarBlue = dolarBlue;
        metrics.dolarBlueHistory = dolarBlueHistory;

        // Estructura para el panel Últimos 12 meses · Ganancia Dual (Proyectada vs Liberada por Cobros)
        const MONTH_NAMES_12M_SHORT = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
        const MONTH_NAMES_12M_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        function createEmpty12Months() {
            const list = [];
            for (let i = 0; i < 12; i++) {
                const d = new Date(selectedDate);
                d.setDate(1);
                d.setMonth(d.getMonth() - (11 - i));
                const ym = getArgentinaYearMonth(d);
                const y = ym.year;
                const m = ym.month;
                const isCur = y === currentArgYM.year && m === currentArgYM.month;
                const isSel = i === 11;
                const shortYear = String(y).slice(-2);
                list.push({
                    index: i,
                    year: y,
                    month: m,
                    key: `${y}-${String(m + 1).padStart(2, '0')}`,
                    label: `${MONTH_NAMES_12M_SHORT[m]} ${shortYear}`,
                    fullLabel: `${MONTH_NAMES_12M_FULL[m]} ${y}`,
                    isCurrentMonth: isCur,
                    isSelectedMonth: isSel,
                    salesCount: 0,
                    gainARS: 0,
                    gainUSD: 0,
                    incompleteCount: 0,
                    status: 'empty',
                    sales: []
                });
            }
            return list;
        }

        const projectedMonths = createEmpty12Months();
        const releasedMonths = createEmpty12Months();   // GANANCIA COBRADA (por fecha de cobro)
        const distributedMonths = createEmpty12Months(); // GANANCIA DISTRIBUIDA por Tesorería (por fecha de cobro)
        const saleWaterfallMap = new Map();
        const depositEvents = [];

        // Ventas cuya seña ya figura como movimiento propio (evita contar dos veces la seña aplicada)
        const saleIdsWithDepositTx = new Set();
        transactions.forEach(t => {
            if (t && t.saleId && isIncomeTransaction(t) && isActiveTransaction(t)
                && (t.source === 'reserva' || /seña|reserva/i.test(`${t.concept || ''} ${t.description || ''}`))) {
                saleIdsWithDepositTx.add(String(t.saleId));
            }
        });

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
                
                // Combinar datos del stock con los populados de la venta
                const carData = carFromStock || (isPopulated ? sale.vehicleId : null);

                // Cotización histórica de Ámbito correspondiente a la fecha de venta
                const rateMeta = resolveHistoricalRateMeta(saleDateRaw, dolarBlueHistory, 'venta');
                const explicitRate = (sale.exchangeRate && Number(sale.exchangeRate) > 0) ? Number(sale.exchangeRate) : null;
                const historicalRate = explicitRate || rateMeta.rate;
                const appliedRate = historicalRate || blueRate;

                // Cálculo estricto de ganancia comercial neta de la agencia
                // (descontando costo de adquisición/toma, gastos del auto, gastos de venta, comisiones y participación de socios)
                const commercialProfit = computeSaleProfit({
                    salePrice: sale.salePrice,
                    saleCurrency: sale.saleCurrency,
                    vehicle: carData,
                    vehicleExpenses: carData?.expenses || [],
                    saleExpenses: sale.saleExpenses || [],
                    commissionSettings: sale.commissionSettings,
                    exchangeRate: appliedRate
                });

                let profitARS = 0;
                let profitUSD = 0;
                let isCalculableProfit = commercialProfit.calculable && commercialProfit.agencyNetProfit !== null;

                if (isCalculableProfit) {
                    if (commercialProfit.currency === 'USD') {
                        profitUSD = commercialProfit.agencyNetProfit;
                        profitARS = appliedRate ? Math.round(commercialProfit.agencyNetProfit * appliedRate) : 0;
                    } else {
                        profitARS = commercialProfit.agencyNetProfit;
                        profitUSD = appliedRate ? Math.round(commercialProfit.agencyNetProfit / appliedRate) : 0;
                    }
                } else if (carData && carData.purchasePrice) {
                    // Fallback a margen básico si falta algún dato pero hay precio y costo
                    const cost = Number(carData.purchasePrice);
                    const price = Number(sale.salePrice);
                    const normSaleCur = (sale.saleCurrency === 'U$S' || sale.saleCurrency === 'USD') ? 'USD' : 'ARS';
                    const normPurchCur = (carData.purchaseCurrency === 'U$S' || carData.purchaseCurrency === 'USD') ? 'USD' : 'ARS';
                    if (normSaleCur === 'USD' && normPurchCur === 'USD') {
                        profitUSD = price - cost;
                        profitARS = appliedRate ? Math.round(profitUSD * appliedRate) : 0;
                    } else if (normSaleCur === 'ARS' && normPurchCur === 'ARS') {
                        profitARS = price - cost;
                        profitUSD = appliedRate ? Math.round(profitARS / appliedRate) : 0;
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

                const saleArgYM = getArgentinaYearMonth(saleDateRaw);
                const isSelectedMonthInArgentina = saleArgYM.year === targetYear && saleArgYM.month === targetMonth;

                if (isSelectedMonthInArgentina) {
                    metrics.counts.vendidos++;
                    realMarginUSD += profitUSD;
                    realMarginARS += profitARS;

                    salesDetails.push(fullSaleDetail);

                    // --- Facturación mensual pactada (Cockpit CEO) ---
                    let finalOperationPrice = Number(sale.salePrice) || 0;
                    let vehiclePrice = finalOperationPrice;
                    let interestAmount = 0;
                    const hasFinancing = Boolean(sale.financingDetails?.hasFinancing || sale.paymentMethod === 'financiado');

                    if (hasFinancing && sale.financingDetails) {
                        const totalOp = Number(sale.financingDetails.totalOperationPrice);
                        if (Number.isFinite(totalOp) && totalOp > 0) {
                            finalOperationPrice = totalOp;
                        }
                        interestAmount = Number(sale.financingDetails.interestAmount) || 0;
                        vehiclePrice = Number(sale.financingDetails.cashPrice) || Math.max(0, finalOperationPrice - interestAmount);
                    }

                    const originalCurrency = (sale.saleCurrency === 'U$S' || sale.saleCurrency === 'USD')
                        ? 'USD'
                        : (sale.saleCurrency === '$' || sale.saleCurrency === 'ARS')
                        ? 'ARS'
                        : (sale.saleCurrency || 'ARS');

                    const isConsigned = Boolean(
                        sale.consignationOwnerId ||
                        (carData && (carData.consignedBy || carData.agencyOwned === false))
                    );

                    if (originalCurrency === 'ARS') {
                        billingTotalARS += finalOperationPrice;
                    } else if (originalCurrency === 'USD') {
                        billingTotalUSD += finalOperationPrice;
                    } else {
                        billingOtherCurrencies[originalCurrency] = (billingOtherCurrencies[originalCurrency] || 0) + finalOperationPrice;
                    }

                    monthlyBillingSales.push({
                        id: sale._id,
                        date: saleDate,
                        dateRaw: saleDateRaw,
                        dateDisplay: formatArgentinaDate(saleDateRaw),
                        clientName: sale.clientId?.fullName || sale.clientId?.name || sale.buyerName || 'Cliente sin nombre',
                        carName: displayCarName,
                        plate: carData?.plateOrVin || carData?.plate || 'S/D',
                        originalPrice: finalOperationPrice,
                        originalCurrency,
                        vehiclePrice,
                        interestAmount,
                        hasFinancing,
                        isConsigned,
                        paymentMethod: sale.paymentMethod || 'Contado',
                        saleRef: `/admin/ventas?saleId=${sale._id}`
                    });
                }
                
                // Asignar al bucket de ganancia comercial proyectada (agrupada por fecha de venta)
                const bucketProj = projectedMonths.find(b => b.year === saleArgYM.year && b.month === saleArgYM.month);
                if (bucketProj) {
                    bucketProj.salesCount++;
                    if (isCalculableProfit) {
                        // Normalización ARS/USD: nunca se usa la cotización actual para completar el equivalente de una venta histórica.
                        const isUsdSale = (sale.saleCurrency === 'USD' || sale.saleCurrency === 'U$S');
                        if (historicalRate || isUsdSale) bucketProj.gainUSD += profitUSD;
                        if (historicalRate || !isUsdSale) bucketProj.gainARS += profitARS;
                        if (!historicalRate) bucketProj.incompleteCount++;
                    } else {
                        bucketProj.incompleteCount++;
                    }

                    const hasFinancing = Boolean(sale.financingDetails?.hasFinancing || sale.paymentMethod === 'financiado');
                    const financedBal = hasFinancing ? Number(sale.financingDetails?.financedBalance || 0) : 0;

                    bucketProj.sales.push({
                        id: sale._id,
                        date: saleDateRaw,
                        dateDisplay: formatArgentinaDate(saleDateRaw),
                        carName: displayCarName,
                        plate: carData?.plateOrVin || carData?.plate || 'S/D',
                        salePrice: Number(sale.salePrice) || 0,
                        saleCurrency: (sale.saleCurrency === 'U$S' || sale.saleCurrency === 'USD') ? 'USD' : 'ARS',
                        cost: commercialProfit.acquisitionCost,
                        expenses: commercialProfit.totalExpenses,
                        commissions: commercialProfit.commissionAmount,
                        investorPct: commercialProfit.investorPercentage,
                        investorProfit: commercialProfit.investorProfitShare,
                        agencyProfitARS: isCalculableProfit ? profitARS : null,
                        agencyProfitUSD: (isCalculableProfit && (historicalRate || sale.saleCurrency === 'USD')) ? profitUSD : null,
                        rateUsed: appliedRate,
                        rateDate: rateMeta.rateDate,
                        isExactDate: rateMeta.isExactDate,
                        isSubstituted: rateMeta.isSubstituted,
                        substitutedFromDate: rateMeta.substitutedFromDate,
                        rateSource: explicitRate ? 'Registrada en venta' : rateMeta.source,
                        rateNote: rateMeta.note,
                        calculable: commercialProfit.calculable,
                        missingReasons: commercialProfit.missingReasons,
                        isConsigned: Boolean(sale.consignationOwnerId || (carData && (carData.consignedBy || carData.agencyOwned === false))),
                        hasFinancing,
                        financedBalance: financedBal,
                        type: 'sale_projection'
                    });
                }

                // Registrar venta en el circuito de Tesorería para calcular la ganancia cobrada / distribuida
                // (costo + gastos + comisión descontada una sola vez, parte de socios y capital de permutas).
                const gainState = buildSaleGainState({ sale, commercialProfit, carData });
                saleWaterfallMap.set(String(sale._id), gainState);

                // Seña aplicada a la venta sin movimiento propio: se considera efectivo cobrado (igual criterio que Tesorería)
                const depositAmt = Number(sale.depositAppliedAmount) || 0;
                if (depositAmt > 0 && !saleIdsWithDepositTx.has(String(sale._id))) {
                    depositEvents.push({
                        _id: `deposit-${sale._id}`,
                        saleId: sale._id,
                        date: saleDateRaw,
                        amount: depositAmt,
                        currency: sale.depositAppliedCurrency || sale.saleCurrency,
                        type: 'Ingreso',
                        status: 'activo',
                        source: 'reserva',
                        concept: 'Seña aplicada a la venta'
                    });
                }

                // Cálculo para el array histórico de 12 meses (ventas brutas para Dashboard General)
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

        // --- Procesamiento de cobros reales: GANANCIA COBRADA y GANANCIA DISTRIBUIDA ---
        // La ganancia comercial (por fecha de venta) ya se acumuló arriba en projectedMonths.
        // Cotización ARS/USD de un cobro: la registrada en el movimiento, luego la pactada en la venta, luego la histórica de Ámbito.
        // Nunca se completa con la cotización actual ni con un valor fijo.
        const resolveTxRate = (t, tDate, saleState) => {
            const txRate = Number(t?.exchangeRate) > 0 ? Number(t.exchangeRate) : null;
            const saleRate = Number(saleState?.saleRate) > 0 ? Number(saleState.saleRate) : null;
            const meta = resolveHistoricalRateMeta(tDate, dolarBlueHistory, 'venta');
            if (txRate) {
                return { ...meta, rate: txRate, isExactDate: true, isSubstituted: false, source: 'Registrada en el cobro', note: 'Cotización registrada en el movimiento' };
            }
            if (saleRate) {
                return { ...meta, rate: saleRate, isExactDate: false, isSubstituted: false, source: 'Registrada en la venta', note: 'Cotización pactada en la venta' };
            }
            return meta;
        };

        const { events: gainEvents, reconciliation: gainsReconciliation } = computeGainEvents({
            saleStates: saleWaterfallMap,
            transactions,
            resolveTxRate,
            depositEvents
        });

        const pushGainEntry = (bucket, ev, amountObj, extra = {}) => {
            const rate = ev.rateMeta?.rate || null;
            const conv = toArsUsd(amountObj.amount, amountObj.currency, rate);
            const calc = ev.calculable && !conv.missingRate;
            bucket.salesCount++;
            bucket.gainARS += conv.ars;
            bucket.gainUSD += conv.usd;
            if (!calc) bucket.incompleteCount++;
            const st = ev.state;
            bucket.sales.push({
                id: ev.id,
                saleId: ev.saleId,
                date: ev.date,
                dateDisplay: formatArgentinaDate(ev.date),
                clientName: st.sale.clientId?.fullName || st.sale.clientId?.name || st.sale.buyerName || 'Cliente',
                concept: ev.tx.concept || ev.tx.description || 'Cobro de venta / cuota',
                carName: st.carData ? `${st.carData.brand || ''} ${st.carData.name || ''}`.trim() : 'Vehículo',
                plate: st.carData?.plateOrVin || st.carData?.plate || 'S/D',
                amountCollected: ev.amount,
                currency: ev.txCurrency,
                realInvestment: st.totalCosts,
                collectedSoFar: ev.collectedSoFar,
                agencyProfitARS: conv.ars,
                agencyProfitUSD: conv.missingRate ? null : conv.usd,
                rateUsed: rate,
                rateDate: ev.rateMeta?.rateDate || null,
                isExactDate: ev.rateMeta?.isExactDate,
                isSubstituted: ev.rateMeta?.isSubstituted,
                substitutedFromDate: ev.rateMeta?.substitutedFromDate,
                rateSource: ev.rateMeta?.source,
                rateNote: ev.rateMeta?.note,
                calculable: calc,
                missingReasons: ev.missingReasons || (conv.missingRate ? ['Falta cotización histórica para el equivalente ARS/USD'] : undefined),
                basis: ev.basis,
                type: ev.type,
                ...extra
            });
        };

        gainEvents.forEach(ev => {
            const ym = getArgentinaYearMonth(ev.date);
            const relBucket = releasedMonths.find(b => b.year === ym.year && b.month === ym.month);
            if (relBucket) pushGainEntry(relBucket, ev, ev.collected);

            // Distribuida: solo cobros que Tesorería ya repartió oficialmente (nunca se confunde con la cobrada)
            if (ev.basis === 'tesoreria' && ev.distributed.amount > 0) {
                const distBucket = distributedMonths.find(b => b.year === ym.year && b.month === ym.month);
                if (distBucket) pushGainEntry(distBucket, ev, ev.distributed);
            }
        });

        // Función para consolidar estados y estadísticas de cada colección
        function finalizeGainsCollection(list) {
            list.forEach(b => {
                if (b.salesCount === 0) {
                    b.status = 'empty';
                } else if (b.incompleteCount > 0 && b.sales.every(s => !s.calculable)) {
                    b.status = 'incomplete';
                } else if (b.gainUSD < 0 || b.gainARS < 0) {
                    b.status = 'negative';
                } else {
                    b.status = 'positive';
                }
            });

            const totalAccARS = list.reduce((acc, b) => acc + b.gainARS, 0);
            const totalAccUSD = list.reduce((acc, b) => acc + b.gainUSD, 0);
            const activeMonths = list.filter(b => b.salesCount > 0);
            const activeCount = activeMonths.length || 1;
            const avgARS = Math.round(totalAccARS / activeCount);
            const avgUSD = Math.round(totalAccUSD / activeCount);
            const maxGainUSD = Math.max(...list.map(b => b.gainUSD), 0);
            const maxGainARS = Math.max(...list.map(b => b.gainARS), 0);
            const minGainUSD = Math.min(...list.map(b => b.gainUSD), 0);
            const minGainARS = Math.min(...list.map(b => b.gainARS), 0);
            const totalSalesCount = list.reduce((acc, b) => acc + b.salesCount, 0);

            return {
                months: list,
                totalAccumulatedARS: totalAccARS,
                totalAccumulatedUSD: totalAccUSD,
                monthlyAverageARS: avgARS,
                monthlyAverageUSD: avgUSD,
                maxGainUSD,
                maxGainARS,
                minGainUSD,
                minGainARS,
                totalSalesCount12m: totalSalesCount,
                activeMonthsCount: activeMonths.length
            };
        }

        const projSummary = finalizeGainsCollection(projectedMonths);
        const relSummary = finalizeGainsCollection(releasedMonths);
        const distSummary = finalizeGainsCollection(distributedMonths);

        // Tres conceptos separados:
        //   commercial  = ganancia comercial (por fecha de venta)      [alias histórico: projected]
        //   collected   = ganancia cobrada / liberada (por fecha de cobro) [alias histórico: released]
        //   distributed = margen asignado por Tesorería (por fecha de cobro)
        metrics.last12MonthsGains = {
            months: projectedMonths, // Compatible por defecto
            commercial: projSummary,
            collected: relSummary,
            distributed: distSummary,
            projected: projSummary,
            released: relSummary,
            reconciliation: gainsReconciliation,
            cockpitTargetUSD: cockpitTargetUSD || 110000,
            dolarBlueCurrent: blueRate,
            dolarBlueHistoryCount: dolarBlueHistory?.count || 0
        };

        // --- Totales convertidos para Facturación Mensual ---
        const rateVenta = (blueRate && blueRate > 0) ? blueRate : null;
        const rateCompra = (dolarBlue && Number(dolarBlue.compra) > 0) ? Number(dolarBlue.compra) : null;
        const conversionAvailable = Boolean(rateVenta && rateVenta > 0);

        monthlyBillingSales.sort((a, b) => new Date(b.date) - new Date(a.date));

        monthlyBillingSales.forEach(s => {
            if (conversionAvailable) {
                if (s.originalCurrency === 'USD') {
                    s.rowEquivARS = s.originalPrice * rateVenta;
                    s.rowEquivUSD = s.originalPrice;
                } else if (s.originalCurrency === 'ARS') {
                    s.rowEquivUSD = s.originalPrice / rateVenta;
                    s.rowEquivARS = s.originalPrice;
                } else {
                    s.rowEquivARS = null;
                    s.rowEquivUSD = null;
                }
            } else {
                s.rowEquivARS = null;
                s.rowEquivUSD = null;
            }
        });

        const totalEquivARS = conversionAvailable ? (billingTotalARS + (billingTotalUSD * rateVenta)) : null;
        const totalEquivUSD = conversionAvailable ? (billingTotalUSD + (billingTotalARS / rateVenta)) : null;
        const totalEquivARSCompra = (rateCompra && rateCompra > 0) ? (billingTotalARS + (billingTotalUSD * rateCompra)) : null;
        const totalEquivUSDCompra = (rateCompra && rateCompra > 0) ? (billingTotalUSD + (billingTotalARS / rateCompra)) : null;

        metrics.monthlyBilling = {
            targetYear,
            targetMonth,
            targetLabel: new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' }).format(selectedDate),
            isCurrentMonth,
            isPastMonth,
            salesCount: monthlyBillingSales.length,
            totalOriginalARS: billingTotalARS,
            totalOriginalUSD: billingTotalUSD,
            otherCurrencies: Object.entries(billingOtherCurrencies).map(([currency, amount]) => ({ currency, amount })),
            blueRateVenta: rateVenta,
            blueRateCompra: rateCompra,
            blueData: dolarBlue || null,
            conversionAvailable,
            totalEquivARS,
            totalEquivUSD,
            totalEquivARSCompra,
            totalEquivUSDCompra,
            sales: monthlyBillingSales
        };
        
        // --- Transacciones (Cash Flow) ---

        metrics.finanzas = {
            ingresosUSD: 0, ingresosARS: 0,
            egresosUSD: 0, egresosARS: 0,
            saldos: { USD: 0, ARS: 0 }
        };

        transactions.forEach(t => {
            // Tesorería guarda el tipo como 'Ingreso'/'Egreso' (capitalizado) y los movimientos anulados/pendientes no son dinero real.
            if (!isActiveTransaction(t)) return;
            const tDate = new Date(t.date || t.createdAt);
            if (tDate.getMonth() === targetMonth && tDate.getFullYear() === targetYear) {
                const amount = Number(t.amount) || 0;
                const currency = (t.currency === 'ARS' || t.currency === '$') ? 'ARS' : 'USD';
                
                if (isIncomeTransaction(t)) {
                    if (currency === 'USD') metrics.finanzas.ingresosUSD += amount;
                    else metrics.finanzas.ingresosARS += amount;
                } else if (isExpenseTransaction(t)) {
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
