import { formSaleDate } from './saleCalendarDate.js';
import { normalizeSaleWorkspace } from './saleWorkspace.js';
import { parseDecimal } from './saleCommercial.js';

const idOf = (value) => typeof value === 'object' ? value?._id || '' : value || '';
const inputDate = formSaleDate;

const todayInArgentina = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

export function createSaleForm() {
    return {
        manualImport: false,
        vehicleId: '', clientId: '', leadId: '', status: 'borrador',
        initialCancellationReason: '',
        mileage: '', saleCurrency: 'USD', salePrice: '', salesperson: '', saleDate: todayInArgentina(),
        buyerName: '', buyerPhone: '', buyerEmail: '', buyerDni: '',
        vehicleOwnerName: '', vehicleOwnerPhone: '',
        depositAppliedAmount: 0, depositAppliedCurrency: 'USD',
        depositRecords: [], tradeIns: [], exchangeRate: '', reminders: [], reviewAsked: false,
        managementNote: { recipient: 'gestoria', text: '' },
        paymentMethod: '', installmentsCount: '', hasTradeIn: false,
        consignationOwnerId: '', consignationManagerId: '',
        manualCommission: false, sellerPct: 1, consignationPct: 0.5,
        extraCurrency: 'USD', extraAmount: '', splitCommission: false, commissionMode: 'fixed', commissionPercent: '',
        deliveryItems: { securityNut: false, spareKey: false, manuals: false, vehicleCard: false },
        estimatedDeliveryDate: '', notes: ''
    };
}

export function saleToForm(sale) {
    const form = createSaleForm();
    if (!sale) return form;
    const draft = sale.draftData || {};
    const commission = sale.commissionSettings || {};
    const client = typeof sale.clientId === 'object' ? sale.clientId : null;
    return {
        ...form,
        manualImport: Boolean(sale.isManualImport),
        vehicleId: idOf(sale.vehicleId), clientId: idOf(sale.clientId), leadId: idOf(sale.leadId),
        status: sale.status || 'borrador',
        initialCancellationReason: sale.cancellationReason || '',
        mileage: draft.mileage ?? '',
        saleCurrency: sale.saleCurrency || 'USD', salePrice: sale.salePrice ?? '',
        salesperson: sale.salesperson || '', saleDate: inputDate(sale.saleDate) || form.saleDate,
        buyerName: draft.buyerName ?? client?.fullName ?? client?.firstName ?? '',
        buyerPhone: draft.buyerPhone ?? client?.phone ?? '',
        buyerEmail: draft.buyerEmail ?? client?.email ?? '',
        buyerDni: draft.buyerDni ?? client?.dniCuit ?? client?.documentNumber ?? client?.dni ?? '',
        vehicleOwnerName: sale.vehicleOwnerName || '', vehicleOwnerPhone: sale.vehicleOwnerPhone || '',
        depositAppliedAmount: sale.depositAppliedAmount ?? 0,
        depositAppliedCurrency: sale.depositAppliedCurrency || sale.saleCurrency || 'USD',
        paymentMethod: sale.paymentMethod || '', installmentsCount: sale.installmentsCount || '',
        hasTradeIn: Boolean(draft.hasTradeIn || sale.tradeIns?.length),
        depositRecords: (sale.depositRecords || []).map(row => ({ ...row, date: inputDate(row.date) })),
        tradeIns: (sale.tradeIns || []).map(row => ({ ...row })), exchangeRate: sale.exchangeRate ?? '',
        reminders: (sale.reminders || []).map(row => ({ ...row, date: inputDate(row.date) })), reviewAsked: Boolean(sale.reviewAsked),
        consignationOwnerId: idOf(sale.consignationOwnerId), consignationManagerId: idOf(sale.consignationManagerId),
        manualCommission: Boolean(commission.isManual), sellerPct: commission.sellerPct ?? 1,
        consignationPct: commission.consignationPct ?? 0.5,
        extraCurrency: commission.extraCurrency || 'USD', extraAmount: commission.extraAmount ?? '',
        commissionMode: commission.mode || 'fixed', commissionPercent: commission.percent ?? '',
        splitCommission: Boolean(commission.isSplit),
        deliveryItems: { ...form.deliveryItems, ...sale.deliveryItems },
        estimatedDeliveryDate: inputDate(sale.estimatedDeliveryDate),
        notes: draft.notes ?? sale.notes ?? ''
    };
}

