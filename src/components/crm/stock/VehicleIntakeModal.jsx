"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ImagePlus, Loader2, X } from 'lucide-react';
import CrmModal from '../ui/CrmModal';
import CrmButton from '../ui/CrmButton';
import CrmInput from '../ui/CrmInput';
import { compressImage } from '../../../utils/imageCompressor';

const MAX_PHOTOS = 20;
const MAX_TOTAL_PHOTO_BYTES = Math.floor(3.8 * 1024 * 1024);
const fieldClass = 'h-10 w-full rounded-lg border border-crm-border bg-crm-bg px-3 text-base text-crm-fg focus:outline-none focus:ring-2 focus:ring-crm-red/30 md:text-sm';
const initialForm = { brand: '', name: '', year: '', km: '', fuel: 'Nafta', condition: 'Muy bueno',
    price: '', currency: 'ARS', plateOrVin: '', color: '', agencyOwned: true,
    purchasePrice: '', purchaseCurrency: '', notes: '' };

function Field({ label, children }) {
    return <label className="block space-y-1.5 text-xs font-bold text-crm-fg-muted"><span>{label}</span>{children}</label>;
}

function Photo({ file, onRemove, disabled }) {
    const [url, setUrl] = useState('');
    useEffect(() => {
        const preview = URL.createObjectURL(file);
        setUrl(preview);
        return () => URL.revokeObjectURL(preview);
    }, [file]);
    return <div className="relative overflow-hidden rounded-lg border border-crm-border bg-crm-bg">
        {url && <img src={url} alt={file.name} className="h-24 w-full object-contain" />}
        <button type="button" disabled={disabled} onClick={onRemove} aria-label={`Quitar ${file.name}`} className="absolute right-1 top-1 rounded-full bg-black/80 p-1 text-white disabled:opacity-50"><X size={15}/></button>
        <p className="truncate px-2 py-1 text-[10px] text-crm-fg-muted">{file.name}</p>
    </div>;
}

