import { computeIncomeOwnership } from './treasuryIncomeOwnership.js';
import {
    computeOperationRecoveryState,
    computeSchemeDistributionForCollection
} from './treasuryWaterfallHelpers.js';
import { roundMoney } from '../utils/saleCommercial.js';

const CURRENCIES = ['ARS', 'USD'];
const ACTIVE_TRANSACTION_STATUSES = new Set(['activo', 'Completado']);
const CENT = 0.01;

const amount = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const idOf = (value) => String(value?._id ?? value?.id ?? value ?? '');
const currencyOf = (value) => value === 'USD' ? 'USD' : 'ARS';
const statusOfTransaction = (transaction) => ACTIVE_TRANSACTION_STATUSES.has(transaction?.status);

function addWarning(warnings, code, message) {
    if (!warnings.some((warning) => warning.code === code)) warnings.push({ code, message });
}

function findActiveExpenseTransaction(transactions, transactionId, expectedAmount, expectedCurrency) {
    if (!transactionId) return null;
    const tx = transactions.find((candidate) => idOf(candidate) === String(transactionId));
    if (!tx || tx.type !== 'Egreso' || !statusOfTransaction(tx)) return null;
    if (Math.abs(Number(tx.amount || 0) - Number(expectedAmount || 0)) > CENT) return null;
    if (currencyOf(tx.currency) !== currencyOf(expectedCurrency)) return null;
    return tx;
}

function collectVerifiedPurchasePayments(operation, allTransactions, warnings) {
    const paymentState = operation.vehicle?.purchasePaymentState;
    if (!paymentState) {
        if (operation.vehicle?.tradeInOrigin?.saleId) {
            return { paid: 0, debt: 0, paymentsVerified: true, reconciled: true };
        }
        addWarning(warnings, 'purchase_payment_state_missing', 'No hay estado de pago verificable para el costo de adquisición.');
        return { paid: 0, debt: null, paymentsVerified: false, reconciled: false };
    }

    const payments = Array.isArray(paymentState.payments) ? paymentState.payments : [];
    const transactionIndex = new Map(allTransactions.map((tx) => [idOf(tx), tx]));
    const seenPaymentIds = new Set();
    let verifiedPaid = 0;
    let reconciled = true;

    for (const payment of payments) {
        const paymentId = String(payment.transactionId || '');
        if (paymentId && seenPaymentIds.has(paymentId)) {
            reconciled = false;
            addWarning(warnings, 'duplicate_purchase_payment', 'Un mismo egreso de adquisición aparece repetido y no se duplica el desembolso.');
            continue;
        }
        if (paymentId) seenPaymentIds.add(paymentId);
        const linkedTx = transactionIndex.get(String(payment.transactionId || ''));
        const validTx = findActiveExpenseTransaction(
            allTransactions,
            payment.transactionId,
            payment.amount,
            payment.currency || paymentState.currency
        );
        if (!validTx || (linkedTx?.vehicleId && idOf(linkedTx.vehicleId) !== idOf(operation.vehicle))) {
            reconciled = false;
            addWarning(warnings, 'purchase_payment_unverified', 'Hay pagos de adquisición sin un egreso activo y coincidente.');
            continue;
        }
        const converted = convertToCurrency(
            validTx.amount,
            validTx.currency,
            operation.sale?.saleCurrency || paymentState.currency,
            operation.sale?.exchangeRate
        );
        if (converted === null) {
            reconciled = false;
            addWarning(warnings, 'purchase_payment_fx_missing', 'Falta una cotización identificable para conciliar pagos de adquisición en otra moneda.');
            continue;
        }
        verifiedPaid = roundMoney(verifiedPaid + converted);
    }

    const recordedPaid = amount(paymentState.amountPaid);
    if (payments.length === 0 && Number(recordedPaid || 0) > 0) {
        reconciled = false;
        addWarning(warnings, 'historical_purchase_unverified', 'El pago histórico de adquisición no tiene movimientos vinculados para confirmarlo.');
    } else if (recordedPaid !== null && Math.abs(recordedPaid - verifiedPaid) > CENT) {
        reconciled = false;
        addWarning(warnings, 'purchase_payment_total_mismatch', 'El importe pagado del vehículo no coincide con los egresos activos vinculados.');
    }

    const debt = amount(paymentState.pendingDebt);
    if (debt === null || debt < 0) {
        reconciled = false;
        addWarning(warnings, 'purchase_debt_unknown', 'La deuda de adquisición no tiene un importe conciliable.');
    } else if (debt > CENT) {
        addWarning(warnings, 'purchase_debt_pending', 'Existe deuda de adquisición pendiente; el objetivo de recuperación requiere conciliación.');
    }

    const normalizedDebt = debt === null ? null : convertToCurrency(
        debt,
        paymentState.currency || operation.vehicle?.purchaseCurrency,
        operation.sale?.saleCurrency || paymentState.currency,
        operation.sale?.exchangeRate
    );
    if (debt !== null && normalizedDebt === null) {
        reconciled = false;
        addWarning(warnings, 'purchase_debt_fx_missing', 'Falta una cotización identificable para conciliar la deuda de adquisición.');
    }
    if (paymentState.status === 'no_aplica' && operation.vehicle?.tradeInOrigin?.saleId && payments.length === 0) {
        return { paid: 0, debt: normalizedDebt ?? 0, paymentsVerified: true, reconciled: true };
    }

    return {
        paid: verifiedPaid,
        debt: normalizedDebt,
        paymentsVerified: reconciled,
        reconciled: reconciled && normalizedDebt !== null && normalizedDebt <= CENT
    };
}

