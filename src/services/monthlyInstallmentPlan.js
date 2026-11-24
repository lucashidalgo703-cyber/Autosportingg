export function buildMonthlyPlan({ installmentsCount, amount, currency, firstDueDate }) {
    const count = Number(installmentsCount);
    const payment = Number(amount);
    if (!Number.isInteger(count) || count < 1 || count > 120) throw new Error('Ingresá entre 1 y 120 cuotas.');
    if (!Number.isFinite(payment) || payment <= 0 || payment > 1e12 ||
        Math.abs(payment - Math.round(payment * 100) / 100) > Number.EPSILON) {
        throw new Error('Ingresá un importe positivo con hasta dos decimales.');
    }
    if (!['ARS', 'USD'].includes(currency)) throw new Error('Seleccioná ARS o USD.');
    if (typeof firstDueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(firstDueDate)) {
        throw new Error('Ingresá la fecha del primer vencimiento.');
    }
    const date = new Date(firstDueDate + 'T03:00:00.000Z');
    if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== firstDueDate ||
        date.getUTCFullYear() < 2000 || date.getUTCFullYear() > 2090) {
        throw new Error('Ingresá una fecha de vencimiento válida.');
    }
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    return Array.from({ length: count }, (_, index) => {
        const monthEnd = new Date(Date.UTC(year, month + index + 1, 0)).getUTCDate();
        const dueDate = new Date(Date.UTC(year, month + index, Math.min(day, monthEnd), 3));
        return { installmentNumber: index + 1, dueDate, originalDueDate: dueDate, amount: payment, currency };
    });
}
