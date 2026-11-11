import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import CrmInput from '../ui/CrmInput';
import CrmSelect from '../ui/CrmSelect';
import CrmTextarea from '../ui/CrmTextarea';
import CrmButton from '../ui/CrmButton';
import { SALE_REMINDER_TYPES } from '../../../utils/saleWorkspace';
import { formSaleDate } from '../../../utils/saleCalendarDate';

export const newSaleRowId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), n => n.toString(16).padStart(2, '0')).join('');
export const createSaleTradeInRow = () => ({ _id: newSaleRowId(), brand: '', model: '', year: '', estimatedValue: '', currency: 'USD', shouldEnterStock: true, consigned: false, condition: '', fuel: '', mileage: '' });
export const SaleField = ({ label, children }) => <label className="block min-w-0 text-xs text-crm-fg-muted"><span className="mb-1.5 block">{label}</span>{children}</label>;
export const SaleCheck = ({ children, checked, onChange, disabled }) => <label className="flex items-start gap-2 text-xs leading-5 text-crm-fg"><input className="mt-0.5 h-4 w-4 accent-red-500" type="checkbox" checked={Boolean(checked)} onChange={e => onChange(e.target.checked)} disabled={disabled} />{children}</label>;
const Currency = ({ value, onChange }) => <CrmSelect value={value} onChange={e => onChange(e.target.value)}><option>USD</option><option>ARS</option></CrmSelect>;
const FileField = ({ label, onFile, file, disabled }) => <SaleField label={label}><input className="w-full text-xs text-crm-fg file:mr-2 file:rounded-md file:border file:border-crm-border file:bg-crm-surface-raised file:p-2 file:text-crm-fg" type="file" accept="image/*,application/pdf" disabled={disabled} onChange={e => { const selected = e.target.files?.[0]; if (selected) onFile(selected); e.target.value = ''; }} />{file && <span className="mt-1 block truncate text-crm-fg">{file.name}</span>}</SaleField>;
export function SaleDepositEditor({ rows, onChange, accounts, files, onFile, legacy, disabled }) {
    const set = (index, key, value) => onChange(rows.map((row, i) => i === index ? { ...row, [key]: value, ...(key === 'currency' ? { accountId: '' } : {}) } : row));
    return <section className="space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="m-0 text-sm font-semibold text-amber-300">Seña / adelanto ({rows.length})</h3><CrmButton size="sm" variant="secondary" disabled={disabled} onClick={() => onChange([...rows, { _id: newSaleRowId(), amount: '', currency: 'USD', date: formSaleDate(new Date().toISOString()), accountId: '', status: 'pendiente', notes: '' }])}><Plus size={14} /> Agregar seña</CrmButton></div>
        <p className="m-0 text-xs leading-5 text-crm-fg-muted">Declaración del acuerdo. Queda pendiente hasta que Tesorería confirme el cobro; guardar esta venta no acredita caja ni descuenta estas señas del saldo cobrado.</p>
        {Number(legacy?.amount) > 0 && <p className="text-xs text-crm-fg">Seña aplicada anterior: {legacy.currency} {Number(legacy.amount).toLocaleString('es-AR')}. Se conserva; su conciliación se realiza desde la ficha financiera.</p>}
        {!rows.length && <p className="rounded-lg border border-dashed border-amber-500/20 p-4 text-center text-xs text-crm-fg-muted">Sin señas declaradas.</p>}
        {rows.map((row, i) => <div key={row._id} className="space-y-3 rounded-lg border border-crm-border p-3"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-crm-fg">Seña {i + 1} · {row.status || 'pendiente'}</span>{row.status === 'pendiente' && <button type="button" aria-label={`Quitar seña ${i + 1}`} disabled={disabled} className="text-xs text-red-300" onClick={() => onChange(rows.filter((_, n) => n !== i))}>Quitar</button>}</div><div className="grid gap-3 sm:grid-cols-4">
            <SaleField label="Monto"><CrmInput type="number" min="0.01" step="any" value={row.amount} disabled={disabled || row.status !== 'pendiente'} onChange={e => set(i, 'amount', e.target.value)} /></SaleField>
            <SaleField label="Moneda"><Currency value={row.currency} onChange={v => set(i, 'currency', v)} /></SaleField>
            <SaleField label="Fecha"><CrmInput type="date" value={formSaleDate(row.date)} onChange={e => set(i, 'date', e.target.value)} disabled={disabled || row.status !== 'pendiente'} /></SaleField>
            <SaleField label="Caja destino"><CrmSelect value={row.accountId?._id || row.accountId || ''} onChange={e => set(i, 'accountId', e.target.value)} disabled={disabled || row.status !== 'pendiente'}><option value="">Pendiente de definir</option>{accounts.filter(a => a.currency === row.currency && a.isActive !== false).map(a => <option value={a._id} key={a._id}>{a.name}</option>)}</CrmSelect></SaleField>
        </div><FileField label="Comprobante (máximo 15 MB)" file={files?.[`deposit_receipt:${row._id}`]} disabled={disabled} onFile={file => onFile({ slot: 'deposit_receipt', depositId: row._id }, file)} /></div>)}
    </section>;
}

