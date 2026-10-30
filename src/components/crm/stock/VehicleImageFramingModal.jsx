"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Sliders, Check, MoveVertical, Crop, Eye, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VehicleImageFramingModal({
    isOpen,
    onClose,
    vehicle,
    images = [],
    imageUrl,
    initialIndex = 0,
    currentPosition = '50% 75%',
    onPositionSaved,
    onPositionsSaved,
    onCropComplete
}) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [positions, setPositions] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isCropping, setIsCropping] = useState(false);
    const imgRef = useRef(null);

    // Normalizar lista de imágenes (strings, objetos de Cloudinary o Files locales)
    const imageList = useMemo(() => {
        const raw = Array.isArray(images) && images.length > 0
            ? images
            : (imageUrl ? [imageUrl] : (vehicle?.images || []));

        return raw.map(item => {
            if (!item) return '';
            if (typeof item === 'string') return item;
            return item.preview || item.url || '';
        }).filter(Boolean);
    }, [images, imageUrl, vehicle]);

    // Extraer número vertical de "50% 75%" -> 75
    const parseY = (pos) => {
        if (!pos || typeof pos !== 'string') return 75;
        const parts = pos.trim().split(/\s+/);
        if (parts.length >= 2) {
            const num = parseInt(parts[1].replace('%', ''));
            return isNaN(num) ? 75 : num;
        }
        if (pos.toLowerCase() === 'center') return 50;
        if (pos.toLowerCase() === 'top') return 20;
        if (pos.toLowerCase() === 'bottom') return 80;
        return 75;
    };

    // Al abrir el modal, inicializar índice y posiciones para todas las imágenes
    useEffect(() => {
        if (isOpen) {
            const total = Math.max(imageList.length, 1);
            const safeIdx = Math.max(0, Math.min(initialIndex || 0, total - 1));
            setCurrentIndex(safeIdx);

            const initialPositions = Array(total).fill('').map((_, idx) => {
                if (Array.isArray(vehicle?.imagePositions) && vehicle.imagePositions[idx]) {
                    return vehicle.imagePositions[idx];
                }
                if (idx === 0 && (vehicle?.imagePosition || currentPosition)) {
                    return vehicle?.imagePosition || currentPosition;
                }
                return '50% 75%';
            });
            setPositions(initialPositions);
        }
    }, [isOpen, initialIndex, imageList.length, vehicle, currentPosition]);

    // Navegación con teclado (Flecha Izq / Flecha Der)
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrev();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNext();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, imageList.length]);

    if (!isOpen) return null;

    const currentImgUrl = imageList[currentIndex] || '';
    const currentPos = positions[currentIndex] || (currentIndex === 0 ? (vehicle?.imagePosition || currentPosition) : '50% 75%');
    const currentY = parseY(currentPos);

    const updateCurrentPosY = (newY) => {
        const formatted = `50% ${newY}%`;
        setPositions(prev => {
            const next = [...prev];
            next[currentIndex] = formatted;
            return next;
        });
    };

    const handlePrev = () => {
        if (imageList.length <= 1) return;
        setCurrentIndex(prev => (prev - 1 + imageList.length) % imageList.length);
    };

    const handleNext = () => {
        if (imageList.length <= 1) return;
        setCurrentIndex(prev => (prev + 1) % imageList.length);
    };

    const quickPresets = [
        { label: 'Techo / Superior', val: 35, desc: 'Para autos con techo cortado o tomas cenitales' },
        { label: 'Centro', val: 50, desc: 'Enfoque simétrico medio (ideal para interiores y volantes)' },
        { label: 'Equilibrado', val: 65, desc: 'Punto medio óptimo para autos tomados de cerca' },
        { label: 'Ruedas / Inferior', val: 75, desc: 'Recomendado para fotos del playón con galpón arriba' },
    ];

    const handleSaveAll = async () => {
        const carId = vehicle?.id || vehicle?._id;
        const total = Math.max(imageList.length, 1);
        const finalPositions = Array(total).fill('').map((_, idx) => (
            positions[idx] || (idx === 0 ? (vehicle?.imagePosition || currentPosition) : '50% 75%')
        ));
        const finalCoverPosition = finalPositions[0] || '50% 75%';

        if (!carId) {
            // Auto nuevo en creación
            if (onPositionsSaved) onPositionsSaved(finalPositions, finalCoverPosition);
            if (onPositionSaved) onPositionSaved(finalCoverPosition);
            toast.success(`Encuadre guardado para ${finalPositions.length} fotos`);
            onClose();
            return;
        }

        try {
            setIsSaving(true);
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

            const res = await fetch(`${baseUrl}/api/admin/cars/${carId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    imagePositions: finalPositions,
                    imagePosition: finalCoverPosition
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Error al guardar los encuadres');
            }

            toast.success(`Encuadre de ${finalPositions.length} foto(s) guardado exitosamente`);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('vehicle-updated', {
                    detail: {
                        carId,
                        imagePositions: finalPositions,
                        imagePosition: finalCoverPosition
                    }
                }));
            }
            if (onPositionsSaved) onPositionsSaved(finalPositions, finalCoverPosition);
            if (onPositionSaved) onPositionSaved(finalCoverPosition);
            onClose();
        } catch (error) {
            console.error('Error saving image positions:', error);
            toast.error(error.message || 'No se pudo guardar el encuadre');
        } finally {
            setIsSaving(false);
        }
    };

    // Función para recortar físicamente la imagen activa a 4:3
    const handleCropToCanvas = async () => {
        if (!currentImgUrl) return;
        setIsCropping(true);
        toast.loading(`Generando recorte 4:3 para foto #${currentIndex + 1}...`, { id: 'cropper' });

        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = currentImgUrl;

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('No se pudo cargar la imagen para recorte (CORS)'));
            });

            const naturalWidth = img.naturalWidth;
            const naturalHeight = img.naturalHeight;
            const targetRatio = 4 / 3;

            let sourceWidth = naturalWidth;
            let sourceHeight = naturalWidth / targetRatio;
            let sourceX = 0;
            let sourceY = 0;

            if (sourceHeight > naturalHeight) {
                sourceHeight = naturalHeight;
                sourceWidth = naturalHeight * targetRatio;
                sourceX = (naturalWidth - sourceWidth) / 2;
                sourceY = 0;
            } else {
                const extraHeight = naturalHeight - sourceHeight;
                sourceY = extraHeight * (currentY / 100);
            }

            const canvas = document.createElement('canvas');
            canvas.width = Math.min(sourceWidth, 1440);
            canvas.height = Math.round(canvas.width / targetRatio);

            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(
                img,
                sourceX, sourceY, sourceWidth, sourceHeight,
                0, 0, canvas.width, canvas.height
            );

            canvas.toBlob((blob) => {
                if (!blob) {
                    toast.error('Error al generar el recorte', { id: 'cropper' });
                    setIsCropping(false);
                    return;
                }
                const croppedFile = new File([blob], `foto-${currentIndex + 1}-4x3-${Date.now()}.jpg`, { type: 'image/jpeg' });
                croppedFile.preview = URL.createObjectURL(croppedFile);

                toast.success(`Recorte 4:3 de foto #${currentIndex + 1} listo`, { id: 'cropper' });
                if (onCropComplete) {
                    onCropComplete(croppedFile, currentIndex);
                }
                setIsCropping(false);
            }, 'image/jpeg', 0.92);

        } catch (error) {
            console.error('Error in canvas crop:', error);
            toast.error(error.message || 'Error al procesar el recorte', { id: 'cropper' });
            setIsCropping(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-2xl bg-crm-surface border border-crm-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border bg-crm-surface-raised">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-crm-red/10 border border-crm-red/30 flex items-center justify-center text-crm-red">
                            <Sliders size={16} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-white">Ajustar Encuadre de Fotos</h3>
                                {currentIndex === 0 ? (
                                    <span className="text-[10px] font-bold bg-crm-red/20 text-crm-red border border-crm-red/30 px-2 py-0.5 rounded-full">
                                        Portada Principal
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-medium bg-white/10 text-white/80 border border-white/20 px-2 py-0.5 rounded-full">
                                        Foto {currentIndex + 1} de {imageList.length || 1}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-crm-fg-muted">
                                {vehicle?.brand} {vehicle?.name} • Cada foto guarda su propio encuadre para catálogo y ficha
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Botón Guardar en el header con icono de disquete */}
                        <button
                            type="button"
                            onClick={handleSaveAll}
                            disabled={isSaving || isCropping}
                            title="Guardar encuadre de todas las imágenes"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-crm-red hover:bg-red-600 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            {isSaving ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            ) : (
                                <Save size={14} />
                            )}
                            <span>Guardar</span>
                        </button>

                        <button
                            onClick={onClose}
                            className="text-crm-fg-muted hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                            title="Cerrar"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
                    
                    {/* Live Preview Container (Aspect 4:3) with Navigation Arrows */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-crm-fg flex items-center gap-1.5">
                                <Eye size={14} className="text-crm-red" />
                                Vista Previa Exacta (Ratio 4:3)
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-crm-fg-muted font-mono">
                                    Foto {currentIndex + 1}/{imageList.length || 1}
                                </span>
                                <span className="text-xs font-mono font-bold text-crm-red bg-crm-red/10 px-2 py-0.5 rounded border border-crm-red/30">
                                    Y: {currentY}%
                                </span>
                            </div>
                        </div>

                        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border-2 border-crm-border bg-black shadow-inner group">
                            {currentImgUrl ? (
                                <img
                                    ref={imgRef}
                                    src={currentImgUrl}
                                    alt={`Foto ${currentIndex + 1}`}
                                    className="w-full h-full object-cover select-none pointer-events-none transition-all duration-150"
                                    style={{ objectPosition: `50% ${currentY}%` }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-crm-fg-muted text-xs">
                                    Sin imagen seleccionada
                                </div>
                            )}

                            {/* Flecha Izquierda (Anterior) */}
                            {imageList.length > 1 && (
                                <button
                                    type="button"
                                    onClick={handlePrev}
                                    title="Foto anterior (←)"
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-crm-red text-white flex items-center justify-center transition-all duration-150 shadow-xl border border-white/20 hover:scale-110 active:scale-95 z-20 cursor-pointer backdrop-blur-sm"
                                >
                                    <ChevronLeft size={22} />
                                </button>
                            )}

                            {/* Flecha Derecha (Siguiente) */}
                            {imageList.length > 1 && (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    title="Foto siguiente (→)"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-crm-red text-white flex items-center justify-center transition-all duration-150 shadow-xl border border-white/20 hover:scale-110 active:scale-95 z-20 cursor-pointer backdrop-blur-sm"
                                >
                                    <ChevronRight size={22} />
                                </button>
                            )}

                            {/* Badges superiores */}
                            <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none z-10">
                                <span className="bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20 uppercase tracking-wider">
                                    DISPONIBLE
                                </span>
                                {currentIndex === 0 && (
                                    <span className="bg-crm-red/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                                        PORTADA
                                    </span>
                                )}
                            </div>

                            {/* Icono de Guardado Rápido flotante sobre la foto */}
                            <button
                                type="button"
                                onClick={handleSaveAll}
                                disabled={isSaving || isCropping}
                                title="Guardar cambios de encuadre"
                                className="absolute top-3 right-3 bg-black/75 hover:bg-crm-red text-white px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1.5 text-xs font-bold transition-all shadow-lg backdrop-blur-md z-20 cursor-pointer active:scale-95"
                            >
                                <Save size={13} />
                                <span>Guardar</span>
                            </button>

                            {/* Overlay informativo inferior */}
                            <div className="absolute bottom-3 left-3 right-3 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3 rounded-lg pointer-events-none">
                                <div className="text-sm font-bold text-white leading-tight">
                                    {vehicle?.brand || 'Marca'} {vehicle?.name || 'Modelo'}
                                </div>
                                <div className="text-[11px] text-white/70">
                                    Foto {currentIndex + 1} de {imageList.length || 1} • {vehicle?.year || '2024'}
                                </div>
                            </div>

                            {/* Líneas guía de tercios */}
                            <div className="absolute inset-0 pointer-events-none border border-white/10 opacity-25">
                                <div className="absolute top-1/3 left-0 right-0 border-t border-dashed border-white/40"></div>
                                <div className="absolute top-2/3 left-0 right-0 border-t border-dashed border-white/40"></div>
                            </div>
                        </div>
                    </div>

                    {/* Tira de Miniaturas para Selección Directa */}
                    {imageList.length > 1 && (
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-medium text-crm-fg-muted">
                                    Seleccionar foto para encuadrar ({imageList.length} fotos disponibles):
                                </span>
                                <span className="text-[10px] text-crm-fg-muted">
                                    Usa las flechas o haz clic en una miniatura
                                </span>
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
                                {imageList.map((url, idx) => {
                                    const thumbPos = positions[idx] || (idx === 0 ? (vehicle?.imagePosition || currentPosition) : '50% 75%');
                                    const isSelected = idx === currentIndex;
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setCurrentIndex(idx)}
                                            className={`
                                                relative flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer bg-black
                                                ${isSelected
                                                    ? 'border-crm-red ring-2 ring-crm-red/50 scale-105 shadow-md'
                                                    : 'border-crm-border hover:border-white/50 opacity-70 hover:opacity-100'
                                                }
                                            `}
                                            title={`Foto #${idx + 1}${idx === 0 ? ' (Portada)' : ''}`}
                                        >
                                            <img
                                                src={url}
                                                alt={`Miniatura ${idx + 1}`}
                                                className="w-full h-full object-cover"
                                                style={{ objectPosition: thumbPos }}
                                            />
                                            <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[9px] font-mono px-1 rounded">
                                                #{idx + 1}
                                            </span>
                                            {idx === 0 && (
                                                <span className="absolute top-0.5 left-0.5 bg-crm-red text-white text-[8px] font-bold px-1 rounded">
                                                    P
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Presets Rápidos para la foto activa */}
                    <div>
                        <label className="block text-xs font-semibold text-crm-fg mb-1.5">
                            Alineaciones Rápidas Recomendadas (para foto #{currentIndex + 1}):
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {quickPresets.map((preset) => (
                                <button
                                    key={preset.val}
                                    type="button"
                                    onClick={() => updateCurrentPosY(preset.val)}
                                    className={`
                                        p-2.5 rounded-lg border text-left transition-all text-xs cursor-pointer
                                        ${currentY === preset.val
                                            ? 'border-crm-red bg-crm-red/10 text-white font-bold ring-1 ring-crm-red'
                                            : 'border-crm-border bg-crm-surface-raised hover:border-crm-red/40 text-crm-fg-muted hover:text-white'
                                        }
                                    `}
                                >
                                    <div className="font-semibold text-[11px]">{preset.label}</div>
                                    <div className="text-[10px] opacity-70 mt-0.5">{preset.val}% vertical</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Control Deslizante Manual */}
                    <div className="bg-crm-surface-raised p-4 rounded-xl border border-crm-border">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                                <MoveVertical size={14} className="text-crm-red" />
                                Ajuste Fino Vertical (Foto #{currentIndex + 1}):
                            </label>
                            <span className="text-xs font-mono text-crm-fg-muted">
                                0% (Techo) ← 50% → 100% (Suelo)
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={currentY}
                            onChange={(e) => updateCurrentPosY(parseInt(e.target.value))}
                            className="w-full h-2 bg-crm-bg rounded-lg appearance-none cursor-pointer accent-crm-red"
                        />
                        <div className="flex justify-between text-[10px] text-crm-fg-muted mt-1 font-mono">
                            <span>0% Arriba</span>
                            <span>35% Techo</span>
                            <span>50% Centro</span>
                            <span>65% Equilibrado</span>
                            <span>75% Ruedas</span>
                            <span>100% Abajo</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-crm-border bg-crm-surface-raised">
                    {onCropComplete ? (
                        <button
                            type="button"
                            onClick={handleCropToCanvas}
                            disabled={isCropping || isSaving}
                            className="px-3 py-2 rounded-lg border border-crm-border hover:border-crm-red text-crm-fg hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Genera un archivo recortado a 4:3 fija para la foto activa"
                        >
                            <Crop size={14} />
                            Recortar Foto #{currentIndex + 1} a 4:3
                        </button>
                    ) : (
                        <div className="text-[11px] text-crm-fg-muted">
                            Se guarda individualmente cada foto para catálogo y ficha
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving || isCropping}
                            className="px-4 py-2 rounded-lg border border-crm-border text-crm-fg hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveAll}
                            disabled={isSaving || isCropping}
                            className="px-5 py-2 rounded-lg bg-crm-red hover:bg-red-600 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                        >
                            {isSaving ? (
                                <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save size={15} />
                                    Guardar Encuadres ({imageList.length || 1})
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