function convertToCurrency(value, sourceCurrency, targetCurrency, exchangeRate) {
    const raw = Number(value || 0);
    if (currencyOf(sourceCurrency) === currencyOf(targetCurrency)) return roundMoney(raw);
    const rate = Number(exchangeRate || 0);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    return roundMoney(currencyOf(targetCurrency) === 'ARS' ? raw * rate : raw / rate);
}

function assessUnpaidOrUnlinkedExpenses(operation, allTransactions, warnings) {
    const expenses = [
        ...(Array.isArray(operation.vehicle?.expenses) ? operation.vehicle.expenses : []),
        ...(Array.isArray(operation.sale?.saleExpenses) ? operation.sale.saleExpenses : [])
    ];
    if (expenses.length === 0) return { reconciled: true, count: 0, paid: 0 };

    const normalizedPayments = operation.verifiedDirectCostPayments || [];
    const verifiedPaymentByExpense = new Map();
    for (const payment of normalizedPayments) {
        const tx = findActiveExpenseTransaction(allTransactions, payment.transactionId, payment.amount, payment.currency);
        if (tx && payment.expenseId) verifiedPaymentByExpense.set(String(payment.expenseId), tx);
    }

    let paid = 0;
    const unlinked = expenses.filter((expense) => {
        const expenseId = idOf(expense);
        const txId = expense.transactionId || normalizedPayments.find((payment) => String(payment.expenseId) === expenseId)?.transactionId;
        const tx = findActiveExpenseTransaction(allTransactions, txId, expense.amount, expense.currency);
        const isExplicitlyPending = expense?.status === 'pendiente' || expense?.paid === false || expense?.isPending === true;
        const isExplicitlyPaid = expense?.status === 'pagado' || expense?.status === 'paid' || expense?.paid === true || expense?.isPending === false;
        const verifiedTx = tx || verifiedPaymentByExpense.get(expenseId);
        if (isExplicitlyPaid && verifiedTx) {
            const converted = convertToCurrency(
                verifiedTx.amount,
                verifiedTx.currency,
                operation.sale?.saleCurrency || expense.currency,
                operation.sale?.exchangeRate
            );
            if (converted !== null) paid = roundMoney(paid + converted);
            else addWarning(warnings, 'expense_payment_fx_missing', 'Falta una cotización identificable para conciliar gastos en otra moneda.');
        }
        return isExplicitlyPending || !isExplicitlyPaid || !verifiedTx;
    });
    if (unlinked.length > 0) {
        addWarning(warnings, 'expense_payment_unverified', 'Hay gastos directos sin estado de pago o sin egreso vinculado; no se cuentan como desembolso confirmado.');
    }
    return { reconciled: unlinked.length === 0, count: unlinked.length, paid };
}

