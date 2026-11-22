export const sum = values => values.reduce((total, value) => {
    const result = total + value;
    if (!Number.isSafeInteger(value) || !Number.isSafeInteger(result)) throw new RangeError('Importe fuera de la precisión admitida.');
    return result;
}, 0);

const total = (balance, keys) => sum(keys.map(key => balance.get(key) ?? 0));

export function ledger(opening, entries) {
    const balance = new Map(Object.entries(opening));
    const seen = new Set();
    if (sum([...balance.values()]) !== 0) throw new Error('Apertura desbalanceada.');
    for (const { id, debit, credit } of entries) {
        if (seen.has(id) || sum(Object.values(debit)) !== sum(Object.values(credit))) throw new Error('Asiento duplicado o desbalanceado: ' + id);
        seen.add(id);
        for (const [sign, lines] of [[1, debit], [-1, credit]]) {
            for (const [key, amount] of Object.entries(lines)) {
                if (amount < 0) throw new Error('Un asiento requiere importes positivos.');
                balance.set(key, sum([balance.get(key) ?? 0, sign * amount]));
            }
        }
    }
    return balance;
}

export function reconcileAccounts(balance, accounts) {
    return accounts.map(({ account, source, statement, reconciling, restrictionId, obligationId, stale }) => {
        const registered = balance.get(account) ?? 0;
        const difference = statement == null ? null : registered - sum([statement, reconciling]);
        const quality = stale ? 'stale' : difference === null ? 'unknown' : difference === 0 ? 'verified' : 'partial';
        const reconciled = quality === 'verified' ? registered : null;
        const restricted = restrictionId ? Math.max(0, registered) : 0;
        return { account, source, registered, reconciled, restricted, obligationId, difference, quality,
            usable: reconciled === null ? null : reconciled - restricted };
    });
}

export function stockPosition(stock) {
    const economic = stock.filter(asset => asset.rightsRetained === true);
    return {
        commercialUnits: stock.filter(asset => asset.status === 'disponible').length,
        inventory: economic.every(asset => Number.isSafeInteger(asset.remainingCost)) ? sum(economic.map(asset => asset.remainingCost)) : null,
        purchases: economic.map(asset => ({
            id: asset.id, cost: asset.remainingCost ?? null, paid: asset.paid ?? null, pending: asset.supplierOutstanding ?? null,
            committed: asset.paid == null || asset.supplierOutstanding == null ? null : sum([asset.paid, asset.supplierOutstanding])
        })),
        incomplete: stock.filter(asset => asset.rightsRetained == null || (asset.rightsRetained && asset.remainingCost == null)).map(asset => asset.id)
    };
}

// Round to nearest unit, with ties away from zero. BigInt avoids floating point multiplication.
export function shareOf(amount, basisPoints) {
    if (!Number.isSafeInteger(amount) || !Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10000) throw new RangeError('Participación inválida.');
    const absolute = BigInt(Math.abs(amount));
    return Math.sign(amount) * Number((absolute * BigInt(basisPoints) + 5000n) / 10000n) || 0;
}

export function attributeReceivables(items) {
    let own = 0, external = 0, unattributed = 0;
    for (const item of items) {
        if (item.share == null || !item.vehicle) unattributed = sum([unattributed, item.remaining]);
        else {
            const allocation = shareOf(item.remaining, item.share * 100);
            own = sum([own, allocation]);
            external = sum([external, item.remaining - allocation]);
        }
    }
    return { nominal: sum([own, external, unattributed]), own, external, unattributed };
}

export function operationResult(revenue, cost, direct) {
    const margin = sum([revenue, -cost]);
    return { revenue, cost, direct, margin, contribution: sum([margin, -direct]) };
}

export function financingPosition(input) {
    const principal = sum([input.principal, -input.principalPaid]);
    return { principal, contractualInterest: input.contractualInterest, recognizedInterest: input.earnedAtCutoff,
        cash: sum([input.principalPaid, input.interestPaid]),
        contractualOutstanding: sum([principal, input.contractualInterest, -input.interestPaid]),
        recognizedReceivable: sum([principal, input.earnedAtCutoff, -input.interestPaid]),
        stressedPrincipalRecovery: Math.max(0, sum([principal, -input.stressedPrincipalLoss])) };
}