export default function VehicleIntakeModal({ onClose }) {
    const [form, setForm] = useState(initialForm);
    const [photos, setPhotos] = useState([]);
    const [preparing, setPreparing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [receipt, setReceipt] = useState(null);
    const busyRef = useRef(false);
    const requestKeyRef = useRef(null);
    const close = () => { if (!busyRef.current) onClose(); };

    const change = event => {
        if (busyRef.current) return;
        const { name, value, type, checked } = event.target;
        requestKeyRef.current = null;
        setError('');
        setForm(previous => ({ ...previous, [name]: type === 'checkbox' ? checked : value }));
    };

    const choosePhotos = async event => {
        const files = Array.from(event.target.files || []);
        event.target.value = '';
        if (!files.length || busyRef.current) return;
        if (photos.length + files.length > MAX_PHOTOS) {
            setError('Podés adjuntar hasta 20 fotos. Quitá alguna antes de agregar más.'); return;
        }
        busyRef.current = true;
        setPreparing(true);
        setError('');
        try {
            const prepared = [];
            for (const file of files) {
                if (!file.type.startsWith('image/')) throw new Error('Adjuntá imágenes JPG, PNG o WebP del vehículo.');
                prepared.push(await compressImage(file));
            }
            const next = [...photos, ...prepared];
            if (next.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_PHOTO_BYTES) {
                throw new Error('Las fotos juntas superan el límite de carga. Seleccioná menos fotos o copias más livianas y reintentá.');
            }
            requestKeyRef.current = null;
            setPhotos(next);
        } catch (cause) { setError(cause.message || 'No se pudieron preparar las fotos. Probá con otra imagen.'); }
        finally { busyRef.current = false; setPreparing(false); }
    };

    const submit = async event => {
        event.preventDefault();
        if (busyRef.current || receipt) return;
        const token = localStorage.getItem('token');
        if (!token) { setError('La sesión venció. Iniciá sesión nuevamente para enviar la solicitud.'); return; }
        if (photos.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_PHOTO_BYTES) {
            setError('Quitá algunas fotos para reducir el tamaño de la carga.'); return;
        }
        busyRef.current = true;
        setSaving(true);
        setProgress(0);
        setError('');
        requestKeyRef.current ||= crypto.randomUUID();
        const body = new FormData();
        for (const [key, value] of Object.entries(form)) {
            if (value !== '') body.append(key, String(value));
        }
        for (const file of photos) body.append('images', file, file.name);
        try {
            const result = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/api/admin/intake/vehicles');
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                xhr.setRequestHeader('Idempotency-Key', requestKeyRef.current);
                xhr.timeout = 120000;
                xhr.upload.onprogress = upload => { if (upload.lengthComputable) setProgress(Math.min(95, Math.round(upload.loaded / upload.total * 95))); };
                xhr.onerror = () => reject(new Error('Se interrumpió la conexión. Reintentá el mismo envío; se conserva una sola solicitud.'));
                xhr.ontimeout = () => reject(new Error('El envío está demorando más de lo esperado. Reintentá sin cambiar los datos para recuperar la solicitud.'));
                xhr.onload = () => {
                    let data;
                    try { data = JSON.parse(xhr.responseText); } catch { data = {}; }
                    if (xhr.status < 200 || xhr.status >= 300) {
                        const fallback = xhr.status === 413 ? 'La carga es demasiado grande. Quitá algunas fotos y reintentá.' : 'No se pudo enviar la solicitud. Reintentá.';
                        reject(new Error(data.message || fallback)); return;
                    }
                    if (!data.pendingApproval || !data.approval?._id) {
                        reject(new Error('No pudimos confirmar la solicitud. Revisá Autorizaciones o reintentá el mismo envío.')); return;
                    }
                    resolve(data);
                };
                xhr.send(body);
            });
            setProgress(100);
            setReceipt(result);
        } catch (cause) { setError(cause.message || 'No se pudo enviar la solicitud. Reintentá.'); }
        finally { busyRef.current = false; setSaving(false); }
    };

    return <CrmModal isOpen onClose={close} hideCloseButton={preparing || saving} title="Solicitar alta de vehículo" maxWidth="max-w-3xl" footer={receipt ? <CrmButton type="button" onClick={close}>Cerrar</CrmButton> : <div className="flex flex-wrap justify-end gap-2">
        <CrmButton type="button" variant="ghost" disabled={preparing || saving} onClick={close}>Cancelar</CrmButton>
        <CrmButton type="submit" form="vehicle-intake-form" disabled={preparing || saving}>{saving ? <><Loader2 size={15} className="animate-spin"/> Enviando…</> : 'Enviar para autorización'}</CrmButton>
    </div>}>
        {receipt ? <div className="space-y-4 p-5" role="status">
            <CheckCircle2 size={35} className="text-emerald-400"/>
            <h3 className="text-lg font-bold text-crm-fg">Solicitud recibida · Pendiente de autorización del titular.</h3>
            <p className="text-sm text-crm-fg-muted">{form.brand} {form.name} {form.year}{form.plateOrVin ? ` · ${form.plateOrVin.toUpperCase()}` : ''}</p>
            <p className="text-sm text-crm-fg-muted">El vehículo se incorporará al inventario cuando el propietario apruebe el alta.</p>
            <Link href="/admin/autorizaciones" className="inline-flex font-bold text-crm-red underline underline-offset-4">Ver solicitud en Autorizaciones</Link>
        </div> : <form id="vehicle-intake-form" onSubmit={submit} className="space-y-5 p-4 sm:p-5">
            <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-crm-fg-muted">Revisá los datos antes de enviarlos. El alta quedará pendiente de autorización del propietario.</p>
            <fieldset disabled={preparing || saving} className="grid grid-cols-1 gap-4 sm:grid-cols-2 disabled:opacity-70">
                <Field label="Marca"><CrmInput name="brand" value={form.brand} onChange={change} required maxLength={100}/></Field>
                <Field label="Modelo y versión"><CrmInput name="name" value={form.name} onChange={change} required maxLength={200}/></Field>
                <Field label="Año"><CrmInput name="year" type="number" inputMode="numeric" min="1900" max={new Date().getFullYear() + 2} step="1" value={form.year} onChange={change} required/></Field>
                <Field label="Kilometraje"><CrmInput name="km" type="number" inputMode="numeric" min="0" step="1" value={form.km} onChange={change} required/></Field>
                <Field label="Combustible"><select name="fuel" value={form.fuel} onChange={change} className={fieldClass}>{['Nafta', 'Diésel', 'GNC', 'Híbrido', 'Eléctrico'].map(value => <option key={value}>{value}</option>)}</select></Field>
                <Field label="Condición"><select name="condition" value={form.condition} onChange={change} className={fieldClass}>{['0 km', 'Excelente', 'Muy bueno', 'Bueno', 'Regular'].map(value => <option key={value}>{value}</option>)}</select></Field>
                <Field label="Precio publicado"><CrmInput name="price" type="number" inputMode="decimal" min="0" step="0.01" value={form.price} onChange={change} required/></Field>
                <Field label="Moneda del precio"><select name="currency" value={form.currency} onChange={change} className={fieldClass}><option value="ARS">ARS · Pesos</option><option value="USD">USD · Dólares</option></select></Field>
                <Field label="Patente / VIN"><CrmInput name="plateOrVin" value={form.plateOrVin} onChange={change} maxLength={40} className="uppercase"/></Field>
                <Field label="Color"><CrmInput name="color" value={form.color} onChange={change} maxLength={60}/></Field>
                <Field label="Costo de compra (opcional)"><CrmInput name="purchasePrice" type="number" inputMode="decimal" min="0" step="0.01" value={form.purchasePrice} onChange={change}/></Field>
                <Field label="Moneda del costo"><select name="purchaseCurrency" value={form.purchaseCurrency} onChange={change} className={fieldClass} required={form.purchasePrice !== ''}><option value="">Seleccionar moneda</option><option value="ARS">ARS · Pesos</option><option value="USD">USD · Dólares</option></select></Field>
                <label className="flex items-center gap-2 text-sm text-crm-fg sm:col-span-2"><input name="agencyOwned" type="checkbox" checked={form.agencyOwned} onChange={change} className="h-4 w-4"/> Unidad propia de la agencia</label>
                <div className="sm:col-span-2"><Field label="Observaciones"><textarea name="notes" value={form.notes} onChange={change} rows={3} maxLength={10000} className={`${fieldClass} h-auto py-2`}/></Field></div>
            </fieldset>
            <section className="space-y-3" aria-label="Fotos del vehículo">
                <h3 className="text-sm font-bold text-crm-fg">Fotos del vehículo <span className="font-normal text-crm-fg-muted">(opcional)</span></h3>
                <p className="text-xs text-crm-fg-muted">JPG, PNG o WebP. Hasta 20 fotos y 3,8 MB en total después de prepararlas.</p>
                <label className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-crm-border bg-crm-bg px-3 text-sm font-semibold text-crm-fg ${preparing || saving ? 'pointer-events-none opacity-50' : ''}`}>
                    {preparing ? <Loader2 size={17} className="animate-spin"/> : <ImagePlus size={17}/>} {preparing ? 'Preparando fotos…' : 'Agregar fotos'}
                    <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={choosePhotos} disabled={preparing || saving} className="sr-only" aria-label="Agregar fotos del vehículo"/>
                </label>
                {photos.length > 0 && <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{photos.map((file, index) => <Photo key={`${file.name}-${index}`} file={file} disabled={preparing || saving} onRemove={() => { requestKeyRef.current = null; setPhotos(previous => previous.filter((_, i) => i !== index)); }}/>)}</div>}
            </section>
            {saving && <div className="space-y-2" role="status"><p className="text-sm text-crm-fg-muted">{progress < 95 ? `Subiendo solicitud: ${progress}%` : 'Confirmando recepción…'}</p><progress max="100" value={progress} aria-label="Progreso del envío" className="h-2 w-full accent-red-600"/></div>}
            {error && <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
        </form>}
    </CrmModal>;
}