function verifyExpenseReversals(treasurySnapshot, warnings) {
    const expenseTransactions = treasurySnapshot?.expenseTransactions || [];
    const history = (treasurySnapshot?.boxes || []).flatMap((box) => box.history || []);
    const unresolved = [];

    for (const tx of expenseTransactions) {
        if (tx?.status !== 'anulado') continue;
        const txId = idOf(tx);
        const hadTreasuryOutflow = history.some((entry) =>
            idOf(entry.sourceExpenseId) === txId && entry.type === 'egreso_finanzas'
        );
        const hasReversal = history.some((entry) =>
            idOf(entry.sourceExpenseId) === txId && entry.type === 'reversion_egreso'
        );
        if (hadTreasuryOutflow && !hasReversal) unresolved.push(txId);
    }

    if (unresolved.length > 0) {
        addWarning(warnings, 'expense_reversal_unreconciled', 'Hay gastos anulados cuyo débito de caja no tiene una reversa auditable.');
    }
    return unresolved;
}

function verifyCapitalAllocationHistory(treasurySnapshot, transactions, warnings) {
    const history = (treasurySnapshot?.boxes || []).flatMap((box) => box.history || []);
    const unresolved = [];
    for (const tx of transactions) {
        if (tx?.type !== 'Ingreso' || !statusOfTransaction(tx) || !tx.isTreasuryDistributed || tx.isTreasuryDistributionReversed) continue;
        const expected = Number(tx.treasuryBreakdown?.capitalRecoveredToStock || 0);
        if (expected <= CENT) continue;
        const txId = idOf(tx);
        const actual = roundMoney(history
            .filter((entry) => idOf(entry.sourceIncomeId) === txId
                && entry.type === 'recuperacion_capital'
                && currencyOf(entry.currency) === currencyOf(tx.currency))
            .reduce((sum, entry) => sum + Number(entry.amount || 0), 0));
        if (Math.abs(actual - expected) > CENT) unresolved.push(txId);
    }
    if (unresolved.length > 0) {
        addWarning(warnings, 'capital_allocation_history_mismatch', 'El desglose marca capital recuperado, pero el historial de cajas no confirma la misma asignación a Stock.');
    }
    return unresolved;
}

function computeLiquidity(treasurySnapshot, currency, reversalIds) {
    const accounts = amount(treasurySnapshot?.accountBalances?.[currency]);
    const unassignedOwn = amount(treasurySnapshot?.unassignedOwn?.[currency]);
    const thirdPartyFunds = amount(treasurySnapshot?.thirdPartyFunds?.[currency]);
    const boxes = Array.isArray(treasurySnapshot?.boxes) ? treasurySnapshot.boxes : [];
    const boxBalance = (key) => amount(boxes.find((box) => box.key === key)?.[`balance${currency}`]);
    const boxCommitments = (key) => amount(boxes.find((box) => box.key === key)?.[`commitments${currency}`]);
    const accountValue = accounts ?? 0;
    const unassignedValue = unassignedOwn ?? 0;
    const thirdPartyValue = thirdPartyFunds ?? 0;
    const assignedTotal = roundMoney(boxes.reduce((sum, box) => sum + Number(box?.[`balance${currency}`] || 0), 0));
    const expectedAccounts = roundMoney(assignedTotal + unassignedValue + thirdPartyValue);
    const stockBalance = boxBalance('stock');
    const stockCommitments = boxCommitments('stock');
    const uncoveredCommitments = roundMoney(boxes.reduce((sum, box) => sum + Math.max(0, Number(box?.[`shortfall${currency}`] || 0)), 0));
    const equationBalanced = accounts !== null && unassignedOwn !== null && thirdPartyFunds !== null
        && Math.abs(accountValue - expectedAccounts) <= CENT;
    const reconciliationReady = treasurySnapshot?.reconciliationStatus === 'conciliado'
        && treasurySnapshot?.isBalanced === true
        && equationBalanced
        && stockBalance !== null
        && stockCommitments !== null
        && unassignedValue >= 0
        && thirdPartyValue >= 0
        && uncoveredCommitments <= CENT
        && reversalIds.length === 0;
    const protectedFunds = roundMoney(
        Math.max(0, boxBalance('reserva') || 0)
        + Math.max(0, boxCommitments('impuestos') || 0)
        + Math.max(0, boxCommitments('deudas') || 0)
    );
    const allCommitments = roundMoney(boxes.reduce((sum, box) => sum + Math.max(0, Number(box?.[`commitments${currency}`] || 0)), 0));
    const stockAvailable = stockBalance === null || stockCommitments === null
        ? null
        : roundMoney(Math.max(0, stockBalance - stockCommitments));
    const availableForPurchase = reconciliationReady && stockAvailable !== null
        ? roundMoney(stockAvailable + Math.max(0, unassignedValue))
        : null;

    return {
        currency,
        status: reconciliationReady ? 'conciliado' : 'pendiente_conciliacion',
        accountCash: reconciliationReady ? accountValue : null,
        assignedToBoxes: reconciliationReady ? assignedTotal : null,
        ownUnassigned: reconciliationReady ? unassignedValue : null,
        thirdPartyFunds: reconciliationReady ? thirdPartyValue : null,
        protectedFunds: reconciliationReady ? protectedFunds : null,
        commitments: reconciliationReady ? allCommitments : null,
        uncoveredCommitments: reconciliationReady ? uncoveredCommitments : null,
        stockAvailable: reconciliationReady ? stockAvailable : null,
        availableForPurchase,
        reconciliationDifference: accounts === null ? null : roundMoney(accountValue - expectedAccounts),
        equationBalanced
    };
}

