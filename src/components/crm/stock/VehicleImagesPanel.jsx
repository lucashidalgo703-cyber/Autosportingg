"use client";
import React, { useState } from 'react';
import { Upload, X, Save, Image as ImageIcon, Sliders } from 'lucide-react';
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

export default function VehicleImagesPanel({ vehicle, onSaveComplete }) {
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState(
        (vehicle?.fotos || vehicle?.images || []).map(url => ({ preview: url, isExisting: true, url }))
    );
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showFramingModal, setShowFramingModal] = useState(false);
    const [currentImagePosition, setCurrentImagePosition] = useState(vehicle?.imagePosition || '50% 75%');

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
        const rawFilesArray = Array.from(newFilesRaw);
        const processedFiles = [];

        toast.loading("Comprimiendo imágenes...", { id: 'compressing' });

        for (const file of rawFilesArray) {
            try {
                const compressedFile = await compressImage(file, 1280, 0.72);
                if (compressedFile.size > 900 * 1024) {
                    toast.error(`La imagen ${file.name} sigue pesando más de 900KB comprimida. Intenta con otra.`, { duration: 5000 });
                    continue;
                }
                compressedFile.preview = URL.createObjectURL(compressedFile);
                processedFiles.push(compressedFile);
            } catch (err) {
                console.error("Error compressing image", err);
                toast.error(`Error procesando ${file.name}`);
            }
        }

        toast.dismiss('compressing');

        setFiles(prev => {
            const combined = [...prev, ...processedFiles];
            if (combined.length > 20) {
                toast.error("Máximo 20 imágenes en total.");
                return combined.slice(0, 20);
            }
            return combined;
        });
    };

    const uploadSingleImage = async ({ file, index, total, baseUrl, token }) => {
        const maxAttempts = 3;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            const formDataToSend = new FormData();
            formDataToSend.append('images', file);

            const attemptLabel = attempt > 1 ? ` (reintento ${attempt - 1}/2)` : '';
            toast.loading(`Subiendo imagen ${index + 1} de ${total}${attemptLabel}...`, { id: 'saveImages' });

            try {
                const res = await fetch(`${baseUrl}/api/admin/cars/${vehicle.id || vehicle._id}/images`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formDataToSend
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
                if (attempt >= maxAttempts) {
                    throw new Error(`No se pudo subir "${file.name}": ${error.message}`);
                }
            }
        }

        throw new Error(`No se pudo subir "${file.name}".`);
    };

    const handleSaveImages = async () => {
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
                    file: localFile,
                    index: i,
                    total: newFiles.length,
                    baseUrl,
                    token
                });

                const fileIndexInState = finalFilesState.indexOf(localFile);
                if (fileIndexInState !== -1) {
                    finalFilesState[fileIndexInState] = {
                        ...finalFilesState[fileIndexInState],
                        url: uploadedUrl,
                        isExisting: true
                    };
                }
            }

            const imageOrder = finalFilesState.map(f => f.url).filter(Boolean);
            if (imageOrder.length !== finalFilesState.length) {
                throw new Error('No se pudo consolidar el orden porque hay imagenes sin URL final.');
            }

            toast.loading('Consolidando orden de imagenes...', { id: 'saveImages' });
            const orderFormData = new FormData();
            orderFormData.append('imageOrder', JSON.stringify(imageOrder));

            const resOrder = await fetch(`${baseUrl}/api/admin/cars/${vehicle.id || vehicle._id}/images`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: orderFormData
            });

            if (!resOrder.ok) {
                const errorMsg = await readUploadError(resOrder, 'Error al reordenar imagenes');
                throw new Error(errorMsg);
            }

            setFiles(finalFilesState);
            toast.success('Imagenes actualizadas exitosamente', { id: 'saveImages' });
            if (onSaveComplete) onSaveComplete();
        } catch (error) {
            toast.error(error.message, { id: 'saveImages', duration: 7000 });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <CrmCard>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                    <ImageIcon size={18} className="text-crm-fg-muted" />
                    Imágenes del vehículo
                </h3>
                <div className="flex items-center gap-3">
                    {files.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowFramingModal(true)}
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
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
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
                                key={i} draggable
                                onDragStart={() => handleDragStart(i)}
                                onDragOver={handleDragOver}
                                onDrop={() => handleDropSort(i)}
                                className={`
                                    flex-shrink-0 relative w-28 h-20 rounded-lg overflow-hidden border shadow-sm group cursor-grab active:cursor-grabbing select-none
                                    ${i === 0 ? 'border-crm-red ring-1 ring-crm-red/50' : 'border-crm-border'}
                                `}
                            >
                                <img src={file.preview} alt={`Foto ${i + 1}`} className="w-full h-full object-cover pointer-events-none" />
                                {i === 0 && (
                                    <>
                                        <div className="absolute top-0 left-0 w-full bg-crm-red/90 text-white text-[8px] font-bold text-center py-0.5 tracking-wider uppercase z-10 pointer-events-none">
                                            Principal
                                        </div>
                                        <button
                                            type="button"
                                            title="Ajustar encuadre de portada"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowFramingModal(true);
                                            }}
                                            className="absolute bottom-1 left-1 bg-black/80 hover:bg-crm-red text-white p-1 rounded z-20 shadow transition-colors flex items-center justify-center cursor-pointer border border-white/20"
                                        >
                                            <Sliders size={11} />
                                        </button>
                                    </>
                                )}
                                <button
                                    type="button"
                                    title="Eliminar imagen"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setFiles(prev => prev.filter((_, idx) => idx !== i));
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

            <div className="flex justify-end">
                <button
                    onClick={handleSaveImages}
                    disabled={isSaving}
                    className="bg-crm-red hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {isSaving ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div> : <Save size={14} />}
                    Guardar Imágenes
                </button>
            </div>

            <VehicleImageFramingModal
                isOpen={showFramingModal}
                onClose={() => setShowFramingModal(false)}
                vehicle={vehicle}
                imageUrl={files[0]?.preview || files[0]?.url}
                currentPosition={currentImagePosition}
                onPositionSaved={(newPos) => {
                    setCurrentImagePosition(newPos);
                    if (onSaveComplete) onSaveComplete();
                }}
                onCropComplete={(croppedFile) => {
                    setFiles(prev => {
                        const updated = [...prev];
                        updated[0] = croppedFile;
                        return updated;
                    });
                    toast.success('Foto principal reemplazada con el recorte 4:3');
                }}
            />
        </CrmCard>
    );
}
