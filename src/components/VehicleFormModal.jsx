import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Upload, Plus, ArrowLeft, ArrowRight, Star, CheckCircle2, DollarSign, Sliders } from 'lucide-react';
import VehicleImageFramingModal from './crm/stock/VehicleImageFramingModal';
import toast from 'react-hot-toast';
import { parseArgentineMoney } from '../utils/saleCommercial';
import VehicleEditorDialog, { useVehicleFormClose, VehicleFormSection, VehicleFormErrors, revealVehicleField } from './crm/stock/VehicleEditorDialog';
import { useAuth } from '../context/AuthContext';
import { validateVehicleInput } from '../utils/vehicleValidation.js';
import { vehicleDraftIdentity, readVehicleDraft, writeVehicleDraft, clearVehicleDraft } from '../utils/vehicleFormDraft.js';
import {vehicleEditorExistingFiles, reorderVehicleEditorPhotos, removeVehicleEditorPhoto} from '../utils/vehicleEditPreservation.js';
import { compressImage } from '../utils/imageCompressor';

const InputLabel = ({ children, required, htmlFor }) => (
    <label htmlFor={htmlFor} className="text-xs text-crm-fg-muted font-medium mb-1.5 block">
        {children} {required && <span className="text-red-500">*</span>}
    </label>
);

const TextInput = ({ name, value, onChange, placeholder, type="text", required, min, max, step }) => (
    <input
        id={`vehicle-create-${name}`} type={type} name={name} min={min} max={max} step={step} value={value ?? ''} onChange={onChange} placeholder={placeholder} required={required}
        className="h-9 w-full bg-crm-surface border border-crm-border rounded-lg px-3 py-2 text-sm text-crm-fg placeholder-gray-600 focus:border-red-500 focus:outline-none transition-colors"
    />
);

const SelectInput = ({ name, value, onChange, options, disabled }) => (
    <select
        disabled={disabled} id={`vehicle-create-${name}`} name={name} value={value ?? ''} onChange={onChange}
        className="h-9 w-full bg-crm-surface border border-crm-border rounded-lg px-3 py-2 text-sm text-crm-fg focus:border-red-500 focus:outline-none transition-colors"
    >
        {value && !options.includes(value) && <option value={value}>{value}</option>}
        {options.map((opt, i) => <option key={i} value={opt} className="bg-crm-surface text-crm-fg">{opt}</option>)}
    </select>
);

const accountCurrency = value => {
    const code = String(value || '').trim().toUpperCase();
    if (['USD', 'U$S', 'US$'].includes(code)) return 'USD';
    return code === '$' ? 'ARS' : code;
};

