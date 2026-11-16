"use client";
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, Search, Plus, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useAdminClients } from '../../../hooks/useAdminClients';
import { useAdminSales } from '../../../hooks/useAdminSales';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import CrmButton from '../ui/CrmButton';
import CrmInput from '../ui/CrmInput';
import CrmSelect from '../ui/CrmSelect';
import CrmTextarea from '../ui/CrmTextarea';
import CrmModal from '../ui/CrmModal';

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
const labelCar = car => `${car?.brand || ''} ${car?.name || car?.model || ''} ${car?.infoAuto?.versionName || car?.version || ''} ${car?.plateOrVin ? `· ${car.plateOrVin}` : ''}`.trim();
const idOf = value => String(value?._id || value || '');
const money = (n, currency) => `${currency || 'USD'} ${Number(n || 0).toLocaleString('es-AR')}`;
const Field = ({ label, children }) => <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold text-crm-fg-muted">{label}</span>{children}</label>;
const newForm = user => ({ vehicleId: '', salePrice: '', saleCurrency: 'USD', saleDate: today(), assignedTo: user?.id || user?.userId || user?._id || '',
    clientId: '', buyerName: '', buyerPhone: '', buyerEmail: '', buyerDni: '', paymentMethod: 'contado', notes: '',
    depositAppliedAmount: '', depositAppliedCurrency: 'USD', exchangeRate: '', hasFinancing: false, downPayment: '', installmentsCount: '12',
    interestRate: '0', calculationMode: 'by_rate', customInstallmentAmount: '', tradeIns: [], resolvePause: false, pauseResolutionReason: '',
    splitCommission: false, consignationManagerId: '', extraAmount: '', extraCurrency: 'USD', isManualImport: false });
const newTradeIn = () => ({ brand: '', model: '', version: '', year: '', plate: '', estimatedValue: '', currency: 'USD', documentationStatus: 'pendiente' });

