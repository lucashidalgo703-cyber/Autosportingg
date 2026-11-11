"use client";
import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Save, Sliders, AlertTriangle, HelpCircle, FileText, Upload, Eye, Trash2, Edit, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { parseArgentineMoney } from '../../../utils/saleCommercial';
import { validateVehicleInput } from '../../../utils/vehicleValidation.js';
import {vehicleAcquisitionEditPatch, vehicleDateEditPatch, vehicleEditorDateValue} from '../../../utils/vehicleEditPreservation.js';
import { useAuth } from '../../../context/AuthContext';
import VehicleReferenceFields from './VehicleReferenceFields';
import VehicleImageFramingModal from './VehicleImageFramingModal';
import {compressImage} from '../../../utils/imageCompressor';
import {vehicleEditorExistingFiles,reorderVehicleEditorPhotos,removeVehicleEditorPhoto} from '../../../utils/vehicleEditPreservation.js';
import VehicleEditorDialog, {useVehicleFormClose, VehicleFormSection, VehicleFormErrors, revealVehicleField} from './VehicleEditorDialog';

export default function VehicleEditModal({ isOpen, onClose, onSave, vehicleData }) {
    const {token: authToken} = useAuth();
    const [formData, setFormData] = useState({});
    const [fieldErrors, setFieldErrors] = useState({});
    const [docFiles, setDocFiles] = useState({});
    const [deletedDocs, setDeletedDocs] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isSearchingInfoAuto, setIsSearchingInfoAuto] = useState(false);
    const infoAutoRequest = useRef(null);
    const documentRequest = useRef(null);
    const editSession = useRef(0);
    const vehicleId = vehicleData?._original?._id || vehicleData?.id;
    const existingPurchase = vehicleData?._original?.purchasePrice ?? vehicleData?.tradeInOrigin?.value;
    const hasKnownPurchase = existingPurchase !== undefined && existingPurchase !== null && existingPurchase !== '';
    const { dirty, markDirty, requestClose, closeNotice } = useVehicleFormClose({isOpen, onClose, busy: isSaving, resetKey: vehicleId});


    const editingCar = vehicleData?._original || null;
    const [files,setFiles] = useState([]);
    const [isDragging,setIsDragging] = useState(false);
    const [draggedIndex,setDraggedIndex] = useState(null);
    const [showFramingModal,setShowFramingModal] = useState(false);
    const [framingInitialIndex,setFramingInitialIndex] = useState(0);
    const [isProcessingImages,setIsProcessingImages] = useState(false);
    const fileGeneration = editSession;
    const fileJobCount = useRef(0);
    const previewUrls = useRef(new Set());
    const framingVehicle = useMemo(() => ({...editingCar,brand:formData.brand,name:formData.name,year:formData.year,km:formData.km,imagePosition:formData.imagePosition,imagePositions:formData.imagePositions}), [editingCar,formData.brand,formData.name,formData.year,formData.km,formData.imagePosition,formData.imagePositions]);
    useEffect(() => { const current = new Set(files.filter(file => !file.isExisting && file.preview?.startsWith('blob:')).map(file => file.preview)); for(const url of previewUrls.current)if(!current.has(url))URL.revokeObjectURL(url); previewUrls.current=current; },[files]);
    useEffect(() => () => {for(const url of previewUrls.current)URL.revokeObjectURL(url);},[]);

    const docFieldsConfig = [
        { key: 'tituloAutomotor', label: 'Título Automotor' },
        { key: 'cedulaVerde', label: 'Cédula Verde/Azul' },
        { key: 'verificacionPolicial', label: 'Verificación Policial (12)' },
        { key: 'informeDominio', label: 'Informe de Dominio' },
        { key: 'formulario08', label: 'Formulario 08' },
        { key: 'libreDeudaPatentes', label: 'Libre Deuda Patentes' }
    ];

    useEffect(() => {
        if (isOpen && vehicleData) {
            setDeletedDocs([]);
            setDocFiles({});
            setFieldErrors({});
            setIsSaving(false);
            setIsProcessingImages(false); fileJobCount.current=0; setFiles(vehicleEditorExistingFiles(vehicleData._original || {}));
            // Flatten the nested structure for the form.
            setFormData({
                brand: vehicleData.marca || '',
                name: vehicleData.modelo || '',
                description: vehicleData._original?.description || '',
                publicEquipment:vehicleData._original?.publicEquipment || '',publicMaintenance:vehicleData._original?.publicMaintenance || '',publicPurchaseConditions:vehicleData._original?.publicPurchaseConditions || '',youtubeUrl:vehicleData._original?.youtubeUrl || '',
                imagePosition:vehicleData._original?.imagePosition || '50% 75%',imagePositions:vehicleData._original?.imagePositions || [],
                version: vehicleData._original?.version || '',
                vehicleType: vehicleData._original?.vehicleType || 'Auto',
                color: vehicleData._original?.color || '',
                transmission: vehicleData._original?.transmission || '',
                bodyType: vehicleData._original?.bodyType || '',
                doors: vehicleData._original?.doors ?? '',
                engine: vehicleData._original?.engine || '',
                engineNumber: vehicleData._original?.engineNumber || '',
                chassisNumber: vehicleData._original?.chassisNumber || '',
                owners: vehicleData._original?.owners ?? 1,
                ownerName: vehicleData._original?.ownerName || '',
                ownerPhone: vehicleData._original?.ownerPhone || '',
                ownerEmail: vehicleData._original?.ownerEmail || '',
                linkedClient: vehicleData._original?.linkedClient || '',
                hasManuals: vehicleData._original?.hasManuals || 'No',
                hasDuplicateKeys: vehicleData._original?.hasDuplicateKeys || 'No',
                hasOfficialServices: vehicleData._original?.hasOfficialServices || 'No',
                publishedOnML: vehicleData._original?.publishedOnML || 'No',
                publishedBy: vehicleData._original?.publishedBy || '',
                mlLink: vehicleData._original?.mlLink || '',
                documentation: vehicleData._original?.documentation || vehicleData.documentation || {},
                year: vehicleData.año || '',
                km: vehicleData.kilometraje || 0,
                fuel: vehicleData.combustible || 'Nafta',
                condition: vehicleData.condicion || 'Usado',
                price: vehicleData.precioPublicado || 0,
                currency: vehicleData.moneda || 'USD',
                status: vehicleData._original?.status || 'Disponible',
                visibleEnWeb: vehicleData.visibleEnWeb,

                // Internal fields
                purchasePrice: hasKnownPurchase ? (vehicleData.precioCompra ?? existingPurchase) : '',
                purchaseCurrency: vehicleData._original?.purchaseCurrency || vehicleData.monedaCompra || 'USD',
                purchasePriceChangeType: 'correccion_precio',
                purchasePriceJustification: '',
                purchasePriceExpenseConcept: '',
                agencyOwned: vehicleData._original?.agencyOwned || vehicleData.origen === 'propio' || false,
                consignedBy: vehicleData._original?.consignedBy || (vehicleData.origen === 'consignación' ? 'Consignador' : ''),
                plateOrVin: vehicleData.dominio || '',
                location: vehicleData._original?.location || 'Salón Principal',
                notes: vehicleData.observaciones === 'Sin observaciones.' ? '' : vehicleData.observaciones,
                createdAt: vehicleEditorDateValue(vehicleData._original?.createdAt),
                soldAt: vehicleEditorDateValue(vehicleData._original?.soldAt),
                isSharedInvestment: !!(vehicleData.investor && vehicleData.investor.percentage > 0),
                investorName: vehicleData.investor?.name || '',
                investorPercentage: vehicleData.investor?.percentage || 50,

                // InfoAuto
                infoAutoCodia: vehicleData.infoAuto?.codia || vehicleData._original?.infoAuto?.codia || '',
                infoAutoValor: vehicleData.infoAuto?.valor || vehicleData._original?.infoAuto?.valor || '',
                infoAutoCurrency: vehicleData.infoAuto?.currency || vehicleData._original?.infoAuto?.currency || 'ARS',
                infoAutoEdicion: vehicleData.infoAuto?.edicion || vehicleData._original?.infoAuto?.edicion || '',
                infoAutoAutoSync: vehicleData.infoAuto?.autoSync ?? vehicleData._original?.infoAuto?.autoSync ?? true
            });
        }
    }, [isOpen, vehicleId, authToken]);

    useEffect(() => {
        editSession.current += 1;
        infoAutoRequest.current?.abort();
        documentRequest.current?.abort();
        setIsSearchingInfoAuto(false);
        return () => { editSession.current += 1; infoAutoRequest.current?.abort(); documentRequest.current?.abort(); };
    }, [isOpen, vehicleId, authToken]);

    if (!isOpen) return null;

    const handleLookupInfoAuto = async () => {
        if (isSearchingInfoAuto) return;
        const session = editSession.current;
        const controller = new AbortController();
        infoAutoRequest.current?.abort();
        infoAutoRequest.current = controller;
        try {
            setIsSearchingInfoAuto(true);
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const params = new URLSearchParams();
            if (formData.infoAutoCodia) params.append('codia', formData.infoAutoCodia);
            if (formData.brand) params.append('brand', formData.brand);
            if (formData.name) params.append('model', formData.name);
            if (formData.year) params.append('year', formData.year);

            const res = await fetch(`/api/admin/infoauto/lookup?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` },
                signal: controller.signal
            });
            const data = await res.json();
            if (controller.signal.aborted || session !== editSession.current) return;
            if (data.ok && data.valor) {
                markDirty();
                setFormData(prev => ({
                    ...prev,
                    infoAutoValor: data.valor,
                    infoAutoCurrency: data.currency || 'ARS',
                    infoAutoEdicion: data.edicion || prev.infoAutoEdicion,
                    infoAutoCodia: data.codia || prev.infoAutoCodia
                }));
                toast.success(`Cotización InfoAuto: ${data.currency} ${Number(data.valor).toLocaleString('es-AR')}`);
            } else {
                if (data.edicion) {
                    markDirty();
                    setFormData(prev => ({ ...prev, infoAutoEdicion: data.edicion }));
                }
                toast(data.message || 'Podés ingresar el valor oficial manualmente', { icon: 'ℹ️' });
            }
        } catch (err) {
            if (!controller.signal.aborted && session === editSession.current) toast.error('No se pudo consultar InfoAuto: ' + err.message);
        } finally {
            if (session === editSession.current) setIsSearchingInfoAuto(false);
        }
    };

    const isTradeIn = Boolean(
        vehicleData?.tradeInOrigin?.saleId ||
        vehicleData?.acquisitionSource === 'valor_de_toma' ||
        vehicleData?._original?.tradeInOrigin?.saleId
    );
    const initialPurchasePrice = parseArgentineMoney(vehicleData?.precioCompra ?? vehicleData?.tradeInOrigin?.value ?? 0) || 0;
    const currentPurchasePrice = parseArgentineMoney(formData.purchasePrice);
    const originalCurrency = String(vehicleData?._original?.purchaseCurrency || vehicleData?.monedaCompra || 'USD').trim().toUpperCase();
    const normalizeCurrency = value => ['USD', 'U$S', 'US$'].includes(String(value).trim().toUpperCase()) ? 'USD' : 'ARS';
    const hasCurrencyChanged = normalizeCurrency(formData.purchaseCurrency) !== normalizeCurrency(originalCurrency);
    const hasPurchasePriceChanged = (Number.isFinite(currentPurchasePrice) && Math.abs(currentPurchasePrice - initialPurchasePrice) > 0.001) || hasCurrencyChanged;

    const handleChange = (e) => {
        markDirty();
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleDocChange = (e, fieldName) => {
        markDirty();
        const file = e.target.files[0];
        if (file) {
            setDocFiles(prev => ({ ...prev, [fieldName]: file }));
        }
    };

    const handleOrigenChange = (e) => {
        markDirty();
        const val = e.target.value;
        setFormData(prev => ({
            ...prev,
            agencyOwned: val === 'propio',
            consignedBy: val === 'consignación' ? (prev.consignedBy || 'Dueño ') : ''
        }));
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
        if (isSaving || isProcessingImages) return;
        const savingSession = editSession.current;
        const savingToken = authToken;
        const assertSaveSession = () => {
            if (!savingToken || savingSession !== editSession.current || savingToken !== localStorage.getItem('token')) throw new Error('La sesión cambió. Actualizá la ficha antes de continuar con los documentos.');
        };
        if (!savingToken || savingToken !== localStorage.getItem('token')) { setFieldErrors({_form:'Iniciá sesión nuevamente antes de guardar.'}); return; }
        const validationInput = {...formData};
        if (!hasKnownPurchase && String(formData.purchasePrice ?? '').trim() === '') delete validationInput.purchasePrice;
        const validation = validateVehicleInput(validationInput, {partial:true});
        setFieldErrors(validation.errors);
        if (Object.keys(validation.errors).length) { revealVehicleField(Object.keys(validation.errors)[0], 'vehicle-edit'); return; }
        const parsedPrice = parseArgentineMoney(formData.price);
        const parsedPurchasePrice = !hasKnownPurchase && String(formData.purchasePrice ?? '').trim() === '' ? undefined : parseArgentineMoney(formData.purchasePrice);
        const parsedKm = parseArgentineMoney(formData.km);

        if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
            toast.error('El precio de publicación debe ser un número válido y positivo.');
            return;
        }

        if (parsedPurchasePrice !== undefined && (Number.isNaN(parsedPurchasePrice) || parsedPurchasePrice < 0)) {
            toast.error('Ingresá un valor de toma / costo de compra válido (número positivo).');
            return;
        }

        if (Number.isNaN(parsedKm) || parsedKm < 0) {
            toast.error('El kilometraje debe ser un número válido y positivo.');
            return;
        }

        if (hasPurchasePriceChanged) {
            if (!String(formData.purchasePriceJustification || '').trim()) {
                toast.error(isTradeIn
                    ? 'Debés ingresar una justificación obligatoria para modificar el valor de toma acordado.'
                    : 'Debés ingresar una justificación obligatoria para modificar el costo de compra/toma.'
                );
                return;
            }
            if (!['correccion_precio', 'gasto_adicional'].includes(formData.purchasePriceChangeType)) {
                toast.error('Seleccioná si el cambio es una corrección del precio de compra/toma o un gasto adicional.');
                return;
            }
            if (formData.purchasePriceChangeType === 'gasto_adicional' && (currentPurchasePrice <= initialPurchasePrice || hasCurrencyChanged)) {
                toast.error('Para registrar un gasto adicional, el nuevo importe debe ser superior al costo base actual.');
                return;
            }
        }

        try {
            setIsSaving(true);
            const controller = new AbortController();
            documentRequest.current?.abort();
            documentRequest.current = controller;

            const payload = {
                brand: formData.brand,
                name: formData.name,
                description: formData.description,
                publicEquipment:formData.publicEquipment,publicMaintenance:formData.publicMaintenance,publicPurchaseConditions:formData.publicPurchaseConditions,youtubeUrl:formData.youtubeUrl,
                imagePosition:formData.imagePosition,imagePositions:formData.imagePositions,
                version: formData.version,
                vehicleType: formData.vehicleType,
                color: formData.color,
                transmission: formData.transmission,
                bodyType: formData.bodyType,
                doors: formData.doors === '' ? null : Number(formData.doors),
                engine: formData.engine,
                engineNumber: formData.engineNumber,
                chassisNumber: formData.chassisNumber,
                owners: Number(formData.owners),
                ownerName: formData.ownerName,
                ownerPhone: formData.ownerPhone,
                ownerEmail: formData.ownerEmail,
                linkedClient: formData.linkedClient,
                hasManuals: formData.hasManuals,
                hasDuplicateKeys: formData.hasDuplicateKeys,
                hasOfficialServices: formData.hasOfficialServices,
                publishedOnML: formData.publishedOnML,
                publishedBy: formData.publishedBy,
                mlLink: formData.mlLink,
                documentation: formData.documentation,
                year: Number(formData.year),
                km: Number(formData.km),
                fuel: formData.fuel,
                condition: formData.condition,
                price: parsedPrice,
                currency: formData.currency,
                status: formData.status,
                visibleEnWeb: formData.visibleEnWeb,

                ...vehicleAcquisitionEditPatch({purchasePrice:hasKnownPurchase ? initialPurchasePrice : '', purchaseCurrency:originalCurrency}, formData),
                ...(hasPurchasePriceChanged ? {
                    purchasePriceChangeType: formData.purchasePriceChangeType,
                    purchasePriceJustification: String(formData.purchasePriceJustification).trim(),
                    purchasePriceExpenseConcept: String(formData.purchasePriceExpenseConcept || '').trim()
                } : {}),
                agencyOwned: formData.agencyOwned,
                consignedBy: formData.consignedBy,
                plateOrVin: formData.plateOrVin,
                location: formData.location,
                notes: formData.notes,
                ...vehicleDateEditPatch(vehicleData._original || {}, formData),
                investor: formData.isSharedInvestment ? {
                    name: formData.investorName,
                    percentage: Number(formData.investorPercentage)
                } : { name: '', percentage: 0 },
                infoAuto: {
                    codia: formData.infoAutoCodia ? String(formData.infoAutoCodia).trim() : '',
                    valor: parseArgentineMoney(formData.infoAutoValor) || 0,
                    currency: formData.infoAutoCurrency || 'ARS',
                    edicion: formData.infoAutoEdicion ? String(formData.infoAutoEdicion).trim() : '',
                    autoSync: Boolean(formData.infoAutoAutoSync)
                }
            };

            const finalValidation = validateVehicleInput(payload, {partial:true});
            if (Object.keys(finalValidation.errors).length) { setFieldErrors(finalValidation.errors); revealVehicleField(Object.keys(finalValidation.errors)[0], 'vehicle-edit'); return; }
            // Validate and save the unit before changing files; a rejected unit update must not delete documents.
            assertSaveSession();
            await onSave(payload,files);
            assertSaveSession();
            const docsToUpload = Object.keys(docFiles).filter(key => docFiles[key] instanceof File);
            const token = savingToken;
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');

            let docsUpdated = false;

            // Handle deletions
            if (deletedDocs.length > 0) {
                toast.loading('Eliminando documentos...', { id: 'deleteDocs' });
                for (const docKey of deletedDocs) {
                    assertSaveSession();
                    const deleteRes = await fetch(`${baseUrl}/api/admin/cars/${vehicleData._original?._id || vehicleData.id}/docs/${docKey}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` },
                        signal: controller.signal
                    });
                    assertSaveSession();
                    if (!deleteRes.ok) {
                        throw new Error(`Error al eliminar el documento ${docKey}`);
                    }
                }
                toast.success('Documentos eliminados', { id: 'deleteDocs' });
                docsUpdated = true;
            }

            if (docsToUpload.length > 0) {
                assertSaveSession();
                toast.loading('Guardando documentos...', { id: 'saveDocs' });
                const docsFormData = new FormData();
                docsToUpload.forEach(key => {
                    docsFormData.append(key, docFiles[key]);
                });

                const docsRes = await fetch(`${baseUrl}/api/admin/cars/${vehicleData._original?._id || vehicleData.id}/docs`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: docsFormData,
                    signal: controller.signal
                });
                assertSaveSession();

                if (!docsRes.ok) {
                    toast.dismiss('saveDocs');
                    throw new Error('Los datos del vehículo se guardaron, pero no los documentos. Revisá los archivos y volvé a guardar.');
                } else {
                    toast.success('Documentos subidos', { id: 'saveDocs' });
                    docsUpdated = true;
                }
            }


            // Save main vehicle data which will also trigger a refetch in the parent
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('vehicle-updated', {detail:{carId:vehicleId}}));
            }

            if (docsUpdated) {
                toast.success('Vehículo y documentos actualizados', { id: 'saveVehicle' });
            } else {
                toast.success('Vehículo actualizado', { id: 'saveVehicle' });
            }

            onClose();
        } catch (error) {
            toast.dismiss('deleteDocs'); toast.dismiss('saveDocs');
            if (savingSession !== editSession.current || savingToken !== localStorage.getItem('token')) return;
            const errors = error.errors || {_form: error.message || 'Error al guardar'};
            setFieldErrors(errors);
            revealVehicleField(Object.keys(errors)[0], 'vehicle-edit');
            toast.dismiss('deleteDocs'); toast.dismiss('saveDocs');
            toast.error(error.message || 'Error al guardar');
        } finally {
            if (savingSession === editSession.current) setIsSaving(false);
        }
    };

    const isVisibleWarning = !formData.visibleEnWeb;

    const ownCostContents = <div className="space-y-4">{hasPurchasePriceChanged && (
                                <div className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-amber-300">Justificación obligatoria por cambio de costo</span>
                                        <span className="text-crm-fg-muted">
                                            Anterior: {formData.purchaseCurrency} {initialPurchasePrice.toLocaleString('es-AR')} → Nuevo: {formData.purchaseCurrency} {currentPurchasePrice.toLocaleString('es-AR')}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label htmlFor="vehicle-edit-purchasePriceChangeType" className="text-[11px] font-semibold uppercase tracking-wider text-crm-fg-muted">Tipo de modificación *</label>
                                        <select id="vehicle-edit-purchasePriceChangeType"
                                            name="purchasePriceChangeType"
                                            value={formData.purchasePriceChangeType || 'correccion_precio'}
                                            onChange={handleChange}
                                            className="rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-xs text-crm-fg focus:border-crm-red focus:outline-none"
                                        >
                                            <option value="correccion_precio">Corrección del precio de compra / valor de toma acordado</option>
                                            <option value="gasto_adicional">Gasto adicional del vehículo (taller, gestoría, traslado, alistamiento)</option>
                                        </select>
                                        <p className="m-0 text-[11px] text-crm-fg-muted">
                                            {formData.purchasePriceChangeType === 'gasto_adicional'
                                                ? `Se mantendrá el costo base original (${formData.purchaseCurrency} ${initialPurchasePrice.toLocaleString('es-AR')}) y se sumará únicamente la diferencia (${formData.purchaseCurrency} ${Math.max(0, currentPurchasePrice - initialPurchasePrice).toLocaleString('es-AR')}) como gasto del vehículo, sin duplicar costos.`
                                                : 'Se corregirá el valor base de compra/toma sin generar un gasto adicional ni un egreso duplicado.'}
                                        </p>
                                    </div>

                                    {formData.purchasePriceChangeType === 'gasto_adicional' && (
                                        <div className="flex flex-col gap-1.5">
                                            <label htmlFor="vehicle-edit-purchasePriceExpenseConcept" className="text-[11px] font-semibold uppercase tracking-wider text-crm-fg-muted">Concepto del gasto adicional</label>
                                            <input id="vehicle-edit-purchasePriceExpenseConcept"
                                                type="text"
                                                name="purchasePriceExpenseConcept"
                                                value={formData.purchasePriceExpenseConcept || ''}
                                                onChange={handleChange}
                                                placeholder="Ej: Reparación tren delantero / Gestoría / Chapista"
                                                className="rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-xs text-crm-fg focus:border-crm-red focus:outline-none"
                                            />
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-1.5">
                                        <label htmlFor="vehicle-edit-purchasePriceJustification" className="text-[11px] font-semibold uppercase tracking-wider text-crm-fg-muted">Motivo / Justificación para el Historial Interno *</label>
                                        <input id="vehicle-edit-purchasePriceJustification"
                                            type="text"
                                            required
                                            name="purchasePriceJustification"
                                            value={formData.purchasePriceJustification || ''}
                                            onChange={handleChange}
                                            placeholder="Explicá por qué se modifica el valor de compra/toma..."
                                            className="rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-xs text-crm-fg focus:border-crm-red focus:outline-none"
                                        />
                                    </div>
                                </div>
                            )}<div className="flex flex-col gap-3 p-4 bg-crm-surface-raised border border-crm-border rounded-lg">
                                <label className="flex items-center gap-3 cursor-pointer group w-fit">
                                    <input id="vehicle-edit-isSharedInvestment" type="checkbox" name="isSharedInvestment" checked={formData.isSharedInvestment} onChange={handleChange} className="w-5 h-5 rounded border-blue-500 text-blue-500 focus:ring-blue-500 bg-crm-bg cursor-pointer" />
                                    <div className="flex flex-col">
                                        <span className="text-crm-fg font-medium group-hover:text-blue-400 transition-colors text-sm">Vehículo con inversión compartida</span>
                                        <span className="text-[10px] text-crm-fg-muted">El auto fue comprado a medias con un inversionista.</span>
                                    </div>
                                </label>

                                {formData.isSharedInvestment && (
                                    <div className="grid grid-cols-2 gap-4 mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                        <div className="flex flex-col gap-1.5">
                                            <label htmlFor="vehicle-edit-investorName" className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Nombre del Inversor *</label>
                                            <input id="vehicle-edit-investorName" list="edit-companies-datalist" type="text" name="investorName" value={formData.investorName || ''} onChange={handleChange} required={formData.isSharedInvestment} placeholder="Seleccionar empresa o nombre..." className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                            <datalist id="edit-companies-datalist">
                                                <option value="LHIVER" />
                                                <option value="AUTOTERRA" />
                                                <option value="AKAR" />
                                                <option value="ALWAYS SAS" />
                                            </datalist>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label htmlFor="vehicle-edit-investorPercentage" className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Porcentaje (%) *</label>
                                            <input id="vehicle-edit-investorPercentage" type="number" name="investorPercentage" value={formData.investorPercentage || ''} onChange={handleChange} required={formData.isSharedInvestment} min="1" max="100" className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                        </div>
                                    </div>
                                )}
                            </div><VehicleFormSection title="Referencia InfoAuto">
                                <div className="flex items-center justify-between border-b border-blue-500/20 pb-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/20 text-blue-400 font-bold text-xs">
                                            ℹ️
                                        </span>
                                        <div>
                                            <span className="text-xs font-bold text-crm-fg uppercase tracking-wider block">
                                                Referencia Oficial InfoAuto
                                            </span>
                                            <span className="text-[10px] text-crm-fg-muted">
                                                {formData.infoAutoEdicion ? `Guía ${formData.infoAutoEdicion}` : 'Guía de precios oficial CCA / InfoAuto'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {Number(formData.infoAutoValor) > 0 ? (
                                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                                Vinculado
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-medium text-crm-fg-muted bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                                                Sin cotización
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleLookupInfoAuto}
                                            disabled={isSearchingInfoAuto}
                                            className="text-[11px] font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                            title="Consultar cotización actualizada en InfoAuto"
                                        >
                                            {isSearchingInfoAuto ? (
                                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400"></div>
                                            ) : (
                                                <RefreshCw size={12} />
                                            )}
                                            <span>Consultar</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {/* 1. Valor de Lista y Moneda (ancho completo sin apretar) */}
                                    <div className="grid grid-cols-[1fr_90px] gap-2.5">
                                        <div className="flex flex-col gap-1">
                                            <label htmlFor="vehicle-edit-infoAutoValor" className="text-[11px] font-bold text-crm-fg uppercase tracking-wider">
                                                Valor de Lista Oficial InfoAuto
                                            </label>
                                            <input id="vehicle-edit-infoAutoValor"
                                                type="text"
                                                inputMode="decimal"
                                                name="infoAutoValor"
                                                value={formData.infoAutoValor || ''}
                                                onChange={handleChange}
                                                placeholder="Ej: 18.500.000"
                                                className="bg-crm-bg border border-crm-border text-crm-fg font-bold rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-mono"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label htmlFor="vehicle-edit-infoAutoCurrency" className="text-[11px] font-bold text-crm-fg-muted uppercase tracking-wider">
                                                Moneda
                                            </label>
                                            <select id="vehicle-edit-infoAutoCurrency"
                                                name="infoAutoCurrency"
                                                value={formData.infoAutoCurrency || 'ARS'}
                                                onChange={handleChange}
                                                className="bg-crm-bg border border-crm-border text-crm-fg font-medium rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                                            >
                                                <option value="ARS">ARS</option>
                                                <option value="USD">USD</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* 2. Código CODIA (Opcional) y Edición */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        <div className="flex flex-col gap-1">
                                            <label htmlFor="vehicle-edit-infoAutoCodia" className="text-[11px] font-medium text-crm-fg-muted uppercase tracking-wider flex items-center justify-between">
                                                <span>Código CODIA</span>
                                                <span className="text-[10px] text-blue-400 font-normal lowercase">(opcional)</span>
                                            </label>
                                            <input id="vehicle-edit-infoAutoCodia"
                                                type="text"
                                                name="infoAutoCodia"
                                                value={formData.infoAutoCodia || ''}
                                                onChange={handleChange}
                                                placeholder="Ej: 10423 (o dejar vacío)"
                                                className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 font-mono"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label htmlFor="vehicle-edit-infoAutoEdicion" className="text-[11px] font-medium text-crm-fg-muted uppercase tracking-wider">
                                                Edición Guía
                                            </label>
                                            <input id="vehicle-edit-infoAutoEdicion"
                                                type="text"
                                                name="infoAutoEdicion"
                                                value={formData.infoAutoEdicion || ''}
                                                onChange={handleChange}
                                                placeholder="Ej: Octubre 2026"
                                                className="bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    {/* 3. Checkbox auto-sincronización */}
                                    <div className="pt-1 border-t border-blue-500/20">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input id="vehicle-edit-infoAutoAutoSync"
                                                type="checkbox"
                                                name="infoAutoAutoSync"
                                                checked={formData.infoAutoAutoSync ?? true}
                                                onChange={handleChange}
                                                className="w-3.5 h-3.5 rounded border-blue-500 text-blue-500 bg-crm-bg cursor-pointer"
                                            />
                                            <span className="text-[11px] text-crm-fg-muted hover:text-crm-fg transition-colors">
                                                Actualizar cotización automáticamente con la guía mensual
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* Comparativa inteligente con Costo y Precio */}
                                {Number(formData.infoAutoValor) > 0 && (
                                    <div className="mt-1 pt-2 border-t border-blue-500/20 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                        <div className="p-2 rounded bg-crm-bg/60 border border-crm-border flex flex-col justify-between">
                                            <span className="text-[10px] text-crm-fg-muted uppercase font-semibold">Vs. Costo de Compra</span>
                                            {currentPurchasePrice > 0 && normalizeCurrency(formData.purchaseCurrency) === normalizeCurrency(formData.infoAutoCurrency) ? (
                                                <div className="flex items-baseline justify-between mt-1">
                                                    <span className="font-mono font-bold text-crm-fg">
                                                        {formData.purchaseCurrency} {currentPurchasePrice.toLocaleString('es-AR')}
                                                    </span>
                                                    {(() => {
                                                        const diff = currentPurchasePrice - Number(formData.infoAutoValor);
                                                        const pct = ((diff / Number(formData.infoAutoValor)) * 100).toFixed(1);
                                                        return (
                                                            <span className={`font-bold ${diff <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                                {diff <= 0 ? `-${Math.abs(pct)}% (Ahorro)` : `+${pct}% (Sobre lista)`}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-crm-fg-muted mt-1">Sin costo comparable en esta moneda</span>
                                            )}
                                        </div>

                                        <div className="p-2 rounded bg-crm-bg/60 border border-crm-border flex flex-col justify-between">
                                            <span className="text-[10px] text-crm-fg-muted uppercase font-semibold">Vs. Precio Publicado</span>
                                            {parseArgentineMoney(formData.price) > 0 && normalizeCurrency(formData.currency) === normalizeCurrency(formData.infoAutoCurrency) ? (
                                                <div className="flex items-baseline justify-between mt-1">
                                                    <span className="font-mono font-bold text-crm-fg">
                                                        {formData.currency} {parseArgentineMoney(formData.price).toLocaleString('es-AR')}
                                                    </span>
                                                    {(() => {
                                                        const p = parseArgentineMoney(formData.price);
                                                        const diff = p - Number(formData.infoAutoValor);
                                                        const pct = ((diff / Number(formData.infoAutoValor)) * 100).toFixed(1);
                                                        return (
                                                            <span className={`font-bold ${diff >= 0 ? 'text-emerald-400' : 'text-blue-400'}`}>
                                                                {diff >= 0 ? `+${pct}% (Sobre lista)` : `-${Math.abs(pct)}% (Competitivo)`}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-crm-fg-muted mt-1">Sin precio comparable en esta moneda</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </VehicleFormSection></div>;
    const movePhoto = (from,to) => {
        markDirty();
        const arranged=reorderVehicleEditorPhotos(files,formData.imagePositions,formData.imagePosition,from,to);
        setFiles(arranged.files);setFormData(previous=>({...previous,imagePositions:arranged.imagePositions,imagePosition:arranged.imagePosition}));
    };
    const photoContents = <div className="space-y-3">
                            <div className="flex items-center justify-between mb-4 border-b border-crm-border pb-2 mt-6">
                                <span className="text-xs font-semibold text-crm-fg">Fotos del vehículo</span>
                                <button type="button" onClick={()=>document.getElementById('vehicle-edit-images')?.click()} className="rounded-lg border border-crm-border px-3 py-2 text-xs font-semibold text-crm-fg">Agregar fotos</button>
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
                                    id="vehicle-edit-images" aria-label="Agregar fotos del vehículo" hidden
                                    onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
                                />

                                {files.length === 0 ? (
                                    <div className="text-center pointer-events-none z-10">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors ${isDragging ? 'bg-red-500 text-crm-fg' : 'bg-crm-surface-raised text-crm-fg-muted'}`}>
                                            <Upload size={18} />
                                        </div>
                                        <p className="text-gray-300 text-xs font-medium">Arrastra imágenes aquí</p>
                                        <p className="text-crm-fg-muted text-xs mt-1">o usá Agregar fotos</p>
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
                                                <img src={file.preview} alt={'Foto '+(i+1)+' del vehículo'} className="w-full h-full object-cover" />
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
                                                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-crm-fg p-1 rounded-full z-30 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                                                >
                                                    <X size={10} />
                                                </button>
                                                <div className="absolute bottom-1 right-1 z-30 flex gap-1">
                                                    <button type="button" aria-label={'Mover foto '+(i+1)+' a la izquierda'} disabled={i === 0} onClick={event=>{event.stopPropagation();movePhoto(i,i-1);}} className="rounded border border-white/20 bg-black/80 px-1.5 py-0.5 text-xs text-white disabled:opacity-30">←</button>
                                                    <button type="button" aria-label={'Mover foto '+(i+1)+' a la derecha'} disabled={i === files.length-1} onClick={event=>{event.stopPropagation();movePhoto(i,i+1);}} className="rounded border border-white/20 bg-black/80 px-1.5 py-0.5 text-xs text-white disabled:opacity-30">→</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>;
    const documentContents = <div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {docFieldsConfig.map(field => {
                                    const existingUrl = vehicleData?._original?.documentationFiles?.[field.key] || vehicleData?.documentationFiles?.[field.key];
                                    const hasNewFile = docFiles[field.key] instanceof File;

                                    return (
                                        <div key={field.key} className="flex flex-col gap-2 p-3 bg-crm-bg border border-crm-border rounded-lg">
                                            <span className="text-xs font-medium text-crm-fg">{field.label}</span>
                                            {deletedDocs.includes(field.key) && <button type="button" onClick={() => setDeletedDocs(previous => previous.filter(key => key !== field.key))} className="text-left text-xs text-amber-400 underline">Se quitará al guardar · Deshacer</button>}
                                            <label htmlFor={'vehicle-edit-doc-state-' + field.key} className="text-xs text-crm-fg-muted">Estado de {field.label}</label>
                                            <select id={'vehicle-edit-doc-state-' + field.key} value={formData.documentation?.[field.key] || 'pendiente'} onChange={event => setFormData(previous => ({...previous, documentation:{...previous.documentation,[field.key]:event.target.value}}))} className="rounded-lg border border-crm-border bg-crm-bg px-2 py-2 text-xs text-crm-fg"><option value="pendiente">Pendiente</option><option value="recibido">Recibido</option><option value="no aplica">No aplica</option></select>
                                            <div className="flex items-center gap-2">
                                                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-crm-surface-raised hover:bg-crm-surface-raised-hover cursor-pointer border border-crm-border border-dashed rounded text-xs text-crm-fg-muted transition-colors text-center">
                                                    <Upload size={14} />
                                                    <span className="truncate">{hasNewFile ? docFiles[field.key].name : 'Subir archivo'}</span>
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        aria-label={'Adjuntar ' + field.label} accept="image/png, image/jpeg, image/webp, application/pdf"
                                                        onChange={(e) => handleDocChange(e, field.key)}
                                                    />
                                                </label>
                                                {existingUrl && !hasNewFile && !deletedDocs.includes(field.key) && (
                                                    <div className="flex items-center gap-1">
                                                        <a href={existingUrl} target="_blank" rel="noreferrer" className="p-2 bg-crm-surface-raised hover:bg-crm-surface-raised-hover border border-crm-border rounded text-crm-fg-muted hover:text-crm-fg transition-colors" title="Ver archivo actual">
                                                            <Eye size={16} />
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => {markDirty(); setDeletedDocs(prev => [...prev, field.key]);}}
                                                            className="p-2 bg-crm-surface-raised hover:bg-crm-surface-raised-hover border border-crm-border rounded text-crm-fg-muted hover:text-crm-red transition-colors cursor-pointer"
                                                            title="Eliminar archivo"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>;
    const footer = <>{closeNotice}<div className="flex flex-wrap items-center justify-end gap-2"><span className="mr-auto text-xs text-crm-fg-muted">{dirty ? 'Cambios sin guardar' : 'Sin cambios'}</span><Link href="/admin/ayuda?tema=stock" target="_blank" rel="noreferrer" className="mr-auto text-xs text-crm-fg-muted underline">Ayuda de Stock</Link><button type="button" onClick={requestClose} disabled={isSaving} className="rounded-lg border border-crm-border px-3 py-2 text-xs text-crm-fg disabled:opacity-40">Cancelar</button><button type="submit" form="vehicleEditForm" disabled={isSaving || isProcessingImages} className="flex items-center gap-2 rounded-lg bg-crm-red px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"><Save size={14}/>{isProcessingImages ? 'Procesando fotos…' : isSaving ? 'Guardando…' : 'Guardar'}</button></div></>;
    return <VehicleEditorDialog isOpen={isOpen} onClose={requestClose} title={'Editar — '+[formData.brand,formData.name,formData.year].filter(Boolean).join(' ')} subtitle="Fotos y datos complementarios se abren por sección." busy={isSaving} suspendKeyboard={showFramingModal} footer={footer}>
        <form id="vehicleEditForm" onSubmit={handleSubmit} onChangeCapture={markDirty}>
            <fieldset disabled={isSaving} className="min-w-0">
<div className="p-4 sm:p-5 space-y-4"><VehicleFormErrors errors={fieldErrors} prefix="vehicle-edit"/><VehicleReferenceFields data={formData} onChange={handleChange} prefix="vehicle-edit" isEditing lockedStatus={['Reservado','Vendido'].includes(vehicleData?._original?.status)} costs={ownCostContents} documents={documentContents} photos={photoContents}/></div>
</fieldset>
        </form>
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
    </VehicleEditorDialog>;
}
