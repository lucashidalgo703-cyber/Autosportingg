import { projectCapitalReinvestment } from './capitalReinvestmentEngine.js';
import Car from '../models/Car.js';
import Sale from '../models/Sale.js';
import Transaction from '../models/Transaction.js';
import Installment from '../models/Installment.js';
import TreasuryBox from '../models/TreasuryBox.js';
import TreasuryConfig from '../models/TreasuryConfig.js';
import Account from '../models/Account.js';
import TreasuryReconciliation from '../models/TreasuryReconciliation.js';
import { computeIncomeOwnership } from './treasuryIncomeOwnership.js';

const SOURCE_LIMIT = 10000;
const EXCLUDED_CATEGORIES = new Set([
    'Ajuste de Conciliación Inicial', 'Conciliación Tesorería', 'Ajuste de Saldo',
    'Transferencia Interna', 'Traspaso', 'Regularización Histórica'
]);
const id = (value) => String(value?._id ?? value ?? '');
const plain = (document) => document?.toObject ? document.toObject() : document;

const SELECT = {
    cars: '_id brand name year purchasePrice purchaseCurrency agencyOwned investor.percentage consignedBy consignmentCommission ownerName tradeInOrigin.saleId tradeInOrigin.value tradeInOrigin.currency purchasePaymentState.modality purchasePaymentState.status purchasePaymentState.totalCost purchasePaymentState.amountPaid purchasePaymentState.pendingDebt purchasePaymentState.currency purchasePaymentState.payments.transactionId purchasePaymentState.payments.amount purchasePaymentState.payments.currency purchasePaymentState.payments.date purchasePaymentState.payments.expenseId purchasePaymentState.payments.deductedFromBox purchasePaymentState.payments.boxKey purchasePaymentState.payments.strategicBoxKey expenses._id expenses.amount expenses.currency expenses.date expenses.paid expenses.isPending expenses.status expenses.transactionId',
    sales: '_id vehicleId status saleDate salePrice saleCurrency exchangeRate depositAppliedAmount depositAppliedCurrency commissionAmount commissionCurrency commissionSettings.enabled commissionSettings.totalCommissionAmount commissionSettings.fixedAmount commissionSettings.percent financingDetails.hasFinancing financingDetails.financedBalance tradeInTotalAmount tradeIns.estimatedValue tradeIns.currency saleExpenses._id saleExpenses.amount saleExpenses.currency saleExpenses.status saleExpenses.date saleExpenses.transactionId',
    transactions: '_id type amount currency date status source concept description category saleId reservationId vehicleId carId installmentId accountId isTreasuryDistributed isTreasuryDistributionReversed thirdPartyAmount thirdPartyCapitalReturn thirdPartyProfitShare thirdPartySettled treasuryBreakdown.totalCollected treasuryBreakdown.ownGrossAmount treasuryBreakdown.thirdPartyAmount treasuryBreakdown.thirdPartyCapitalReturn treasuryBreakdown.thirdPartyProfitShare treasuryBreakdown.operationPendingCostsReserved treasuryBreakdown.capitalRecoveredToStock treasuryBreakdown.marginCollected treasuryBreakdown.extraReinvestmentToStock treasuryBreakdown.obligationsSeparated treasuryBreakdown.taxObligationsSeparated treasuryBreakdown.distributableMargin treasuryBreakdown.marginDistributed treasuryBreakdown.pendingDistributionAmount treasuryBreakdown.unassignedRemainder treasuryBreakdown.schemeKey treasuryBreakdown.appliedAllocations.boxKey treasuryBreakdown.appliedAllocations.amount treasuryBreakdown.appliedAllocations.historyType',
    installments: '_id saleId vehicleId amount currency dueDate status paidAmount paymentDate transactionId cancelled',
    boxes: '_id key balanceARS balanceUSD pendingCommitmentsARS pendingCommitmentsUSD isActive history.date history.type history.amount history.currency history.sourceIncomeId history.sourceExpenseId history.transactionId history.relatedTransactionId',
    accounts: '_id currency balance isActive',
    config: '_id reserveMonths isSetupCompleted activeDistributionScheme reinvestmentExtraConfigured reinvestmentExtraPct',
    reconciliations: '_id cutoffDate status createdAt accountsSnapshot.accountId accountsSnapshot.currency accountsSnapshot.realBalance'
};

async function bounded(query, limit = SOURCE_LIMIT) {
    const rows = await query.limit(limit + 1).lean();
    return { rows: rows.slice(0, limit), truncated: rows.length > limit };
}