export function SaleTradeInEditor({ rows, onChange, stockOptions, onSearch, canStock, files, onFile, disabled }) {
    const [search, setSearch] = useState('');
    const set = (index, key, value) => onChange(rows.map((row, i) => i === index ? { ...row, [key]: value } : row));
    const chooseStock = (index, value) => {
        const car = stockOptions.find(item => item._id === value);
        if (!car) return set(index, 'existingStockCarId', '');
        onChange(rows.map((row, i) => i === index ? { ...row, existingStockCarId: car._id, brand: car.brand || '', model: car.name || '', version: car.version || '', year: car.year || '', mileage: car.km ?? '', plate: car.plateOrVin || '', color: car.color || '', fuel: car.fuel || '', condition: car.condition || '', location: car.location || '', estimatedValue: car.purchasePrice ?? '', currency: car.purchaseCurrency || 'USD', ownerName: car.ownerName || '', consigned: !car.agencyOwned, shouldEnterStock: true } : row));
    };
    return <section className="space-y-4">{rows.map((row, i) => <div className="space-y-4 rounded-xl border border-crm-border bg-crm-bg p-4" key={row._id}>
        <div className="flex items-center justify-between"><h4 className="m-0 text-sm font-semibold">Permuta {i + 1}</h4>{!row.linkedStockCarId && <CrmButton size="sm" variant="ghost" disabled={disabled} onClick={() => onChange(rows.filter((_, n) => i !== n))}><Trash2 size={14} /> Quitar</CrmButton>}</div>
        {row.linkedStockCarId ? <Link href={`/admin/stock/${row.linkedStockCarId}`} className="flex items-center gap-2 text-xs text-crm-red">Abrir unidad vinculada <ExternalLink size={13} /></Link> : canStock && <div className="grid gap-2 sm:grid-cols-2"><CrmInput aria-label={`Buscar stock para permuta ${i + 1}`} placeholder="Buscar en Stock por marca o patente" value={search} onChange={e => { setSearch(e.target.value); onSearch(e.target.value); }} /><CrmSelect aria-label={`Unidad del stock para permuta ${i + 1}`} value={row.existingStockCarId || ''} onChange={e => chooseStock(i, e.target.value)}><option value="">Vehículo nuevo / Sin vincular</option>{stockOptions.filter(c => ['Disponible', 'Pausado'].includes(c.status)).map(c => <option key={c._id} value={c._id}>{c.brand} {c.name} · {c.plateOrVin}</option>)}</CrmSelect></div>}
        <div className="grid gap-3 sm:grid-cols-3">
            <SaleField label="Valor de toma"><CrmInput type="number" min="0" step="any" value={row.estimatedValue ?? ''} disabled={disabled || Boolean(row.linkedStockCarId)} onChange={e => set(i, 'estimatedValue', e.target.value)} /></SaleField>
            <SaleField label="Moneda de toma"><Currency value={row.currency || 'USD'} onChange={v => set(i, 'currency', v)} /></SaleField>
            <SaleField label="Precio de publicación"><CrmInput type="number" min="0" step="any" value={row.askingPrice ?? ''} onChange={e => set(i, 'askingPrice', e.target.value)} /></SaleField>
            {Object.entries({ brand: 'Marca', model: 'Modelo', year: 'Año', mileage: 'Kilómetros', plate: 'Patente', color: 'Color', fuel: 'Combustible', condition: 'Condición', location: 'Ubicación', ownerName: 'Dueño anterior', ownerDni: 'DNI del dueño' }).map(([key, label]) => <SaleField key={key} label={label}><CrmInput value={row[key] ?? ''} onChange={e => set(i, key, e.target.value)} disabled={disabled || Boolean(row.linkedStockCarId)} /></SaleField>)}
        </div>
        <div className="flex flex-wrap gap-5"><SaleCheck checked={row.shouldEnterStock} disabled={disabled || Boolean(row.linkedStockCarId)} onChange={v => set(i, 'shouldEnterStock', v)}>Ingresar automáticamente al Stock al activar</SaleCheck><SaleCheck checked={row.consigned} disabled={disabled || Boolean(row.linkedStockCarId)} onChange={v => set(i, 'consigned', v)}>Vehículo consignado</SaleCheck></div>
        <p className="m-0 text-xs leading-5 text-crm-fg-muted">El borrador conserva el acuerdo. Al activar, las nuevas unidades ingresan pausadas y sin publicar; no se registra caja. Desmarcá el ingreso para guardar sólo la permuta.</p>
        <div className="grid gap-3 sm:grid-cols-2">{['front', 'back'].map(side => <FileField key={side} label={`Cédula ${side === 'front' ? 'frente' : 'dorso'} (máximo 15 MB)`} file={files?.[`trade_in_card_${side}:${row._id}`]} onFile={file => onFile({ slot: `trade_in_card_${side}`, tradeInId: row._id }, file)} disabled={disabled} />)}</div>
    </div>)}<CrmButton size="sm" variant="secondary" disabled={disabled} onClick={() => onChange([...rows, createSaleTradeInRow()])}><Plus size={14} /> {rows.length ? 'Agregar otra permuta' : 'Agregar permuta'}</CrmButton></section>;
}

