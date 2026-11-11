"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FileText, ExternalLink } from 'lucide-react';
import { useAdminSales } from '../../../hooks/useAdminSales';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import CrmButton from '../ui/CrmButton';
import CrmInput from '../ui/CrmInput';
import CrmSelect from '../ui/CrmSelect';
import CrmTextarea from '../ui/CrmTextarea';
import CrmModal from '../ui/CrmModal';
import { createSaleForm, saleToForm, buildSaleCreatePayload } from '../../../utils/saleDraftForm';
import { SALE_PAYMENT_LABELS } from '../../../utils/salesWorkbench';
import { saleTradeInComposition } from '../../../utils/saleWorkspace';
import { uploadSaleDocument } from '../../../utils/saleDocuments';
import { SaleField, SaleCheck, SaleDepositEditor, SaleTradeInEditor, SaleReminderEditor, SaleTopDocumentInputs, createSaleTradeInRow } from './SaleAgreementEditors';
import SaleDocumentsPanel from './SaleDocumentsPanel';
const Section = ({ title, children }) => <section className="space-y-4"><h3 className="m-0 text-xs font-semibold uppercase tracking-wider text-crm-fg-muted">{title}</h3>{children}</section>;
const optionsWith = (rows, original) => original?._id && !rows.some(row => row._id === original._id) ? [original, ...rows] : rows;

