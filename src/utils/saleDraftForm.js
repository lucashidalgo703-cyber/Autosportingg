import { formSaleDate } from './saleCalendarDate.js';

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
        mileage: '', saleCurrency: 'USD', salePrice: '', salesperson: '', saleDate: todayInArgentina(),
        buyerName: '', buyerPhone: '', buyerEmail: '', buyerDni: '',
        vehicleOwnerName: '', vehicleOwnerPhone: '',
        depositAppliedAmount: 0, depositAppliedCurrency: 'USD',
        paymentMethod: '', installmentsCount: '', hasTradeIn: false,
        consignationOwnerId: '', consignationManagerId: '',
        manualCommission: false, sellerPct: 1, consignationPct: 0.5,
        extraCurrency: 'USD', extraAmount: '', splitCommission: false,
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
        mileage: draft.mileage ?? '',
        saleCurrency: sale.saleCurrency || 'USD', salePrice: sale.salePrice ?? '',
        salesperson: sale.salesperson || '', saleDate: inputDate(sale.saleDate) || form.saleDate,
        buyerName: draft.buyerName ?? client?.fullName ?? client?.firstName ?? '',
        buyerPhone: draft.buyerPhone ?? client?.phone ?? '',
        buyerEmail: draft.buyerEmail ?? client?.email ?? '',
        buyerDni: draft.buyerDni ?? client?.dni ?? '',
        vehicleOwnerName: sale.vehicleOwnerName || '', vehicleOwnerPhone: sale.vehicleOwnerPhone || '',
        depositAppliedAmount: sale.depositAppliedAmount ?? 0,
        depositAppliedCurrency: sale.depositAppliedCurrency || sale.saleCurrency || 'USD',
        paymentMethod: sale.paymentMethod || '', installmentsCount: sale.installmentsCount || '',
        hasTradeIn: Boolean(draft.hasTradeIn),
        consignationOwnerId: idOf(sale.consignationOwnerId), consignationManagerId: idOf(sale.consignationManagerId),
        manualCommission: Boolean(commission.isManual), sellerPct: commission.sellerPct ?? 1,
        consignationPct: commission.consignationPct ?? 0.5,
        extraCurrency: commission.extraCurrency || 'USD', extraAmount: commission.extraAmount ?? '',
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
    const price = form.salePrice === '' && finalStatus === 'borrador' ? 0 : Number(form.salePrice);
    if (!Number.isFinite(price) || price < 0) throw new Error('Ingresá un precio de venta válido.');
    if (!form.manualImport && finalStatus !== 'borrador' && !form.vehicleId) {
        throw new Error('Seleccioná un vehículo disponible del stock para activar la venta.');
    }
    const draftData = Object.fromEntries(
        ['buyerName', 'buyerPhone', 'buyerEmail', 'buyerDni', 'mileage', 'notes']
            .map((key) => [key, String(form[key] ?? '')])
    );
    draftData.hasTradeIn = Boolean(form.hasTradeIn);
    return {
        isManualImport: Boolean(form.manualImport),
        vehicleId: form.vehicleId || null, clientId: form.clientId || null, leadId: form.leadId || null,
        salePrice: price, saleCurrency: form.saleCurrency, paymentMethod: form.paymentMethod || 'contado',
        salesperson: form.salesperson, saleDate: form.saleDate, status: finalStatus,
        vehicleOwnerName: form.vehicleOwnerName, vehicleOwnerPhone: form.vehicleOwnerPhone,
        consignationOwnerId: form.consignationOwnerId || null,
        consignationManagerId: form.consignationManagerId || null,
        commissionSettings: {
            isManual: form.manualCommission,
            sellerPct: form.splitCommission ? 0.5 : Number(form.sellerPct),
            consignationPct: form.splitCommission ? 0.5 : Number(form.consignationPct),
            extraAmount: Number(form.extraAmount) || 0, extraCurrency: form.extraCurrency,
            isSplit: form.splitCommission
        },
        deliveryItems: form.deliveryItems, installmentsCount: Number(form.installmentsCount) || 0,
        depositAppliedAmount: Number(form.depositAppliedAmount) || 0,
        depositAppliedCurrency: form.depositAppliedCurrency,
        estimatedDeliveryDate: form.estimatedDeliveryDate || null,
        draftData,
        notes: [
            form.buyerName ? `Comprador manual: ${form.buyerName}` : '',
            form.buyerPhone ? `Tel: ${form.buyerPhone}` : '',
            form.buyerDni ? `DNI: ${form.buyerDni}` : '',
            form.notes
        ].filter(Boolean).join('\n')
    };
}