export default function VehicleFormModal({ isOpen, onClose, onSave, editingCar }) {
    const { token } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [draftRestored, setDraftRestored] = useState(false);
    const [draftAvailable, setDraftAvailable] = useState(null);
    const draftOwner = vehicleDraftIdentity(token);
    const { markDirty, requestClose, closeNotice } = useVehicleFormClose({ isOpen, onClose, busy: isSaving, resetKey: editingCar?._id || token });
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState([]);
    const fileGeneration = useRef(0);
    const fileJobCount = useRef(0);
    const [isProcessingImages, setIsProcessingImages] = useState(false);
    const previewUrls = useRef(new Set());
    useEffect(() => {
        const current = new Set(files.filter(file => !file.isExisting && file.preview?.startsWith('blob:')).map(file => file.preview));
        for (const url of previewUrls.current) if (!current.has(url)) URL.revokeObjectURL(url);
        previewUrls.current = current;
    }, [files]);
    useEffect(() => () => { fileGeneration.current += 1; for (const url of previewUrls.current) URL.revokeObjectURL(url); }, []);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [showFramingModal, setShowFramingModal] = useState(false);
    const [framingInitialIndex, setFramingInitialIndex] = useState(0);

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
        setAccounts([]);
        if (!isOpen || !token) return;
        const controller = new AbortController();
        setLoadingAccounts(true);
        fetch('/api/admin/accounts', { headers: { Authorization: 'Bearer ' + token }, signal: controller.signal })
            .then(res => res.ok ? res.json() : [])
            .then(data => { if (!controller.signal.aborted) setAccounts((Array.isArray(data) ? data : data.accounts || []).filter(account => account.isActive !== false)); })
            .catch(() => {})
            .finally(() => { if (!controller.signal.aborted) setLoadingAccounts(false); });
        return () => controller.abort();
    }, [isOpen, token]);

    const [formData, setFormData] = useState({
        brand: '', name: '', year: '', km: '', fuel: 'Nafta', condition: 'Muy bueno',
        description: '', price: '', currency: 'USD', featured: false, sold: false, status: 'Disponible',
        vehicleType: 'Auto', transmission: '', bodyType: '', doors: '', engine: '', version: '', documentation: {}, plateOrVin: '', color: '', purchasePrice: '', purchaseCurrency: 'USD',
        location: 'Salón Principal', owners: '1', agencyOwned: false, ownerName: '', linkedClient: '',
        ownerPhone: '', ownerEmail: '', consignedBy: '', engineNumber: '', chassisNumber: '',
        hasManuals: 'No', hasDuplicateKeys: 'No', hasOfficialServices: 'No', publishedOnML: 'No',
        publishedBy: '', mlLink: '', notes: '', visibleEnWeb: true,
        isSharedInvestment: false, investorName: '', investorPercentage: 50,
        receivedAsTradeIn: false, tradeInOriginSaleId: '', tradeInOriginItemId: '',
        tradeInOriginValue: '', tradeInOriginCurrency: 'ARS'
    });

    useEffect(() => {
        fileGeneration.current += 1;
        fileJobCount.current = 0;
        setIsProcessingImages(false);
        if (isOpen) {
            setIsSaving(false);
            setFieldErrors({});
            setDraftRestored(false);
            setDraftAvailable(!editingCar && draftOwner ? readVehicleDraft(window.localStorage, draftOwner) : null);
            setPurchasePayment({modality: 'ya_pagado_historico', accountId: '', amountPaid: '', deductFromStrategicBox: false, strategicBoxKey: 'stock', expectedFundsNote: '', paymentMethod: 'Transferencia bancaria', reference: ''});
            if (editingCar) {
                setFormData({
                    ...editingCar,
                    vehicleType: editingCar.vehicleType || 'Auto',
                    transmission: editingCar.transmission || '', bodyType: editingCar.bodyType || '', doors: editingCar.doors ?? '', engine: editingCar.engine || '', version: editingCar.version || '', documentation: editingCar.documentation || {},
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
                    tradeInOriginCurrency: editingCar.tradeInOrigin?.currency || editingCar.purchaseCurrency || 'ARS',
                    imagePosition: editingCar.imagePosition || '50% 75%',
                    imagePositions: editingCar.imagePositions || []
                });

                // Load existing images if editing
                setFiles(vehicleEditorExistingFiles(editingCar));
            } else {
                setFormData({
                    brand: '', name: '', year: '', km: '', fuel: 'Nafta', condition: 'Muy bueno',
                    description: '', price: '', currency: 'USD', featured: false, sold: false, status: 'Disponible',
                    vehicleType: 'Auto', transmission: '', bodyType: '', doors: '', engine: '', version: '', documentation: {}, plateOrVin: '', color: '', purchasePrice: '', purchaseCurrency: 'USD',
                    location: 'Salón Principal', owners: '1', agencyOwned: false, ownerName: '', linkedClient: '',
                    ownerPhone: '', ownerEmail: '', consignedBy: '', engineNumber: '', chassisNumber: '',
                    hasManuals: 'No', hasDuplicateKeys: 'No', hasOfficialServices: 'No', publishedOnML: 'No',
                    publishedBy: '', mlLink: '', notes: '', visibleEnWeb: true,
                    isSharedInvestment: false, investorName: '', investorPercentage: 50,
                    receivedAsTradeIn: false, tradeInOriginSaleId: '', tradeInOriginItemId: '',
                    tradeInOriginValue: '', tradeInOriginCurrency: 'ARS',
                    imagePosition: '50% 75%',
                    imagePositions: []
                });
                setFiles([]);
            }
        } else { setFiles([]); }
    }, [isOpen, editingCar, token]);

    useEffect(() => {
        setAvailableSales([]);
        if (!isOpen || !formData.receivedAsTradeIn || !token) return;
        const controller = new AbortController();
        setLoadingSales(true);
        fetch('/api/admin/sales', {headers: {Authorization: 'Bearer ' + token}, signal: controller.signal})
            .then(res => res.ok ? res.json() : [])
            .then(data => { if (!controller.signal.aborted) setAvailableSales((Array.isArray(data) ? data : data.sales || []).filter(sale => !sale.historicalOnly && !['cancelada', 'borrador', 'caida'].includes(sale.status) && sale.vehicleId)); })
            .catch(() => {})
            .finally(() => { if (!controller.signal.aborted) setLoadingSales(false); });
        return () => controller.abort();
    }, [isOpen, formData.receivedAsTradeIn, token]);

    const eligibleAccounts = accounts.filter(account => accountCurrency(account.currency) === accountCurrency(formData.purchaseCurrency));
    const framingVehicle = useMemo(() => ({...editingCar, brand:formData.brand, name:formData.name, year:formData.year, km:formData.km, imagePosition:formData.imagePosition, imagePositions:formData.imagePositions}), [editingCar, formData.brand, formData.name, formData.year, formData.km, formData.imagePosition, formData.imagePositions]);
    useEffect(() => {
        setPurchasePayment(previous => {
            if (!previous.accountId || accounts.some(account => String(account._id) === String(previous.accountId) && accountCurrency(account.currency) === accountCurrency(formData.purchaseCurrency))) return previous;
            return {...previous, accountId:''};
        });
    }, [accounts, formData.purchaseCurrency]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        markDirty();
        const { name, value, type, checked } = e.target;
        if (name === 'purchaseCurrency' && accountCurrency(value) !== accountCurrency(formData.purchaseCurrency)) {
            setPurchasePayment(previous => ({...previous, accountId:'', amountPaid:'', deductFromStrategicBox:false}));
        }
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
        markDirty();
        if (draggedIndex === null) return;
        const arranged = reorderVehicleEditorPhotos(files, formData.imagePositions, formData.imagePosition, draggedIndex, index);
        setFiles(arranged.files);
        setFormData(previous => ({...previous, imagePositions:arranged.imagePositions, imagePosition:arranged.imagePosition}));
        setDraggedIndex(null);
    };
    const handleRemovePhoto = index => {
        markDirty();
        const arranged = removeVehicleEditorPhoto(files, formData.imagePositions, formData.imagePosition, index);
        setFiles(arranged.files);
        setFormData(previous => ({...previous, imagePositions:arranged.imagePositions, imagePosition:arranged.imagePosition}));
    };

    const onDropFiles = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        addFiles(droppedFiles);
    };

    const addFiles = async (newFilesRaw) => {
        markDirty();
        const incoming = Array.from(newFilesRaw).filter(file => ['image/jpeg','image/png','image/webp'].includes(file.type));
        const room = Math.max(0,20-files.length);
        if (incoming.length > room) toast.error('Máximo 20 imágenes.');
        const fileList = incoming.slice(0,room);
        if (!fileList.length) return;
        const generation = fileGeneration.current;
        fileJobCount.current += 1;
        setIsProcessingImages(true);
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
            if (generation !== fileGeneration.current) {
                compressedFiles.forEach(file => URL.revokeObjectURL(file.preview));
                return;
            }
            setFiles(previous => {
                if (generation !== fileGeneration.current) { compressedFiles.forEach(file => URL.revokeObjectURL(file.preview)); return previous; }
                const roomNow = Math.max(0, 20 - previous.length);
                compressedFiles.slice(roomNow).forEach(file => URL.revokeObjectURL(file.preview));
                return [...previous, ...compressedFiles.slice(0, roomNow)];
            });
        } catch (error) {
            toast.dismiss(loadingToast);
            if (generation === fileGeneration.current) toast.error("Error al procesar las imágenes");
        } finally {
            if (generation === fileGeneration.current) {
                fileJobCount.current = Math.max(0, fileJobCount.current - 1);
                setIsProcessingImages(fileJobCount.current > 0);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        if (isProcessingImages) { setFieldErrors({images:'Esperá a que terminen de procesarse las fotos.'}); revealVehicleField('images', 'vehicle-create'); return; }
        const validation = validateVehicleInput(formData, { partial: Boolean(editingCar) });
        setFieldErrors(validation.errors);
        if (Object.keys(validation.errors).length) { revealVehicleField(Object.keys(validation.errors)[0], 'vehicle-create'); return; }

        if (!editingCar && formData.receivedAsTradeIn) {
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
        const originalPurchaseCurrency = String(editingCar?.purchaseCurrency || 'USD').trim().toUpperCase();
        const normalizeCurrency = value => ['USD','U$S','US$'].includes(String(value).trim().toUpperCase()) ? 'USD' : 'ARS';
        const currencyChangedInEdit = Boolean(editingCar && normalizeCurrency(formData.purchaseCurrency) !== normalizeCurrency(originalPurchaseCurrency));
        const purchaseChangedInEdit = Boolean(editingCar && (Math.abs(nextPurchase - initialPurchase) > 0.001 || currencyChangedInEdit));

        if (purchaseChangedInEdit) {
            if (!String(formData.purchasePriceJustification || '').trim()) {
                toast.error('Debés ingresar una justificación obligatoria para modificar el precio de compra o valor de toma.');
                return;
            }
            if (!['correccion_precio', 'gasto_adicional'].includes(formData.purchasePriceChangeType || 'correccion_precio')) {
                toast.error('Indicá si el cambio corresponde a una corrección de precio o a un gasto adicional.');
                return;
            }
            if (formData.purchasePriceChangeType === 'gasto_adicional' && (nextPurchase <= initialPurchase || currencyChangedInEdit)) {
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

        if (editingCar || !dataToSave.receivedAsTradeIn) {
            delete dataToSave.receivedAsTradeIn;
            delete dataToSave.tradeInOriginSaleId;
            delete dataToSave.tradeInOriginItemId;
            delete dataToSave.tradeInOriginValue;
            delete dataToSave.tradeInOriginCurrency;
        }

        if (dataToSave.agencyOwned && !dataToSave.receivedAsTradeIn && !editingCar) {
            dataToSave.purchasePayment = JSON.stringify(purchasePayment);
        }
        if (Array.isArray(dataToSave.imagePositions)) {
            dataToSave.imagePositions = JSON.stringify(dataToSave.imagePositions);
        }
        if (dataToSave.documentation && typeof dataToSave.documentation === 'object') dataToSave.documentation = JSON.stringify(dataToSave.documentation);
        // These are maintained by their own workflows. Sending them as multipart scalars
        // would turn nested source objects into "[object Object]" during a stock edit.
        for (const key of ['infoAuto', 'tradeInOrigin', 'purchasePaymentState', 'auditLog', 'expenses', 'documentationFiles', '__v', 'createdAt', 'updatedAt', 'draftPurchaseModality']) delete dataToSave[key];
        // Omit a blank acquisition amount; changing an existing amount still follows its audit flow.
        if (dataToSave.purchasePrice === '') delete dataToSave.purchasePrice;
        delete dataToSave.sold;
        const finalValidation = validateVehicleInput(dataToSave, {partial:Boolean(editingCar)});
        if (Object.keys(finalValidation.errors).length) {setFieldErrors(finalValidation.errors); revealVehicleField(Object.keys(finalValidation.errors)[0], 'vehicle-create'); return;}
        try {
            setIsSaving(true);
            const result = await onSave(dataToSave, files);
            if (result && !editingCar && draftOwner === vehicleDraftIdentity(localStorage.getItem('token'))) clearVehicleDraft(localStorage, draftOwner);
        } catch (error) {
            const errors = error.errors || {form: error.message || 'No se pudo guardar el vehículo.'};
            setFieldErrors(errors);
            revealVehicleField(Object.keys(errors)[0], 'vehicle-create');
        } finally { setIsSaving(false); }
    };



    const restoreDraft = () => {
        if (!draftAvailable || !draftOwner || draftOwner !== vehicleDraftIdentity(localStorage.getItem('token'))) return;
        fileGeneration.current += 1;
        fileJobCount.current = 0;
        setIsProcessingImages(false);
        setFiles([]);
        setFormData(previous => ({...previous, ...draftAvailable.values, receivedAsTradeIn:Boolean(draftAvailable.values.receivedAsTradeIn), tradeInOriginSaleId:'', tradeInOriginItemId:'', tradeInOriginValue:'', tradeInOriginCurrency:draftAvailable.values.purchaseCurrency || 'ARS'}));
        setPurchasePayment({modality:draftAvailable.values.draftPurchaseModality || 'ya_pagado_historico', accountId:'', amountPaid:'', deductFromStrategicBox:false, strategicBoxKey:'stock', expectedFundsNote:'', paymentMethod:'Transferencia bancaria', reference:''});
        setDraftRestored(true);
        setDraftAvailable(null);
        setFieldErrors({});
        markDirty();
    };
    const saveForLater = () => {
        if (!draftOwner || draftOwner !== vehicleDraftIdentity(localStorage.getItem('token'))) { toast.error('Iniciá sesión para guardar un borrador en este dispositivo.'); return; }
        if (!writeVehicleDraft(localStorage, draftOwner, {...formData, draftPurchaseModality: purchasePayment.modality})) { toast.error('No se pudo guardar el borrador en este navegador.'); return; }
        toast.success('Borrador guardado. Podés continuarlo desde Nuevo vehículo.');
        onClose();
    };
    const modalFooter = <>{closeNotice}<div className="flex flex-wrap items-center justify-end gap-2">
        {!editingCar && <button type="button" onClick={saveForLater} disabled={isSaving} className="mr-auto rounded-lg border border-crm-border px-3 py-2 text-xs font-medium text-crm-fg disabled:opacity-40">Guardar y continuar después</button>}
        <button type="button" onClick={requestClose} disabled={isSaving} className="rounded-lg border border-crm-border px-3 py-2 text-xs font-medium text-crm-fg disabled:opacity-40">Cancelar</button>
        <button type="submit" form="vehicleForm" disabled={isSaving || isProcessingImages} className="rounded-lg bg-crm-red px-4 py-2 text-xs font-semibold text-white hover:bg-crm-red-hover disabled:opacity-40">{isProcessingImages ? 'Procesando fotos…' : isSaving ? 'Guardando…' : editingCar ? 'Guardar cambios' : 'Dar de alta'}</button>
    </div></>;

    return (
        <VehicleEditorDialog
            isOpen={isOpen}
            onClose={requestClose}
            title={editingCar ? 'Editar vehículo' : 'Nuevo vehículo'}
            subtitle="Identidad, precios y propietario. Completá los datos técnicos y la publicación cuando los tengas."
            busy={isSaving}
            suspendKeyboard={showFramingModal}
            footer={modalFooter}
        >
            <div className="p-4 sm:p-5 space-y-4">

                    <form id="vehicleForm" onSubmit={handleSubmit} onChangeCapture={markDirty} className="space-y-4">
                        <VehicleFormErrors errors={fieldErrors} prefix="vehicle-create" />
                        {draftAvailable && <div className="rounded-xl border border-crm-border bg-crm-bg p-3 text-xs text-crm-fg"><p className="mb-2">Tenés un borrador guardado en este dispositivo el {new Date(draftAvailable.savedAt).toLocaleString('es-AR')}.</p><div className="flex gap-2"><button type="button" className="rounded-lg bg-crm-red px-3 py-2 font-semibold text-white" onClick={restoreDraft}>Continuar borrador</button><button type="button" className="rounded-lg border border-crm-border px-3 py-2" onClick={() => {clearVehicleDraft(localStorage, draftOwner); setDraftAvailable(null);}}>Descartar borrador guardado</button></div></div>}
                        {draftRestored && <p role="status" className="rounded-lg border border-crm-border p-3 text-xs text-crm-fg-muted">Borrador recuperado. Revisá el pago de compra, volvé a vincular la venta de origen si es una permuta y seleccioná las fotos nuevamente.</p>}
                        <fieldset disabled={isSaving} className="min-w-0 space-y-4">

                        {/* 1. IDENTIDAD */}
                        <section>
                            <div className="flex items-center gap-2 mb-4 border-b border-crm-border pb-2">
                                <span className="text-xs font-bold text-crm-fg uppercase tracking-widest">1. Identidad</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><InputLabel htmlFor="vehicle-create-vehicleType">Tipo de vehículo</InputLabel><SelectInput name="vehicleType" value={formData.vehicleType} onChange={handleChange} options={['Auto', 'Camioneta/SUV', 'Pick-up', 'Moto', 'Cuatriciclo', 'UTV', 'Moto de agua', 'Náutica', 'Camión', 'Otro']} /></div>
                                <div><InputLabel htmlFor="vehicle-create-brand" required>Marca</InputLabel><TextInput name="brand" value={formData.brand} onChange={handleChange} required /></div>
                                <div><InputLabel htmlFor="vehicle-create-name" required>Modelo / Versión</InputLabel><TextInput name="name" value={formData.name} onChange={handleChange} required /></div>

                                <div><InputLabel htmlFor="vehicle-create-year" required>Año</InputLabel><TextInput name="year" value={formData.year} onChange={handleChange} type="number" min="1886" max={new Date().getFullYear() + 2} step="1" required /></div>
                                <div><InputLabel htmlFor="vehicle-create-plateOrVin">Patente / VIN</InputLabel><TextInput name="plateOrVin" value={formData.plateOrVin} onChange={handleChange} /></div>
                                <div><InputLabel htmlFor="vehicle-create-color">Color</InputLabel><TextInput name="color" value={formData.color} onChange={handleChange} /></div>
                            </div>
                        </section>

                        {/* 2. PRECIO Y ESTADO */}
                        <section>
                            <div className="flex items-center gap-2 mb-4 border-b border-crm-border pb-2 mt-6">
                                <span className="text-xs font-bold text-crm-fg uppercase tracking-widest">2. Precio y Estado</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><InputLabel htmlFor="vehicle-create-km" required>Kilómetros</InputLabel><TextInput name="km" value={formData.km} onChange={handleChange} type="number" min="0" step="1" required /></div>
                                <div><InputLabel htmlFor="vehicle-create-price" required>Precio de venta</InputLabel><TextInput name="price" value={formData.price} onChange={handleChange} type="number" min="0" step="0.01" required /></div>
                                <div><InputLabel htmlFor="vehicle-create-currency">Moneda venta</InputLabel><SelectInput name="currency" value={formData.currency} onChange={handleChange} options={['USD', 'ARS']} /></div>

                                <div><InputLabel htmlFor="vehicle-create-purchaseCurrency">Moneda compra / toma</InputLabel><SelectInput name="purchaseCurrency" value={formData.purchaseCurrency} onChange={handleChange} options={['USD', 'ARS']} /></div>
                                <div><InputLabel htmlFor="vehicle-create-purchasePrice">Precio compra / toma (opcional)</InputLabel><TextInput name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} type="text" placeholder="0" /></div>
                                <div><InputLabel htmlFor="vehicle-create-condition" required>Condición</InputLabel><SelectInput name="condition" value={formData.condition} onChange={handleChange} options={['0 km', 'Excelente', 'Muy bueno', 'Bueno', 'Regular']} /></div>
                                <div><InputLabel htmlFor="vehicle-create-status">Estado inicial</InputLabel><SelectInput name="status" value={formData.status} onChange={handleChange} options={['Disponible', 'Pausado']} disabled={Boolean(editingCar && ['Reservado', 'Vendido'].includes(editingCar.status))} /></div>

                                <div><InputLabel htmlFor="vehicle-create-location" required>Ubicación</InputLabel><SelectInput name="location" value={formData.location} onChange={handleChange} options={['Salón Principal', 'Depósito', 'Con cliente', 'Taller Mecánico', 'Taller Chapa y Pintura', 'Otra']} /></div>
                            </div>

                            {editingCar && ['Reservado','Vendido'].includes(editingCar.status) && <p className="mt-2 text-xs text-crm-fg-muted">El estado se gestiona desde la reserva o venta vinculada.</p>}
                            {editingCar && (Math.abs((parseArgentineMoney(formData.purchasePrice) || 0) - (parseArgentineMoney(editingCar.purchasePrice ?? editingCar.precioCompra ?? 0) || 0)) > 0.001 || String(formData.purchaseCurrency || '').replace('U$S','USD') !== String(editingCar.purchaseCurrency || 'USD').replace('U$S','USD')) && (
                                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-amber-300">Justificación obligatoria por cambio de costo</span>
                                        <span className="text-crm-fg-muted">
                                            Anterior: {Number(editingCar.purchasePrice ?? editingCar.precioCompra ?? 0).toLocaleString('es-AR')} → Nuevo: {Number(formData.purchasePrice || 0).toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <InputLabel htmlFor="vehicle-create-purchasePriceChangeType" required>Tipo de modificación</InputLabel>
                                            <select id="vehicle-create-purchasePriceChangeType"
                                                name="purchasePriceChangeType"
                                                value={formData.purchasePriceChangeType || 'correccion_precio'}
                                                onChange={handleChange}
                                                className="h-9 w-full bg-crm-surface border border-crm-border rounded-lg px-3 py-2 text-sm text-crm-fg focus:border-red-500 focus:outline-none"
                                            >
                                                <option value="correccion_precio">Corrección del precio de compra / valor de toma</option>
                                                <option value="gasto_adicional">Gasto adicional del vehículo</option>
                                            </select>
                                        </div>
                                        <div>
                                            <InputLabel htmlFor="vehicle-create-purchasePriceJustification" required>Motivo / Justificación (Historial Interno)</InputLabel>
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
                                <span className="text-xs font-bold text-crm-fg uppercase tracking-widest">3. Propietario y Origen</span>
                            </div>

                            <div className="bg-crm-surface border border-crm-border rounded-xl p-4 mb-4 flex flex-col gap-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input id="vehicle-create-agencyOwned" type="checkbox" name="agencyOwned" checked={formData.agencyOwned} onChange={handleChange} className="w-4 h-4 rounded border-gray-600 text-red-500 focus:ring-red-500 bg-crm-surface-raised" />
                                    <div>
                                        <span className="text-xs font-bold text-crm-fg block">Vehículo propio de la agencia</span>
                                        <span className="text-[10px] text-crm-fg-muted">El auto es de la agencia, no consignado por un tercero.</span>
                                    </div>
                                </label>

{formData.agencyOwned && !formData.receivedAsTradeIn && !editingCar && (
                                    <div className="border-t border-crm-border pt-4 mt-2 space-y-4">
                                        <div>
                                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-1">
                                                Pago de la compra (Unidad Propia)
                                            </span>
                                            <span className="text-[11px] text-crm-fg-muted">
                                                Seleccioná cómo se abona la compra para sincronizar con cuentas físicas y la caja estratégica de reposición.
                                            </span>
                                        </div>

                                        <div id="vehicle-create-purchasePayment.modality" tabIndex={-1} role="group" aria-label="Modalidad de pago de compra" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                aria-pressed={purchasePayment.modality === 'pagar_ahora'} onClick={() => { markDirty(); setPurchasePayment(prev => ({ ...prev, modality: 'pagar_ahora' })); }}
                                                className={`p-3 rounded-xl border text-left transition-all ${
                                                    purchasePayment.modality === 'pagar_ahora'
                                                        ? 'border-emerald-500 bg-emerald-500/10 text-crm-fg'
                                                        : 'border-crm-border bg-crm-bg/40 text-crm-fg-muted hover:text-crm-fg hover:bg-crm-surface-raised'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-bold">Pagar ahora</span>
                                                    {purchasePayment.modality === 'pagar_ahora' && <CheckCircle2 size={14} className="text-emerald-400" />}
                                                </div>
                                                <p className="text-[10px] text-crm-fg-muted">
                                                    Fondos disponibles. Genera un egreso inmediato en la cuenta seleccionada.
                                                </p>
                                            </button>

                                            <button
                                                type="button"
                                                aria-pressed={purchasePayment.modality === 'pendiente'} onClick={() => { markDirty(); setPurchasePayment(prev => ({ ...prev, modality: 'pendiente' })); }}
                                                className={`p-3 rounded-xl border text-left transition-all ${
                                                    purchasePayment.modality === 'pendiente'
                                                        ? 'border-amber-500 bg-amber-500/10 text-crm-fg'
                                                        : 'border-crm-border bg-crm-bg/40 text-crm-fg-muted hover:text-crm-fg hover:bg-crm-surface-raised'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-bold">Pendiente / Esperando fondos</span>
                                                    {purchasePayment.modality === 'pendiente' && <CheckCircle2 size={14} className="text-amber-400" />}
                                                </div>
                                                <p className="text-[10px] text-crm-fg-muted">
                                                    Se liquidará con un cobro futuro (previsión vinculada a una venta o cuota).
                                                </p>
                                            </button>

                                            <button
                                                type="button"
                                                aria-pressed={purchasePayment.modality === 'pago_parcial'} onClick={() => { markDirty(); setPurchasePayment(prev => ({ ...prev, modality: 'pago_parcial' })); }}
                                                className={`p-3 rounded-xl border text-left transition-all ${
                                                    purchasePayment.modality === 'pago_parcial'
                                                        ? 'border-blue-500 bg-blue-500/10 text-crm-fg'
                                                        : 'border-crm-border bg-crm-bg/40 text-crm-fg-muted hover:text-crm-fg hover:bg-crm-surface-raised'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-bold">Pago parcial</span>
                                                    {purchasePayment.modality === 'pago_parcial' && <CheckCircle2 size={14} className="text-blue-400" />}
                                                </div>
                                                <p className="text-[10px] text-crm-fg-muted">
                                                    Se abona un anticipo ahora y el resto queda como saldo a pagar.
                                                </p>
                                            </button>

                                            <button
                                                type="button"
                                                aria-pressed={purchasePayment.modality === 'ya_pagado_historico'} onClick={() => { markDirty(); setPurchasePayment(prev => ({ ...prev, modality: 'ya_pagado_historico' })); }}
                                                className={`p-3 rounded-xl border text-left transition-all ${
                                                    purchasePayment.modality === 'ya_pagado_historico'
                                                        ? 'border-purple-500 bg-purple-500/10 text-crm-fg'
                                                        : 'border-crm-border bg-crm-bg/40 text-crm-fg-muted hover:text-crm-fg hover:bg-crm-surface-raised'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-bold">Ya pagado / Alta histórica</span>
                                                    {purchasePayment.modality === 'ya_pagado_historico' && <CheckCircle2 size={14} className="text-purple-400" />}
                                                </div>
                                                <p className="text-[10px] text-crm-fg-muted">
                                                    Unidad liquidada con anterioridad. No genera movimientos de caja actuales.
                                                </p>
                                            </button>
                                        </div>

                                        {(purchasePayment.modality === 'pagar_ahora' || purchasePayment.modality === 'pago_parcial') && (
                                            <div className="p-3 bg-crm-bg/70 border border-crm-border rounded-xl space-y-3">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div>
                                                        <InputLabel htmlFor="vehicle-create-purchasePayment.accountId" required>Cuenta física de origen</InputLabel>
                                                        <select id="vehicle-create-purchasePayment.accountId" aria-label="Cuenta física de origen"
                                                            value={purchasePayment.accountId}
                                                            onChange={(e) => setPurchasePayment(prev => ({ ...prev, accountId: e.target.value }))}
                                                            className="h-9 w-full bg-crm-surface border border-crm-border rounded-lg px-3 py-2 text-sm text-crm-fg focus:border-emerald-500 focus:outline-none"
                                                            required
                                                        >
                                                            <option value="">{loadingAccounts ? 'Cargando cuentas…' : '— Seleccionar cuenta —'}</option>
                                                            {eligibleAccounts.map(acc => (
                                                                <option key={acc._id} value={acc._id}>
                                                                    {acc.name} ({acc.currency} {Number(acc.balance || 0).toLocaleString('es-AR')})
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {!loadingAccounts && eligibleAccounts.length === 0 && <p className="mt-1 text-xs text-crm-fg-muted">No hay cuentas activas en {formData.purchaseCurrency}. Usá una cuenta de esa moneda para registrar el pago.</p>}
                                                    </div>

                                                    {purchasePayment.modality === 'pago_parcial' && (
                                                        <div>
                                                            <InputLabel htmlFor="vehicle-create-purchasePayment.amountPaid" required>Monto abonado ahora ({formData.purchaseCurrency})</InputLabel>
                                                            <input id="vehicle-create-purchasePayment.amountPaid" aria-label="Monto abonado ahora"
                                                                type="number"
                                                                min="1"
                                                                placeholder="Ej: 5000"
                                                                value={purchasePayment.amountPaid}
                                                                onChange={(e) => setPurchasePayment(prev => ({ ...prev, amountPaid: e.target.value }))}
                                                                className="h-9 w-full bg-crm-surface border border-crm-border rounded-lg px-3 py-2 text-sm text-crm-fg focus:border-emerald-500 focus:outline-none"
                                                                required
                                                            />
                                                        </div>
                                                    )}

                                                    <div>
                                                        <InputLabel>Medio de pago</InputLabel>
                                                        <select aria-label="Medio de pago"
                                                            value={purchasePayment.paymentMethod}
                                                            onChange={(e) => setPurchasePayment(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                                            className="h-9 w-full bg-crm-surface border border-crm-border rounded-lg px-3 py-2 text-sm text-crm-fg focus:outline-none"
                                                        >
                                                            <option value="Transferencia bancaria">Transferencia bancaria</option>
                                                            <option value="Efectivo">Efectivo</option>
                                                            <option value="Cheque">Cheque</option>
                                                            <option value="Otro">Otro</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <InputLabel>Comprobante / Referencia (opcional)</InputLabel>
                                                        <input aria-label="Comprobante o referencia"
                                                            type="text"
                                                            placeholder="Ej: Transf. 984128"
                                                            value={purchasePayment.reference}
                                                            onChange={(e) => setPurchasePayment(prev => ({ ...prev, reference: e.target.value }))}
                                                            className="h-9 w-full bg-crm-surface border border-crm-border rounded-lg px-3 py-2 text-sm text-crm-fg focus:outline-none"
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
                                                        <span className="text-xs font-bold text-crm-fg block">
                                                            Deducir asignación de caja estratégica Stock / Reposición
                                                        </span>
                                                        <span className="text-[10px] text-crm-fg-muted">
                                                            Descuenta la reserva para reposición de unidades en Tesorería Estratégica en coordinación con la cuenta bancaria.
                                                        </span>
                                                    </div>
                                                </label>
                                            </div>
                                        )}

                                        {(purchasePayment.modality === 'pendiente' || purchasePayment.modality === 'pago_parcial') && (
                                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                                                <InputLabel>Previsión de fondos / Cobro futuro esperado</InputLabel>
                                                <input aria-label="Previsión de fondos"
                                                    type="text"
                                                    placeholder="Ej: Se liquidará con el cobro de la cuota #2 de la venta Pérez o ingreso de seña..."
                                                    value={purchasePayment.expectedFundsNote}
                                                    onChange={(e) => setPurchasePayment(prev => ({ ...prev, expectedFundsNote: e.target.value }))}
                                                    className="h-9 w-full bg-crm-surface border border-crm-border rounded-lg px-3 py-2 text-sm text-crm-fg focus:border-amber-500 focus:outline-none"
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
                                            <input id="vehicle-create-receivedAsTradeIn" type="checkbox" name="receivedAsTradeIn" checked={formData.receivedAsTradeIn} onChange={handleChange} className="w-4 h-4 rounded border-gray-600 text-purple-500 focus:ring-purple-500 bg-crm-surface-raised" />
                                            <div>
                                                <span className="text-xs font-bold text-crm-fg block">Recibido en parte de pago</span>
                                                <span className="text-[10px] text-crm-fg-muted">Vincular esta unidad a la venta de origen y registrar su valor de toma acordado.</span>
                                            </div>
                                        </label>

                                        {formData.receivedAsTradeIn && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                                                <div className="md:col-span-2">
                                                    <InputLabel htmlFor="vehicle-create-tradeInOriginSaleId" required>Venta de origen</InputLabel>
                                                    <select id="vehicle-create-tradeInOriginSaleId"
                                                        name="tradeInOriginSaleId"
                                                        value={formData.tradeInOriginSaleId}
                                                        onChange={handleChange}
                                                        required={formData.receivedAsTradeIn}
                                                        className="h-9 w-full bg-crm-surface border border-crm-border rounded-lg px-3 py-2 text-sm text-crm-fg focus:border-purple-500 focus:outline-none"
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
                                                            <InputLabel htmlFor="vehicle-create-tradeInOriginItemId">Permuta declarada en la venta (opcional)</InputLabel>
                                                            <select id="vehicle-create-tradeInOriginItemId"
                                                                name="tradeInOriginItemId"
                                                                value={formData.tradeInOriginItemId}
                                                                onChange={handleChange}
                                                                className="h-9 w-full bg-crm-surface border border-crm-border rounded-lg px-3 py-2 text-sm text-crm-fg focus:border-purple-500 focus:outline-none"
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
                                                    <InputLabel htmlFor="vehicle-create-tradeInOriginValue" required>Valor de toma acordado</InputLabel>
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
                                                    <InputLabel htmlFor="vehicle-create-tradeInOriginCurrency" required>Moneda del valor de toma</InputLabel>
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
                                    <div><InputLabel htmlFor="vehicle-create-ownerName">Nombre / Razón Social</InputLabel><TextInput name="ownerName" value={formData.ownerName} onChange={handleChange} /></div>
                                    <div><InputLabel htmlFor="vehicle-create-ownerPhone">Teléfono</InputLabel><TextInput name="ownerPhone" value={formData.ownerPhone} onChange={handleChange} /></div>
                                    <div><InputLabel htmlFor="vehicle-create-ownerEmail">Email</InputLabel><TextInput name="ownerEmail" value={formData.ownerEmail} onChange={handleChange} type="email" /></div>
                                    <div><InputLabel htmlFor="vehicle-create-consignedBy">Consignado por</InputLabel><TextInput name="consignedBy" value={formData.consignedBy} onChange={handleChange} placeholder="Nombre del responsable" /></div>
                                </div>
                            </div>
                        </section>

                        {/* 4. INVERSIÓN COMPARTIDA */}
                        <VehicleFormSection title="Inversión Compartida" initiallyOpen={Boolean(formData.isSharedInvestment)}>

                            <div className="bg-crm-surface border border-crm-border rounded-xl p-4 flex flex-col gap-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input id="vehicle-create-isSharedInvestment" type="checkbox" name="isSharedInvestment" checked={formData.isSharedInvestment} onChange={handleChange} className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-crm-surface-raised" />
                                    <div>
                                        <span className="text-xs font-bold text-crm-fg block">Vehículo con inversión compartida</span>
                                        <span className="text-[10px] text-crm-fg-muted">El auto fue comprado a medias con un inversionista.</span>
                                    </div>
                                </label>

                                {formData.isSharedInvestment && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                        <div>
                                            <InputLabel htmlFor="vehicle-create-investorName" required>Nombre del inversionista</InputLabel>
                                            <input id="vehicle-create-investorName"
                                                list="loaded-companies-datalist"
                                                name="investorName"
                                                value={formData.investorName}
                                                onChange={handleChange}
                                                placeholder="Seleccionar empresa cargada o ingresar nombre..."
                                                required={formData.isSharedInvestment}
                                                className="w-full bg-crm-surface-raised border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                            />
                                            <datalist id="loaded-companies-datalist">
                                                <option value="LHIVER" />
                                                <option value="AUTOTERRA" />
                                                <option value="AKAR" />
                                                <option value="ALWAYS SAS" />
                                            </datalist>
                                        </div>
                                        <div>
                                            <InputLabel htmlFor="vehicle-create-investorPercentage" required>Porcentaje del Inversionista (%)</InputLabel>
                                            <TextInput name="investorPercentage" type="number" value={formData.investorPercentage} onChange={handleChange} placeholder="Ej: 50" required={formData.isSharedInvestment} />
                                            <p className="text-[10px] text-blue-400 mt-1">La agencia retiene el {100 - (Number(formData.investorPercentage) || 0)}%</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </VehicleFormSection>

<VehicleFormSection title="Ficha técnica"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
    <div><InputLabel htmlFor="vehicle-create-transmission">Transmisión</InputLabel><SelectInput name="transmission" value={formData.transmission} onChange={handleChange} options={['', 'Manual', 'Automática']} /></div>
    <div><InputLabel htmlFor="vehicle-create-bodyType">Carrocería</InputLabel><SelectInput name="bodyType" value={formData.bodyType} onChange={handleChange} options={['', 'SUV', 'Sedán', 'Hatchback', 'Pick-up', 'Coupé', 'Cabriolet', 'Familiar', 'Utilitario', 'Otro']} /></div>
    <div><InputLabel htmlFor="vehicle-create-doors">Puertas</InputLabel><TextInput name="doors" type="number" min="0" max="12" step="1" value={formData.doors} onChange={handleChange} /></div>
    <div><InputLabel htmlFor="vehicle-create-engine">Motor / Cilindrada</InputLabel><TextInput name="engine" value={formData.engine} onChange={handleChange} /></div>
    <div><InputLabel htmlFor="vehicle-create-version">Versión</InputLabel><TextInput name="version" value={formData.version} onChange={handleChange} /></div>
    <div><InputLabel htmlFor="vehicle-create-engineNumber">Nº Motor</InputLabel><TextInput name="engineNumber" value={formData.engineNumber} onChange={handleChange} /></div>
<div><InputLabel htmlFor="vehicle-create-chassisNumber">Nº Chasis</InputLabel><TextInput name="chassisNumber" value={formData.chassisNumber} onChange={handleChange} /></div>
<div><InputLabel htmlFor="vehicle-create-fuel">Combustible</InputLabel><SelectInput name="fuel" value={formData.fuel} onChange={handleChange} options={['Nafta', 'Diésel', 'GNC', 'Híbrido', 'Eléctrico']} /></div>
</div></VehicleFormSection>
                        {/* 5. DOCUMENTACIÓN */}
                        <VehicleFormSection title="Documentación">

                            <p className="mb-3 text-xs text-crm-fg-muted">Los archivos registrales se adjuntan desde la ficha después del alta. Podés indicar su estado ahora.</p>
                            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">{[['tituloAutomotor','Título automotor'],['cedulaVerde','Cédula verde / azul'],['verificacionPolicial','Verificación policial'],['informeDominio','Informe de dominio'],['formulario08','Formulario 08'],['libreDeudaPatentes','Libre deuda de patentes']].map(([key,label]) => <div key={key}><label htmlFor={'vehicle-create-doc-' + key} className="mb-1.5 block text-xs text-crm-fg-muted">{label}</label><select id={'vehicle-create-doc-' + key} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-xs text-crm-fg" value={formData.documentation?.[key] || 'pendiente'} onChange={event => setFormData(previous => ({...previous, documentation: {...previous.documentation, [key]: event.target.value}}))}><option value="pendiente">Pendiente</option><option value="recibido">Recibido</option><option value="no aplica">No aplica</option></select></div>)}</div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><InputLabel htmlFor="vehicle-create-hasManuals">Manuales</InputLabel><SelectInput name="hasManuals" value={formData.hasManuals} onChange={handleChange} options={['No', 'Sí', 'Parcial']} /></div>
                                <div><InputLabel htmlFor="vehicle-create-hasDuplicateKeys">Duplicado de llaves</InputLabel><SelectInput name="hasDuplicateKeys" value={formData.hasDuplicateKeys} onChange={handleChange} options={['No', 'Sí', 'Parcial']} /></div>
                                <div><InputLabel htmlFor="vehicle-create-hasOfficialServices">Servicios oficiales</InputLabel><SelectInput name="hasOfficialServices" value={formData.hasOfficialServices} onChange={handleChange} options={['No', 'Sí', 'Parcial']} /></div>
                            </div>
                        </VehicleFormSection>

                        {/* 6. PUBLICACIÓN */}
                        <VehicleFormSection title="Publicación">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <InputLabel>Visible en Web (Catálogo)</InputLabel>
                                    <label className="flex items-center gap-3 cursor-pointer mt-2">
                                        <input id="vehicle-create-visibleEnWeb" type="checkbox" name="visibleEnWeb" checked={formData.visibleEnWeb} onChange={handleChange} className="w-4 h-4 rounded border-gray-600 text-red-500 focus:ring-red-500 bg-crm-surface-raised" />
                                        <span className="text-xs font-bold text-crm-fg">Mostrar en sitio web</span>
                                    </label>
                                </div>
                                <div><InputLabel htmlFor="vehicle-create-publishedOnML">¿Publicado en MercadoLibre?</InputLabel><SelectInput name="publishedOnML" value={formData.publishedOnML} onChange={handleChange} options={['No', 'Sí']} /></div>
                                <div><InputLabel htmlFor="vehicle-create-publishedBy">Publicado por</InputLabel><TextInput name="publishedBy" value={formData.publishedBy} onChange={handleChange} placeholder="Ej: Richi, Lucia..." /></div>
                            </div>
                            {!formData.visibleEnWeb || formData.status !== 'Disponible' ? (
                                <div className="mb-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-3 rounded-lg text-xs flex gap-2 items-start">
                                    <span>⚠️</span>
                                    <span>Este vehículo está oculto del catálogo. Para publicarlo, cambiá estado a Disponible y activá Visible en web.</span>
                                </div>
                            ) : null}
                            <div className="mb-4">
                                <InputLabel htmlFor="vehicle-create-mlLink">Link de MercadoLibre</InputLabel>
                                <TextInput name="mlLink" value={formData.mlLink} onChange={handleChange} placeholder="https://articulo.mercadolibre.com.ar/..." />
                            </div>
                        </VehicleFormSection>

                        {/* 7. FOTOS Y NOTAS */}
                        <VehicleFormSection title="Fotos y Notas">
                            <div className="flex items-center justify-between mb-4 border-b border-crm-border pb-2 mt-6">
                                <span className="text-xs font-bold text-crm-fg uppercase tracking-widest">7. Fotos y Notas</span>
                                {files.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFramingInitialIndex(0);
                                            markDirty(); setShowFramingModal(true);
                                        }}
                                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-crm-surface hover:bg-crm-border text-crm-fg transition-colors flex items-center gap-1.5 border border-crm-border hover:border-red-500 cursor-pointer"
                                        title="Ajustar cómo se encuadra la foto en catálogo y ficha"
                                    >
                                        <Sliders size={12} className="text-red-500" />
                                        Ajustar encuadre
                                    </button>
                                )}
                            </div>
                            <div className="mb-6">
                                <InputLabel htmlFor="vehicle-create-notes">Notas Internas</InputLabel>
                                <textarea id="vehicle-create-notes"
                                    name="notes" value={formData.notes} onChange={handleChange} rows="3" placeholder="Observaciones privadas sobre el vehículo..."
                                    className="h-9 w-full bg-crm-surface border border-crm-border rounded-lg px-3 py-2 text-sm text-crm-fg placeholder-gray-600 focus:border-red-500 focus:outline-none transition-colors resize-none"
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
                                    id="vehicle-create-images" aria-label="Agregar fotos del vehículo" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                    onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
                                />

                                {files.length === 0 ? (
                                    <div className="text-center pointer-events-none z-10">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors ${isDragging ? 'bg-red-500 text-crm-fg' : 'bg-crm-surface-raised text-crm-fg-muted'}`}>
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
                                                {i === 0 && (
                                                    <div className="absolute top-0 left-0 w-full bg-red-500/90 text-crm-fg text-[8px] font-bold text-center py-0.5 tracking-wider uppercase z-20">Portada</div>
                                                )}
                                                <button
                                                    type="button"
                                                    title={`Ajustar encuadre de foto #${i + 1}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setFramingInitialIndex(i);
                                                        markDirty(); setShowFramingModal(true);
                                                    }}
                                                    className="absolute bottom-1 left-1 bg-black/80 hover:bg-red-600 text-crm-fg p-1 rounded z-30 shadow transition-colors flex items-center justify-center cursor-pointer border border-white/20"
                                                >
                                                    <Sliders size={10} />
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label={`Quitar foto ${i + 1}`} onClick={(e) => { e.stopPropagation(); handleRemovePhoto(i); }}
                                                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-crm-fg p-1 rounded-full z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </VehicleFormSection>

                        </fieldset>
                    </form>
            </div>

            <VehicleImageFramingModal
                isOpen={showFramingModal}
                onClose={() => setShowFramingModal(false)}
                vehicle={framingVehicle}
                images={files}
                initialIndex={framingInitialIndex}
                currentPosition={formData.imagePosition || '50% 75%'}
                onPositionSaved={(newPos) => {
                    setFormData(prev => ({ ...prev, imagePosition: newPos }));
                }}
                onPositionsSaved={(newPositions, coverPos) => {
                    setFormData(prev => ({ ...prev, imagePositions: newPositions, imagePosition: coverPos }));
                }}
                onCropComplete={(croppedFile, cropIndex) => {
                    setFiles(prev => {
                        const updated = [...prev];
                        updated[cropIndex] = croppedFile;
                        return updated;
                    });
                    toast.success(`Foto #${cropIndex + 1} reemplazada con el recorte 4:3`);
                }}
            />
        </VehicleEditorDialog>
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
