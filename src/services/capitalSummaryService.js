import Car from '../models/Car.js';
import Account from '../models/Account.js';
import Installment from '../models/Installment.js';
import Transaction from '../models/Transaction.js';
import Sale from '../models/Sale.js';
import { emptyMoney, isActiveStock, stockOwnership, stockStatus, stockValuation, summarizeStock } from '../utils/inventoryStock.js';
import { normalizeCurrency, roundMoney } from '../utils/saleCommercial.js';

// Legacy scalar fields are ARS only. Every component also returns byCurrency; USD is never silently added to ARS.
export async function getCapitalSummary() {
    const cutoffDate = new Date();
    const [allCars, accounts, installments, debts, unassignedPayments] = await Promise.all([
        Car.find({}).lean(), Account.find({}).lean(),
        Installment.find({ status: { $in: ['pendiente', 'vencida', 'parcial'] } }).lean(),
        Transaction.find({ type: { $regex: /egreso/i }, status: 'pendiente' }).lean(),
        Transaction.find({ type: { $regex: /egreso/i }, status: 'activo',
            accountAssignmentStatus: 'pending', accountDebitApplied: false }).lean()
    ]);
    const stockCars = allCars.filter(isActiveStock);
    const metrics = summarizeStock(stockCars);
    const auditedVehicles = stockCars.map(car => {
        const v = stockValuation(car);
        const isConsignment = v.type === 'consignacion';
        const isThirdParty = v.type === 'tercero';
        return { id: String(car._id), brand: car.brand || '', name: car.name || '', model: car.name || car.model || '', year: car.year || '',
            plate: car.plateOrVin || 'S/D', status: car.status || 'sin_estado', isConsignment, isThirdParty,
            consignedBy: car.consignedBy || '', isShared: ['compartido', 'inversor'].includes(v.type), ownPct: v.ownPct,
            invPct: v.externalPct, investorName: car.investor?.name || car.consignedBy || '',
            purchasePrice: v.purchase, purchaseCurrency: v.purchaseCurrency, currency: v.askingCurrency,
            expenses: v.expenses[v.purchaseCurrency], expensesByCurrency: v.expenses,
            costoBase: v.cost[v.purchaseCurrency], costoPropio: v.ownCost[v.purchaseCurrency], costoInv: v.externalCost[v.purchaseCurrency],
            costByCurrency: v.cost, ownCostByCurrency: v.ownCost, externalCostByCurrency: v.externalCost,
            price: v.asking, precioPropio: v.ownAsking, precioInv: v.externalAsking,
            hasMissingCost: !v.hasCost && !isConsignment && !isThirdParty, hasMissingPrice: !v.asking,
            reason: isConsignment || isThirdParty ? 'Unidad de terceros: no aporta al capital propio.' : !v.hasCost ? 'Pendiente de registrar costo real de compra o toma.' : `Participación propia ${v.ownPct}% / inversor ${v.investorPct}%. Monedas sin conversión.` };
    });
    const cash = emptyMoney();
    const accountsList = accounts.map(account => {
        const currency = normalizeCurrency(account.currency);
        const balance = roundMoney(account.balance);
        cash[currency] = roundMoney(cash[currency] + balance);
        return { id: String(account._id), name: account.name || 'Cuenta', type: account.type || 'Efectivo', currency, balance,
            isIncludedInARS: currency === 'ARS', notes: 'Cuenta real; no duplica asignaciones de cajas estratégicas.' };
    });
    const sales = await Sale.find({ _id: { $in: [...new Set(installments.map(i => i.saleId).filter(Boolean).map(String))] } }).lean();
    const salesById = new Map(sales.map(s => [String(s._id), s]));
    const carsById = new Map(allCars.map(c => [String(c._id), c]));
    const portfolio = emptyMoney();
    const portfolioOwn = emptyMoney();
    const portfolioExternal = emptyMoney();
    const carteraList = [];
    for (const installment of installments) {
        const sale = salesById.get(String(installment.saleId || ''));
        if (sale?.status === 'cancelada') continue;
        const remaining = Math.max(0, roundMoney((Number(installment.amount) || 0) - (Number(installment.paidAmount) || 0)));
        if (!remaining) continue;
        const car = carsById.get(String(sale?.vehicleId || installment.vehicleId || ''));
        const ownPct = car ? stockOwnership(car).ownPct : 100;
        const currency = normalizeCurrency(installment.currency);
        const ownRemaining = roundMoney(remaining * ownPct / 100);
        const invRemaining = roundMoney(remaining - ownRemaining);
        portfolio[currency] = roundMoney(portfolio[currency] + remaining);
        portfolioOwn[currency] = roundMoney(portfolioOwn[currency] + ownRemaining);
        portfolioExternal[currency] = roundMoney(portfolioExternal[currency] + invRemaining);
        carteraList.push({ id: String(installment._id), installmentNumber: installment.installmentNumber || 1,
            saleId: installment.saleId ? String(installment.saleId) : null,
            vehicleTitle: car ? `${car.brand} ${car.name} (${car.year})` : 'Operación / Venta', dueDate: installment.dueDate,
            isOverdue: Boolean(installment.dueDate && new Date(installment.dueDate) < cutoffDate), status: installment.status,
            amount: roundMoney(installment.amount), paidAmount: roundMoney(installment.paidAmount), remaining,
            ownPct, ownRemaining, invRemaining, investorName: car?.investor?.name || car?.consignedBy || '', currency,
            notes: installment.notes || '' });
    }
    const debt = emptyMoney();
    const deudasList = debts.map(transaction => {
        const currency = normalizeCurrency(transaction.currency);
        const amount = roundMoney(transaction.amount);
        debt[currency] = roundMoney(debt[currency] + amount);
        return { id: String(transaction._id), concept: transaction.concept || transaction.description || 'Gasto pendiente',
            category: transaction.category || 'Varios', amount, currency, dueDate: transaction.dueDate || transaction.date,
            status: transaction.status, notes: transaction.notes || '' };
    });
    // These expenses are already paid. Clear their cash effect until their real
    // account is assigned, without presenting them as unpaid debt or changing a balance.
    const paymentsWithoutAccount = emptyMoney();
    const pagosSinCuentaList = unassignedPayments.map(transaction => {
        const currency = normalizeCurrency(transaction.currency);
        const amount = roundMoney(transaction.amount);
        paymentsWithoutAccount[currency] = roundMoney(paymentsWithoutAccount[currency] + amount);
        return { id: String(transaction._id), concept: transaction.concept || transaction.description || 'Pago registrado',
            category: transaction.category || 'Varios', amount, currency, date: transaction.date,
            status: transaction.status, notes: 'Pago registrado; falta asignar la cuenta de origen.' };
    });
    const totalsByCurrency = {};
    for (const currency of ['ARS', 'USD']) {
        const common = cash[currency] + portfolioOwn[currency] - debt[currency] - paymentsWithoutAccount[currency];
        totalsByCurrency[currency] = {
            capitalPropioCosto: roundMoney(metrics.ownCost[currency] + common),
            capitalPropioPublicado: roundMoney(metrics.ownAsking[currency] + common),
            margenComercialPotencial: roundMoney(metrics.ownAsking[currency] - metrics.ownCost[currency]),
            efectivoDisponible: roundMoney(cash[currency] - paymentsWithoutAccount[currency]), stockPropioPublicado: metrics.ownAsking[currency],
            stockInversionistasPublicado: metrics.investorAsking[currency],
            valorStockTotalPublicado: roundMoney(metrics.ownAsking[currency] + metrics.investorAsking[currency]),
            consignacionesTotalPublicado: metrics.thirdPartyAsking[currency]
        };
    }
    const ownVehicles = auditedVehicles.filter(v => !v.isConsignment && !v.isThirdParty);
    const consignmentCount = auditedVehicles.filter(v => v.isConsignment).length;
    return { cutoffDate, currency: 'ARS', totalsByCurrency,
        conciliacionStatus: metrics.missingCost || pagosSinCuentaList.length ? 'parcial_datos_pendientes' : 'completa',
        conciliacionMessage: `${metrics.missingCost} unidades sin costo real registrado. ${pagosSinCuentaList.length} pagos con cuenta sin asignar descontados del capital y efectivo disponible. ARS y USD separados; no se convirtió ni se inventó un costo.`,
        componentes: {
            stockPropioCosto: { label: 'Stock propio a costo', signo: '+', monto: metrics.ownCost.ARS, byCurrency: metrics.ownCost,
                subtotalInversionistas: metrics.investorCost.ARS, inversionistasByCurrency: metrics.investorCost,
                unidadesTotal: ownVehicles.length, unidadesSinCosto: metrics.missingCost,
                descripcion: 'Participación real en compra o toma y gastos del stock activo, separada por moneda.', items: ownVehicles, itemsConsignaciones: auditedVehicles.filter(v => v.isConsignment || v.isThirdParty) },
            efectivoPropio: { label: 'Efectivo propio conciliado', signo: '+', monto: cash.ARS, byCurrency: cash,
                cuentasCount: accountsList.length, descripcion: 'Caja y bancos reales sin duplicar cajas virtuales de Tesorería.', items: accountsList },
            carteraPropia: { label: 'Cartera propia pendiente', signo: '+', monto: portfolioOwn.ARS, byCurrency: portfolioOwn,
                montoTotalNominal: portfolio.ARS, nominalByCurrency: portfolio, montoInversionistas: portfolioExternal.ARS,
                inversionistasByCurrency: portfolioExternal, cuotasCount: carteraList.length,
                descripcion: 'Saldo sin cobrar según la participación real; excluye ventas canceladas y cuotas cobradas.', items: carteraList },
            otrosCreditos: { label: 'Otros créditos propios verificados', signo: '+', monto: 0, byCurrency: emptyMoney(), creditosCount: 0,
                descripcion: 'Sin créditos adicionales documentados.', items: [] },
            deudasPropia: { label: 'Deudas y obligaciones propias', signo: '−', monto: debt.ARS, byCurrency: debt,
                deudasCount: deudasList.length, descripcion: 'Egresos documentados pendientes, separados por moneda.', items: deudasList },
            pagosSinCuenta: { label: 'Pagos con cuenta sin asignar', signo: '−', monto: paymentsWithoutAccount.ARS, byCurrency: paymentsWithoutAccount,
                pagosCount: pagosSinCuentaList.length,
                descripcion: 'Pagos ya registrados cuyo origen falta asignar. Ajustan el capital y el efectivo disponible hasta descontarse de su cuenta real; no son deudas pendientes.',
                items: pagosSinCuentaList }
        },
        totales: { ...totalsByCurrency.ARS, consignacionesCount: consignmentCount },
        auditoriaIndicadores: { totalStockActivo: stockCars.length, consignaciones: consignmentCount,
            disponibles: stockCars.filter(c => stockStatus(c) === 'disponible').length,
            reservados: stockCars.filter(c => stockStatus(c) === 'reservado').length,
            pausados: stockCars.filter(c => stockStatus(c) === 'pausado').length,
            sinEstado: stockCars.filter(c => stockStatus(c) === 'sin_estado').length,
            compartidos: auditedVehicles.filter(v => v.isShared).length,
            ceroKm: stockCars.filter(c => /^(0\s?km|nuevo)$/i.test(c.condition || '') || c.km === 0).length,
            origenPesosUno: { hallazgo: 'Importes provisorios o no redondos registrados en el inventario actual.',
                vehiculos: auditedVehicles.filter(v => v.price % 10 !== 0).map(v => ({ id: v.id,
                    titulo: `${v.brand} ${v.name} (${v.year})`, estado: v.status, precioPublicado: v.price, currency: v.currency,
                    costo: v.purchasePrice, participacionPropia: `${v.ownPct}%`, contribucionPropio: v.precioPropio })),
                explicacion: 'Diagnóstico calculado sobre los registros actuales, sin cifras históricas fijas ni cambios de moneda por el importe.' }
        }
    };
}
