"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, X, Save, Image as ImageIcon, Sliders, ArrowLeft, ArrowRight } from 'lucide-react';
import VehicleImageFramingModal from './VehicleImageFramingModal';
import toast from 'react-hot-toast';
import CrmCard from '../ui/CrmCard';

import { compressImage } from '../../../utils/imageCompressor';

const readUploadError = async (res, fallback) => {
    try {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const data = await res.json();
            return data.message || data.error || data.detail || fallback;
        }
        const text = await res.text();
        return text || fallback;
    } catch (error) {
        return fallback;
    }
};

export default function VehicleImagesPanel({ vehicle, onSaveComplete, canEdit = false, onDirtyChange, onBusyChange }) {
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState(() => (vehicle?.fotos || vehicle?.images || []).map((url, index) => ({
        preview: url, isExisting: true, url,
        position: vehicle?._original?.imagePositions?.[index] || vehicle?.imagePositions?.[index] || (index === 0 ? (vehicle?._original?.imagePosition || vehicle?.imagePosition) : null) || '50% 75%'
    })));
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showFramingModal, setShowFramingModal] = useState(false);
    const [framingInitialIndex, setFramingInitialIndex] = useState(0);
    const [isCompressing, setIsCompressing] = useState(false);
    const localPreviewUrls = useRef(new Set());
    const workRef = useRef({ mounted: true, generation: 0, busy: false, controller: null, allowed: canEdit });
    const serverImages = vehicle?.fotos || vehicle?.images || [];
    const hasChanges = files.length !== serverImages.length || files.some((file, index) => {
        const serverPosition = vehicle?._original?.imagePositions?.[index] || vehicle?.imagePositions?.[index] || (index === 0 ? (vehicle?._original?.imagePosition || vehicle?.imagePosition) : null) || '50% 75%';
        return !file.isExisting || file.url !== serverImages[index] || file.position !== serverPosition;
    });
    const isBusy = isSaving || isCompressing;
    useEffect(() => { onDirtyChange?.(hasChanges || isBusy); }, [hasChanges, isBusy, onDirtyChange]);
    useEffect(() => { onBusyChange?.(isBusy); return () => onBusyChange?.(false); }, [isBusy, onBusyChange]);
    const framingVehicle = useMemo(() => ({
        // No id: the framing dialog stages changes until Guardar imágenes.
        brand: vehicle?.marca || vehicle?._original?.brand,
        name: vehicle?.modelo || vehicle?._original?.name,
        imagePositions: files.map(file => file.position || '50% 75%'),
        imagePosition: files[0]?.position || '50% 75%'
    }), [files, vehicle?.marca, vehicle?.modelo, vehicle?._original?.brand, vehicle?._original?.name]);
    const isCurrentJob = generation => workRef.current.mounted && workRef.current.allowed && workRef.current.generation === generation;

    useEffect(() => {
        workRef.current.mounted = true;
        return () => {
            workRef.current.mounted = false;
            workRef.current.generation += 1;
            workRef.current.controller?.abort();
            toast.dismiss('compressing');
            toast.dismiss('saveImages');
        };
    }, []);
    useEffect(() => {
        workRef.current.allowed = canEdit;
        if (!canEdit) {
            workRef.current.generation += 1;
            workRef.current.controller?.abort();
            workRef.current.busy = false;
            toast.dismiss('compressing');
            toast.dismiss('saveImages');
            setIsSaving(false);
            setIsCompressing(false);
            setShowFramingModal(false);
        }
    }, [canEdit]);

    useEffect(() => {
        files.forEach(file => { if (file.preview?.startsWith('blob:')) localPreviewUrls.current.add(file.preview); });
    }, [files]);
    useEffect(() => {
        const urls = localPreviewUrls.current;
        return () => urls.forEach(url => URL.revokeObjectURL(url));
    }, []);
    useEffect(() => {
        if (!canEdit || !hasChanges) return;
        const warnBeforeUnload = event => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warnBeforeUnload);
        return () => window.removeEventListener('beforeunload', warnBeforeUnload);
    }, [canEdit, hasChanges]);

    const handleDragStart = (index) => { if (!isBusy && canEdit) setDraggedIndex(index); };
    const movePhoto = (index, offset) => setFiles(previous => {
        const target = index + offset;
        if (target < 0 || target >= previous.length || isBusy || !canEdit) return previous;
        const updated = [...previous];
        [updated[index], updated[target]] = [updated[target], updated[index]];
        return updated;
    });
    const handleDragOver = (e) => e.preventDefault();
    const handleDropSort = (index) => {
        if (draggedIndex === null || isBusy || !canEdit) return;
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
        if (!canEdit || workRef.current.busy || !workRef.current.mounted) return;
        const rawFilesArray = Array.from(newFilesRaw).filter(file => file.type.startsWith('image/'));
        if (!rawFilesArray.length) return;
        const generation = ++workRef.current.generation;
        workRef.current.busy = true;
        setIsCompressing(true);
        const processedFiles = [];
        toast.loading("Comprimiendo imágenes...", { id: 'compressing' });
        try {
            for (const file of rawFilesArray.slice(0, Math.max(0, 20 - files.length))) {
                try {
                    const compressedFile = await compressImage(file, 1280, 0.72);
                    if (!isCurrentJob(generation)) return;
                    if (compressedFile.size > 900 * 1024) {
                        toast.error(`La imagen ${file.name} sigue pesando más de 900KB comprimida. Intenta con otra.`, { duration: 5000 });
                        continue;
                    }
                    const preview = URL.createObjectURL(compressedFile);
                    localPreviewUrls.current.add(preview);
                    processedFiles.push({ file: compressedFile, preview, isExisting: false, position: '50% 75%' });
                } catch (err) {
                    if (!isCurrentJob(generation)) return;
                    console.error("Error compressing image", err);
                    toast.error(`Error procesando ${file.name}`);
                }
            }
            if (!isCurrentJob(generation)) return;
            if (rawFilesArray.length > 20 - files.length) toast.error('Máximo 20 imágenes en total.');
            setFiles(previous => [...previous, ...processedFiles].slice(0, 20));
        } finally {
            if (workRef.current.generation === generation) {
                toast.dismiss('compressing');
                workRef.current.busy = false;
                if (workRef.current.mounted) setIsCompressing(false);
            }
        }
    };

    const uploadSingleImage = async ({ file, index, total, baseUrl, token, controller, generation }) => {
        const maxAttempts = 3;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            if (!isCurrentJob(generation) || controller.signal.aborted) throw new DOMException('Operación cancelada.', 'AbortError');
            const formDataToSend = new FormData();
            formDataToSend.append('images', file);

            const attemptLabel = attempt > 1 ? ` (reintento ${attempt - 1}/2)` : '';
            toast.loading(`Subiendo imagen ${index + 1} de ${total}${attemptLabel}...`, { id: 'saveImages' });

            try {
                const res = await fetch(`${baseUrl}/api/admin/cars/${vehicle.id || vehicle._id}/images`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formDataToSend,
                    signal: controller.signal
                });

                if (!res.ok) {
                    const errorMsg = await readUploadError(res, 'Error al subir imagen');
                    throw new Error(errorMsg);
                }

                const data = await res.json();
                const uploadedImages = data.uploadedImages || [];
                if (uploadedImages.length !== 1 || !uploadedImages[0]) {
                    throw new Error('Cloudinary no devolvio la URL de la imagen subida. Intenta guardar nuevamente.');
                }

                return uploadedImages[0];
            } catch (error) {
                if (controller.signal.aborted || !isCurrentJob(generation) || error.name === 'AbortError') throw error;
                if (attempt >= maxAttempts) {
                    throw new Error(`No se pudo subir "${file.name}": ${error.message}`);
                }
            }
        }

        throw new Error(`No se pudo subir "${file.name}".`);
    };

    const handleSaveImages = async () => {
        if (!canEdit || workRef.current.busy || !hasChanges || !workRef.current.mounted) return;
        const generation = ++workRef.current.generation;
        const controller = new AbortController();
        workRef.current.controller = controller;
        workRef.current.busy = true;
        try {
            setIsSaving(true);
            const newFiles = files.filter(f => !f.isExisting);

            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!token) throw new Error('Sesión expirada. Iniciá sesión nuevamente.');

            toast.loading('Guardando imagenes...', { id: 'saveImages' });

            let finalFilesState = [...files];

            for (let i = 0; i < newFiles.length; i += 1) {
                const localFile = newFiles[i];
                const uploadedUrl = await uploadSingleImage({
                    file: localFile.file || localFile,
                    index: i,
                    total: newFiles.length,
                    baseUrl,
                    token,
                    controller,
                    generation
                });
                if (!isCurrentJob(generation)) return;

                const fileIndexInState = finalFilesState.indexOf(localFile);
                if (fileIndexInState !== -1) {
                    finalFilesState[fileIndexInState] = {
                        ...finalFilesState[fileIndexInState],
                        url: uploadedUrl,
                        isExisting: true
                    };
                    // Retain completed uploads if a later image or final order fails.
                    setFiles([...finalFilesState]);
                }
            }

            const imageOrder = finalFilesState.map(f => f.url).filter(Boolean);
            if (imageOrder.length !== finalFilesState.length) {
                throw new Error('No se pudo consolidar el orden porque hay imagenes sin URL final.');
            }

            toast.loading('Consolidando orden de imagenes...', { id: 'saveImages' });
            const imagePositions = finalFilesState.map(file => file.position || '50% 75%');
            const resOrder = await fetch(`${baseUrl}/api/admin/cars/${vehicle.id || vehicle._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ imageOrder, imagePositions, imagePosition: imagePositions[0] || '50% 75%' }),
                signal: controller.signal
            });

            if (!resOrder.ok) {
                const errorMsg = await readUploadError(resOrder, 'Error al reordenar imagenes');
                throw new Error(errorMsg);
            }

            if (!isCurrentJob(generation)) return;
            setFiles(finalFilesState);
            toast.success('Imagenes actualizadas exitosamente', { id: 'saveImages' });
            await onSaveComplete?.();
        } catch (error) {
            if (isCurrentJob(generation) && error.name !== 'AbortError') toast.error(error.message, { id: 'saveImages', duration: 7000 });
        } finally {
            if (workRef.current.generation === generation) {
                workRef.current.busy = false;
                workRef.current.controller = null;
                if (workRef.current.mounted) setIsSaving(false);
            }
        }
    };

    if (!canEdit) return <CrmCard><h2 className="mb-4 text-sm font-semibold text-crm-fg">Fotos del vehículo · {serverImages.length}</h2>{serverImages.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{serverImages.map((url, index) => <a key={`${url}:${index}`} href={url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-crm-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red"><img src={url} alt={`Foto ${index + 1} de ${vehicle.marca} ${vehicle.modelo}`} className="aspect-[4/3] w-full object-cover" style={{ objectPosition: vehicle._original?.imagePositions?.[index] || vehicle._original?.imagePosition || '50% 75%' }} /></a>)}</div> : <p className="rounded-lg border border-dashed border-crm-border p-6 text-center text-sm text-crm-fg-muted">Todavía no hay fotos cargadas.</p>}</CrmCard>;

    return (
        <CrmCard>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-crm-fg font-semibold text-sm flex items-center gap-2">
                    <ImageIcon size={18} className="text-crm-fg-muted" />
                    Imágenes del vehículo
                </h2>
                <div className="flex items-center gap-3">
                    {files.length > 0 && (
                        <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                                setFramingInitialIndex(0);
                                setShowFramingModal(true);
                            }}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-crm-surface-raised hover:bg-crm-border text-white transition-colors flex items-center gap-1.5 border border-crm-border hover:border-crm-red"
                            title="Ajustar cómo se encuadra la foto en el catálogo y ficha"
                        >
                            <Sliders size={13} className="text-crm-red" />
                            Ajustar encuadre
                        </button>
                    )}
                    <div className="text-xs text-crm-fg-muted font-medium">{files.length} / 20 fotos</div>
                </div>
            </div>

            <div
                onDragOver={(e) => { e.preventDefault(); if (!isBusy) setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={onDropFiles}
                className={`
                    relative transition-all duration-300
                    border border-dashed rounded-xl flex flex-col justify-center mb-4 p-3
                    ${files.length > 0 ? 'min-h-[120px] border-crm-border bg-crm-bg' : 'h-48 bg-crm-bg items-center'}
                    ${isDragging ? 'border-crm-red bg-crm-red/5' : 'border-crm-border hover:border-crm-red/50'}
                `}
            >
                {files.length === 0 ? (
                    <label className="relative w-full h-full flex flex-col items-center justify-center cursor-pointer py-8">
                        <input
                            type="file" multiple accept="image/png, image/jpeg, image/jpg, image/webp"
                            disabled={isBusy}
                            className="hidden"
                            onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
                        />
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors ${isDragging ? 'bg-crm-red text-white' : 'bg-crm-surface-raised text-crm-fg-muted'}`}>
                            <Upload size={18} />
                        </div>
                        <p className="text-crm-fg-muted text-xs font-medium">Arrastra imágenes aquí</p>
                        <p className="text-crm-fg-muted text-[10px] mt-1">o haz clic para buscar</p>
                    </label>
                ) : (
                    <div className="flex gap-3 overflow-x-auto w-full items-center justify-start custom-scrollbar py-1">
                        {files.map((file, i) => (
                            <div
                                key={i} draggable={!isBusy}
                                onDragStart={() => handleDragStart(i)}
                                onDragOver={handleDragOver}
                                onDrop={(event) => { event.preventDefault(); event.stopPropagation(); handleDropSort(i); }}
                                className={`
                                    flex-shrink-0 relative w-28 h-20 rounded-lg overflow-hidden border shadow-sm group cursor-grab active:cursor-grabbing select-none
                                    ${i === 0 ? 'border-crm-red ring-1 ring-crm-red/50' : 'border-crm-border'}
                                `}
                            >
                                <img src={file.preview} alt={`Foto ${i + 1}`} className="w-full h-full object-cover pointer-events-none" style={{ objectPosition: file.position || '50% 75%' }} />
                                {i === 0 && (
                                    <div className="absolute top-0 left-0 w-full bg-crm-red/90 text-white text-[8px] font-bold text-center py-0.5 tracking-wider uppercase z-10 pointer-events-none">
                                        Principal
                                    </div>
                                )}
                                <button
                                    type="button"
                                    disabled={isBusy}
                                    title={`Ajustar encuadre de foto #${i + 1}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFramingInitialIndex(i);
                                        setShowFramingModal(true);
                                    }}
                                    className="absolute bottom-1 left-1 bg-black/80 hover:bg-crm-red text-white p-1 rounded z-20 shadow transition-colors flex items-center justify-center cursor-pointer border border-white/20"
                                >
                                    <Sliders size={11} />
                                </button>
                                <div className="absolute bottom-1 right-1 z-20 flex gap-1">
                                    <button type="button" aria-label={`Mover foto ${i + 1} hacia el inicio`} disabled={i === 0 || isBusy} onClick={() => movePhoto(i, -1)} className="rounded border border-white/20 bg-black/80 p-1 text-white disabled:opacity-30"><ArrowLeft size={11} /></button>
                                    <button type="button" aria-label={`Mover foto ${i + 1} hacia el final`} disabled={i === files.length - 1 || isBusy} onClick={() => movePhoto(i, 1)} className="rounded border border-white/20 bg-black/80 p-1 text-white disabled:opacity-30"><ArrowRight size={11} /></button>
                                </div>
                                <button
                                    type="button"
                                    title="Eliminar imagen"
                                    disabled={isBusy}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        if (!isBusy) setFiles(prev => prev.filter((_, idx) => idx !== i));
                                    }}
                                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full z-30 shadow-md transition-all opacity-90 group-hover:opacity-100 hover:scale-110 flex items-center justify-center cursor-pointer"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}

                        {files.length < 20 && (
                            <label className="flex-shrink-0 w-28 h-20 rounded-lg border-2 border-dashed border-crm-border hover:border-crm-red flex flex-col items-center justify-center cursor-pointer transition-colors bg-crm-surface-raised/30 hover:bg-crm-surface-raised/60 group">
                                <input
                                    type="file" multiple accept="image/png, image/jpeg, image/jpg, image/webp"
                                    disabled={isBusy}
                                    className="hidden"
                                    onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
                                />
                                <Upload size={16} className="text-crm-fg-muted group-hover:text-crm-red transition-colors mb-1" />
                                <span className="text-[10px] text-crm-fg-muted group-hover:text-white font-medium">Agregar foto</span>
                            </label>
                        )}
                    </div>
                )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
                {isCompressing && <span role="status" className="text-xs text-crm-fg-muted">Preparando imágenes…</span>}
                {hasChanges && <span role="status" className="text-xs text-amber-500">Fotos con cambios sin guardar</span>}
                <button
                    onClick={handleSaveImages}
                    disabled={isBusy || showFramingModal || !hasChanges}
                    className="bg-crm-red hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {isSaving ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div> : <Save size={14} />}
                    {isSaving ? 'Guardando…' : 'Guardar imágenes'}
                </button>
            </div>

            <VehicleImageFramingModal
                isOpen={showFramingModal && canEdit && !isBusy}
                onClose={() => setShowFramingModal(false)}
                vehicle={framingVehicle}
                images={files}
                initialIndex={framingInitialIndex}
                currentPosition={framingVehicle.imagePosition}
                onPositionsSaved={(newPositions) => {
                    if (!workRef.current.mounted || !workRef.current.allowed || workRef.current.busy) return;
                    setFiles(previous => previous.map((file, index) => ({ ...file, position: newPositions[index] || file.position || '50% 75%' })));
                }}
                onCropComplete={(croppedFile, cropIndex) => {
                    if (!workRef.current.mounted || !workRef.current.allowed || workRef.current.busy) {
                        if (croppedFile.preview?.startsWith('blob:')) URL.revokeObjectURL(croppedFile.preview);
                        return;
                    }
                    if (croppedFile.preview?.startsWith('blob:')) localPreviewUrls.current.add(croppedFile.preview);
                    setFiles(prev => {
                        if (!prev[cropIndex]) return prev;
                        const updated = [...prev];
                        updated[cropIndex] = { file: croppedFile, preview: croppedFile.preview, isExisting: false, position: '50% 50%' };
                        return updated;
                    });
                    toast.success(`Foto #${cropIndex + 1} reemplazada con el recorte 4:3`);
                }}
            />
        </CrmCard>
    );
}
