const normalize = value => String(value || '').toLowerCase();

export function financeDateInputValue(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function calendarDay(value) {
    const match = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
    return date.setHours(0, 0, 0, 0);
}

export function filterFinanceTransactions(transactions, filters, mode = 'todos') {
    return transactions.filter(tx => {
        const type = normalize(tx.type);
        const text = `${tx.concept || ''} ${tx.description || ''} ${tx.category || ''} ${tx.notes || ''}`.toLowerCase();
        if (mode === 'ingreso' && type !== 'ingreso') return false;
        if (mode === 'egreso' && type !== 'egreso') return false;
        if (mode === 'transferencias' && !text.includes('transfer')) return false;
        if (filters.search && !text.includes(filters.search.toLowerCase())) return false;
        if (filters.currency !== 'todas' && tx.currency !== filters.currency) return false;
        if (filters.paymentMethod !== 'todas' && tx.paymentMethod !== filters.paymentMethod) return false;
        if (filters.status !== 'todos' && tx.status !== filters.status) return false;
        const links = { sale: tx.saleId, reservation: tx.reservationId, client: tx.clientId, vehicle: tx.vehicleId, installment: tx.installmentId };
        if (filters.linkedTo === 'unlinked' && Object.values(links).some(Boolean)) return false;
        if (filters.linkedTo && !['todas', 'unlinked'].includes(filters.linkedTo) && !links[filters.linkedTo]) return false;
        if (filters.startDate || filters.endDate) {
            const date = calendarDay(tx.date || tx.createdAt);
            if (!Number.isFinite(date)) return false;
            if (filters.startDate && date < calendarDay(filters.startDate)) return false;
            if (filters.endDate && date > calendarDay(filters.endDate)) return false;
        }
        return true;
    });
}

export function summarizeFinanceInstallments(installments, now = new Date()) {
    const summary = { pending: { ARS: 0, USD: 0 }, paid: { ARS: 0, USD: 0 }, pendingCount: 0, overdueCount: 0, soonCount: 0, futureCount: 0 };
    const today = calendarDay(now);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const lastSoonDay = calendarDay(nextWeek);
    for (const item of installments || []) {
        const status = normalize(item.status);
        if (status === 'anulada') continue;
        const currency = item.currency === 'USD' ? 'USD' : 'ARS';
        const paid = Number(item.paidAmount || 0);
        summary.paid[currency] += paid;
        summary.pending[currency] += Number(item.amount || 0) - paid;
        if (['pagada', 'pagada_manual'].includes(status)) continue;
        summary.pendingCount++;
        const due = calendarDay(item.dueDate);
        if (!Number.isFinite(due)) continue;
        if (due < today) summary.overdueCount++;
        else if (due <= lastSoonDay) summary.soonCount++;
        else summary.futureCount++;
    }
    return summary;
}

export function summarizeFinanceTransactions(transactions) {
    const totals = { ARS: { income: 0, expense: 0 }, USD: { income: 0, expense: 0 } };
    for (const tx of transactions) {
        if (['anulado', 'pendiente'].includes(normalize(tx.status))) continue;
        const currency = tx.currency === 'USD' ? 'USD' : 'ARS';
        if (normalize(tx.type) === 'ingreso') totals[currency].income += Number(tx.amount || 0);
        if (normalize(tx.type) === 'egreso') totals[currency].expense += Number(tx.amount || 0);
    }
    return totals;
}
