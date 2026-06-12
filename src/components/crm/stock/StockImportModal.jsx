"use client";
import React, { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import CrmButton from '../ui/CrmButton';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

export default function StockImportModal({ isOpen, onClose, onSuccess }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleReset = () => {
        setStep(1);
        setPreviewData(null);
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const normalizeHeaders = (data) => {
        if (!data || data.length === 0) return [];
        // Map Excel headers to expected keys
        return data.map(row => {
            const mapped = {};
            for (const [key, val] of Object.entries(row)) {
                const lower = key.toLowerCase().trim();
                if (lower.includes('marca')) mapped.brand = val;
                else if (lower.includes('modelo') || lower.includes('name')) mapped.name = val;
                else if (lower.includes('año') || lower.includes('year')) mapped.year = val;
                else if (lower.includes('km') || lower.includes('kilometro')) mapped.km = val;
                else if (lower.includes('precio') || lower.includes('price')) mapped.price = val;
                else if (lower.includes('moneda') || lower.includes('currency')) mapped.currency = val;
                else if (lower.includes('patente') || lower.includes('vin') || lower.includes('dominio')) mapped.plateOrVin = val;
                else if (lower.includes('estado') || lower.includes('status')) mapped.status = val;
                else if (lower.includes('combustible') || lower.includes('fuel')) mapped.fuel = val;
                else if (lower.includes('tipo') || lower.includes('vehicletype')) mapped.vehicleType = val;
                else if (lower.includes('ml') || lower.includes('mercadolibre')) mapped.publishedOnML = val;
                else mapped[key] = val; // keep unmapped just in case
            }
            return mapped;
        });
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            
            const normalizedRows = normalizeHeaders(rawJson);

            if (normalizedRows.length === 0) {
                toast.error('El archivo está vacío');
                setLoading(false);
                return;
            }

            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/cars/validate-import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ rows: normalizedRows })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Error validando datos');
            }

            const validationResult = await res.json();
            setPreviewData(validationResult);
            setStep(2);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmImport = async () => {
        if (!previewData) return;
        const validCars = previewData.results.filter(r => r.status === 'valid').map(r => r.data);
        
        if (validCars.length === 0) {
            toast.error('No hay vehículos válidos para importar');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/cars/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ cars: validCars })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Error en la importación masiva');
            }

            const data = await res.json();
            handleReset();
            onSuccess(data.count);
        } catch (error) {
            toast.error(error.message);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="flex w-full max-w-4xl flex-col rounded-xl border border-crm-border bg-crm-surface shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-crm-border p-4">
                    <h2 className="m-0 flex items-center gap-2 text-lg font-bold text-white">
                        <FileSpreadsheet className="text-crm-red" />
                        Importar Stock Masivo
                    </h2>
                    <button onClick={handleClose} className="text-crm-fg-muted hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {step === 1 && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <input 
                                type="file" 
                                accept=".xlsx,.xls,.csv" 
                                className="hidden" 
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                            />
                            <div className="mb-4 rounded-full bg-crm-bg p-4">
                                <Upload size={32} className="text-crm-fg-muted" />
                            </div>
                            <h3 className="mb-2 text-lg font-bold text-white">Seleccione un archivo Excel</h3>
                            <p className="mb-6 text-center text-sm text-crm-fg-muted max-w-md">
                                El archivo debe contener columnas reconocibles como Marca, Modelo, Año, Precio, Moneda y Patente. <br/>
                                <b>Importante:</b> Los vehículos existentes no serán reemplazados. Se detectarán duplicados por Patente o VIN.
                            </p>
                            <CrmButton 
                                variant="primary" 
                                onClick={() => fileInputRef.current?.click()}
                                loading={loading}
                            >
                                Seleccionar Archivo
                            </CrmButton>
                        </div>
                    )}

                    {step === 2 && previewData && (
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-3 gap-4 mb-2">
                                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                                    <div className="text-xl font-bold text-emerald-400">{previewData.summary.validCount}</div>
                                    <div className="text-xs text-emerald-500/70 uppercase font-bold">Válidos (A crear)</div>
                                </div>
                                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-center">
                                    <div className="text-xl font-bold text-amber-400">{previewData.summary.duplicateCount}</div>
                                    <div className="text-xs text-amber-500/70 uppercase font-bold">Duplicados (Ignorados)</div>
                                </div>
                                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center">
                                    <div className="text-xl font-bold text-red-400">{previewData.summary.errorCount}</div>
                                    <div className="text-xs text-red-500/70 uppercase font-bold">Errores (Ignorados)</div>
                                </div>
                            </div>

                            <div className="max-h-[300px] overflow-y-auto rounded-lg border border-crm-border">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-crm-bg sticky top-0">
                                        <tr>
                                            <th className="p-2 font-semibold text-crm-fg-muted">Fila</th>
                                            <th className="p-2 font-semibold text-crm-fg-muted">Vehículo</th>
                                            <th className="p-2 font-semibold text-crm-fg-muted">Patente/VIN</th>
                                            <th className="p-2 font-semibold text-crm-fg-muted">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-crm-border">
                                        {previewData.results.map((res, i) => (
                                            <tr key={i} className="hover:bg-crm-bg/50">
                                                <td className="p-2 text-crm-fg-muted">#{res.row}</td>
                                                <td className="p-2 text-white font-medium">
                                                    {res.data.brand || '---'} {res.data.name || '---'}
                                                </td>
                                                <td className="p-2 text-crm-fg-muted">{res.data.plateOrVin || 'N/A'}</td>
                                                <td className="p-2">
                                                    {res.status === 'valid' && <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 size={14}/> Válido</span>}
                                                    {res.status === 'duplicate' && <span className="inline-flex items-center gap-1 text-amber-400"><AlertTriangle size={14}/> Duplicado</span>}
                                                    {res.status === 'error' && <span className="inline-flex items-center gap-1 text-red-400"><X size={14}/> Error: {res.message}</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 2 && (
                    <div className="flex items-center justify-end gap-3 border-t border-crm-border p-4 bg-crm-bg/50 rounded-b-xl">
                        <CrmButton variant="secondary" onClick={handleReset} disabled={loading}>
                            Cancelar
                        </CrmButton>
                        <CrmButton 
                            variant="primary" 
                            onClick={handleConfirmImport} 
                            disabled={previewData?.summary.validCount === 0}
                            loading={loading}
                        >
                            Confirmar Importación ({previewData?.summary.validCount})
                        </CrmButton>
                    </div>
                )}
            </div>
        </div>
    );
}
