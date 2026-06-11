"use client";
import React, { useState } from 'react';
import { Upload, X, Save, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import CrmCard from '../ui/CrmCard';

export default function VehicleImagesPanel({ vehicle, onSaveComplete }) {
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState(
        (vehicle?.fotos || vehicle?.images || []).map(url => ({ preview: url, isExisting: true, url }))
    );
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

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

    const addFiles = (newFilesRaw) => {
        const newFiles = Array.from(newFilesRaw).map(file => Object.assign(file, { preview: URL.createObjectURL(file) }));
        if (files.length + newFiles.length > 20) {
            toast.error("Máximo 20 imágenes.");
            setFiles(prev => [...prev, ...newFiles.slice(0, 20 - files.length)]);
        } else {
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const handleSaveImages = async () => {
        try {
            setIsSaving(true);
            const formDataToSend = new FormData();
            
            // Append new files
            files.forEach(file => {
                if (!file.isExisting) {
                    formDataToSend.append('images', file);
                }
            });

            // Order array
            const imageOrder = files.map((f, i) => f.isExisting ? f.url : `__new__${i}`);
            formDataToSend.append('imageOrder', JSON.stringify(imageOrder));

            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

            toast.loading("Subiendo imágenes...", { id: 'saveImages' });

            const res = await fetch(`${baseUrl}/api/admin/cars/${vehicle.id || vehicle._id}/images`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formDataToSend
            });

            if (!res.ok) throw new Error("Error al guardar imágenes");

            toast.success("Imágenes actualizadas", { id: 'saveImages' });
            if (onSaveComplete) onSaveComplete();
        } catch (error) {
            toast.error(error.message, { id: 'saveImages' });
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
                <div className="text-xs text-crm-fg-muted font-medium">{files.length} / 20 fotos</div>
            </div>

            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={onDropFiles}
                className={`
                    relative cursor-pointer transition-all duration-300
                    border border-dashed rounded-xl flex flex-col items-center justify-center mb-4
                    ${files.length > 0 ? 'h-32 border-crm-border bg-[#09090B]' : 'h-48 bg-[#09090B]'}
                    ${isDragging ? 'border-[#E63027] bg-[#E63027]/5' : 'border-crm-border hover:border-[#E63027]/50'}
                `}
            >
                <input
                    type="file" multiple accept="image/png, image/jpeg, image/jpg, image/webp"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
                />

                {files.length === 0 ? (
                    <div className="text-center pointer-events-none z-10">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors ${isDragging ? 'bg-[#E63027] text-white' : 'bg-[#24242B] text-crm-fg-muted'}`}>
                            <Upload size={18} />
                        </div>
                        <p className="text-crm-fg-muted text-xs font-medium">Arrastra imágenes aquí</p>
                        <p className="text-crm-fg-muted text-[10px] mt-1">o haz clic para buscar</p>
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
                                    ${i === 0 ? 'border-[#E63027] ring-1 ring-[#E63027]/50' : 'border-crm-border'}
                                `}
                            >
                                <img src={file.preview} className="w-full h-full object-cover" />
                                {i === 0 && <div className="absolute top-0 left-0 w-full bg-[#E63027]/90 text-white text-[8px] font-bold text-center py-0.5 tracking-wider uppercase z-20">Principal</div>}
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setFiles(files.filter((_, idx) => idx !== i)); }}
                                    className="absolute top-1 right-1 bg-crm-red hover:bg-red-600 text-white p-1 rounded-full z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-end">
                <button 
                    onClick={handleSaveImages}
                    disabled={isSaving}
                    className="bg-[#E63027] hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {isSaving ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div> : <Save size={14} />}
                    Guardar Imágenes
                </button>
            </div>
        </CrmCard>
    );
}
