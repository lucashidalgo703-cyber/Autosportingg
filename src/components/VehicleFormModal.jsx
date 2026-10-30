import React, { useState, useEffect } from 'react';
import { X, Upload, Plus, ArrowLeft, ArrowRight, Star, Scan, CheckCircle2, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { parseArgentineMoney } from '../utils/saleCommercial';
import CrmModal from './crm/ui/CrmModal';
import { compressImage } from '../utils/imageCompressor';

const InputLabel = ({ children, required }) => (
    <label className="text-[10px] text-gray-400 font-medium mb-1.5 block">
        {children} {required && <span className="text-red-500">*</span>}
    </label>
);

const TextInput = ({ name, value, onChange, placeholder, type="text", required }) => (
    <input 
        type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required}
        className="w-full bg-crm-surface border border-crm-border rounded-md px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-red-500 focus:outline-none transition-colors"
    />
);

const SelectInput = ({ name, value, onChange, options }) => (
    <select 
        name={name} value={value} onChange={onChange}
        className="w-full bg-crm-surface border border-crm-border rounded-md px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none transition-colors appearance-none"
        style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em' }}
    >
        {options.map((opt, i) => <option key={i} value={opt} className="bg-crm-surface text-white">{opt}</option>)}
    </select>
);

export default function VehicleFormModal({ isOpen, onClose, onSave, editingCar }) {
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState([]);
    const [draggedIndex, setDraggedIndex] = useState(null);

    const [availableSales, setAvailableSales] = useState([]);
    const [loadingSales, setLoadingSales] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    const [purchasePayment, setPurchasePayment] = useState({
        modality: 'ya_pagado_historico',
        accountId: '',
        amountPaid: '',
        deductFromStrategicBox: false,
        strategicBoxKey: 'stock',
        expectedFundsNote: '',
        paymentMethod: 'Transferencia bancaria',
        reference: ''
    });

    useEffect(() => {
        if (isOpen && accounts.length === 0 && !loadingAccounts) {
            setLoadingAccounts(true);
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            fetch('/api/admin/accounts', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
                .then(res => res.ok ? res.json() : [])
                .then(data => {
                    const list = Array.isArray(data) ? data : (data.accounts || []);
                    const filtered = list.filter(a => a.isActive !== false);
                    setAccounts(filtered);
                    if (filtered.length > 0 && !purchasePayment.accountId) {
                        setPurchasePayment(prev => ({ ...prev, accountId: filtered[0]._id }));
                    }
                })
                .catch(err => console.error('Error loading accounts:', err))
                .finally(() => setLoadingAccounts(false));
        }
    }, [isOpen, accounts.length, loadingAccounts]);

    const [formData, setFormData] = useState({
        brand: '', name: '', year: '', km: '', fuel: 'Nafta', condition: 'Muy bueno',
        description: '', price: '', currency: 'USD', featured: false, sold: false, status: 'Disponible',
        vehicleType: 'Auto', plateOrVin: '', color: '', purchasePrice: '', purchaseCurrency: 'USD',
        location: 'Salón Principal', owners: '1', agencyOwned: false, ownerName: '', linkedClient: '',
        ownerPhone: '', ownerEmail: '', consignedBy: '', engineNumber: '', chassisNumber: '',
        hasManuals: 'No', hasDuplicateKeys: 'No', hasOfficialServices: 'No', publishedOnML: 'No',
        publishedBy: '', mlLink: '', notes: '', visibleEnWeb: true,
        isSharedInvestment: false, investorName: '', investorPercentage: 50,
        receivedAsTradeIn: false, tradeInOriginSaleId: '', tradeInOriginItemId: '',
        tradeInOriginValue: '', tradeInOriginCurrency: 'ARS'
    });

    useEffect(() => {
        if (isOpen) {
            if (editingCar) {
                setFormData({
                    ...editingCar,
                    vehicleType: editingCar.vehicleType || 'Auto',
                    condition: editingCar.condition || 'Muy bueno',
                    currency: editingCar.currency || 'USD',
                    status: editingCar.status || 'Disponible',
                    purchaseCurrency: editingCar.purchaseCurrency || 'USD',
                    location: editingCar.location || 'Salón Principal',
                    owners: editingCar.owners || '1',
                    hasManuals: editingCar.hasManuals || 'No',
                    hasDuplicateKeys: editingCar.hasDuplicateKeys || 'No',
                    hasOfficialServices: editingCar.hasOfficialServices || 'No',
                    publishedOnML: editingCar.publishedOnML || 'No',
                    visibleEnWeb: editingCar.visibleEnWeb !== undefined ? editingCar.visibleEnWeb : true,
                    isSharedInvestment: !!(editingCar.investor && editingCar.investor.percentage > 0),
                    investorName: editingCar.investor?.name || '',
                    investorPercentage: editingCar.investor?.percentage || 50,
                    receivedAsTradeIn: Boolean(editingCar.tradeInOrigin?.saleId),
                    tradeInOriginSaleId: editingCar.tradeInOrigin?.saleId || '',
                    tradeInOriginItemId: editingCar.tradeInOrigin?.tradeInId || '',
                    tradeInOriginValue: editingCar.tradeInOrigin?.value ?? '',
                    tradeInOriginCurrency: editingCar.tradeInOrigin?.currency || editingCar.purchaseCurrency || 'ARS'
                });
                
                // Load existing images if editing
                if (editingCar.images && editingCar.images.length > 0) {
                    const loadedFiles = editingCar.images.map(url => ({
                        preview: url,
                        isExisting: true,
                        url: url
                    }));
                    setFiles(loadedFiles);
                } else {
                    setFiles([]);
                }
            } else {
                setFormData({
                    brand: '', name: '', year: '', km: '', fuel: 'Nafta', condition: 'Muy bueno',
                    description: '', price: '', currency: 'USD', featured: false, sold: false, status: 'Disponible',
                    vehicleType: 'Auto', plateOrVin: '', color: '', purchasePrice: '', purchaseCurrency: 'USD',
                    location: 'Salón Principal', owners: '1', agencyOwned: false, ownerName: '', linkedClient: '',
                    ownerPhone: '', ownerEmail: '', consignedBy: '', engineNumber: '', chassisNumber: '',
                    hasManuals: 'No', hasDuplicateKeys: 'No', hasOfficialServices: 'No', publishedOnML: 'No',
                    publishedBy: '', mlLink: '', notes: '', visibleEnWeb: true,
                    isSharedInvestment: false, investorName: '', investorPercentage: 50,
                    receivedAsTradeIn: false, tradeInOriginSaleId: '', tradeInOriginItemId: '',
                    tradeInOriginValue: '', tradeInOriginCurrency: 'ARS'
                });
                setFiles([]);
            }
        }
    }, [isOpen, editingCar]);

    useEffect(() => {
        if (isOpen && formData.receivedAsTradeIn && availableSales.length === 0 && !loadingSales) {
            setLoadingSales(true);
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            fetch(`${baseUrl}/api/admin/sales`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
                .then(res => res.ok ? res.json() : [])
                .then(data => {
                    const list = Array.isArray(data) ? data : (data.sales || []);
                    setAvailableSales(list.filter(s => s.status !== 'cancelada' && s.vehicleId));
                })
                .catch(() => setAvailableSales([]))
                .finally(() => setLoadingSales(false));
        }
    }, [isOpen, formData.receivedAsTradeIn, availableSales.length, loadingSales]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => {
            const next = {
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            };
            if (name === 'receivedAsTradeIn' && checked) {
                next.agencyOwned = true;
            }
            if (name === 'tradeInOriginSaleId') {
                next.tradeInOriginItemId = '';
                const sale = availableSales.find(s => String(s._id) === String(value));
                if (sale) {
                    const unlinked = (sale.tradeIns || []).filter(t => !t.linkedStockCarId);
                    if (unlinked.length === 1) {
                        const t = unlinked[0];
                        next.tradeInOriginItemId = t._id || '';
                        next.tradeInOriginValue = t.estimatedValue ?? next.tradeInOriginValue;
                        next.tradeInOriginCurrency = t.currency === 'USD' ? 'USD' : 'ARS';
                        next.purchasePrice = t.estimatedValue ?? next.purchasePrice;
                        next.purchaseCurrency = next.tradeInOriginCurrency;
                        if (!next.brand && t.brand) next.brand = t.brand;
                        if (!next.name && t.model) next.name = `${t.model}${t.version ? ' ' + t.version : ''}`;
                        if (!next.year && t.year) next.year = t.year;
                        if (!next.plateOrVin && t.plate) next.plateOrVin = t.plate;
                        if (!next.km && t.mileage) next.km = t.mileage;
                    }
                }
            }
            if (name === 'tradeInOriginItemId' && value) {
                const sale = availableSales.find(s => String(s._id) === String(prev.tradeInOriginSaleId));
                const t = (sale?.tradeIns || []).find(item => String(item._id) === String(value));
                if (t) {
                    next.tradeInOriginValue = t.estimatedValue ?? next.tradeInOriginValue;
                    next.tradeInOriginCurrency = t.currency === 'USD' ? 'USD' : 'ARS';
                    next.purchasePrice = t.estimatedValue ?? next.purchasePrice;
                    next.purchaseCurrency = next.tradeInOriginCurrency;
                    if (!next.brand && t.brand) next.brand = t.brand;
                    if (!next.name && t.model) next.name = `${t.model}${t.version ? ' ' + t.version : ''}`;
                    if (!next.year && t.year) next.year = t.year;
                    if (!next.plateOrVin && t.plate) next.plateOrVin = t.plate;
                    if (!next.km && t.mileage) next.km = t.mileage;
                }
            }
            if (name === 'tradeInOriginValue' && prev.receivedAsTradeIn) {
                next.purchasePrice = value;
            }
            if (name === 'tradeInOriginCurrency' && prev.receivedAsTradeIn) {
                next.purchaseCurrency = value;
            }
            return next;
        });
    };

    const handleDragStart = (index) => setDraggedIndex(index);
    const handleDragOver = (e) => e.preventDefault();
    const handleDropSort = (index) => {
        if (draggedIndex === null) return;
        const newFiles = [...files];
        const draggedItem = newFiles.splice(draggedIndex, 1)[0];
        newFiles.splice(index, 0, draggedItem);
        setFiles(newFiles);
        setDraggedIndex(null);
    };

    const onDropFiles = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        addFiles(droppedFiles);
    };

    const addFiles = async (newFilesRaw) => {
        const fileList = Array.from(newFilesRaw);
        const loadingToast = toast.loading("Comprimiendo imágenes...");

        try {
            const compressedFiles = await Promise.all(
                fileList.map(async (file) => {
                    try {
                        const compressed = await compressImage(file);
                        return Object.assign(compressed, { preview: URL.createObjectURL(compressed) });
                    } catch (e) {
                        console.error("Compression error:", e);
                        return Object.assign(file, { preview: URL.createObjectURL(file) });
                    }
                })
            );

            toast.dismiss(loadingToast);

            if (files.length + compressedFiles.length > 20) {
                toast.error("Máximo 20 imágenes.");
                setFiles(prev => [...prev, ...compressedFiles.slice(0, 20 - files.length)]);
            } else {
                setFiles(prev => [...prev, ...compressedFiles]);
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error("Error al procesar las imágenes");
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (formData.receivedAsTradeIn) {
            if (!formData.tradeInOriginSaleId) {
                toast.error('Seleccioná la venta de origen para el vehículo recibido en parte de pago.');
                return;
            }
            const parsedTradeInVal = parseArgentineMoney(formData.tradeInOriginValue);
            if (Number.isNaN(parsedTradeInVal) || parsedTradeInVal < 0) {
                toast.error('Ingresá el valor de toma acordado del vehículo (número positivo).');
                return;
            }
        }

        const initialPurchase = editingCar ? parseArgentineMoney(editingCar.purchasePrice ?? editingCar.precioCompra ?? 0) : null;
        const nextPurchase = parseArgentineMoney(formData.purchasePrice) || 0;
        const purchaseChangedInEdit = Boolean(editingCar && Math.abs(nextPurchase - initialPurchase) > 0.001);

        if (purchaseChangedInEdit) {
            if (!String(formData.purchasePriceJustification || '').trim()) {
                toast.error('Debés ingresar una justificación obligatoria para modificar el precio de compra o valor de toma.');
                return;
            }
            if (!['correccion_precio', 'gasto_adicional'].includes(formData.purchasePriceChangeType || 'correccion_precio')) {
                toast.error('Indicá si el cambio corresponde a una corrección de precio o a un gasto adicional.');
                return;
            }
            if (formData.purchasePriceChangeType === 'gasto_adicional' && nextPurchase <= initialPurchase) {
                toast.error('Para registrar un gasto adicional, el nuevo importe debe ser superior al costo base actual.');
                return;
            }
        }

        const dataToSave = { ...formData };
        if (purchaseChangedInEdit) {
            dataToSave.purchasePriceChangeType = formData.purchasePriceChangeType || 'correccion_precio';
            dataToSave.purchasePriceJustification = String(formData.purchasePriceJustification).trim();
            dataToSave.purchasePriceExpenseConcept = String(formData.purchasePriceExpenseConcept || '').trim();
        } else {
            delete dataToSave.purchasePriceChangeType;
            delete dataToSave.purchasePriceJustification;
            delete dataToSave.purchasePriceExpenseConcept;
        }
        if (dataToSave.isSharedInvestment) {
            dataToSave.investor = JSON.stringify({
                name: dataToSave.investorName,
                percentage: Number(dataToSave.investorPercentage)
            });
        } else {
            dataToSave.investor = JSON.stringify({ name: '', percentage: 0 });
        }
        delete dataToSave.isSharedInvestment;
        delete dataToSave.investorName;
        delete dataToSave.investorPercentage;

        if (!dataToSave.receivedAsTradeIn) {
            delete dataToSave.receivedAsTradeIn;
            delete dataToSave.tradeInOriginSaleId;
            delete dataToSave.tradeInOriginItemId;
            delete dataToSave.tradeInOriginValue;
            delete dataToSave.tradeInOriginCurrency;
        }

        if (dataToSave.agencyOwned && !dataToSave.receivedAsTradeIn && !editingCar) {
            dataToSave.purchasePayment = JSON.stringify(purchasePayment);
        }
        onSave(dataToSave, files);
    };



    const modalTitle = (
        <div>
            <h2 className="text-lg font-bold text-white tracking-tight">{editingCar ? 'Editar vehículo' : 'Nuevo vehículo'}</h2>
            <p className="text-[10px] text-gray-500 mt-1">Datos básicos del vehículo. Las fotos se configuran en esta pantalla.</p>
        </div>
    );

    const modalFooter = (
        <div className="flex justify-end gap-3 w-full">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg text-xs font-medium text-white bg-crm-surface-raised hover:bg-crm-surface-raised border border-crm-border transition-colors">
                Cancelar
            </button>
            <button type="submit" form="vehicleForm" className="px-6 py-2 rounded-lg text-xs font-bold text-white bg-crm-red hover:bg-crm-red-hover shadow-[0_0_15px_rgba(230,48,39,0.3)] transition-all flex items-center gap-2">
                {editingCar ? 'Guardar cambios' : 'Dar de alta'}
            </button>
        </div>
    );

    return (
        <CrmModal
            isOpen={isOpen}
            onClose={onClose}
            title={modalTitle}
            maxWidth="max-w-3xl"
            footer={modalFooter}
        >
            <div className="p-6 space-y-8">
                    
                    <form id="vehicleForm" onSubmit={handleSubmit} className="space-y-8">
                        
                        {/* 1. IDENTIDAD */}
                        <section>
                            <div className="flex items-center gap-2 mb-4 border-b border-crm-border pb-2">
                                <span className="text-xs font-bold text-white uppercase tracking-widest">1. Identidad</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><InputLabel>Tipo de vehículo</InputLabel><SelectInput name="vehicleType" value={formData.vehicleType} onChange={handleChange} options={['Auto', 'Camioneta/SUV', 'Pick-up', 'Moto', 'Cuatriciclo', 'UTV', 'Moto de agua', 'Náutica', 'Camión', 'Otro']} /></div>
                                <div><InputLabel required>Marca</InputLabel><TextInput name="brand" value={formData.brand} onChange={handleChange} required /></div>
                                <div><InputLabel required>Modelo / Versión</InputLabel><TextInput name="name" value={formData.name} onChange={handleChange} required /></div>
                                
                                <div><InputLabel required>Año</InputLabel><TextInput name="year" value={formData.year} onChange={handleChange} type="number" required /></div>
                                <div><InputLabel required>Patente / VIN</InputLabel><TextInput name="plateOrVin" value={formData.plateOrVin} onChange={handleChange} required /></div>
                                <div><InputLabel required>Color</InputLabel><TextInput name="color" value={formData.color} onChange={handleChange} required /></div>

                                <div><InputLabel>Nº Motor</InputLabel><TextInput name="engineNumber" value={formData.engineNumber} onChange={handleChange} /></div>
                                <div><InputLabel>Nº Chasis</InputLabel><TextInput name="chassisNumber" value={formData.chassisNumber} onChange={handleChange} /></div>
                            </div>
                        </section>

                        {/* 2. PRECIO Y ESTADO */}
                        <section>
                            <div className="flex items-center gap-2 mb-4 border-b border-crm-border pb-2 mt-6">
                                <span className="text-xs font-bold text-white uppercase tracking-widest">2. Precio y Estado</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><InputLabel required>Kilómetros</InputLabel><TextInput name="km" value={formData.km} onChange={handleChange} type="number" required /></div>
                                <div><InputLabel required>Precio de venta</InputLabel><TextInput name="price" value={formData.price} onChange={handleChange} type="number" required /></div>
                                <div><InputLabel>Moneda venta</InputLabel><SelectInput name="currency" value={formData.currency} onChange={handleChange} options={['USD', 'ARS']} /></div>
                                
                                <div><InputLabel>Precio compra / toma (opcional)</InputLabel><TextInput name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} type="text" placeholder="0" /></div>
                                <div><InputLabel required>Condición</InputLabel><SelectInput name="condition" value={formData.condition} onChange={handleChange} options={['0 km', 'Excelente', 'Muy bueno', 'Bueno', 'Regular']} /></div>
                                <div><InputLabel>Combustible</InputLabel><SelectInput name="fuel" value={formData.fuel} onChange={handleChange} options={['Nafta', 'Diésel', 'GNC', 'Híbrido', 'Eléctrico']} /></div>
                                <div><InputLabel>Estado inicial</InputLabel><SelectInput name="status" value={formData.status} onChange={handleChange} options={['Disponible', 'Reservado', 'Señado', 'Vendido', 'En preparación']} /></div>

                                <div><InputLabel required>Ubicación</InputLabel><SelectInput name="location" value={formData.location} onChange={handleChange} options={['Salón Principal', 'Depósito', 'Con cliente', 'Taller Mecánico', 'Taller Chapa y Pintura', 'Otra']} /></div>
                            </div>

                            {editingCar && Math.abs(Number(formData.purchasePrice || 0) - Number(editingCar.purchasePrice ?? editingCar.precioCompra ?? 0)) > 0.001 && (
                                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-amber-300">Justificación obligatoria por cambio de costo</span>
                                        <span className="text-gray-400">
                                            Anterior: {Number(editingCar.purchasePrice ?? editingCar.precioCompra ?? 0).toLocaleString('es-AR')} → Nuevo: {Number(formData.purchasePrice || 0).toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <InputLabel required>Tipo de modificación</InputLabel>
                                            <select
                                                name="purchasePriceChangeType"
                                                value={formData.purchasePriceChangeType || 'correccion_precio'}
                                                onChange={handleChange}
                                                className="w-full bg-crm-surface border border-crm-border rounded-md px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                                            >
                                                <option value="correccion_precio">Corrección del precio de compra / valor de toma</option>
                                                <option value="gasto_adicional">Gasto adicional del vehículo</option>
                                            </select>
                                        </div>
                                        <div>
                                            <InputLabel required>Motivo / Justificación (Historial Interno)</InputLabel>
                                            <TextInput
                                                name="purchasePriceJustification"
                                                value={formData.purchasePriceJustification || ''}
                                                onChange={handleChange}
                                                placeholder="Motivo del cambio..."
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* 3. PROPIETARIO */}
                        <section>
                            <div className="flex items-center gap-2 mb-4 border-b border-crm-border pb-2 mt-6">
                                <span className="text-xs font-bold text-white uppercase tracking-widest">3. Propietario y Origen</span>
                            </div>
                            
                            <div className="bg-crm-surface border border-crm-border rounded-xl p-4 mb-4 flex flex-col gap-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" name="agencyOwned" checked={formData.agencyOwned} onChange={handleChange} className="w-4 h-4 rounded border-gray-600 text-red-500 focus:ring-red-500 bg-crm-surface-raised" />
                                    <div>
                                        <span className="text-xs font-bold text-white block">Vehículo propio de la agencia</span>
                                        <span className="text-[10px] text-gray-500">El auto es de la agencia, no consignado por un tercero.</span>
                                    </div>
                                </label>

{formData.agencyOwned && !formData.receivedAsTradeIn && !editingCar && (
                                    <div className="border-t border-crm-border pt-4 mt-2 space-y-4">
                                        <div>
                                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-1">
                                                Pago de la compra (Unidad Propia)
                                            </span>
                                            <span className="text-[11px] text-gray-400">
                                                Seleccioná cómo se abona la compra para sincronizar con cuentas físicas y la caja estratégica de reposición.
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPurchasePayment(prev => ({ ...prev, modality: 'pagar_ahora' }))}
                                                className={`p-3 rounded-xl border text-left transition-all ${
                                                    purchasePayment.modality === 'pagar_ahora'
                                                        ? 'border-emerald-500 bg-emerald-500/10 text-white'
                                                        : 'border-crm-border bg-crm-bg/40 text-gray-400 hover:text-white hover:bg-crm-surface-raised'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-bold">Pagar ahora</span>
                                                    {purchasePayment.modality === 'pagar_ahora' && <CheckCircle2 size={14} className="text-emerald-400" />}
                                                </div>
                                                <p className="text-[10px] text-gray-400">
                                                    Fondos disponibles. Genera un egreso inmediato en la cuenta seleccionada.
                                                </p>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setPurchasePayment(prev => ({ ...prev, modality: 'pendiente' }))}
                                                className={`p-3 rounded-xl border text-left transition-all ${
                                                    purchasePayment.modality === 'pendiente'
                                                        ? 'border-amber-500 bg-amber-500/10 text-white'
                                                        : 'border-crm-border bg-crm-bg/40 text-gray-400 hover:text-white hover:bg-crm-surface-raised'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-bold">Pendiente / Esperando fondos</span>
                                                    {purchasePayment.modality === 'pendiente' && <CheckCircle2 size={14} className="text-amber-400" />}
                                                </div>
                                                <p className="text-[10px] text-gray-400">
                                                    Se liquidará con un cobro futuro (previsión vinculada a una venta o cuota).
                                                </p>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setPurchasePayment(prev => ({ ...prev, modality: 'pago_parcial' }))}
                                                className={`p-3 rounded-xl border text-left transition-all ${
                                                    purchasePayment.modality === 'pago_parcial'
                                                        ? 'border-blue-500 bg-blue-500/10 text-white'
                                                        : 'border-crm-border bg-crm-bg/40 text-gray-400 hover:text-white hover:bg-crm-surface-raised'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-bold">Pago parcial</span>
                                                    {purchasePayment.modality === 'pago_parcial' && <CheckCircle2 size={14} className="text-blue-400" />}
                                                </div>
                                                <p className="text-[10px] text-gray-400">
                                                    Se abona un anticipo ahora y el resto queda como saldo a pagar.
                                                </p>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setPurchasePayment(prev => ({ ...prev, modality: 'ya_pagado_historico' }))}
                                                className={`p-3 rounded-xl border text-left transition-all ${
                                                    purchasePayment.modality === 'ya_pagado_historico'
                                                        ? 'border-purple-500 bg-purple-500/10 text-white'
                                                        : 'border-crm-border bg-crm-bg/40 text-gray-400 hover:text-white hover:bg-crm-surface-raised'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-bold">Ya pagado / Alta histórica</span>
                                                    {purchasePayment.modality === 'ya_pagado_historico' && <CheckCircle2 size={14} className="text-purple-400" />}
                                                </div>
                                                <p className="text-[10px] text-gray-400">
                                                    Unidad liquidada con anterioridad. No genera movimientos de caja actuales.
                                                </p>
                                            </button>
                                        </div>

                                        {(purchasePayment.modality === 'pagar_ahora' || purchasePayment.modality === 'pago_parcial') && (
                                            <div className="p-3 bg-crm-bg/70 border border-crm-border rounded-xl space-y-3">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div>
                                                        <InputLabel required>Cuenta física de origen</InputLabel>
                                                        <select
                                                            value={purchasePayment.accountId}
                                                            onChange={(e) => setPurchasePayment(prev => ({ ...prev, accountId: e.target.value }))}
                                                            className="w-full bg-crm-surface border border-crm-border rounded-md px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                                                            required
                                                        >
                                                            <option value="">— Seleccionar cuenta —</option>
                                                            {accounts.map(acc => (
                                                                <option key={acc._id} value={acc._id}>
                                                                    {acc.name} ({acc.currency} {Number(acc.balance || 0).toLocaleString('es-AR')})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {purchasePayment.modality === 'pago_parcial' && (
                                                        <div>
                                                            <InputLabel required>Monto abonado ahora ({formData.purchaseCurrency})</InputLabel>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                placeholder="Ej: 5000"
                                                                value={purchasePayment.amountPaid}
                                                                onChange={(e) => setPurchasePayment(prev => ({ ...prev, amountPaid: e.target.value }))}
                                                                className="w-full bg-crm-surface border border-crm-border rounded-md px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                                                                required
                                                            />
                                                        </div>
                                                    )}

                                                    <div>
                                                        <InputLabel>Medio de pago</InputLabel>
                                                        <select
                                                            value={purchasePayment.paymentMethod}
                                                            onChange={(e) => setPurchasePayment(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                                            className="w-full bg-crm-surface border border-crm-border rounded-md px-3 py-2 text-xs text-white focus:outline-none"
                                                        >
                                                            <option value="Transferencia bancaria">Transferencia bancaria</option>
                                                            <option value="Efectivo">Efectivo</option>
                                                            <option value="Cheque">Cheque</option>
                                                            <option value="Otro">Otro</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <InputLabel>Comprobante / Referencia (opcional)</InputLabel>
                                                        <input
                                                            type="text"
                                                            placeholder="Ej: Transf. 984128"
                                                            value={purchasePayment.reference}
                                                            onChange={(e) => setPurchasePayment(prev => ({ ...prev, reference: e.target.value }))}
                                                            className="w-full bg-crm-surface border border-crm-border rounded-md px-3 py-2 text-xs text-white focus:outline-none"
                                                        />
                                                    </div>
                                                </div>

                                                <label className="flex items-start gap-2.5 pt-2 border-t border-crm-border/60 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={purchasePayment.deductFromStrategicBox}
                                                        onChange={(e) => setPurchasePayment(prev => ({ ...prev, deductFromStrategicBox: e.target.checked }))}
                                                        className="w-4 h-4 mt-0.5 rounded border-crm-border text-emerald-500 focus:ring-emerald-500 bg-crm-surface"
                                                    />
                                                    <div>
                                                        <span className="text-xs font-bold text-white block">
                                                            Deducir asignación de caja estratégica Stock / Reposición
                                                        </span>
                                                        <span className="text-[10px] text-gray-400">
                                                            Descuenta la reserva para reposición de unidades en Tesorería Estratégica en coordinación con la cuenta bancaria.
                                                        </span>
                                                    </div>
                                                </label>
                                            </div>
                                        )}

                                        {(purchasePayment.modality === 'pendiente' || purchasePayment.modality === 'pago_parcial') && (
                                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                                                <InputLabel>Previsión de fondos / Cobro futuro esperado</InputLabel>
                                                <input
                                                    type="text"
                                                    placeholder="Ej: Se liquidará con el cobro de la cuota #2 de la venta Pérez o ingreso de seña..."
                                                    value={purchasePayment.expectedFundsNote}
                                                    onChange={(e) => setPurchasePayment(prev => ({ ...prev, expectedFundsNote: e.target.value }))}
                                                    className="w-full bg-crm-surface border border-crm-border rounded-md px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                                                />
                                                <p className="text-[10px] text-amber-300">
                                                    No crea dinero ficticio ni altera saldos actuales. Queda registrado como saldo pendiente de pago para liquidar desde Stock o Finanzas.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                

                                {!editingCar && (
                                    <div className="border-t border-crm-border pt-3">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" name="receivedAsTradeIn" checked={formData.receivedAsTradeIn} onChange={handleChange} className="w-4 h-4 rounded border-gray-600 text-purple-500 focus:ring-purple-500 bg-crm-surface-raised" />
                                            <div>
                                                <span className="text-xs font-bold text-white block">Recibido en parte de pago</span>
                                                <span className="text-[10px] text-gray-500">Vincular esta unidad a la venta de origen y registrar su valor de toma acordado.</span>
                                            </div>
                                        </label>

                                        {formData.receivedAsTradeIn && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                                                <div className="md:col-span-2">
                                                    <InputLabel required>Venta de origen</InputLabel>
                                                    <select
                                                        name="tradeInOriginSaleId"
                                                        value={formData.tradeInOriginSaleId}
                                                        onChange={handleChange}
                                                        required={formData.receivedAsTradeIn}
                                                        className="w-full bg-crm-surface border border-crm-border rounded-md px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                                                    >
                                                        <option value="">{loadingSales ? 'Cargando ventas...' : '— Seleccionar venta de origen —'}</option>
                                                        {availableSales.map(s => {
                                                            const veh = s.vehicleId ? `${s.vehicleId.brand || ''} ${s.vehicleId.name || ''}`.trim() : 'Sin vehículo';
                                                            const cli = s.clientId?.fullName || s.buyerName || 'Sin cliente';
                                                            const dt = s.saleDate ? new Date(s.saleDate).toLocaleDateString('es-AR') : '';
                                                            return (
                                                                <option key={s._id} value={s._id}>
                                                                    {veh} — {cli} ({dt}) [{s.saleCurrency} {(Number(s.salePrice) || 0).toLocaleString('es-AR')}]
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </div>

                                                {(() => {
                                                    const selSale = availableSales.find(s => String(s._id) === String(formData.tradeInOriginSaleId));
                                                    const unlinkedItems = (selSale?.tradeIns || []).filter(t => !t.linkedStockCarId);
                                                    if (unlinkedItems.length === 0) return null;
                                                    return (
                                                        <div className="md:col-span-2">
                                                            <InputLabel>Permuta declarada en la venta (opcional)</InputLabel>
                                                            <select
                                                                name="tradeInOriginItemId"
                                                                value={formData.tradeInOriginItemId}
                                                                onChange={handleChange}
                                                                className="w-full bg-crm-surface border border-crm-border rounded-md px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                                                            >
                                                                <option value="">— Nueva permuta o vincular manualmente —</option>
                                                                {unlinkedItems.map(item => (
                                                                    <option key={item._id} value={item._id}>
                                                                        {item.brand} {item.model} ({item.year}) — Toma: {item.currency || 'ARS'} {(Number(item.estimatedValue) || 0).toLocaleString('es-AR')}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    );
                                                })()}

                                                <div>
                                                    <InputLabel required>Valor de toma acordado</InputLabel>
                                                    <TextInput
                                                        name="tradeInOriginValue"
                                                        type="text"
                                                        value={formData.tradeInOriginValue}
                                                        onChange={handleChange}
                                                        placeholder="Ej: 10.000.000"
                                                        required={formData.receivedAsTradeIn}
                                                    />
                                                    <p className="text-[10px] text-purple-300 mt-1">Se usará como costo inicial del vehículo recibido.</p>
                                                </div>
                                                <div>
                                                    <InputLabel required>Moneda del valor de toma</InputLabel>
                                                    <SelectInput
                                                        name="tradeInOriginCurrency"
                                                        value={formData.tradeInOriginCurrency}
                                                        onChange={handleChange}
                                                        options={['ARS', 'USD']}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><InputLabel>Nombre / Razón Social</InputLabel><TextInput name="ownerName" value={formData.ownerName} onChange={handleChange} /></div>
                                    <div><InputLabel>Teléfono</InputLabel><TextInput name="ownerPhone" value={formData.ownerPhone} onChange={handleChange} /></div>
                                    <div><InputLabel>Email</InputLabel><TextInput name="ownerEmail" value={formData.ownerEmail} onChange={handleChange} type="email" /></div>
                                    <div><InputLabel>Consignado por</InputLabel><SelectInput name="consignedBy" value={formData.consignedBy} onChange={handleChange} options={['— Sin asignar —', 'Vendedor 1']} /></div>
                                </div>
                            </div>
                        </section>

                        {/* 4. INVERSIÓN COMPARTIDA */}
                        <section>
                            <div className="flex items-center gap-2 mb-4 border-b border-crm-border pb-2 mt-6">
                                <span className="text-xs font-bold text-white uppercase tracking-widest">4. Inversión Compartida</span>
                            </div>

                            <div className="bg-crm-surface border border-crm-border rounded-xl p-4 flex flex-col gap-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" name="isSharedInvestment" checked={formData.isSharedInvestment} onChange={handleChange} className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-crm-surface-raised" />
                                    <div>
                                        <span className="text-xs font-bold text-white block">Vehículo con inversión compartida</span>
                                        <span className="text-[10px] text-gray-500">El auto fue comprado a medias con un inversionista.</span>
                                    </div>
                                </label>

                                {formData.isSharedInvestment && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                        <div>
                                            <InputLabel required>Nombre del inversionista</InputLabel>
                                            <input
                                                list="loaded-companies-datalist"
                                                name="investorName"
                                                value={formData.investorName}
                                                onChange={handleChange}
                                                placeholder="Seleccionar empresa cargada o ingresar nombre..."
                                                required={formData.isSharedInvestment}
                                                className="w-full bg-crm-surface-raised border border-crm-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                            />
                                            <datalist id="loaded-companies-datalist">
                                                <option value="LHIVER" />
                                                <option value="AUTOTERRA" />
                                                <option value="AKAR" />
                                                <option value="ALWAYS SAS" />
                                            </datalist>
                                        </div>
                                        <div>
                                            <InputLabel required>Porcentaje del Inversionista (%)</InputLabel>
                                            <TextInput name="investorPercentage" type="number" value={formData.investorPercentage} onChange={handleChange} placeholder="Ej: 50" required={formData.isSharedInvestment} />
                                            <p className="text-[10px] text-blue-400 mt-1">La agencia retiene el {100 - (Number(formData.investorPercentage) || 0)}%</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 5. DOCUMENTACIÓN */}
                        <section>
                            <div className="flex items-center gap-2 mb-4 border-b border-crm-border pb-2 mt-6">
                                <span className="text-xs font-bold text-white uppercase tracking-widest">5. Documentación</span>
                            </div>

                            {/* Escaneo Cédula Verde */}
                            <div className="bg-crm-surface border border-dashed border-crm-border rounded-xl p-4 flex justify-between items-center mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                                        <Scan size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white mb-0.5">Escanear cédula verde (opcional)</p>
                                        <p className="text-[10px] text-gray-400">Subí una foto clara del frente para extraer datos automáticamente y autocompletar la Identidad.</p>
                                    </div>
                                </div>
                                <button type="button" className="bg-crm-surface-raised hover:bg-crm-surface-raised border border-crm-border text-white text-xs px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                                    <Upload size={14} /> Subir foto
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><InputLabel>Manuales</InputLabel><SelectInput name="hasManuals" value={formData.hasManuals} onChange={handleChange} options={['No', 'Sí', 'Parcial']} /></div>
                                <div><InputLabel>Duplicado de llaves</InputLabel><SelectInput name="hasDuplicateKeys" value={formData.hasDuplicateKeys} onChange={handleChange} options={['No', 'Sí', 'Parcial']} /></div>
                                <div><InputLabel>Servicios oficiales</InputLabel><SelectInput name="hasOfficialServices" value={formData.hasOfficialServices} onChange={handleChange} options={['No', 'Sí', 'Parcial']} /></div>
                            </div>
                        </section>

                        {/* 6. PUBLICACIÓN */}
                        <section>
                            <div className="flex items-center gap-2 mb-4 border-b border-crm-border pb-2 mt-6">
                                <span className="text-xs font-bold text-white uppercase tracking-widest">6. Publicación</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <InputLabel>Visible en Web (Catálogo)</InputLabel>
                                    <label className="flex items-center gap-3 cursor-pointer mt-2">
                                        <input type="checkbox" name="visibleEnWeb" checked={formData.visibleEnWeb} onChange={handleChange} className="w-4 h-4 rounded border-gray-600 text-red-500 focus:ring-red-500 bg-crm-surface-raised" />
                                        <span className="text-xs font-bold text-white">Mostrar en sitio web</span>
                                    </label>
                                </div>
                                <div><InputLabel>¿Publicado en MercadoLibre?</InputLabel><SelectInput name="publishedOnML" value={formData.publishedOnML} onChange={handleChange} options={['No', 'Sí']} /></div>
                                <div><InputLabel>Publicado por</InputLabel><TextInput name="publishedBy" value={formData.publishedBy} onChange={handleChange} placeholder="Ej: Richi, Lucia..." /></div>
                            </div>
                            {!formData.visibleEnWeb || formData.status !== 'Disponible' ? (
                                <div className="mb-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-3 rounded-lg text-xs flex gap-2 items-start">
                                    <span>⚠️</span>
                                    <span>Este vehículo está oculto del catálogo. Para publicarlo, cambiá estado a Disponible y activá Visible en web.</span>
                                </div>
                            ) : null}
                            <div className="mb-4">
                                <InputLabel>Link de MercadoLibre</InputLabel>
                                <TextInput name="mlLink" value={formData.mlLink} onChange={handleChange} placeholder="https://articulo.mercadolibre.com.ar/..." />
                            </div>
                        </section>

                        {/* 7. FOTOS Y NOTAS */}
                        <section>
                            <div className="flex items-center gap-2 mb-4 border-b border-crm-border pb-2 mt-6">
                                <span className="text-xs font-bold text-white uppercase tracking-widest">7. Fotos y Notas</span>
                            </div>
                            <div className="mb-6">
                                <InputLabel>Notas Internas</InputLabel>
                                <textarea 
                                    name="notes" value={formData.notes} onChange={handleChange} rows="3" placeholder="Observaciones privadas sobre el vehículo..."
                                    className="w-full bg-crm-surface border border-crm-border rounded-md px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-red-500 focus:outline-none transition-colors resize-none"
                                />
                            </div>
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                                onDrop={onDropFiles}
                                className={`
                                    relative cursor-pointer transition-all duration-300
                                    border border-dashed rounded-xl flex flex-col items-center justify-center
                                    ${files.length > 0 ? 'h-32 border-crm-border bg-crm-surface' : 'h-48 bg-crm-surface'}
                                    ${isDragging ? 'border-red-500 bg-red-500/5' : 'border-crm-border hover:border-white/20'}
                                `}
                            >
                                <input
                                    type="file" multiple accept="image/png, image/jpeg, image/jpg, image/webp"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                    onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
                                />

                                {files.length === 0 ? (
                                    <div className="text-center pointer-events-none z-10">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors ${isDragging ? 'bg-red-500 text-white' : 'bg-crm-surface-raised text-gray-500'}`}>
                                            <Upload size={18} />
                                        </div>
                                        <p className="text-gray-300 text-xs font-medium">Arrastra imágenes aquí</p>
                                        <p className="text-gray-600 text-[10px] mt-1">o haz clic para explorar</p>
                                    </div>
                                ) : (
                                    <div className="flex gap-4 px-4 overflow-x-auto w-full items-center justify-start h-full z-10 custom-scrollbar py-2">
                                        {files.map((file, i) => (
                                            <div
                                                key={i} draggable
                                                onDragStart={() => handleDragStart(i)}
                                                onDragOver={handleDragOver}
                                                onDrop={() => handleDropSort(i)}
                                                className={`
                                                    flex-shrink-0 relative w-28 h-20 rounded-lg overflow-hidden border shadow-sm group cursor-grab active:cursor-grabbing
                                                    ${i === 0 ? 'border-red-500 ring-1 ring-red-500/50' : 'border-crm-border'}
                                                `}
                                            >
                                                <img src={file.preview} className="w-full h-full object-cover" />
                                                {i === 0 && <div className="absolute top-0 left-0 w-full bg-red-500/90 text-white text-[8px] font-bold text-center py-0.5 tracking-wider uppercase z-20">Portada</div>}
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setFiles(files.filter((_, idx) => idx !== i)); }}
                                                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                    </form>
            </div>
        </CrmModal>
    );
}

function CarIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
            <circle cx="7" cy="17" r="2" />
            <path d="M9 17h6" />
            <circle cx="17" cy="17" r="2" />
        </svg>
    )
}
