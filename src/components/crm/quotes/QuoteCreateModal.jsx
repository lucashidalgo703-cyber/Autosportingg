import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { parseResponseSafe } from '../../../utils/apiHelper';
import CrmButton from '../ui/CrmButton';
import toast from 'react-hot-toast';

export default function QuoteCreateModal({ isOpen, onClose }) {
    const router = useRouter();
    const { token, user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [clients, setClients] = useState([]);
    const [cars, setCars] = useState([]);
    const [sellers, setSellers] = useState([]);

    const [formData, setFormData] = useState({
        clientId: '',
        clientNameFree: '',
        vehicleId: '',
        vehicleDescription: '',
        assignedTo: user?.id || '',
        tradeIn: {
            brand: '',
            model: '',
            year: '',
            mileage: '',
            condition: '',
            plate: ''
        },
        price: '',
        currency: 'USD',
        issueDate: new Date().toISOString().split('T')[0],
        validUntil: '',
        paymentTerms: '',
        notes: ''
    });

    useEffect(() => {
        if (!isOpen || !token) return;
        const fetchInitialData = async () => {
            try {
                const [clientsRes, carsRes, sellersRes] = await Promise.all([
                    fetch('/api/admin/clients?limit=1000', { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch('/api/admin/cars?limit=1000&status=disponible', { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                if (clientsRes.ok) {
                    const data = await parseResponseSafe(clientsRes);
                    setClients(data.clients || data || []);
                }
                if (carsRes.ok) {
                    const data = await parseResponseSafe(carsRes);
                    const rawCars = data.cars || data || [];
                    const uniqueCars = [];
                    const seen = new Set();
                    rawCars.forEach(c => {
                        const key = `${c.brand}-${c.model}-${c.year}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            uniqueCars.push(c);
                        }
                    });
                    setCars(uniqueCars);
                }
                if (sellersRes.ok) {
                    const data = await parseResponseSafe(sellersRes);
                    setSellers(data || []);
                }
            } catch (err) {
                console.error('Error fetching initial data', err);
            }
        };
        fetchInitialData();
    }, [isOpen, token]);

    if (!isOpen) return null;

    const handleChange = (field, value) => {
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleSave = async () => {
        if (!formData.price || !formData.issueDate) {
            toast.error('Precio y Fecha de emisión son obligatorios');
            return;
        }
        
        if (!formData.clientId && !formData.clientNameFree) {
            toast.error('Debe seleccionar o ingresar un cliente');
            return;
        }

        setSaving(true);
        try {
            const payload = { 
                ...formData,
                price: Number(formData.price),
                status: 'pendiente'
            };
            if (!payload.vehicleId) delete payload.vehicleId;

            const res = await fetch('/api/admin/quotes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await parseResponseSafe(res);
                throw new Error(errorData.message || 'Error al crear la cotización');
            }

            const saved = await parseResponseSafe(res);
            toast.success('Cotización creada');
            router.push(`/admin/cotizaciones/${saved._id}`);
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6">
            <div className="relative flex h-[90vh] w-full max-w-[800px] flex-col rounded-xl border border-crm-border bg-[#1C1C1F] shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-crm-border p-5">
                    <div>
                        <h2 className="m-0 text-xl font-bold text-crm-fg">Nueva cotización</h2>
                        <p className="m-0 mt-1 text-xs text-crm-fg-muted">Se crea en estado Pendiente. El cambio de estado se maneja desde el detalle.</p>
                    </div>
                    <button onClick={onClose} className="rounded p-1 text-crm-fg-muted hover:bg-white/10 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-crm-border">
                    <form className="flex flex-col gap-8">
                        {/* Section 1: Cliente y Vehículo */}
                        <div className="flex flex-col gap-4">
                            <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-crm-fg-muted flex items-center gap-2">
                                <Search size={14} /> CLIENTE Y VEHÍCULO
                            </h3>
                            
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Cliente (del CRM)</label>
                                    <select 
                                        className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none"
                                        value={formData.clientId}
                                        onChange={(e) => {
                                            handleChange('clientId', e.target.value);
                                            const c = clients.find(cl => cl._id === e.target.value);
                                            if (c) handleChange('clientNameFree', c.fullName);
                                        }}
                                    >
                                        <option value="">—</option>
                                        {clients.map(c => (
                                            <option key={c._id} value={c._id}>{c.fullName}</option>
                                        ))}
                                    </select>
                                    <span className="text-[11px] text-crm-fg-muted">Elegí uno o dejá vacío y completá el nombre libre</span>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Nombre del cliente <span className="text-crm-red">*</span></label>
                                    <input 
                                        type="text"
                                        placeholder="Se pre-llena al elegir del selector"
                                        value={formData.clientNameFree}
                                        onChange={(e) => handleChange('clientNameFree', e.target.value)}
                                        className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-2">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Vehículo (del stock)</label>
                                    <select 
                                        className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none"
                                        value={formData.vehicleId}
                                        onChange={(e) => {
                                            handleChange('vehicleId', e.target.value);
                                            const c = cars.find(car => car._id === e.target.value);
                                            if (c) handleChange('vehicleDescription', `${c.brand} ${c.model} ${c.year}`);
                                        }}
                                    >
                                        <option value="">—</option>
                                        {cars.map(c => (
                                            <option key={c._id} value={c._id}>{c.brand} {c.model} {c.year}</option>
                                        ))}
                                    </select>
                                    <span className="text-[11px] text-crm-fg-muted">Opcional — usalo si el cliente ya eligió uno</span>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Descripción del vehículo (libre)</label>
                                    <input 
                                        type="text"
                                        placeholder="Ej. Toyota Hilux 2022 SRX 4x4"
                                        value={formData.vehicleDescription}
                                        onChange={(e) => handleChange('vehicleDescription', e.target.value)}
                                        className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none"
                                    />
                                    <span className="text-[11px] text-crm-fg-muted">Si no está en el stock, describilo acá</span>
                                </div>
                            </div>

                            <div className="mt-2 flex flex-col gap-1.5 md:w-[48%]">
                                <label className="text-sm font-medium text-crm-fg">Vendedor</label>
                                <select 
                                    className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none"
                                    value={formData.assignedTo}
                                    onChange={(e) => handleChange('assignedTo', e.target.value)}
                                >
                                    <option value="">Seleccionar...</option>
                                    {sellers.map(s => (
                                        <option key={s._id} value={s._id}>{s.firstName} {s.lastName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Section 2: Permuta */}
                        <div className="flex flex-col gap-4 border-t border-crm-border pt-6">
                            <div className="flex items-center justify-between">
                                <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-crm-fg-muted flex items-center gap-2">
                                    <RefreshCwIcon /> AUTO QUE EL CLIENTE ENTREGA EN PERMUTA
                                </h3>
                                <button type="button" className="text-xs font-medium text-crm-fg-muted border border-crm-border px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors">
                                    Tasá este usado
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Marca</label>
                                    <input type="text" placeholder="BMW, Audi, Toyota..." value={formData.tradeIn.brand} onChange={e => handleChange('tradeIn.brand', e.target.value)} className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Modelo</label>
                                    <input type="text" placeholder="X3, A4, Hilux..." value={formData.tradeIn.model} onChange={e => handleChange('tradeIn.model', e.target.value)} className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Año</label>
                                    <input type="text" placeholder="2020" value={formData.tradeIn.year} onChange={e => handleChange('tradeIn.year', e.target.value)} className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mt-2">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Kilómetros</label>
                                    <input type="text" placeholder="50000" value={formData.tradeIn.mileage} onChange={e => handleChange('tradeIn.mileage', e.target.value)} className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Estado general</label>
                                    <select value={formData.tradeIn.condition} onChange={e => handleChange('tradeIn.condition', e.target.value)} className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none">
                                        <option value="">Select...</option>
                                        <option value="excelente">Excelente</option>
                                        <option value="bueno">Bueno</option>
                                        <option value="regular">Regular</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Patente / Dominio</label>
                                    <input type="text" placeholder="AB123CD" value={formData.tradeIn.plate} onChange={e => handleChange('tradeIn.plate', e.target.value)} className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none uppercase" />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Precios */}
                        <div className="flex flex-col gap-4 border-t border-crm-border pt-6">
                            <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-crm-fg-muted flex items-center gap-2">
                                <DocumentIcon /> PRECIO Y CONDICIONES
                            </h3>
                            
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Precio sugerido <span className="text-crm-red">*</span></label>
                                    <div className="flex gap-2">
                                        <input type="number" value={formData.price} onChange={e => handleChange('price', e.target.value)} className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none" />
                                        <select value={formData.currency} onChange={e => handleChange('currency', e.target.value)} className="h-10 rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none">
                                            <option value="USD">USD</option>
                                            <option value="ARS">ARS</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Fecha de emisión <span className="text-crm-red">*</span></label>
                                    <input type="date" value={formData.issueDate} onChange={e => handleChange('issueDate', e.target.value)} className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-crm-fg">Vence (opcional)</label>
                                    <input type="date" value={formData.validUntil} onChange={e => handleChange('validUntil', e.target.value)} className="h-10 w-full rounded-md border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5 mt-2">
                                <label className="text-sm font-medium text-crm-fg">Condiciones de pago</label>
                                <textarea 
                                    rows={2}
                                    placeholder="Ej. 30% con refuerzo a 30 días, saldo a la entrega"
                                    value={formData.paymentTerms}
                                    onChange={e => handleChange('paymentTerms', e.target.value)}
                                    className="w-full resize-none rounded-md border border-crm-border bg-crm-surface p-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5 mt-2">
                                <label className="text-sm font-medium text-crm-fg">Notas</label>
                                <textarea 
                                    rows={2}
                                    value={formData.notes}
                                    onChange={e => handleChange('notes', e.target.value)}
                                    className="w-full resize-none rounded-md border border-crm-border bg-crm-surface p-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none"
                                />
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-crm-border bg-crm-surface p-4 rounded-b-xl">
                    <CrmButton variant="ghost" onClick={onClose} disabled={saving}>
                        Cancelar
                    </CrmButton>
                    <CrmButton variant="primary" onClick={handleSave} loading={saving}>
                        Guardar
                    </CrmButton>
                </div>
            </div>
        </div>
    );
}

// Inline SVGs for accuracy
const RefreshCwIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
);
const DocumentIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
);