/** Read-only adapter. Dependencies are injectable to make database behavior testable. */
export async function buildCapitalReinvestmentSnapshot(models = {}, { asOf = new Date(), limit = SOURCE_LIMIT } = {}) {
    const source = { Car, Sale, Transaction, Installment, TreasuryBox, TreasuryConfig, Account, TreasuryReconciliation, ...models };
    const [carsResult, salesResult, txResult, installmentResult, boxesResult, accountsResult, configDoc, reconciliationDoc] = await Promise.all([
        bounded(source.Car.find({}).select(SELECT.cars), limit),
        bounded(source.Sale.find({}).select(SELECT.sales), limit),
        bounded(source.Transaction.find({}).select(SELECT.transactions), limit),
        bounded(source.Installment.find({}).select(SELECT.installments), limit),
        bounded(source.TreasuryBox.find({}).select(SELECT.boxes), limit),
        bounded(source.Account.find({ isActive: { $ne: false } }).select(SELECT.accounts), limit),
        source.TreasuryConfig.findOne({}).select(SELECT.config).lean(),
        source.TreasuryReconciliation.findOne({ status: 'confirmado' }).sort({ cutoffDate: -1, createdAt: -1 }).select(SELECT.reconciliations).lean()
    ]);
    const truncated = [carsResult, salesResult, txResult, installmentResult, boxesResult, accountsResult].some((x) => x.truncated);
    const cars = carsResult.rows.map(plain).map((car) => ({
        ...car,
        investor: car.investor ? { percentage: car.investor.percentage } : undefined,
        // Retain only the ownership signal needed by the calculation, never the owner's identity.
        consignedBy: car.consignedBy ? 'Consignación' : undefined,
        ownerName: car.ownerName ? 'Titular' : undefined
    }));
    const sales = salesResult.rows.map(plain);
    const transactions = txResult.rows.map(plain);
    const installments = installmentResult.rows.map(plain);
    const boxes = boxesResult.rows.filter((box) => box.isActive !== false).map((box) => ({
        key: box.key,
        balanceARS: box.balanceARS,
        balanceUSD: box.balanceUSD,
        commitmentsARS: box.pendingCommitmentsARS,
        commitmentsUSD: box.pendingCommitmentsUSD,
        shortfallARS: 0,
        shortfallUSD: 0,
        history: (box.history || []).map((entry) => ({
            date: entry.date, type: entry.type, amount: entry.amount, currency: entry.currency,
            sourceIncomeId: entry.sourceIncomeId, sourceExpenseId: entry.sourceExpenseId,
            transactionId: entry.transactionId, relatedTransactionId: entry.relatedTransactionId
        }))
    }));
    const accountBalances = { ARS: 0, USD: 0 };
    for (const account of accountsResult.rows) {
        if (account.currency === 'ARS' || account.currency === 'USD') accountBalances[account.currency] += Number(account.balance || 0);
    }

    const vehicleById = new Map(cars.map((car) => [id(car), car]));
    const activeIncome = transactions.filter((tx) => tx.type === 'Ingreso' && ['activo', 'Completado'].includes(tx.status));
    const operations = sales
        .filter((sale) => sale.status !== 'cancelada' && sale.vehicleId && vehicleById.has(id(sale.vehicleId)))
        .map((sale) => {
            const vehicle = vehicleById.get(id(sale.vehicleId));
            const linkedTransactions = activeIncome.filter((tx) => id(tx.saleId) === id(sale));
            const currencyMismatch = linkedTransactions.some((tx) => tx.currency !== sale.saleCurrency);
            const saleTransactions = linkedTransactions.filter((tx) => tx.currency === sale.saleCurrency);
            const saleInstallments = installments.filter((item) => id(item.saleId) === id(sale));
            return {
                id: id(sale), sale, vehicle,
                saleTransactions,
                sourceCurrencyMismatch: currencyMismatch,
                paidSettlements: [],
                // Cuotas no sustituyen los movimientos de cobro: solo se exponen como evidencia pendiente.
                installments: saleInstallments.map((item) => ({ _id: item._id, amount: item.amount, currency: item.currency, dueDate: item.dueDate, status: item.status, paidAmount: item.paidAmount, paymentDate: item.paymentDate, transactionId: item.transactionId })),
                config: {
                    activeDistributionScheme: configDoc?.activeDistributionScheme || null,
                    reinvestmentExtraConfigured: Boolean(configDoc?.reinvestmentExtraConfigured),
                    reinvestmentExtraPct: configDoc?.reinvestmentExtraPct ?? null
                },
                treasuryBoxes: boxes
            };
        });

    const expenseTransactions = transactions.filter((tx) => tx.type === 'Egreso' && tx.status === 'anulado');
    const thirdPartyFunds = { ARS: 0, USD: 0 };
    const cutoff = reconciliationDoc?.cutoffDate ? new Date(reconciliationDoc.cutoffDate) : null;
    for (const tx of transactions) {
        if (tx.type !== 'Ingreso' || !['activo', 'Completado'].includes(tx.status) || tx.thirdPartySettled || EXCLUDED_CATEGORIES.has(tx.category)) continue;
        if (cutoff && new Date(tx.date) <= cutoff) continue;
        const vehicle = vehicleById.get(id(tx.vehicleId || tx.carId));
        const ownership = computeIncomeOwnership({ ...tx, vehicleId: vehicle || null });
        const currency = tx.currency === 'USD' ? 'USD' : 'ARS';
        thirdPartyFunds[currency] += Number(ownership.tercerosAmount || 0);
    }
    const thirdPartyPayouts = transactions.filter((tx) => tx.type === 'Egreso' && ['activo', 'Completado'].includes(tx.status)
        && ['Pago a Propietario', 'Liquidación Socio', 'Pago Consignación', 'Liquidación Tercero'].includes(tx.category)
        && (!cutoff || new Date(tx.date) > cutoff));
    for (const tx of thirdPartyPayouts) thirdPartyFunds[tx.currency === 'USD' ? 'USD' : 'ARS'] -= Number(tx.amount || 0);
    thirdPartyFunds.ARS = Math.max(0, thirdPartyFunds.ARS);
    thirdPartyFunds.USD = Math.max(0, thirdPartyFunds.USD);

    const assigned = { ARS: 0, USD: 0 };
    for (const box of boxes) {
        assigned.ARS += Number(box.balanceARS || 0);
        assigned.USD += Number(box.balanceUSD || 0);
    }
    const unassignedOwn = {
        ARS: accountBalances.ARS - assigned.ARS - thirdPartyFunds.ARS,
        USD: accountBalances.USD - assigned.USD - thirdPartyFunds.USD
    };
    const latestReconciliation = reconciliationDoc && new Date(reconciliationDoc.cutoffDate) <= new Date(asOf);
    const reconciliationAccountById = new Map((reconciliationDoc?.accountsSnapshot || []).map((entry) => [id(entry.accountId), entry]));
    const accountMovementEvidence = Boolean(latestReconciliation) && accountsResult.rows.every((account) => {
        const opening = reconciliationAccountById.get(id(account));
        if (!opening || opening.currency !== account.currency || !Number.isFinite(Number(opening.realBalance))) return false;
        const expected = transactions.filter((tx) => id(tx.accountId) === id(account) && new Date(tx.date) > new Date(reconciliationDoc.cutoffDate)
            && ['activo', 'Completado'].includes(tx.status) && (tx.type === 'Ingreso' || tx.type === 'Egreso'))
            .reduce((balance, tx) => balance + (tx.type === 'Ingreso' ? 1 : -1) * Number(tx.amount || 0), Number(opening.realBalance));
        return Math.abs(Number(account.balance || 0) - expected) <= 0.01;
    });
    const equationBalanced = ['ARS', 'USD'].every((currency) => Math.abs(
        accountBalances[currency] - (assigned[currency] + unassignedOwn[currency] + thirdPartyFunds[currency])
    ) <= 0.01);
    const reconciliationReady = Boolean(latestReconciliation && accountMovementEvidence && equationBalanced && !truncated && configDoc?.isSetupCompleted);

    return {
        demo: false,
        asOf: new Date(asOf).toISOString(),
        operations,
        vehicles: cars,
        transactions,
        sourceCompleteness: { truncated, rowLimit: limit },
        treasury: {
            reconciliationStatus: reconciliationReady ? 'conciliado' : 'pendiente_conciliacion',
            isBalanced: reconciliationReady,
            sourceReconciliation: {
                lastCutoff: reconciliationDoc?.cutoffDate || null,
                cutoffConfirmed: Boolean(latestReconciliation),
                accountMovementEvidence,
                equationBalanced,
                setupCompleted: Boolean(configDoc?.isSetupCompleted),
                sourceLimitExceeded: truncated,
                byCurrency: Object.fromEntries(['ARS', 'USD'].map((currency) => [currency, {
                    accountBalance: accountBalances[currency],
                    assignedToBoxes: assigned[currency],
                    thirdPartyFunds: thirdPartyFunds[currency],
                    ownUnassigned: unassignedOwn[currency],
                    equationDifference: Math.round((accountBalances[currency] - assigned[currency] - thirdPartyFunds[currency] - unassignedOwn[currency]) * 100) / 100
                }]))
            },
            accountBalances: reconciliationReady ? accountBalances : { ARS: null, USD: null },
            unassignedOwn: reconciliationReady ? unassignedOwn : { ARS: null, USD: null },
            thirdPartyFunds: reconciliationReady ? thirdPartyFunds : { ARS: null, USD: null },
            boxes,
            expenseTransactions,
            reconciliationCutoff: reconciliationDoc?.cutoffDate || null,
            sourceCompleteness: { truncated, rowLimit: limit }
        }
    };
}

