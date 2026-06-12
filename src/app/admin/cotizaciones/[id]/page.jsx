"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Printer, Copy, FileText } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import CrmButton from '../../../../components/crm/ui/CrmButton';

export default function QuoteDetailPage({ params }) {
    const router = useRouter();
    const { token, user } = useAuth();
    const isNew = params.id === 'nueva';
    
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [quote, setQuote] = useState({
        clientId: '',
        vehicleId: '',
        vehicleDescription: '',
        price: 0,
        currency: 'USD',
        paymentTerms: '',
        notes: '',
        tradeIn: { brand: '', model: '', year: '', plate: '', mileage: '', value: 0, currency: 'USD' },
        status: 'pendiente'
    });

    // We fetch full clients and cars to keep it simple for MVP.
    const [clients, setClients] = useState([]);
    const [cars, setCars] = useState([]);

    useEffect(() => {
        if (!token) return;
        
        const init = async () => {
            try {
                // Fetch basic lists for selects
                const [clientsRes, carsRes] = await Promise.all([
                    fetch('/api/admin/clients?limit=1000', { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch('/api/admin/stock', { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                
                if (clientsRes.ok) {
                    const data = await clientsRes.json();
                    setClients(data.clients || []);
                }
                if (carsRes.ok) {
                    const data = await carsRes.json();
                    setCars(data.cars || data || []);
                }

                if (!isNew) {
                    const quoteRes = await fetch(`/api/admin/quotes/${params.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (quoteRes.ok) {
                        const data = await quoteRes.json();
                        setQuote({
                            ...data,
                            clientId: data.clientId?._id || data.clientId || '',
                            vehicleId: data.vehicleId?._id || data.vehicleId || ''
                        });
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [token, params.id, isNew]);

    const handleChange = (field, value) => {
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            setQuote(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
        } else {
            setQuote(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleSave = async () => {
        if (!quote.clientId) {
            alert('Debe seleccionar un cliente.');
            return;
        }

        setSaving(true);
        try {
            const method = isNew ? 'POST' : 'PATCH';
            const url = isNew ? '/api/admin/quotes' : `/api/admin/quotes/${params.id}`;
            
            const payload = { ...quote };
            // Clean empty refs to prevent cast errors
            if (!payload.vehicleId) delete payload.vehicleId;
            if (!payload.leadId) delete payload.leadId;

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Error al guardar');
            }

            if (isNew) {
                const saved = await res.json();
                router.replace(`/admin/cotizaciones/${saved._id}`);
            } else {
                alert('Cotización guardada exitosamente.');
            }
        } catch (err) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDuplicate = async () => {
        if (confirm('¿Desea crear una nueva revisión a partir de esta cotización?')) {
            const { _id, quoteNumber, createdAt, updatedAt, quoteAuditLog, ...cleanQuote } = quote;
            cleanQuote.status = 'pendiente';
            cleanQuote.notes = `${cleanQuote.notes}\n[Revisión de #${quoteNumber}]`;
            
            try {
                const res = await fetch('/api/admin/quotes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(cleanQuote)
                });
                if (res.ok) {
                    const saved = await res.json();
                    router.push(`/admin/cotizaciones/${saved._id}`);
                }
            } catch (err) {
                alert('Error al duplicar');
            }
        }
    };

    if (loading) {
        return <div className="p-8 text-white">Cargando...</div>;
    }

    return (
        <div className="mx-auto w-full max-w-4xl p-4 pb-20 md:p-6 print:p-0 print:bg-white print:text-black">
            {/* Cabecera NO imprimible */}
            <div className="flex items-center justify-between mb-6 print:hidden">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-crm-fg-muted hover:text-white transition-colors">
                    <ArrowLeft size={16} /> Volver
                </button>
                <div className="flex gap-2">
                    {!isNew && (
                        <>
                            <CrmButton variant="secondary" onClick={() => window.print()} title="Imprimir o generar PDF">
                                <Printer size={16} /> Imprimir
                            </CrmButton>
                            <CrmButton variant="secondary" onClick={handleDuplicate} title="Duplicar como nueva versión">
                                <Copy size={16} /> Duplicar
                            </CrmButton>
                        </>
                    )}
                    <CrmButton variant="primary" onClick={handleSave} loading={saving} className="gap-2">
                        <Save size={16} /> {isNew ? 'Crear Cotización' : 'Guardar Cambios'}
                    </CrmButton>
                </div>
            </div>

            {/* Documento Imprimible */}
            <div className="bg-crm-surface border border-crm-border rounded-xl p-8 shadow-sm print:shadow-none print:border-none print:bg-white print:text-black">
                
                <div className="flex justify-between items-start border-b border-crm-border pb-6 mb-6 print:border-gray-200">
                    <div>
                        <h1 className="text-2xl font-bold text-white print:text-black flex items-center gap-2">
                            <FileText size={24} className="text-crm-red print:text-red-600" />
                            {isNew ? 'Nueva Cotización' : `Cotización #${quote.quoteNumber}`}
                        </h1>
                        <p className="text-crm-fg-muted print:text-gray-600 mt-1">AutoSporting - Propuesta Comercial</p>
                    </div>
                    <div className="text-right">
                        <select 
                            value={quote.status} 
                            onChange={e => handleChange('status', e.target.value)}
                            className="bg-crm-bg border border-crm-border text-white text-sm rounded-lg px-3 py-1 print:hidden"
                        >
                            <option value="pendiente">Pendiente</option>
                            <option value="enviada">Enviada</option>
                            <option value="en_revision">En Revisión</option>
                            <option value="aprobada">Aprobada</option>
                            <option value="modificada">Modificada</option>
                            <option value="rechazada">Rechazada</option>
                        </select>
                        {!isNew && (
                            <div className="hidden print:block text-lg font-bold uppercase text-red-600">
                                Estado: {quote.status}
                            </div>
                        )}
                        <p className="text-sm text-crm-fg-muted print:text-gray-600 mt-2">
                            Fecha: {new Date(quote.issueDate || Date.now()).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Cliente */}
                    <div className="flex flex-col gap-3">
                        <h3 className="font-bold text-crm-red print:text-red-600 border-b border-crm-border print:border-gray-200 pb-2">Datos del Cliente</h3>
                        <div>
                            <label className="text-xs text-crm-fg-muted print:text-gray-500 block mb-1">Cliente *</label>
                            <select 
                                value={quote.clientId}
                                onChange={e => handleChange('clientId', e.target.value)}
                                className="w-full bg-crm-bg border border-crm-border rounded p-2 text-white print:hidden"
                            >
                                <option value="">Seleccione un cliente...</option>
                                {clients.map(c => (
                                    <option key={c._id} value={c._id}>{c.fullName} ({c.phone})</option>
                                ))}
                            </select>
                            {/* Version Impresa Cliente */}
                            <div className="hidden print:block font-bold">
                                {clients.find(c => c._id === quote.clientId)?.fullName || '---'}
                            </div>
                            <div className="hidden print:block text-sm">
                                {clients.find(c => c._id === quote.clientId)?.phone || '---'}
                            </div>
                        </div>
                    </div>

                    {/* Vehículo de Interés */}
                    <div className="flex flex-col gap-3">
                        <h3 className="font-bold text-crm-red print:text-red-600 border-b border-crm-border print:border-gray-200 pb-2">Vehículo de Interés</h3>
                        <div>
                            <label className="text-xs text-crm-fg-muted print:text-gray-500 block mb-1">Vehículo Catálogo (Opcional)</label>
                            <select 
                                value={quote.vehicleId}
                                onChange={e => handleChange('vehicleId', e.target.value)}
                                className="w-full bg-crm-bg border border-crm-border rounded p-2 text-white print:hidden"
                            >
                                <option value="">No aplica / Vehículo externo</option>
                                {cars.map(c => (
                                    <option key={c._id} value={c._id}>{c.brand} {c.model} {c.year}</option>
                                ))}
                            </select>
                            <div className="hidden print:block font-bold">
                                {quote.vehicleId ? cars.find(c => c._id === quote.vehicleId)?.brand + ' ' + cars.find(c => c._id === quote.vehicleId)?.model : '---'}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-crm-fg-muted print:text-gray-500 block mb-1">Descripción Libre</label>
                            <input 
                                type="text"
                                value={quote.vehicleDescription}
                                onChange={e => handleChange('vehicleDescription', e.target.value)}
                                className="w-full bg-crm-bg border border-crm-border rounded p-2 text-white print:hidden"
                                placeholder="Ej. Audi A4 Advance (Si no está en catálogo)"
                            />
                            <div className="hidden print:block text-sm">
                                {quote.vehicleDescription || '---'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Económicos */}
                <div className="mb-8">
                    <h3 className="font-bold text-crm-red print:text-red-600 border-b border-crm-border print:border-gray-200 pb-2 mb-4">Condiciones Comerciales</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-crm-bg/50 print:bg-transparent rounded-lg p-4">
                        <div>
                            <label className="text-xs text-crm-fg-muted print:text-gray-500 block mb-1">Precio</label>
                            <input type="number" value={quote.price} onChange={e => handleChange('price', Number(e.target.value))} className="w-full bg-crm-surface border border-crm-border rounded p-2 text-white font-bold print:hidden" />
                            <div className="hidden print:block font-bold text-lg">{quote.price}</div>
                        </div>
                        <div>
                            <label className="text-xs text-crm-fg-muted print:text-gray-500 block mb-1">Moneda</label>
                            <select value={quote.currency} onChange={e => handleChange('currency', e.target.value)} className="w-full bg-crm-surface border border-crm-border rounded p-2 text-white print:hidden">
                                <option value="USD">USD</option>
                                <option value="ARS">ARS</option>
                            </select>
                            <div className="hidden print:block font-bold text-lg">{quote.currency}</div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs text-crm-fg-muted print:text-gray-500 block mb-1">Condiciones de Pago</label>
                            <input type="text" value={quote.paymentTerms} onChange={e => handleChange('paymentTerms', e.target.value)} className="w-full bg-crm-surface border border-crm-border rounded p-2 text-white print:hidden" placeholder="Ej. 50% anticipo, resto a financiar" />
                            <div className="hidden print:block text-sm mt-1">{quote.paymentTerms || '---'}</div>
                        </div>
                    </div>
                </div>

                {/* Toma de usado */}
                <div className="mb-8">
                    <h3 className="font-bold text-crm-red print:text-red-600 border-b border-crm-border print:border-gray-200 pb-2 mb-4">Toma de Usado en Parte de Pago</h3>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        <div className="md:col-span-2">
                            <label className="text-xs text-crm-fg-muted print:text-gray-500 block mb-1">Marca / Modelo</label>
                            <input type="text" value={quote.tradeIn?.brand} onChange={e => handleChange('tradeIn.brand', e.target.value)} className="w-full bg-crm-bg border border-crm-border rounded p-2 text-white print:hidden" placeholder="Ej. VW Golf" />
                            <div className="hidden print:block text-sm">{quote.tradeIn?.brand || 'No aplica'}</div>
                        </div>
                        <div>
                            <label className="text-xs text-crm-fg-muted print:text-gray-500 block mb-1">Año</label>
                            <input type="number" value={quote.tradeIn?.year || ''} onChange={e => handleChange('tradeIn.year', e.target.value)} className="w-full bg-crm-bg border border-crm-border rounded p-2 text-white print:hidden" />
                            <div className="hidden print:block text-sm">{quote.tradeIn?.year || '--'}</div>
                        </div>
                        <div>
                            <label className="text-xs text-crm-fg-muted print:text-gray-500 block mb-1">KMs</label>
                            <input type="number" value={quote.tradeIn?.mileage || ''} onChange={e => handleChange('tradeIn.mileage', e.target.value)} className="w-full bg-crm-bg border border-crm-border rounded p-2 text-white print:hidden" />
                            <div className="hidden print:block text-sm">{quote.tradeIn?.mileage || '--'}</div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs text-crm-fg-muted print:text-gray-500 block mb-1">Valor Estimado ({quote.tradeIn?.currency})</label>
                            <div className="flex gap-2">
                                <input type="number" value={quote.tradeIn?.value || 0} onChange={e => handleChange('tradeIn.value', Number(e.target.value))} className="w-full bg-crm-bg border border-crm-border rounded p-2 text-white font-bold print:hidden" />
                                <select value={quote.tradeIn?.currency} onChange={e => handleChange('tradeIn.currency', e.target.value)} className="bg-crm-bg border border-crm-border rounded p-2 text-white print:hidden">
                                    <option value="USD">USD</option>
                                    <option value="ARS">ARS</option>
                                </select>
                            </div>
                            <div className="hidden print:block text-sm font-bold">{quote.tradeIn?.value > 0 ? `${quote.tradeIn.currency} ${quote.tradeIn.value}` : 'A definir'}</div>
                        </div>
                    </div>
                </div>

                {/* Notas */}
                <div>
                    <h3 className="font-bold text-crm-red print:text-red-600 border-b border-crm-border print:border-gray-200 pb-2 mb-4">Notas y Observaciones</h3>
                    <textarea 
                        value={quote.notes} 
                        onChange={e => handleChange('notes', e.target.value)}
                        className="w-full min-h-[100px] bg-crm-bg border border-crm-border rounded p-3 text-white print:hidden"
                        placeholder="Cualquier información adicional para la cotización..."
                    />
                    <div className="hidden print:block text-sm whitespace-pre-wrap">{quote.notes || '---'}</div>
                </div>

                {/* Pie de página impresión */}
                <div className="hidden print:flex justify-between items-end mt-16 pt-8 border-t border-gray-300">
                    <div className="text-xs text-gray-500">
                        <p>AutoSporting Pilar</p>
                        <p>Cotización válida hasta: {new Date(quote.validUntil || Date.now() + 7 * 86400000).toLocaleDateString()}</p>
                    </div>
                    <div className="w-48 text-center border-t border-gray-400 pt-2 text-sm">
                        Firma Vendedor
                    </div>
                </div>
            </div>
        </div>
    );
}
