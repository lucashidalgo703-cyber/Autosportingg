import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle, FileSpreadsheet, Check, CheckCircle2 } from 'lucide-react';
import CrmButton from '../ui/CrmButton';
import CrmModal from '../ui/CrmModal';
import * as XLSX from 'xlsx';
import { useAuth } from '../../../context/AuthContext';

export default function ClientImportModal({ isOpen, onClose, onSuccess }) {
    const { token } = useAuth();
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [step, setStep] = useState(1); // 1: Upload, 2: Preview
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const resetState = () => {
        setFile(null);
        setPreviewData([]);
        setStep(1);
        setLoading(false);
        setError(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setLoading(true);
        setError(null);

        try {
            const buffer = await selectedFile.arrayBuffer();
            const workbook = XLSX.read(buffer);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawData = XLSX.utils.sheet_to_json(worksheet);

            if (rawData.length === 0) throw new Error("El archivo está vacío.");

            // Standardize columns expected: Nombre, Apellido, Telefono, Email, DNI
            const standardizedRows = rawData.map(row => {
                const getVal = (keys) => {
                    for (const key of keys) {
                        const foundKey = Object.keys(row).find(k => k.toLowerCase().includes(key));
                        if (foundKey) return row[foundKey];
                    }
                    return '';
                };

                return {
                    firstName: getVal(['nombre', 'first']),
                    lastName: getVal(['apellido', 'last']),
                    phone: getVal(['telefono', 'tel', 'cel', 'phone']),
                    email: getVal(['email', 'correo', 'mail']),
                    dni: getVal(['dni', 'documento', 'cuit', 'cuil'])
                };
            }).filter(row => row.firstName || row.lastName || row.phone || row.email);

            if (standardizedRows.length === 0) throw new Error("No se encontraron columnas reconocibles (Nombre, Telefono, Email).");

            // Validate against backend
            const res = await fetch('/api/admin/clients/validate-import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ rows: standardizedRows })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Error validando datos');

            setPreviewData(data.results);
            setStep(2);
        } catch (err) {
            setError(err.message);
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        const validRows = previewData.filter(r => r._importStatus === 'valid');
        if (validRows.length === 0) {
            setError("No hay filas válidas para importar.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/admin/clients/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ clients: validRows })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Error importando clientes');

            onSuccess(data.count);
            handleClose();
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const validCount = previewData.filter(r => r._importStatus === 'valid').length;

    return (
        <CrmModal isOpen={isOpen} onClose={handleClose} title="Importar Clientes (XLSX)">
            <div className="p-6">
                {error && (
                    <div className="mb-6 rounded-xl border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-red-300 flex items-start gap-3">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {step === 1 && (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-crm-border rounded-2xl bg-crm-surface-raised transition-colors hover:border-crm-red/50">
                        <input 
                            type="file" 
                            accept=".xlsx, .xls" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                        <div className="w-16 h-16 rounded-full bg-crm-bg flex items-center justify-center text-crm-fg-muted mb-4">
                            <FileSpreadsheet size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Subir archivo Excel</h3>
                        <p className="text-sm text-crm-fg-muted text-center max-w-sm mb-6">
                            El archivo debe contener al menos las columnas: Nombre, Teléfono o Email.
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

                {step === 2 && (
                    <div className="flex flex-col h-full max-h-[60vh]">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-white">Vista previa de importación</h3>
                                <p className="text-sm text-crm-fg-muted">
                                    <span className="text-crm-success font-bold">{validCount}</span> filas válidas de {previewData.length} en total.
                                </p>
                            </div>
                            <button onClick={() => setStep(1)} className="text-sm font-bold text-crm-red hover:text-crm-red-hover">
                                Cambiar archivo
                            </button>
                        </div>

                        <div className="overflow-auto border border-crm-border rounded-xl mb-6">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="bg-crm-surface-raised sticky top-0">
                                    <tr>
                                        <th className="p-3 text-crm-fg-muted font-bold text-xs uppercase tracking-wider">Estado</th>
                                        <th className="p-3 text-crm-fg-muted font-bold text-xs uppercase tracking-wider">Nombre</th>
                                        <th className="p-3 text-crm-fg-muted font-bold text-xs uppercase tracking-wider">Contacto</th>
                                        <th className="p-3 text-crm-fg-muted font-bold text-xs uppercase tracking-wider">Observaciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.map((row, idx) => (
                                        <tr key={idx} className={`border-t border-crm-border ${row._importStatus !== 'valid' ? 'bg-red-500/5' : ''}`}>
                                            <td className="p-3">
                                                {row._importStatus === 'valid' ? (
                                                    <span className="flex items-center gap-1 text-crm-success text-xs font-bold"><CheckCircle2 size={14}/> OK</span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-crm-red text-xs font-bold"><X size={14}/> Omitido</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-white">
                                                {row.firstName} {row.lastName}
                                            </td>
                                            <td className="p-3 text-crm-fg-muted">
                                                <div>{row.phone || '-'}</div>
                                                <div className="text-xs">{row.email || ''}</div>
                                            </td>
                                            <td className="p-3">
                                                <span className={`text-xs ${row._importStatus === 'valid' ? 'text-crm-fg-muted' : 'text-crm-red'}`}>
                                                    {row._importMessage}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-3 mt-auto pt-4 border-t border-crm-border">
                            <CrmButton variant="secondary" onClick={handleClose}>Cancelar</CrmButton>
                            <CrmButton 
                                variant="primary" 
                                onClick={handleConfirm} 
                                disabled={validCount === 0}
                                loading={loading}
                            >
                                Confirmar {validCount} Clientes
                            </CrmButton>
                        </div>
                    </div>
                )}
            </div>
        </CrmModal>
    );
}