export function closeFinancialPilot({ opening, entries, chart, cashEvidence, stock }) {
    const balance = ledger(opening, entries);
    const evidenceByAccount = new Map(cashEvidence.map(evidence => [evidence.account, evidence]));
    const accounts = reconcileAccounts(balance, chart.cash.map(account => evidenceByAccount.get(account) ?? { account, source: null }));
    const registered = sum(accounts.map(account => account.registered));
    const restricted = sum(accounts.map(account => account.restricted));
    const allReconciled = accounts.every(account => account.quality === 'verified');
    const reconciled = allReconciled ? sum(accounts.map(account => account.reconciled)) : null;
    const usable = allReconciled ? sum(accounts.map(account => account.usable)) : null;
    const inventoryPosition = stockPosition(stock);
    const inventory = inventoryPosition.incomplete.length ? null : inventoryPosition.inventory;
    const receivables = total(balance, chart.receivables);
    const operatingPayables = 0 - total(balance, chart.operatingPayables);
    const financingDebt = 0 - total(balance, chart.financingDebt);
    const partnerPayable = 0 - total(balance, chart.partners);
    const liabilities = sum([operatingPayables, financingDebt, partnerPayable]);
    const operations = [];
    for (const operationId of new Set(entries.map(entry => entry.operationId).filter(Boolean))) {
        const operating = ledger({}, entries.filter(entry => entry.operationId === operationId));
        operations.push({ operationId, ...operationResult(0 - total(operating, chart.revenue),
            total(operating, chart.cost), total(operating, chart.direct)) });
    }
    const operatingResult = operationResult(0 - total(balance, chart.revenue), total(balance, chart.cost), total(balance, chart.direct));
    const overhead = total(balance, chart.overhead);
    const result = sum([operatingResult.contribution, -overhead]);
    const assets = inventory === null ? null : sum([registered, inventory, receivables]);
    const equity = assets === null ? null : sum([assets, -liabilities]);
    const openingBalance = new Map(Object.entries(opening));
    const change = keys => sum([total(balance, keys), -total(openingBalance, keys)]);
    const contributions = 0 - change(chart.contributions);
    const withdrawals = change(chart.withdrawals);
    const otherAdjustments = 0 - change(chart.adjustments);
    const openingEquity = 0 - total(openingBalance, chart.equity);
    const cashChange = sum([registered, -total(openingBalance, chart.cash)]);
    const operatingCash = sum([result, -change(chart.inventory), -change(chart.receivables), -change(chart.operatingPayables)]);
    const financingCash = sum([-change(chart.financingDebt), -change(chart.partners), contributions, -withdrawals]);
    const equityUnexplained = equity === null ? null : sum([equity, -openingEquity, -result, -contributions, withdrawals, -otherAdjustments]);
    const cashUnexplained = sum([cashChange, -operatingCash, -financingCash]);
    return { metrics: { registered, restricted, reconciled, usable, inventory, receivables, operatingPayables, financingDebt, partnerPayable, liabilities, assets, equity, result },
        accounts, inventoryPosition, operations, operatingResult, overhead,
        balances: {
            receivables: chart.receivables.map(key => ({ id: key, amount: total(balance, [key]) })),
            payables: [...chart.operatingPayables, ...chart.financingDebt].map(key => ({ id: key, amount: 0 - total(balance, [key]) })),
            partners: chart.partners.map(key => ({ id: key, amount: 0 - total(balance, [key]) }))
        },
        reconciliations: [
            ...accounts.filter(account => account.quality !== 'verified').map(account => ({ id: account.account, quality: account.quality, difference: account.difference })),
            ...(inventory === total(balance, chart.inventory) ? [] : [{ id: 'inventario-mayor', quality: inventory === null ? 'unknown' : 'partial' }]),
            ...[[ 'puente-caja', cashUnexplained ], [ 'puente-patrimonio', equityUnexplained ]].filter(([, difference]) => difference !== 0)
                .map(([id, difference]) => ({ id, quality: difference === null ? 'unknown' : 'partial', difference }))
        ],
        cashBridge: { change: cashChange, operating: operatingCash, financing: financingCash, unexplained: cashUnexplained },
        equityBridge: { opening: openingEquity, result, contributions, withdrawals, otherAdjustments, unexplained: equityUnexplained }
    };
}
