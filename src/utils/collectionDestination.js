// Shared commercial classification: collecting a procedure charge must not
// pay down the car principal, and a converted reservation must not count twice.
const idOf = value => String(value?._id || value || '');
const amount = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const activeIncome = tx => tx?.type === 'Ingreso' && ['activo', 'completado'].includes(String(tx.status || 'activo').toLowerCase());
export const isGestoriaCollection = tx => tx?.paymentDestination === 'gestoria';
export function isDepositCollection(tx, sale) {
    if (!tx || isGestoriaCollection(tx)) return false;
    if (sale) {
        if (tx.saleId && sale._id && idOf(tx.saleId) !== idOf(sale._id)) return false;
        if (tx.reservationId && sale.reservationId && idOf(tx.reservationId) !== idOf(sale.reservationId)) return false;
    }
    if (tx.paymentDestination) return tx.paymentDestination === 'deposit';
    const description = String(tx.concept || tx.description || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return tx.source === 'reserva' || /sena|reserva/i.test(description);
}
export function remainingAppliedDeposit(sale, transactions = []) {
    const currency = sale?.saleCurrency || 'ARS';
    if (!sale || sale.depositAppliedCurrency !== currency) return 0;
    const paid = transactions.reduce((sum, tx) => sum + (activeIncome(tx) && tx.currency === currency && isDepositCollection(tx, sale) ? amount(tx.amount) : 0), 0);
    return Math.max(0, Math.round((amount(sale.depositAppliedAmount) - paid) * 100) / 100);
}