// Only scalar form values are stored. Files and generated financial effects are never part of this payload.
export function buildSaleCreatePayload(form, status = form.status) {
    const finalStatus = form.manualImport ? 'entregada' : status;
    if (finalStatus !== 'borrador' && (form.salePrice === '' || form.salePrice == null)) {
        throw new Error('Ingresá un precio de venta válido.');
    }
    const price = form.salePrice === '' && finalStatus === 'borrador' ? 0 : parseDecimal(form.salePrice);
    if (!Number.isFinite(price) || price < 0) throw new Error('Ingresá un precio de venta válido.');
    if (!form.manualImport && !['borrador', 'cancelada'].includes(finalStatus) && !form.vehicleId) {
        throw new Error('Seleccioná un vehículo disponible del stock para activar la venta.');
    }
    const draftData = Object.fromEntries(
        ['buyerName', 'buyerPhone', 'buyerEmail', 'buyerDni', 'mileage', 'notes']
            .map((key) => [key, String(form[key] ?? '')])
    );
    draftData.hasTradeIn = Boolean(form.hasTradeIn);
    const finite = (value, label, fallback = 0) => { const n = value === '' || value == null ? fallback : parseDecimal(value); if (!Number.isFinite(n) || n < 0) throw new Error(`Revisá ${label}.`); return n; };
    const extra = normalizeSaleWorkspace({ depositRecords: form.depositRecords || [], tradeIns: form.hasTradeIn ? (form.tradeIns || []) : [], exchangeRate: form.exchangeRate, reminders: form.reminders || [], reviewAsked: Boolean(form.reviewAsked), ...(form.managementNote?.text?.trim() ? { managementNote: form.managementNote } : {}) });
    return {
        ...extra,
        isManualImport: Boolean(form.manualImport),
        vehicleId: form.vehicleId || null, clientId: form.clientId || null, leadId: form.leadId || null,
        salePrice: price, saleCurrency: form.saleCurrency, paymentMethod: form.paymentMethod || 'contado',
        salesperson: form.salesperson, saleDate: form.saleDate, status: finalStatus,
        ...(finalStatus === 'cancelada' ? { initialCancellationReason: String(form.initialCancellationReason || '') } : {}),
        vehicleOwnerName: form.vehicleOwnerName, vehicleOwnerPhone: form.vehicleOwnerPhone,
        consignationOwnerId: form.consignationOwnerId || null,
        consignationManagerId: form.consignationManagerId || null,
        commissionSettings: {
            isManual: form.manualCommission,
            sellerPct: form.splitCommission ? 0.5 : (form.manualCommission ? finite(form.sellerPct, 'el porcentaje del vendedor') : 1),
            consignationPct: form.splitCommission ? 0.5 : (form.manualCommission ? finite(form.consignationPct, 'el porcentaje de consignación') : 0.5),
            extraAmount: finite(form.extraAmount, 'la comisión adicional'), extraCurrency: form.extraCurrency,
            isSplit: form.splitCommission, mode: form.commissionMode || 'fixed',
            ...(form.commissionMode === 'percent' ? { percent: finite(form.commissionPercent, 'el porcentaje de comisión adicional') } : {})
        },
        deliveryItems: form.deliveryItems, installmentsCount: finite(form.installmentsCount, 'las cuotas'),
        depositAppliedAmount: finite(form.depositAppliedAmount, 'la seña aplicada'),
        depositAppliedCurrency: form.depositAppliedCurrency,
        estimatedDeliveryDate: form.estimatedDeliveryDate || null,
        draftData,
        notes: [form.buyerName ? `Comprador manual: ${form.buyerName}` : '', form.buyerPhone ? `Tel: ${form.buyerPhone}` : '', form.buyerDni ? `DNI: ${form.buyerDni}` : '', form.notes].filter(Boolean).join('\n')
    };
}