export default function SaleCreateModal({ isOpen, onClose, onSuccess, initialSale = null }) {
    const { token, user } = useAuth();
    const { createSale, updateSale, salesRequest } = useAdminSales();
    const current = useRef({ token, isOpen }); current.current = { token, isOpen };
    const busy = useRef(false);
    const statusChosen = useRef(false);
    const [form, setForm] = useState(createSaleForm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fields, setFields] = useState({});
    const [cars, setCars] = useState([]); const [clients, setClients] = useState([]); const [users, setUsers] = useState([]); const [accounts, setAccounts] = useState([]);
    const [vehicleSearch, setVehicleSearch] = useState(''); const [clientSearch, setClientSearch] = useState('');
    const [stockSearch, setStockSearch] = useState(''); const [tradeStock, setTradeStock] = useState([]);
    const [files, setFiles] = useState({}); const [savedRecord, setSavedRecord] = useState(null);
    const canStock = hasPermission(user, PERMISSIONS.STOCK_READ); const canEnterStock = hasPermission(user, PERMISSIONS.STOCK_WRITE);
    const canClients = hasPermission(user, PERMISSIONS.CLIENTES_READ); const canAccounts = hasPermission(user, PERMISSIONS.CAJA_READ);
    const canCancel = hasPermission(user, PERMISSIONS.VENTAS_CANCEL);
    const canDocuments = hasPermission(user, PERMISSIONS.DOCUMENTACION_WRITE) && hasPermission(user, PERMISSIONS.VENTAS_WRITE);
    const editingActive = Boolean(initialSale?._id && initialSale.status !== 'borrador');
    useEffect(() => {
        if (!isOpen) return;
        statusChosen.current = Boolean(initialSale?._id);
        setForm(saleToForm(initialSale)); setError(''); setFields({}); setFiles({}); setSavedRecord(null); setVehicleSearch(''); setClientSearch(''); setStockSearch('');
    }, [isOpen, initialSale, token]);
    useEffect(() => {
        if (!isOpen || !token) return;
        let cancelled = false;
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            const jobs = [salesRequest('/api/admin/users/active', { signal: controller.signal }).then(data => { if (!cancelled) setUsers(Array.isArray(data) ? data : data.users || []); })];
            if (canStock) jobs.push(salesRequest(`/api/admin/cars?limit=50&status=disponible&search=${encodeURIComponent(vehicleSearch)}`, { signal: controller.signal }).then(data => { if (!cancelled) setCars(data.cars || (Array.isArray(data) ? data : [])); }));
            if (canClients) jobs.push(salesRequest(`/api/admin/clients?limit=50&search=${encodeURIComponent(clientSearch)}`, { signal: controller.signal }).then(data => { if (!cancelled) setClients(data.clients || []); }));
            if (canAccounts) jobs.push(salesRequest('/api/admin/accounts', { signal: controller.signal }).then(data => { if (!cancelled) setAccounts(Array.isArray(data) ? data : data.accounts || []); }));
            const results = await Promise.allSettled(jobs);
            if (!cancelled && results.some(result => result.status === 'rejected' && result.reason?.name !== 'AbortError')) setError('No se pudieron cargar algunas opciones. Reintentá la búsqueda antes de guardar.');
        }, 250);
        return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
    }, [isOpen, token, salesRequest, canStock, canClients, canAccounts, vehicleSearch, clientSearch]);
    useEffect(() => {
        if (!isOpen || !token || !canStock || !form.hasTradeIn) return;
        let cancelled = false; const controller = new AbortController();
        const timer = setTimeout(() => salesRequest(`/api/admin/cars?limit=50&search=${encodeURIComponent(stockSearch)}`, { signal: controller.signal }).then(data => { if (!cancelled) setTradeStock(data.cars || []); }).catch(err => { if (!cancelled && err.name !== 'AbortError') setError(err.message); }), 250);
        return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
    }, [isOpen, token, salesRequest, canStock, form.hasTradeIn, stockSearch]);
    const availableCars = useMemo(() => optionsWith(cars, typeof initialSale?.vehicleId === 'object' ? initialSale.vehicleId : null), [cars, initialSale]);
    const availableClients = useMemo(() => optionsWith(clients, typeof initialSale?.clientId === 'object' ? initialSale.clientId : null), [clients, initialSale]);
    const vehicle = availableCars.find(car => car._id === form.vehicleId);
    const set = (key, value) => {
        if (key === 'status') statusChosen.current = true;
        if (key === 'manualImport') statusChosen.current = false;
        setForm(previous => ({ ...previous, [key]: value, ...(key === 'hasTradeIn' && value && !previous.tradeIns?.length ? { tradeIns: [createSaleTradeInRow()] } : {}), ...(key === 'vehicleId' && !editingActive && !statusChosen.current ? { status: value ? 'confirmada' : 'borrador' } : {}), ...(key === 'manualImport' ? { status: value ? 'entregada' : (previous.vehicleId ? 'confirmada' : 'borrador') } : {}) }));
    };
    const chooseClient = value => { const client = availableClients.find(row => row._id === value); setForm(previous => ({ ...previous, clientId: value, ...(client ? { buyerName: client.fullName || '', buyerPhone: client.phone || '', buyerEmail: client.email || '', buyerDni: client.dniCuit || '' } : {}) })); };
    const onFile = (scope, file) => {
        if (!canDocuments) { setError('Necesitás permiso de Documentación para adjuntar archivos.'); return; }
        if (file.size > 15 * 1024 * 1024) { setError('Cada archivo debe pesar como máximo 15 MB.'); return; }
        const key = `${scope.slot}${scope.depositId || scope.tradeInId ? `:${scope.depositId || scope.tradeInId}` : ''}`;
        setFiles(previous => ({ ...previous, [key]: { ...scope, file } }));
    };
    const fileNames = Object.fromEntries(Object.entries(files).map(([key, entry]) => [key, entry.file]));
    const close = () => { if (!busy.current) onClose?.(); };
    const finish = async (saved, closeAfter = true) => { try { await onSuccess?.(saved); } catch { toast.error('La venta se guardó. Actualizá la lista para ver los cambios.'); } if (closeAfter) onClose?.(); };
    const save = async asDraft => {
        if (busy.current) return;
        const captured = token; busy.current = true; setLoading(true); setError(''); setFields({});
        let saved = savedRecord;
        try {
            if (!saved) {
                const payload = buildSaleCreatePayload(form, editingActive ? initialSale.status : (asDraft ? 'borrador' : form.status));
                if (!canEnterStock && payload.tradeIns.some(row => row.shouldEnterStock && !row.linkedStockCarId) && payload.status !== 'borrador' && !form.manualImport) throw new Error('Necesitás permiso de edición de Stock para ingresar una permuta. Podés guardar un borrador o desmarcar su ingreso.');
                saved = initialSale?._id ? (editingActive ? await salesRequest(`/api/admin/sales/${initialSale._id}/workspace`, { method: 'PATCH', body: JSON.stringify(payload) }) : await updateSale(initialSale._id, payload)) : await createSale(payload);
                if (current.current.token !== captured || !current.current.isOpen) return;
                setSavedRecord(saved);
            }
            for (const [key, entry] of Object.entries(files)) {
                if (entry.depositId && !(saved.depositRecords || []).some(row => row._id === entry.depositId) || entry.tradeInId && !(saved.tradeIns || []).some(row => row._id === entry.tradeInId)) { setFiles(previous => { const next = { ...previous }; delete next[key]; return next; }); continue; }
                await uploadSaleDocument({ saleId: saved._id, token: captured, ...entry });
                if (current.current.token !== captured || !current.current.isOpen) return;
                setFiles(previous => { const next = { ...previous }; delete next[key]; return next; });
            }
            toast.success(saved.status === 'borrador' ? 'Borrador guardado.' : 'Venta guardada.');
            await finish(saved);
        } catch (err) {
            if (current.current.token !== captured || err.name === 'AbortError') return;
            setError(saved ? `La venta ya se guardó. Quedaron archivos pendientes: ${err.message}. Reintentá los adjuntos sin crear otra venta.` : err.message);
            setFields(err.errors || {});
        } finally { busy.current = false; if (current.current.token === captured) setLoading(false); }
    };
    if (!isOpen) return null;
    const disabled = loading || Boolean(savedRecord);
    const composition = saleTradeInComposition({ salePrice: Number(form.salePrice), saleCurrency: form.saleCurrency, tradeIns: form.hasTradeIn ? form.tradeIns : [], exchangeRate: Number(form.exchangeRate), depositAppliedAmount: form.depositAppliedAmount, depositAppliedCurrency: form.depositAppliedCurrency });
    return <CrmModal isOpen={isOpen} onClose={close} title={initialSale?._id ? (editingActive ? 'Editar venta' : 'Continuar borrador') : 'Nueva venta'} maxWidth="max-w-4xl" fullScreenOnMobile fullHeightOnDesktop bodyClassName="p-0" footer={<div className="flex flex-wrap items-center justify-end gap-2"><CrmButton variant="secondary" disabled={loading} onClick={close}>Cancelar</CrmButton>{savedRecord ? <><CrmButton variant="secondary" disabled={loading} onClick={() => finish(savedRecord)}>Cerrar · venta guardada</CrmButton><CrmButton disabled={loading || !Object.keys(files).length} onClick={() => save(false)}>{loading ? 'Subiendo…' : 'Reintentar archivos'}</CrmButton></> : <>{!editingActive && !form.manualImport && <CrmButton variant="secondary" disabled={loading} onClick={() => save(true)}>Guardar borrador</CrmButton>}<CrmButton disabled={loading} onClick={() => save(false)}><FileText size={14} />{loading ? 'Guardando…' : initialSale?._id ? 'Guardar cambios' : 'Crear venta'}</CrmButton></>}</div>}>
        <div className="space-y-7 p-5 sm:p-6">
            {error && <div role="alert" className="rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">{error}{Object.keys(fields).length > 0 && <ul className="mb-0 mt-2 list-disc pl-4">{Object.entries(fields).map(([key, message]) => <li key={key}>{typeof message === 'string' ? message : message.message || key}</li>)}</ul>}</div>}
            {!editingActive && <div className="rounded-xl border border-crm-border p-4"><SaleCheck checked={form.manualImport} onChange={v => set('manualImport', v)} disabled={disabled}>Carga manual · venta histórica</SaleCheck><p className="mb-0 mt-2 text-xs leading-5 text-crm-fg-muted">Carga simplificada cerrada, sin abrir expediente, modificar stock, generar cuotas ni registrar caja.</p></div>}
            <fieldset disabled={disabled} className="m-0 min-w-0 space-y-7 border-0 p-0 disabled:opacity-60">
            <Section title="Datos de la operación"><div className="grid gap-4 sm:grid-cols-2">
                <SaleField label="Vehículo"><div className="space-y-2">{!editingActive && canStock && <CrmInput aria-label="Buscar vehículo" placeholder="Buscar marca, modelo, patente…" value={vehicleSearch} onChange={e => setVehicleSearch(e.target.value)} />}<CrmSelect aria-label="Vehículo" value={form.vehicleId} disabled={editingActive} onChange={e => set('vehicleId', e.target.value)}><option value="">Sin vehículo asignado</option>{availableCars.map(car => <option key={car._id} value={car._id}>{car.brand} {car.name} · {car.plateOrVin}</option>)}</CrmSelect>{editingActive && <span className="block text-xs text-crm-fg-muted">Para cambiar la unidad, usá el circuito de cambio en la ficha CRM.</span>}</div></SaleField>
                <SaleField label="Status">{editingActive ? <CrmInput readOnly value={{ confirmada: 'Activa', señado: 'Reserva', pendiente_entrega: 'Pendiente de entrega', entregada: 'Cerrada', cancelada: 'Cancelada' }[form.status] || form.status} /> : <CrmSelect aria-label="Estado inicial de la venta" value={form.status} disabled={form.manualImport} onChange={event => set('status', event.target.value)}><option value="borrador">Borrador</option><option value="confirmada">Activa</option><option value="señado">Reserva</option><option value="entregada">Cerrada</option><option value="cancelada" disabled={!canCancel}>Cancelada{!canCancel ? " · requiere permiso" : ""}</option></CrmSelect>}<span className="mt-2 block text-xs">{editingActive ? 'Los cambios de estado se realizan desde el detalle.' : 'Por defecto según vehículo; podés elegir otro estado inicial. El cierre operativo requiere el circuito de entrega.'}</span>{!editingActive && !form.manualImport && form.status === 'entregada' && <span className="mt-2 block text-xs text-amber-300">Para una operación actual, creala Activa y cerrala desde su ficha. Para una venta anterior, activá Carga manual histórica.</span>}</SaleField>
                {!editingActive && form.status === 'cancelada' && <div className="sm:col-span-2"><SaleField label="Motivo de la cancelación inicial"><CrmTextarea value={form.initialCancellationReason} onChange={event => set('initialCancellationReason', event.target.value)} /></SaleField></div>}
                <SaleField label="Kilometraje del vehículo"><CrmInput type="number" min="0" value={form.mileage} onChange={e => set('mileage', e.target.value)} /></SaleField><div />
                <SaleField label="Precio de venta al comprador"><div className="flex gap-2"><CrmSelect aria-label="Moneda de venta" value={form.saleCurrency} onChange={e => set('saleCurrency', e.target.value)} className="!w-24 shrink-0"><option>USD</option><option>ARS</option></CrmSelect><CrmInput aria-label="Precio de venta" type="number" min="0" step="any" value={form.salePrice} onChange={e => set('salePrice', e.target.value)} /></div></SaleField>
                <SaleField label="Vendedor que cerró la venta"><CrmSelect value={form.salesperson} onChange={e => set('salesperson', e.target.value)}><option value="">Sin asignar</option>{form.salesperson && !users.some(u => u.username === form.salesperson) && <option value={form.salesperson}>{form.salesperson}</option>}{users.map(u => <option key={u._id} value={u.username}>{u.name || u.username}</option>)}</CrmSelect></SaleField>
                <SaleField label="Fecha de venta"><CrmInput type="date" value={form.saleDate} onChange={e => set('saleDate', e.target.value)} /></SaleField>
            </div></Section>
            <Section title="Comprador"><div className="grid gap-4 sm:grid-cols-2">
                <SaleField label="Cliente del CRM"><div className="space-y-2">{canClients && !editingActive && <CrmInput placeholder="Buscar cliente, DNI o teléfono…" value={clientSearch} onChange={e => setClientSearch(e.target.value)} />}<CrmSelect value={form.clientId} disabled={editingActive} onChange={e => chooseClient(e.target.value)}><option value="">Datos manuales · sin crear cliente</option>{availableClients.map(client => <option key={client._id} value={client._id}>{client.fullName}</option>)}</CrmSelect>{canClients && form.clientId && <Link href={`/admin/clientes/${form.clientId}`} className="inline-flex items-center gap-1 text-crm-red">Abrir cliente <ExternalLink size={12} /></Link>}</div></SaleField>
                {Object.entries({ buyerName: 'Nombre', buyerPhone: 'Teléfono', buyerEmail: 'Email', buyerDni: 'DNI' }).map(([key, label]) => <SaleField key={key} label={label}><CrmInput aria-label={`${label} del comprador`} value={form[key]} onChange={e => set(key, e.target.value)} /></SaleField>)}
            </div><p className="m-0 text-xs text-crm-fg-muted">Estos datos describen el comprador de la operación. Editarlos no modifica su ficha de cliente vinculada.</p></Section>
            <Section title="Propietario del vehículo"><div className="grid gap-4 sm:grid-cols-2"><SaleField label="Nombre"><CrmInput value={vehicle ? vehicle.ownerName || 'Sin informar en Stock' : form.vehicleOwnerName} readOnly={Boolean(form.vehicleId)} onChange={e => set('vehicleOwnerName', e.target.value)} /></SaleField><SaleField label="Teléfono"><CrmInput value={vehicle ? vehicle.ownerPhone || '' : form.vehicleOwnerPhone} readOnly={Boolean(form.vehicleId)} onChange={e => set('vehicleOwnerPhone', e.target.value)} /></SaleField></div>{form.vehicleId && <p className="m-0 text-xs text-crm-fg-muted">Los datos del propietario se editan desde Stock.</p>}</Section>
            {!form.manualImport && <>
                <SaleDepositEditor rows={form.depositRecords} onChange={v => set('depositRecords', v)} accounts={accounts} files={fileNames} onFile={onFile} legacy={{ amount: form.depositAppliedAmount, currency: form.depositAppliedCurrency }} disabled={disabled} />
                {!canAccounts && <p className="text-xs text-crm-fg-muted">Sin permiso de Caja: podés declarar la seña sin elegir cuenta; Tesorería definirá el destino.</p>}
                <Section title="Pago"><div className="grid gap-4 sm:grid-cols-2"><SaleField label="Método de pago"><CrmSelect value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}><option value="">Seleccionar</option>{Object.entries(SALE_PAYMENT_LABELS).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</CrmSelect></SaleField><SaleField label="Cantidad de cuotas acordadas"><CrmSelect value={form.installmentsCount} onChange={e => set('installmentsCount', e.target.value)} disabled={editingActive || !['financiado', 'mixto'].includes(form.paymentMethod)}><option value="">Sin definir</option>{[3, 6, 12, 18, 24, 36, 48].map(value => <option key={value} value={value}>{value} cuotas</option>)}</CrmSelect></SaleField></div><p className="m-0 text-xs text-crm-fg-muted">El plan de cuotas se configura y confirma desde la ficha financiera.</p></Section>
                <Section title="Permuta"><SaleCheck checked={form.hasTradeIn} onChange={v => set('hasTradeIn', v)}>Incluir vehículo en parte de pago</SaleCheck>{form.hasTradeIn ? <><SaleTradeInEditor rows={form.tradeIns} onChange={v => set('tradeIns', v)} stockOptions={tradeStock} onSearch={setStockSearch} canStock={canStock} files={fileNames} onFile={onFile} disabled={disabled} /><SaleField label="Cotización acordada · ARS por USD (opcional)"><CrmInput type="number" min="0.01" step="any" value={form.exchangeRate} onChange={e => set('exchangeRate', e.target.value)} /></SaleField><p className="m-0 text-xs text-crm-fg-muted">Tomas: USD {composition.totals.USD.toLocaleString('es-AR')} · ARS {composition.totals.ARS.toLocaleString('es-AR')}. {composition.unresolved ? 'Hay monedas diferentes sin cotización: esos importes no se restan del saldo.' : `Crédito de permuta: ${form.saleCurrency} ${composition.credit.toLocaleString('es-AR')}.`}</p></> : <p className="rounded-xl border border-crm-border p-4 text-xs text-crm-fg-muted">Sin permuta.</p>}</Section>
                <Section title="Consignación"><div className="grid gap-4 sm:grid-cols-2">{[['consignationOwnerId', 'Responsable de la consignación'], ['consignationManagerId', 'Gestor asignado']].map(([key, label]) => <SaleField key={key} label={label}><CrmSelect value={form[key]} onChange={e => set(key, e.target.value)}><option value="">Sin asignar</option>{users.map(u => <option key={u._id} value={u._id}>{u.name || u.username}</option>)}</CrmSelect></SaleField>)}</div></Section>
                <Section title="Comisión"><div className="space-y-4 rounded-xl border border-amber-500/25 p-4"><SaleCheck checked={form.manualCommission} onChange={v => set('manualCommission', v)}>Carga manual de comisión</SaleCheck><div className="grid gap-3 sm:grid-cols-3"><SaleField label="% vendedor"><CrmInput type="number" min="0" max="100" step="any" disabled={!form.manualCommission || form.splitCommission} value={form.splitCommission ? 0.5 : form.manualCommission ? form.sellerPct : 1} onChange={e => set('sellerPct', e.target.value)} /></SaleField><SaleField label="% consignación"><CrmInput type="number" min="0" max="100" step="any" disabled={!form.manualCommission || form.splitCommission} value={form.splitCommission ? 0.5 : form.manualCommission ? form.consignationPct : 0.5} onChange={e => set('consignationPct', e.target.value)} /></SaleField><SaleField label="Extra al cliente"><div className="flex gap-2"><CrmSelect value={form.extraCurrency} onChange={e => set('extraCurrency', e.target.value)} className="!w-24 shrink-0"><option>USD</option><option>ARS</option></CrmSelect><CrmInput type="number" min="0" step="any" disabled={form.commissionMode === 'percent'} value={form.extraAmount} onChange={e => set('extraAmount', e.target.value)} /></div></SaleField></div>{form.commissionMode === 'percent' && <p className="text-xs text-crm-fg-muted">Extra de comisión vigente: {form.commissionPercent}% del precio. Se conserva este cálculo; podés editar su modalidad desde la ficha CRM.</p>}<SaleCheck checked={form.splitCommission} onChange={v => set('splitCommission', v)}>Comisión compartida 50/50 · 0,5% cada vendedor</SaleCheck><p className="m-0 text-xs text-crm-fg-muted">Regla fija: vendedor 1% y consignación 0,5%, salvo carga manual. La liquidación no genera caja automáticamente.</p></div></Section>
                <Section title="Ítems de entrega"><div className="grid gap-3 sm:grid-cols-2">{Object.entries({ securityNut: 'Tuerca de seguridad', spareKey: 'Duplicado de llave', manuals: 'Manuales', vehicleCard: 'Cédula' }).map(([key, label]) => <SaleCheck key={key} checked={form.deliveryItems[key]} onChange={v => set('deliveryItems', { ...form.deliveryItems, [key]: v })}>{label}</SaleCheck>)}</div></Section>
                <Section title="Documentos para el expediente">{canDocuments ? <><SaleTopDocumentInputs files={fileNames} onFile={onFile} disabled={disabled} />{initialSale?._id && <SaleDocumentsPanel saleId={initialSale._id} />}</> : <p className="text-xs text-crm-fg-muted">Necesitás permiso de Documentación para adjuntar archivos.</p>}<p className="m-0 text-xs text-crm-fg-muted">Los archivos se suben de forma privada después de guardar la venta. Si falla una carga, podés reintentar sin duplicar la operación.</p></Section>
                <SaleField label="Fecha de entrega estimada"><CrmInput type="date" value={form.estimatedDeliveryDate} onChange={e => set('estimatedDeliveryDate', e.target.value)} className="sm:max-w-xs" /></SaleField>
                <SaleReminderEditor rows={form.reminders} onChange={v => set('reminders', v)} baseDate={form.estimatedDeliveryDate} disabled={disabled} />
                <SaleCheck checked={form.reviewAsked} onChange={v => set('reviewAsked', v)}>Reseña solicitada · registro manual, sin envío</SaleCheck>
                {editingActive && <Section title="Bitácora · agregar gestión"><div className="grid gap-3 sm:grid-cols-[160px_1fr]"><CrmSelect value={form.managementNote.recipient} onChange={e => set('managementNote', { ...form.managementNote, recipient: e.target.value })}><option value="gestoria">Gestoría</option><option value="finanzas">Finanzas</option></CrmSelect><CrmTextarea placeholder="Escribí una gestión para agregar al historial" value={form.managementNote.text} onChange={e => set('managementNote', { ...form.managementNote, text: e.target.value })} /></div><p className="m-0 text-xs text-crm-fg-muted">Se agrega con autor y fecha. No modifica saldos ni envía notificaciones.</p></Section>}
            </>}
            <SaleField label="Notas generales"><CrmTextarea value={form.notes} onChange={e => set('notes', e.target.value)} className="min-h-24" /></SaleField>
            {editingActive && <details className="rounded-xl border border-crm-border p-4"><summary className="cursor-pointer text-sm">Historial de la venta</summary><div className="mt-3 space-y-2">{[...(initialSale.managementNotes || []).map(row => ({ ...row, details: `${row.recipient}: ${row.text}`, user: row.author })), ...(initialSale.saleAuditLog || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).map((row, i) => <p className="text-xs text-crm-fg-muted" key={i}>{row.details || row.action} · {row.user} · {new Date(row.date).toLocaleString('es-AR')}</p>)}</div></details>}
            </fieldset>
        </div>
    </CrmModal>;
}