function summarizeOperation(operation, allTransactions, treasurySnapshot, capitalAllocationMismatchIds) {
    const warnings = [];
    const purchasePayments = collectVerifiedPurchasePayments(operation, allTransactions, warnings);
    const expenseState = assessUnpaidOrUnlinkedExpenses(operation, allTransactions, warnings);
    const transactions = operation.saleTransactions || [];
    const activeIncome = transactions.filter((tx) => tx?.type === 'Ingreso' && statusOfTransaction(tx));
    let unverifiedDeposit = false;
    const hasDepositTransaction = activeIncome.some((tx) =>
        tx.source === 'reserva' || /seña|reserva/i.test(tx.concept || tx.description || '')
    );
    if (Number(operation.sale?.depositAppliedAmount || 0) > 0 && !hasDepositTransaction) {
        unverifiedDeposit = true;
        addWarning(warnings, 'deposit_without_confirmed_transaction', 'La seña aplicada no tiene una transacción acreditada y no se cuenta como efectivo.');
    }

    let ownershipMismatch = false;
    for (const tx of activeIncome) {
        const ownershipFromVehicle = computeIncomeOwnership({
            ...tx,
            thirdPartyAmount: 0,
            vehicleId: operation.vehicle,
            saleId: operation.sale
        });
        if (Number(tx.thirdPartyAmount) > 0
            && Math.abs(Number(tx.thirdPartyAmount) - Number(ownershipFromVehicle.tercerosAmount || 0)) > CENT) {
            ownershipMismatch = true;
        }
    }
    if (ownershipMismatch) {
        addWarning(warnings, 'third_party_ownership_mismatch', 'El importe explícito de terceros no coincide con la participación calculada; se requiere conciliación.');
    }
    const allocationMismatch = activeIncome.some((tx) => capitalAllocationMismatchIds.has(idOf(tx)));
    if (allocationMismatch) {
        addWarning(warnings, 'capital_allocation_history_mismatch', 'La asignación de capital indicada en el cobro no coincide con el historial auditable de cajas.');
    }

    // El helper histórico tiene una compatibilidad que interpreta depositAppliedAmount como efectivo.
    // En esta proyección se elimina esa inferencia salvo que exista una transacción acreditada.
    const saleForCalculation = unverifiedDeposit
        ? { ...operation.sale, depositAppliedAmount: 0 }
        : operation.sale;
    const recoveryState = computeOperationRecoveryState({
        sale: saleForCalculation,
        vehicle: operation.vehicle,
        legacyOrigin: operation.legacyOrigin || null,
        saleTransactions: transactions,
        paidSettlements: operation.paidSettlements || [],
        config: operation.config || {}
    });

    const ownCollectedBreakdown = activeIncome.reduce((accumulator, tx) => {
        const ownership = computeIncomeOwnership({ ...tx, vehicleId: operation.vehicle, saleId: operation.sale });
        accumulator.total += Number(tx.amount || 0);
        accumulator.thirdParty += Number(ownership.tercerosAmount || 0);
        accumulator.own += Number(ownership.propioAmount || 0);
        return accumulator;
    }, { total: 0, own: 0, thirdParty: 0 });
    const pendingCollections = activeIncome.filter((tx) => !tx.isTreasuryDistributed || tx.isTreasuryDistributionReversed);
    const pendingCollectionTotal = roundMoney(pendingCollections.reduce((sum, tx) => sum + Number(tx.amount || 0), 0));
    const pendingThirdParty = roundMoney(pendingCollections.reduce((sum, tx) => {
        return sum + Number(computeIncomeOwnership({ ...tx, vehicleId: operation.vehicle, saleId: operation.sale }).tercerosAmount || 0);
    }, 0));
    const distributionRecommendation = pendingCollectionTotal > 0 && recoveryState.calculable
        ? computeSchemeDistributionForCollection({
            amount: pendingCollectionTotal,
            currency: recoveryState.saleCurrency,
            ownership: {
                totalAmount: pendingCollectionTotal,
                tercerosAmount: pendingThirdParty,
                propioAmount: roundMoney(pendingCollectionTotal - pendingThirdParty)
            },
            operationState: recoveryState,
            schemeKey: operation.config?.activeDistributionScheme || null,
            enrichedBoxes: operation.treasuryBoxes || treasurySnapshot?.boxes || [],
            config: operation.config || {},
            registeredTaxAmount: 0,
            forcePendingDistribution: false
        })
        : null;

    const acquisitionPaymentsReconciled = purchasePayments.reconciled;
    const operationReconciled = recoveryState.calculable
        && acquisitionPaymentsReconciled
        && expenseState.reconciled
        && !unverifiedDeposit
        && !ownershipMismatch
        && !allocationMismatch;
    const capitalTarget = operationReconciled ? recoveryState.ownCashInvestmentToRecover : null;
    const recoveredCash = operationReconciled ? recoveryState.totalCapitalRecoveredSoFar : null;
    const allocatedToStock = operationReconciled ? recoveryState.alreadyRecoveredCapital : null;
    const pendingAssignment = recoveredCash === null || allocatedToStock === null
        ? null
        : roundMoney(Math.max(0, recoveredCash - allocatedToStock));

    return {
        id: idOf(operation.sale?._id || operation.sale?.id || operation.vehicle?._id || operation.id),
        vehicleLabel: [operation.vehicle?.brand, operation.vehicle?.name, operation.vehicle?.year].filter(Boolean).join(' ') || 'Vehículo sin identificar',
        currency: recoveryState.saleCurrency || currencyOf(operation.vehicle?.purchaseCurrency),
        status: operationReconciled ? 'conciliado' : 'pendiente_conciliacion',
        acquisitionCost: recoveryState.calculable ? recoveryState.purchaseCost : null,
        totalAttributableCost: recoveryState.calculable ? recoveryState.realInvestmentTotal : null,
        ownCapitalDisbursed: purchasePayments.paymentsVerified && expenseState.reconciled
            ? roundMoney(purchasePayments.paid + expenseState.paid)
            : null,
        acquisitionDebt: purchasePayments.debt,
        capitalTarget,
        capitalRecovered: recoveredCash,
        capitalAllocatedToStock: allocatedToStock,
        capitalPending: operationReconciled
            ? roundMoney(Math.max(0, Number(capitalTarget || 0) - Number(recoveredCash || 0)))
            : null,
        recoveredPendingAssignment: pendingAssignment,
        reinvestmentTarget: operationReconciled ? recoveryState.extraReinvestmentTarget : null,
        reinvestmentAllocated: operationReconciled ? recoveryState.alreadyAllocatedExtraReinvestment : null,
        estimatedMargin: recoveryState.calculable ? recoveryState.reportedNetProfit : null,
        realizedMargin: operationReconciled ? recoveryState.availableMarginCollectedTotal : null,
        confirmedOwnCollections: operationReconciled ? roundMoney(ownCollectedBreakdown.own) : null,
        distributionRecommendation,
        warnings,
        recoveryState
    };
}

