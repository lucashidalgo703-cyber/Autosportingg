"use client";
import React, { useState, useEffect, useRef } from 'react';
import { X, Sliders, Check, MoveVertical, Crop, Eye, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VehicleImageFramingModal({
    isOpen,
    onClose,
    vehicle,
    imageUrl,
    currentPosition = '50% 75%',
    onPositionSaved,
    onCropComplete
}) {
    // Extraer el porcentaje vertical de currentPosition (ej: "50% 75%" -> 75)
    const parseInitialY = (pos) => {
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

    const [posY, setPosY] = useState(parseInitialY(currentPosition));
    const [isSaving, setIsSaving] = useState(false);
    const [isCropping, setIsCropping] = useState(false);
    const canvasRef = useRef(null);
    const imgRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setPosY(parseInitialY(vehicle?.imagePosition || currentPosition));
        }
    }, [isOpen, vehicle, currentPosition]);

    if (!isOpen) return null;

    const quickPresets = [
        { label: 'Techo / Superior', val: 35, desc: 'Para fotos tomadas desde arriba o autos con techo cortado' },
        { label: 'Centro', val: 50, desc: 'Enfoque simétrico medio (ideal para interiores y volantes)' },
        { label: 'Equilibrado', val: 65, desc: 'Punto medio óptimo para autos tomados de cerca' },
        { label: 'Ruedas / Inferior', val: 75, desc: 'Recomendado para fotos del playón con galpón arriba' },
    ];

    const handleSaveFraming = async () => {
        const finalPosition = `50% ${posY}%`;
        const carId = vehicle?.id || vehicle?._id;

        if (!carId) {
            // Si es un auto nuevo en creación, pasar la posición al componente padre
            if (onPositionSaved) onPositionSaved(finalPosition);
            toast.success(`Encuadre configurado en ${posY}%`);
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
                body: JSON.stringify({ imagePosition: finalPosition })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Error al guardar el encuadre');
            }

            toast.success(`Encuadre guardado exitosamente (${posY}%)`);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('vehicle-updated', { detail: { carId, imagePosition: finalPosition } }));
            }
            if (onPositionSaved) onPositionSaved(finalPosition);
            onClose();
        } catch (error) {
            console.error('Error saving image position:', error);
            toast.error(error.message || 'No se pudo guardar el encuadre');
        } finally {
            setIsSaving(false);
        }
    };

    // Función para recortar físicamente a 4:3 usando un Canvas nativo
    const handleCropToCanvas = async () => {
        if (!imageUrl) return;
        setIsCropping(true);
        toast.loading('Generando recorte 4:3...', { id: 'cropper' });

        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = imageUrl;

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
                // Si la imagen es más ancha que 4:3
                sourceHeight = naturalHeight;
                sourceWidth = naturalHeight * targetRatio;
                sourceX = (naturalWidth - sourceWidth) / 2;
                sourceY = 0;
            } else {
                // Si la imagen es más alta que 4:3 (como fotos verticales 3:4)
                // Calcular sourceY usando el porcentaje del slider posY
                const extraHeight = naturalHeight - sourceHeight;
                sourceY = extraHeight * (posY / 100);
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

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    toast.error('Error al generar el recorte', { id: 'cropper' });
                    setIsCropping(false);
                    return;
                }
                const croppedFile = new File([blob], `portada-4x3-${Date.now()}.jpg`, { type: 'image/jpeg' });
                croppedFile.preview = URL.createObjectURL(croppedFile);

                toast.success('Recorte 4:3 generado exitosamente', { id: 'cropper' });
                if (onCropComplete) {
                    onCropComplete(croppedFile);
                }
                setIsCropping(false);
                onClose();
            }, 'image/jpeg', 0.92);

        } catch (error) {
            console.error('Error in canvas crop:', error);
            toast.error(error.message || 'Error al procesar el recorte', { id: 'cropper' });
            setIsCropping(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-2xl bg-crm-surface border border-crm-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border bg-crm-surface-raised">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-crm-red/10 border border-crm-red/30 flex items-center justify-center text-crm-red">
                            <Sliders size={16} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Ajustar Encuadre de Portada</h3>
                            <p className="text-xs text-crm-fg-muted">
                                {vehicle?.brand} {vehicle?.name} • Catálogo y Ficha
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-crm-fg-muted hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
                    
                    {/* Live Preview Container (Aspect 4:3) */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-crm-fg flex items-center gap-1.5">
                                <Eye size={14} className="text-crm-red" />
                                Vista Previa Exacta en Catálogo (Ratio 4:3)
                            </span>
                            <span className="text-xs font-mono font-bold text-crm-red bg-crm-red/10 px-2 py-0.5 rounded border border-crm-red/30">
                                Y: {posY}%
                            </span>
                        </div>

                        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border-2 border-crm-border bg-black shadow-inner group">
                            {imageUrl ? (
                                <img
                                    ref={imgRef}
                                    src={imageUrl}
                                    alt="Vista previa de encuadre"
                                    className="w-full h-full object-cover select-none pointer-events-none transition-all duration-150"
                                    style={{ objectPosition: `50% ${posY}%` }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-crm-fg-muted text-xs">
                                    Sin imagen seleccionada
                                </div>
                            )}

                            {/* Simulated Catalog Overlay Badges */}
                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20 uppercase tracking-wider pointer-events-none">
                                DISPONIBLE
                            </div>

                            <div className="absolute bottom-3 left-3 right-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 rounded-lg pointer-events-none">
                                <div className="text-sm font-bold text-white leading-tight">
                                    {vehicle?.brand || 'Marca'} {vehicle?.name || 'Modelo'}
                                </div>
                                <div className="text-[11px] text-white/70">
                                    {vehicle?.year || '2024'} • {vehicle?.km !== undefined ? Number(vehicle.km).toLocaleString('es-AR') + ' km' : '0 km'}
                                </div>
                            </div>

                            {/* Rule of thirds guide lines (semi-transparent) */}
                            <div className="absolute inset-0 pointer-events-none border border-white/10 opacity-30">
                                <div className="absolute top-1/3 left-0 right-0 border-t border-dashed border-white/40"></div>
                                <div className="absolute top-2/3 left-0 right-0 border-t border-dashed border-white/40"></div>
                            </div>
                        </div>
                    </div>

                    {/* Presets */}
                    <div>
                        <label className="block text-xs font-semibold text-crm-fg mb-2">
                            Alineaciones Rápidas Recomendadas:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {quickPresets.map((preset) => (
                                <button
                                    key={preset.val}
                                    type="button"
                                    onClick={() => setPosY(preset.val)}
                                    className={`
                                        p-2.5 rounded-lg border text-left transition-all text-xs
                                        ${posY === preset.val
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

                    {/* Manual Slider */}
                    <div className="bg-crm-surface-raised p-4 rounded-xl border border-crm-border">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                                <MoveVertical size={14} className="text-crm-red" />
                                Ajuste Fino Vertical:
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
                            value={posY}
                            onChange={(e) => setPosY(parseInt(e.target.value))}
                            className="w-full h-2 bg-crm-bg rounded-lg appearance-none cursor-pointer accent-crm-red"
                        />
                        <div className="flex justify-between text-[10px] text-crm-fg-muted mt-1 font-mono">
                            <span>0% Arriba</span>
                            <span>35% Techo</span>
                            <span>50% Centro</span>
                            <span>68% Equilibrado</span>
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
                            className="px-3 py-2 rounded-lg border border-crm-border hover:border-crm-red text-crm-fg hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                            title="Genera un archivo recortado físicamente a proporción 4:3 fija"
                        >
                            <Crop size={14} />
                            Recortar a 4:3 Fijo
                        </button>
                    ) : (
                        <div className="text-[11px] text-crm-fg-muted">
                            Se aplica a catálogo y ficha automáticamente
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving || isCropping}
                            className="px-4 py-2 rounded-lg border border-crm-border text-crm-fg hover:text-white text-xs font-semibold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveFraming}
                            disabled={isSaving || isCropping}
                            className="px-5 py-2 rounded-lg bg-crm-red hover:bg-red-600 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Check size={14} />
                                    Guardar Encuadre
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
