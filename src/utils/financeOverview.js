const toLocalDate = value => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : new Date(NaN);
    }
    return new Date(value);
};

/** Read-only chart projection: currencies stay separate and no account balances are recalculated. */
export function buildFinanceOverviewCharts(transactions = [], { period = 'month', now = new Date() } = {}) {
    const currentDate = toLocalDate(now);
    const result = {
        ARS: { income: 0, expense: 0, max: 1, expenseCategories: [] },
        USD: { income: 0, expense: 0, max: 1, expenseCategories: [] }
    };
    const categories = { ARS: new Map(), USD: new Map() };

    transactions.forEach(transaction => {
        if (transaction.status === 'anulado' || transaction.status === 'pendiente') return;
        if (period === 'month') {
            const date = toLocalDate(transaction.date || transaction.createdAt);
            if (!Number.isFinite(date.getTime()) || date.getFullYear() !== currentDate.getFullYear() || date.getMonth() !== currentDate.getMonth()) return;
        }

        const currency = transaction.currency === 'USD' ? 'USD' : 'ARS';
        const amount = Number(transaction.amount || 0);
        if (!Number.isFinite(amount)) return;
        const type = String(transaction.type || '').toLowerCase();
        if (type === 'ingreso') result[currency].income += amount;
        if (type === 'egreso') {
            result[currency].expense += amount;
            const category = transaction.category || 'Sin categoría';
            categories[currency].set(category, (categories[currency].get(category) || 0) + amount);
        }
    });

    ['ARS', 'USD'].forEach(currency => {
        result[currency].max = Math.max(result[currency].income, result[currency].expense, 1);
        result[currency].expenseCategories = [...categories[currency].entries()]
            .map(([category, amount]) => ({ category, amount }))
            .filter(item => item.amount !== 0)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 4);
    });

    return result;
}