function summarizeActualReinvestment(snapshot, allTransactions) {
    const vehicles = snapshot?.vehicles || [];
    const seenTransactionIds = new Set();
    const totals = { ARS: 0, USD: 0 };
    const warnings = [];

    for (const vehicle of vehicles) {
        const paymentState = vehicle?.purchasePaymentState;
        const payments = Array.isArray(paymentState?.payments) ? paymentState.payments : [];
        for (const payment of payments) {
            const txId = String(payment.transactionId || '');
            if (!txId) {
                addWarning(warnings, 'reinvestment_payment_unlinked', 'Hay compras registradas sin un egreso vinculado; no se cuentan como reinversión confirmada.');
                continue;
            }
            if (seenTransactionIds.has(txId)) {
                addWarning(warnings, 'duplicate_reinvestment_transaction', 'Un mismo movimiento aparece en más de un registro de pago y se contó una sola vez.');
                continue;
            }
            seenTransactionIds.add(txId);
            const tx = findActiveExpenseTransaction(allTransactions, txId, payment.amount, payment.currency || paymentState.currency);
            if (!tx || (tx.vehicleId && idOf(tx.vehicleId) !== idOf(vehicle))) {
                addWarning(warnings, 'reinvestment_payment_unverified', 'Un pago de vehículo no tiene un egreso activo coincidente; no se cuenta como reinversión.');
                continue;
            }
            if (payment.deductedFromBox !== true || (payment.boxKey || payment.strategicBoxKey) !== 'stock') {
                addWarning(warnings, 'reinvestment_source_unverified', 'El pago está vinculado al vehículo, pero no confirma que se haya financiado desde la caja Stock.');
                continue;
            }
            const currency = currencyOf(tx.currency);
            totals[currency] = roundMoney(totals[currency] + Number(tx.amount || 0));
        }
        if (Number(paymentState?.amountPaid || 0) > 0 && payments.length === 0) {
            addWarning(warnings, 'reinvestment_historical_unverified', 'Hay pagos históricos de compras sin transacciones vinculadas; no se cuentan como reinversión confirmada.');
        }
    }

    return { totals, warnings };
}