export default function SaleCreateModal({ isOpen, onClose, onSuccess, onViewSale }) {
    const { user } = useAuth();
    const { clients, fetchClients } = useAdminClients();
    const [users, setUsers] = useState([]);
    const { createSale, fetchVehicleOptions, fetchSalespeople } = useAdminSales();
    const [form, setForm] = useState(() => newForm(user));
    const [vehicleSearch, setVehicleSearch] = useState('');
    const [options, setOptions] = useState({ cars: [], pages: 1, total: 0 });
    const [page, setPage] = useState(1);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [searching, setSearching] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [savedSale, setSavedSale] = useState(null);
    const [hasDeposit, setHasDeposit] = useState(false);
    const submitLock = useRef(false);
    const canAssign = hasPermission(user, PERMISSIONS.ASIGNACIONES_WRITE);
    const reservation = selectedVehicle?.reservation;
    const expiredReservation = reservation && new Date(reservation.expiresAt).getTime() <= Date.now();
    const activeSaleId = selectedVehicle?.activeSale?._id;
    const amountInSaleCurrency = (value, currency) => {
        const n = Number(value || 0);
        if (currency === form.saleCurrency) return n;
        const rate = Number(form.exchangeRate || 0);
        return rate > 0 ? (currency === 'USD' ? n * rate : n / rate) : 0;
    };
    const minimumDownPayment = (hasDeposit ? amountInSaleCurrency(form.depositAppliedAmount, form.depositAppliedCurrency) : 0)
        + form.tradeIns.reduce((sum, item) => sum + amountInSaleCurrency(item.estimatedValue, item.currency), 0);
    const effectiveDownPayment = form.downPayment === '' ? minimumDownPayment : Number(form.downPayment);
    const sellerName = users.find(seller => idOf(seller._id) === idOf(form.assignedTo))?.name || user?.username || user?.name || user?.email || 'Usuario actual';
    const field = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    useEffect(() => {
        if (!isOpen) return;
        setForm(newForm(user)); setVehicleSearch(''); setPage(1); setSelectedVehicle(null);
        setError(''); setSavedSale(null); setHasDeposit(false); submitLock.current = false;
        fetchClients({ limit: 80 });
        fetchSalespeople().then(setUsers).catch(err => setError(err.message));
    }, [isOpen, user, fetchClients, fetchSalespeople]);

    useEffect(() => {
        if (!isOpen || savedSale) return;
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setSearching(true);
            try { setOptions(await fetchVehicleOptions({ q: vehicleSearch, page, signal: controller.signal })); }
            catch (err) { if (err.name !== 'AbortError') setError(err.message); }
            finally { if (!controller.signal.aborted) setSearching(false); }
        }, 250);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [isOpen, savedSale, vehicleSearch, page, fetchVehicleOptions]);

    if (!isOpen) return null;
    const close = () => { if (!submitLock.current) onClose?.(); };
    const selectVehicle = vehicle => {
        setSelectedVehicle(vehicle);
        const reserve = vehicle.reservation;
        const client = reserve?.clientId;
        setForm(prev => ({ ...prev, vehicleId: vehicle._id, isManualImport: false,
            salePrice: reserve?.agreedPrice ?? vehicle.price ?? '', saleCurrency: reserve?.agreedCurrency || (['USD', 'U$S'].includes(vehicle.currency) ? 'USD' : 'ARS'),
            clientId: idOf(client), buyerName: client?.fullName || '', buyerPhone: client?.phone || '', buyerEmail: client?.email || '', buyerDni: client?.dniCuit || '',
            depositAppliedAmount: reserve?.depositAmount || '', depositAppliedCurrency: reserve?.depositCurrency || 'USD',
            resolvePause: false, pauseResolutionReason: '' }));
        setHasDeposit(Boolean(reserve)); setError('');
    };
    const selectClient = id => {
        const client = clients.find(item => idOf(item._id) === id);
        setForm(prev => ({ ...prev, clientId: id, buyerName: client?.fullName || '', buyerPhone: client?.phone || '', buyerEmail: client?.email || '', buyerDni: client?.dniCuit || '' }));
    };
    const updateTradeIn = (index, key, value) => setForm(prev => ({ ...prev, tradeIns: prev.tradeIns.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
    const viewSale = async id => { await onViewSale?.(id); onClose?.(); };
    const handleSubmit = async () => {
        if (submitLock.current) return;
        setError('');
        if (!form.isManualImport && !selectedVehicle) return setError('Seleccioná una unidad del stock.');
        if (activeSaleId) return setError('La unidad ya tiene una venta. Abrí la operación existente.');
        if (!form.clientId && !form.buyerName.trim()) return setError('Seleccioná un cliente o ingresá el nombre del comprador.');
        if (form.salePrice === '' || !Number.isFinite(Number(form.salePrice)) || Number(form.salePrice) < 0) return setError('Ingresá un precio de venta válido.');
        submitLock.current = true; setLoading(true);
        try {
            const financing = form.hasFinancing || form.paymentMethod === 'financiado';
            const payload = { ...form, status: 'confirmada', salePrice: Number(form.salePrice),
                reservationId: reservation?._id, buyerName: form.buyerName.trim(),
                depositAppliedAmount: hasDeposit ? Number(form.depositAppliedAmount || 0) : 0,
                tradeIns: form.tradeIns.map(item => ({ ...item, year: Number(item.year), estimatedValue: Number(item.estimatedValue) })),
                financingDetails: financing ? { hasFinancing: true, cashPrice: Number(form.salePrice), downPayment: effectiveDownPayment,
                    installmentsCount: Number(form.installmentsCount), interestRate: Number(form.interestRate), calculationMode: form.calculationMode,
                    customInstallmentAmount: Number(form.customInstallmentAmount || 0), includesDeposit: hasDeposit } : null,
                commissionSettings: { isSplit: form.splitCommission, sellerPct: form.splitCommission ? 0.5 : 1, consignationPct: 0.5,
                    extraAmount: Number(form.extraAmount || 0), extraCurrency: form.extraCurrency },
            };
            const sale = await createSale(payload);
            setSavedSale(sale);
            window.dispatchEvent(new CustomEvent('crm:stock-changed', { detail: { vehicleId: sale.vehicleId, saleId: sale._id, status: 'Vendido' } }));
            localStorage.setItem('crm:stock-changed', `${Date.now()}:${sale._id}`);
            await onSuccess?.(sale);
            toast.success('Venta confirmada.');
        } catch (err) {
            setError(err.message || 'No se pudo confirmar la venta.');
            if (err.activeSaleId) setSelectedVehicle(prev => ({ ...prev, activeSale: { _id: err.activeSaleId } }));
            else if (err.status === 409 && selectedVehicle) {
                // A newly reserved unit must be selected again, so its client
                // and deposit are reviewed before authorizing conversion.
                setSelectedVehicle(null);
                field('vehicleId', '');
                const query = selectedVehicle.plateOrVin || selectedVehicle.name || '';
                setVehicleSearch(query); setPage(1);
                try { setOptions(await fetchVehicleOptions({ q: query, page: 1 })); } catch {}
            }
        } finally { submitLock.current = false; setLoading(false); }
    };
    const blocked = activeSaleId || expiredReservation || (!form.isManualImport && selectedVehicle?.status === 'Pausado' && (!selectedVehicle.canResolvePause || !form.resolvePause || form.pauseResolutionReason.trim().length < 5));
    const mixedCurrency = (hasDeposit && Number(form.depositAppliedAmount) > 0 && form.depositAppliedCurrency !== form.saleCurrency) || form.tradeIns.some(item => item.currency !== form.saleCurrency && Number(item.estimatedValue) > 0);

    return <CrmModal isOpen={isOpen} onClose={close} title={savedSale ? 'Venta confirmada' : 'Nueva venta'} maxWidth="max-w-3xl" footer={
        <div className="flex flex-wrap justify-end gap-2">
            <CrmButton variant="secondary" onClick={close} disabled={loading}>{savedSale ? 'Cerrar' : 'Cancelar'}</CrmButton>
            {savedSale ? <CrmButton variant="primary" onClick={() => viewSale(savedSale._id)}>Ver venta</CrmButton> :
                activeSaleId ? <CrmButton variant="primary" onClick={() => viewSale(activeSaleId)}>Abrir operación existente</CrmButton> :
                <CrmButton variant="primary" onClick={handleSubmit} disabled={loading || Boolean(blocked)}>{loading ? 'Confirmando…' : reservation ? 'Convertir reserva y confirmar' : 'Confirmar venta'}</CrmButton>}
        </div>
    }>
        <div className="space-y-6 p-4 sm:p-6">
            {savedSale ? <div className="space-y-4 py-4" role="status">
                <CheckCircle2 size={36} className="text-emerald-400" />
                <p className="text-lg font-semibold text-crm-fg">{selectedVehicle ? labelCar(selectedVehicle) : 'Venta histórica'} · Vendido</p>
                <p className="text-crm-fg-muted">Vendedor: {savedSale.salesperson}. Importe: {money(savedSale.salePrice, savedSale.saleCurrency)}.</p>
                <p className="text-sm text-crm-fg-muted">Mis Ventas y Stock ya están actualizados.{reservation ? ' La reserva fue convertida y su seña se aplicó una sola vez.' : ''}</p>
            </div> : <>
                <p className="m-0 text-sm text-crm-fg-muted">Elegí la unidad y confirmá la operación acá. El stock pasa a Vendido al guardar.</p>
                {error && <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
                {!form.isManualImport && <section className="space-y-3" aria-label="Elegir vehículo">
                    <Field label="Buscar en todo el stock por modelo, versión o patente">
                        <div className="relative"><Search size={16} className="absolute left-3 top-3 text-crm-fg-muted" />
                            <CrmInput value={vehicleSearch} onChange={e => { setVehicleSearch(e.target.value); setPage(1); }} placeholder="Ej. Corolla, XEI o AB123CD" className="pl-9" />
                        </div>
                    </Field>
                    <div className="max-h-52 overflow-y-auto rounded-lg border border-crm-border" aria-busy={searching}>
                        {searching && <p className="px-3 text-sm text-crm-fg-muted">Buscando…</p>}
                        {!searching && !options.cars.length && <p className="px-3 text-sm text-crm-fg-muted">No se encontraron unidades.</p>}
                        {options.cars.map(car => <button type="button" key={car._id} onClick={() => selectVehicle(car)} aria-pressed={form.vehicleId === car._id}
                            className={`flex w-full flex-wrap items-center justify-between gap-2 border-b border-crm-border px-3 py-3 text-left text-sm last:border-0 ${form.vehicleId === car._id ? 'bg-crm-red/15 text-crm-fg' : 'text-crm-fg hover:bg-crm-surface-raised'}`}>
                            <span className="min-w-0 break-words font-medium">{labelCar(car)}</span><span className="rounded bg-crm-bg px-2 py-1 text-xs">{car.activeSale ? `${car.status} · Venta activa` : car.status}</span>
                        </button>)}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-crm-fg-muted"><span>{options.total} unidades · página {page} de {options.pages}</span>
                        <div className="flex gap-2"><CrmButton variant="ghost" size="sm" disabled={page <= 1 || searching} onClick={() => setPage(p => p - 1)}>Anterior</CrmButton><CrmButton variant="ghost" size="sm" disabled={page >= options.pages || searching} onClick={() => setPage(p => p + 1)}>Siguiente</CrmButton></div>
                    </div>
                    {selectedVehicle && <div className="rounded-lg border border-crm-border bg-crm-bg p-3 text-sm"><strong>{labelCar(selectedVehicle)}</strong><span className="ml-2 text-crm-fg-muted">{selectedVehicle.status}</span></div>}
                    {activeSaleId && <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-300">Esta unidad ya tiene una venta activa. Abrí la operación existente para continuar.</p>}
                    {reservation && <div className={`rounded-lg p-3 text-sm ${expiredReservation ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                        {expiredReservation ? 'La reserva está vencida. Resolvela antes de confirmar.' : <>Reserva vigente de {reservation.clientId?.fullName || 'cliente sin vincular'}. Se recuperaron el comprador y la seña de {money(reservation.depositAmount, reservation.depositCurrency)}. No se genera un nuevo cobro.</>}
                    </div>}
                    {selectedVehicle?.status === 'Reservado' && !reservation && <p className="text-sm text-amber-300">No hay una reserva activa vinculada. Revisá la unidad antes de vender.</p>}
                    {selectedVehicle?.status === 'Pausado' && <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                        <p className="m-0 text-amber-300">Pausado: {selectedVehicle.pauseReason}</p>
                        {selectedVehicle.canResolvePause ? <><label className="flex gap-2"><input type="checkbox" checked={form.resolvePause} onChange={e => field('resolvePause', e.target.checked)} />Resolver la pausa y confirmar la venta</label>
                            {form.resolvePause && <Field label="Motivo de resolución de la pausa"><CrmTextarea value={form.pauseResolutionReason} onChange={e => field('pauseResolutionReason', e.target.value)} /></Field>}</> : <p className="m-0 text-crm-fg-muted">Un usuario con permiso de Stock debe resolver esta pausa.</p>}
                    </div>}
                </section>}
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label="Datos de venta">
                    <Field label="Precio de venta (precio al contado si hay financiación)"><div className="flex gap-2"><CrmSelect aria-label="Moneda de venta" value={form.saleCurrency} onChange={e => field('saleCurrency', e.target.value)} className="w-24 shrink-0"><option>USD</option><option>ARS</option></CrmSelect><CrmInput aria-label="Precio de venta" type="number" min="0" value={form.salePrice} onChange={e => field('salePrice', e.target.value)} /></div></Field>
                    <Field label="Vendedor">{canAssign ? <CrmSelect value={form.assignedTo} onChange={e => field('assignedTo', e.target.value)}><option value={user?.id || user?.userId || user?._id}>{user?.username || user?.name || 'Usuario actual'}</option>{users.filter(seller => idOf(seller._id) !== idOf(user?.id || user?.userId || user?._id)).map(seller => <option key={seller._id} value={seller._id}>{seller.name || seller.email}</option>)}</CrmSelect> : <CrmInput value={sellerName} readOnly />}</Field>
                    <Field label="Fecha de cierre"><CrmInput type="date" value={form.saleDate} onChange={e => field('saleDate', e.target.value)} /></Field>
                    <Field label="Forma de pago"><CrmSelect value={form.paymentMethod} onChange={e => field('paymentMethod', e.target.value)}><option value="contado">Contado</option><option value="financiado">Financiado</option><option value="permuta">Permuta</option><option value="mixto">Mixto</option><option value="otro">Otro</option></CrmSelect></Field>
                </section>
                <section className="space-y-4" aria-label="Comprador">
                    <h3 className="m-0 text-sm font-bold text-crm-fg">Comprador</h3>
                    <Field label="Cliente del CRM"><CrmSelect value={form.clientId} onChange={e => selectClient(e.target.value)} disabled={Boolean(reservation)}><option value="">Crear comprador con los datos de abajo</option>{reservation?.clientId && !clients.some(c => idOf(c._id) === idOf(reservation.clientId)) && <option value={idOf(reservation.clientId)}>{reservation.clientId.fullName}</option>}{clients.map(client => <option key={client._id} value={client._id}>{client.fullName || client.firstName}</option>)}</CrmSelect></Field>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label="Nombre del comprador"><CrmInput value={form.buyerName} onChange={e => field('buyerName', e.target.value)} readOnly={Boolean(form.clientId)} /></Field><Field label="Teléfono"><CrmInput type="tel" value={form.buyerPhone} onChange={e => field('buyerPhone', e.target.value)} readOnly={Boolean(form.clientId)} /></Field>
                        {!form.clientId && <><Field label="Email (opcional)"><CrmInput type="email" value={form.buyerEmail} onChange={e => field('buyerEmail', e.target.value)} /></Field><Field label="DNI / CUIT (opcional)"><CrmInput value={form.buyerDni} onChange={e => field('buyerDni', e.target.value)} /></Field></>}
                    </div>
                </section>
                <section className="space-y-4 border-t border-crm-border pt-4" aria-label="Condiciones adicionales">
                    {!reservation && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hasDeposit} onChange={e => setHasDeposit(e.target.checked)} />Aplicar una seña ya registrada</label>}
                    {hasDeposit && <div className="grid gap-3 sm:grid-cols-2"><Field label="Seña aplicada (no genera un cobro)"><CrmInput type="number" min="0" value={form.depositAppliedAmount} onChange={e => field('depositAppliedAmount', e.target.value)} readOnly={Boolean(reservation)} /></Field><Field label="Moneda de la seña"><CrmSelect value={form.depositAppliedCurrency} onChange={e => field('depositAppliedCurrency', e.target.value)} disabled={Boolean(reservation)}><option>USD</option><option>ARS</option></CrmSelect></Field></div>}
                    <div className="flex items-center justify-between gap-2"><span className="text-sm">Permuta</span><CrmButton variant="secondary" size="sm" onClick={() => field('tradeIns', [...form.tradeIns, newTradeIn()])}><Plus size={14} />Agregar unidad</CrmButton></div>
                    {form.tradeIns.map((item, index) => <div key={index} className="space-y-3 rounded-lg border border-crm-border p-3"><div className="flex justify-between"><strong className="text-sm">Permuta {index + 1}</strong><button type="button" aria-label={`Quitar permuta ${index + 1}`} onClick={() => field('tradeIns', form.tradeIns.filter((_, i) => i !== index))}><X size={16} /></button></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[['brand', 'Marca'], ['model', 'Modelo'], ['version', 'Versión'], ['plate', 'Patente'], ['year', 'Año'], ['estimatedValue', 'Valor de toma']].map(([key, label]) => <Field key={key} label={label}><CrmInput type={['year', 'estimatedValue'].includes(key) ? 'number' : 'text'} min="0" value={item[key]} onChange={e => updateTradeIn(index, key, e.target.value)} /></Field>)}<Field label="Moneda de toma"><CrmSelect value={item.currency} onChange={e => updateTradeIn(index, 'currency', e.target.value)}><option>USD</option><option>ARS</option></CrmSelect></Field></div></div>)}
                    {mixedCurrency && <Field label="Tipo de cambio de la operación (ARS por USD)"><CrmInput type="number" min="0" value={form.exchangeRate} onChange={e => field('exchangeRate', e.target.value)} /></Field>}
                    {form.paymentMethod === 'mixto' && <label className="flex gap-2 text-sm"><input type="checkbox" checked={form.hasFinancing} onChange={e => field('hasFinancing', e.target.checked)} />Hay saldo financiado</label>}
                    {(form.hasFinancing || form.paymentMethod === 'financiado') && <div className="space-y-3 rounded-lg border border-crm-border p-3"><h3 className="m-0 text-sm font-bold">Financiación</h3><p className="m-0 text-xs text-crm-fg-muted">La entrega inicial total incluye la seña y las permutas. Las cuotas se generan pendientes; Caja registra los cobros después.</p><div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Entrega inicial total"><CrmInput type="number" min="0" value={form.downPayment === '' ? minimumDownPayment : form.downPayment} onChange={e => field('downPayment', e.target.value)} /></Field><Field label="Cantidad de cuotas"><CrmSelect value={form.installmentsCount} onChange={e => field('installmentsCount', e.target.value)}>{[3, 6, 12, 18, 24].map(n => <option key={n} value={n}>{n}</option>)}</CrmSelect></Field>
                        <Field label="Cálculo"><CrmSelect value={form.calculationMode} onChange={e => field('calculationMode', e.target.value)}><option value="by_rate">Por interés total</option><option value="by_installment">Por cuota pactada</option></CrmSelect></Field>
                        {form.calculationMode === 'by_rate' ? <Field label="Interés total (%)"><CrmInput type="number" min="0" value={form.interestRate} onChange={e => field('interestRate', e.target.value)} /></Field> : <Field label="Importe de cada cuota"><CrmInput type="number" min="0" value={form.customInstallmentAmount} onChange={e => field('customInstallmentAmount', e.target.value)} /></Field>}
                    </div></div>}
                </section>
                <details className="space-y-4 border-t border-crm-border pt-4"><summary className="cursor-pointer text-sm font-semibold">Comisión compartida y opciones adicionales</summary>
                    <label className="flex gap-2 text-sm"><input type="checkbox" checked={form.splitCommission} onChange={e => field('splitCommission', e.target.checked)} />Comisión compartida</label>
                    {form.splitCommission && <Field label="Vendedor con quien comparte"><CrmSelect value={form.consignationManagerId} onChange={e => field('consignationManagerId', e.target.value)}><option value="">Seleccionar</option>{users.map(seller => <option key={seller._id} value={seller._id}>{seller.name || seller.email}</option>)}</CrmSelect></Field>}
                    <div className="grid gap-3 sm:grid-cols-2"><Field label="Comisión adicional fija (pendiente de pago)"><CrmInput type="number" min="0" value={form.extraAmount} onChange={e => field('extraAmount', e.target.value)} /></Field><Field label="Moneda de la comisión"><CrmSelect value={form.extraCurrency} onChange={e => field('extraCurrency', e.target.value)}><option>USD</option><option>ARS</option></CrmSelect></Field></div>
                    <label className="flex gap-2 text-sm"><input type="checkbox" checked={form.isManualImport} onChange={e => { field('isManualImport', e.target.checked); if (e.target.checked) { setSelectedVehicle(null); field('vehicleId', ''); } }} />Venta histórica sin unidad de stock</label>
                </details>
                <Field label="Notas de la operación"><CrmTextarea value={form.notes} onChange={e => field('notes', e.target.value)} /></Field>
            </>}
        </div>
    </CrmModal>;
}