export function SaleReminderEditor({ rows, onChange, baseDate, disabled }) {
    const set = (i, key, value) => onChange(rows.map((row, n) => i === n ? { ...row, [key]: value } : row));
    const generate = () => {
        const key = formSaleDate(baseDate); if (!key) return;
        const day = new Date(`${key}T12:00:00.000Z`);
        const add = (days, type, note) => { const date = new Date(day); date.setUTCDate(date.getUTCDate() + days); return { _id: newSaleRowId(), type, date: date.toISOString().slice(0, 10), note, completed: false }; };
        const suggested = [add(1, 'postentrega', 'Consultar cómo fue la entrega.'), add(7, 'llamada', 'Seguimiento después de la entrega.'), add(30, 'postentrega', 'Seguimiento del primer mes.')];
        onChange([...rows, ...suggested.filter(next => !rows.some(old => old.type === next.type && old.date === next.date && old.note === next.note))]);
    };
    return <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="m-0 text-xs font-semibold uppercase text-crm-fg-muted">Recordatorios</h3><div className="flex gap-2"><CrmButton size="sm" variant="secondary" disabled={disabled || !baseDate} onClick={generate}>Generar de post entrega</CrmButton><CrmButton size="sm" variant="secondary" disabled={disabled} onClick={() => onChange([...rows, { _id: newSaleRowId(), type: 'llamada', date: '', note: '', completed: false }])}><Plus size={13} /> Agregar</CrmButton></div></div><p className="m-0 text-xs text-crm-fg-muted">Los recordatorios se guardan en esta venta; no envían mensajes. Los automáticos se proponen desde la fecha de entrega y se pueden editar.</p>{rows.map((row, i) => <div className="grid gap-2 rounded-lg border border-crm-border p-3 sm:grid-cols-[150px_145px_1fr_auto]" key={row._id}><CrmSelect aria-label={`Tipo de recordatorio ${i + 1}`} value={row.type} onChange={e => set(i, 'type', e.target.value)}>{Object.entries(SALE_REMINDER_TYPES).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</CrmSelect><CrmInput aria-label={`Fecha de recordatorio ${i + 1}`} type="date" value={formSaleDate(row.date)} onChange={e => set(i, 'date', e.target.value)} /><CrmTextarea aria-label={`Nota de recordatorio ${i + 1}`} value={row.note || ''} onChange={e => set(i, 'note', e.target.value)} className="min-h-9" /><button type="button" className="p-2 text-crm-fg-muted" aria-label={`Quitar recordatorio ${i + 1}`} onClick={() => onChange(rows.filter((_, n) => n !== i))}><Trash2 size={14} /></button></div>)}</section>;
}

export function SaleTopDocumentInputs({ files, onFile, disabled }) {
    return <div className="grid gap-3 sm:grid-cols-2">{Object.entries({ buyer_id_front: 'DNI comprador · frente', buyer_id_back: 'DNI comprador · dorso', vehicle_card_front: 'Cédula vehículo · frente', vehicle_card_back: 'Cédula vehículo · dorso' }).map(([slot, label]) => <FileField key={slot} label={`${label} (máximo 15 MB)`} file={files?.[slot]} disabled={disabled} onFile={file => onFile({ slot }, file)} />)}</div>;
}