function recommendationFor(currencyTotals, liquidity, warnings) {
    if (warnings.length > 0 || Object.values(liquidity).some((item) => item.status !== 'conciliado')) {
        return {
            status: 'pendiente_conciliacion',
            title: 'Conciliá los datos antes de decidir',
            detail: 'Hay saldos, pagos o reversiones que no permiten afirmar una disponibilidad exacta.'
        };
    }
    const needsRecovery = CURRENCIES.some((currency) => (currencyTotals[currency].capitalPending || 0) > CENT);
    const pendingAssignment = CURRENCIES.some((currency) => (currencyTotals[currency].recoveredPendingAssignment || 0) > CENT);
    if (pendingAssignment) {
        return {
            status: 'asignacion_pendiente',
            title: 'Revisá la asignación del capital recuperado',
            detail: 'Hay efectivo recuperado que todavía no figura asignado a Stock según los registros de distribución.'
        };
    }
    if (needsRecovery) {
        return {
            status: 'recuperacion_prioritaria',
            title: 'Priorizá recuperar capital propio',
            detail: 'El cálculo por operación aún muestra capital pendiente de recuperar; aplicá el esquema de Tesorería ya configurado.'
        };
    }
    return {
        status: 'liquidez_revisada',
        title: 'Capital recuperado conciliado',
        detail: 'La proyección no detecta capital pendiente de recuperación. Evaluá cada nueva compra con sus costos, compromisos y riesgo.'
    };
}