export async function getCapitalReinvestmentProjection(models, options) {
    const snapshot = await buildCapitalReinvestmentSnapshot(models, options);
    const projection = projectCapitalReinvestment(snapshot);
    projection.sourceReconciliation = snapshot.treasury.sourceReconciliation;
    const expenseHistory = snapshot.treasury.boxes.flatMap((box) => box.history || []);
    const expenseIdsWithTreasuryDebit = new Set(expenseHistory
        .filter((entry) => entry.type === 'egreso_finanzas' && entry.sourceExpenseId)
        .map((entry) => id(entry.sourceExpenseId)));
    const reversedExpenseIdsWithUnverifiedBalance = new Set(snapshot.treasury.expenseTransactions
        .filter((transaction) => expenseIdsWithTreasuryDebit.has(id(transaction)))
        .map(id));
    if (reversedExpenseIdsWithUnverifiedBalance.size > 0) {
        const warning = {
            code: 'expense_reversal_balance_unverified',
            message: 'Hay gastos anulados con débitos previos de caja. El historial no prueba que el saldo se haya restaurado correctamente; la liquidez queda pendiente, incluso si existe un asiento de reversa.'
        };
        projection.warnings.push(warning);
        projection.reconciliationStatus = 'pendiente_conciliacion';
        for (const currency of ['ARS', 'USD']) {
            const liquidity = projection.liquidity[currency];
            liquidity.status = 'pendiente_conciliacion';
            for (const key of ['accountCash', 'assignedToBoxes', 'ownUnassigned', 'thirdPartyFunds', 'protectedFunds', 'commitments', 'uncoveredCommitments', 'stockAvailable', 'availableForPurchase']) liquidity[key] = null;
        }
        projection.sourceReconciliation = {
            ...projection.sourceReconciliation,
            balanceIntegrity: 'unknown_expense_reversal',
            byCurrency: Object.fromEntries(['ARS', 'USD'].map((currency) => [currency, {
                ...projection.sourceReconciliation.byCurrency[currency],
                accountBalance: null,
                assignedToBoxes: null,
                thirdPartyFunds: null,
                ownUnassigned: null,
                equationDifference: null
            }]))
        };
        projection.unresolvedExpenseReversalIds = Math.max(projection.unresolvedExpenseReversalIds.length, reversedExpenseIdsWithUnverifiedBalance.size);
    }
    if (snapshot.sourceCompleteness.truncated) {
        projection.reconciliationStatus = 'pendiente_conciliacion';
        projection.warnings.push({ code: 'source_limit_exceeded', message: 'El volumen de datos supera el límite de lectura; no se muestran importes como conciliados.' });
        for (const totals of Object.values(projection.currencies)) {
            for (const key of ['acquisitionCost', 'totalAttributableCost', 'ownCapitalDisbursed', 'acquisitionDebt', 'capitalTarget', 'capitalRecovered', 'capitalAllocatedToStock', 'capitalPending', 'recoveredPendingAssignment', 'reinvested', 'reinvestmentTarget', 'reinvestmentAllocated', 'estimatedMargin', 'realizedMargin']) totals[key] = null;
        }
        projection.operations = projection.operations.map((operation) => ({
            ...operation,
            status: 'pendiente_conciliacion',
            acquisitionCost: null,
            totalAttributableCost: null,
            ownCapitalDisbursed: null,
            acquisitionDebt: null,
            capitalTarget: null,
            capitalRecovered: null,
            capitalAllocatedToStock: null,
            capitalPending: null,
            recoveredPendingAssignment: null,
            reinvestmentTarget: null,
            reinvestmentAllocated: null,
            estimatedMargin: null,
            realizedMargin: null,
            confirmedOwnCollections: null
        }));
        for (const currency of ['ARS', 'USD']) {
            projection.liquidity[currency].status = 'pendiente_conciliacion';
            projection.liquidity[currency].availableForPurchase = null;
        }
    }
    const operationBySale = new Map(snapshot.operations.map((operation) => [id(operation.sale), operation]));
    const currencyMismatchIds = new Set(snapshot.operations.filter((operation) => operation.sourceCurrencyMismatch).map((operation) => id(operation.sale)));
    projection.operations = projection.operations.map((operation) => {
        const sourceOperation = operationBySale.get(operation.id);
        if (!sourceOperation) return operation;
        if (sourceOperation.sourceCurrencyMismatch) {
            const warning = { code: 'sale_collection_currency_mismatch', message: 'La operación tiene cobros en moneda distinta a la venta y requiere conciliación explícita.' };
            operation.warnings = [...operation.warnings, warning];
            projection.warnings.push(warning);
            operation.status = 'pendiente_conciliacion';
            for (const key of ['capitalTarget', 'capitalRecovered', 'capitalAllocatedToStock', 'capitalPending', 'recoveredPendingAssignment', 'reinvestmentTarget', 'reinvestmentAllocated', 'realizedMargin', 'confirmedOwnCollections']) operation[key] = null;
        }
        const transactions = sourceOperation.saleTransactions.filter((tx) => tx.isTreasuryDistributed && !tx.isTreasuryDistributionReversed);
        const sourceTotals = {
            capitalRecovered: transactions.reduce((sum, tx) => sum + Number(tx.treasuryBreakdown?.capitalRecoveredToStock || 0), 0),
            reinvestmentAllocated: transactions.reduce((sum, tx) => sum + Number(tx.treasuryBreakdown?.extraReinvestmentToStock || 0), 0),
            obligationsSeparated: transactions.reduce((sum, tx) => sum + Number(tx.treasuryBreakdown?.obligationsSeparated ?? tx.treasuryBreakdown?.operationPendingCostsReserved ?? 0), 0),
            pendingDistribution: transactions.reduce((sum, tx) => sum + Number(tx.treasuryBreakdown?.pendingDistributionAmount ?? tx.treasuryBreakdown?.unassignedRemainder ?? 0), 0)
        };
        const projectedTotals = {
            capitalRecovered: sourceOperation.saleTransactions.length ? Number(operation.recoveryState?.alreadyRecoveredCapital ?? 0) : null,
            reinvestmentAllocated: sourceOperation.saleTransactions.length ? Number(operation.recoveryState?.alreadyAllocatedExtraReinvestment ?? 0) : null,
            obligationsSeparated: sourceOperation.saleTransactions.length ? Number(operation.recoveryState?.alreadyReservedPendingCosts ?? 0) : null,
            pendingDistribution: sourceOperation.saleTransactions.length ? Number(operation.recoveryState?.pendingDistributionAmount ?? 0) : null
        };
        const differences = Object.fromEntries(Object.keys(sourceTotals).map((key) => [key,
            projectedTotals[key] === null ? null : Math.round((sourceTotals[key] - projectedTotals[key]) * 100) / 100
        ]));
        const comparable = Object.values(differences).every((value) => value !== null);
        const reconciled = comparable && !sourceOperation.sourceCurrencyMismatch && Object.values(differences).every((value) => Math.abs(value) <= 0.01);
        operation.waterfallReconciliation = {
            status: reconciled ? 'conciliado' : 'pendiente_conciliacion',
            saleDate: sourceOperation.sale.saleDate || null,
            sourceTotals,
            projectedTotals,
            differences,
            reason: reconciled ? null : 'Los datos heredados no permiten una comparación completa o muestran diferencias frente a la proyección.'
        };
        return operation;
    });
    if (currencyMismatchIds.size > 0) projection.reconciliationStatus = 'pendiente_conciliacion';
    // API DTO: no full recovery helper object, model document, or source transaction identifiers.
    projection.operations = projection.operations.map(({ recoveryState, id: operationId, ...operation }) => ({
        ...operation,
        id: operationId
    }));
    projection.unresolvedExpenseReversalIds = projection.unresolvedExpenseReversalIds.length;
    projection.unresolvedCapitalAllocationIds = projection.unresolvedCapitalAllocationIds.length;
    return projection;
}