/**
 * Projects capital and liquidity from explicit immutable snapshots. It performs no I/O,
 * applies no treasury movements, and returns null for figures that cannot be reconciled.
 */
export function projectCapitalReinvestment(snapshot = {}) {
    const allTransactions = snapshot.transactions || [];
    const expenseReversalIds = verifyExpenseReversals(snapshot.treasury, []);
    const capitalAllocationMismatchIds = verifyCapitalAllocationHistory(snapshot.treasury, allTransactions, []);
    const capitalAllocationMismatchSet = new Set(capitalAllocationMismatchIds);
    const operationResults = (snapshot.operations || []).map((operation) => summarizeOperation(
        operation,
        allTransactions,
        snapshot.treasury,
        capitalAllocationMismatchSet
    ));
    const reinvestment = summarizeActualReinvestment(snapshot, allTransactions);
    const globalWarnings = [...reinvestment.warnings];
    if (expenseReversalIds.length > 0) {
        addWarning(globalWarnings, 'expense_reversal_unreconciled', 'Hay egresos anulados con débitos de caja sin reversa; la liquidez no se muestra como cifra exacta.');
    }
    if (capitalAllocationMismatchIds.length > 0) {
        addWarning(globalWarnings, 'capital_allocation_history_mismatch', 'La asignación de capital a Stock no coincide con el historial auditable de cajas.');
    }
    for (const operation of operationResults) {
        for (const warning of operation.warnings) addWarning(globalWarnings, warning.code, warning.message);
    }

    const currencies = {};
    for (const currency of CURRENCIES) {
        const items = operationResults.filter((operation) => operation.currency === currency);
        const allReconciled = items.every((operation) => operation.status === 'conciliado');
        const sum = (key) => allReconciled && items.every((operation) => operation[key] !== null)
            ? roundMoney(items.reduce((total, operation) => total + Number(operation[key] || 0), 0))
            : null;
        currencies[currency] = {
            currency,
            acquisitionCost: sum('acquisitionCost'),
            totalAttributableCost: sum('totalAttributableCost'),
            ownCapitalDisbursed: sum('ownCapitalDisbursed'),
            acquisitionDebt: items.every((operation) => operation.acquisitionDebt !== null)
                ? roundMoney(items.reduce((total, operation) => total + Number(operation.acquisitionDebt || 0), 0))
                : null,
            capitalTarget: sum('capitalTarget'),
            capitalRecovered: sum('capitalRecovered'),
            capitalAllocatedToStock: sum('capitalAllocatedToStock'),
            capitalPending: sum('capitalPending'),
            recoveredPendingAssignment: sum('recoveredPendingAssignment'),
            reinvested: reinvestment.totals[currency],
            reinvestmentTarget: sum('reinvestmentTarget'),
            reinvestmentAllocated: sum('reinvestmentAllocated'),
            estimatedMargin: sum('estimatedMargin'),
            realizedMargin: sum('realizedMargin'),
            operationCount: items.length,
            pendingOperationCount: items.filter((operation) => operation.status !== 'conciliado').length
        };
    }

    const liquidityWarnings = [];
    const liquidity = {};
    for (const currency of CURRENCIES) {
        liquidity[currency] = computeLiquidity(snapshot.treasury, currency, expenseReversalIds);
        if (liquidity[currency].status !== 'conciliado') {
            addWarning(liquidityWarnings, `liquidity_${currency.toLowerCase()}_unreconciled`, `La liquidez ${currency} está pendiente de conciliación.`);
        }
    }
    for (const warning of liquidityWarnings) addWarning(globalWarnings, warning.code, warning.message);

    return {
        demo: Boolean(snapshot.demo),
        generatedAt: snapshot.asOf || null,
        reconciliationStatus: globalWarnings.length === 0 ? 'conciliado' : 'pendiente_conciliacion',
        currencies,
        liquidity,
        operations: operationResults,
        recommendation: recommendationFor(currencies, liquidity, globalWarnings),
        warnings: globalWarnings,
        unresolvedExpenseReversalIds: expenseReversalIds,
        unresolvedCapitalAllocationIds: capitalAllocationMismatchIds
    };
}

export const capitalReinvestmentCurrencies = CURRENCIES;
