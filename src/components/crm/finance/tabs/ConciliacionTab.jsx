import React, { useState, useRef } from 'react';
import { FileUp, FileSpreadsheet, CheckCircle2, XCircle, FilePlus, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFinanceReconciliation } from '../../../../hooks/useFinanceReconciliation';
import CrmBadge from '../../ui/CrmBadge';
import ConfirmModal from '../../ui/ConfirmModal';

export default function ConciliacionTab({ accounts = [] }) {
    const { uploadReconciliation, confirmReconciliation, loading } = useFinanceReconciliation();

    const [accountId, setAccountId] = useState('');
    const [reconciliation, setReconciliation] = useState(null);
    const [decisions, setDecisions] = useState({});
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!accountId) {
            toast.error('Seleccioná una cuenta primero');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        try {
            const res = await uploadReconciliation({ accountId, file, fileName: file.name });
            setReconciliation(res);

            // Initialize default decisions
            const initialDecisions = {};
            res.lines.forEach(line => {
                if (line.matchStatus === 'matched') {
                    initialDecisions[line.rowIndex] = { action: 'match', matchedTransactionId: line.matchedTransactionId };
                } else {
                    initialDecisions[line.rowIndex] = { action: 'ignore' };
                }
            });
            setDecisions(initialDecisions);

            toast.success('Archivo parseado correctamente');
        } catch (err) {
            toast.error(err.message || 'Error al subir archivo');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleActionChange = (rowIndex, action) => {
        setDecisions(prev => ({
            ...prev,
            [rowIndex]: { ...prev[rowIndex], action, category: '' }
        }));
    };

    const handleCategoryChange = (rowIndex, category) => {
        setDecisions(prev => ({
            ...prev,
            [rowIndex]: { ...prev[rowIndex], category }
        }));
    };

    const handleConfirmRequest = () => {
        if (!reconciliation) return;

        const decisionsArray = Object.entries(decisions).map(([index, dec]) => ({
            index: Number(index),
            ...dec
        }));

        const missingCategories = decisionsArray.some(d => d.action === 'create' && !d.category);
        if (missingCategories) {
            return toast.error('Falta categoría en líneas a crear');
        }

        setIsConfirmOpen(true);
    };

    const handleConfirm = async () => {
        setIsConfirmOpen(false);
        const decisionsArray = Object.entries(decisions).map(([index, dec]) => ({
            index: Number(index),
            ...dec
        }));

        try {
            const res = await confirmReconciliation(reconciliation._id, decisionsArray);
            setReconciliation(res);
            toast.success('Conciliación confirmada con éxito');
        } catch (err) {
            toast.error(err.message || 'Error al confirmar');
            if (err.reconciliation) setReconciliation(err.reconciliation);
        }
    };

    const formatMoney = (amount, currency = 'USD') => {
        return `${currency === 'USD' ? 'USD' : '$'} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    const hasMissingCategories = Object.values(decisions).some(d => d.action === 'create' && !d.category);
    const isConfirmed = reconciliation?.status === 'confirmado';

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                <p className="text-sm font-bold text-crm-fg-muted">Conciliación bancaria: cotejá tus movimientos del sistema contra el extracto de tu banco.</p>
            </div>

            {!reconciliation || reconciliation.status === 'pendiente' ? (
                <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted">Cuenta:</label>
                            <select
                                value={accountId}
                                onChange={(e) => setAccountId(e.target.value)}
                                className="rounded-lg border border-crm-border bg-crm-bg px-3 py-1.5 text-sm text-crm-fg focus:border-crm-red focus:outline-none"
                                disabled={loading || !!reconciliation}
                            >
                                <option value="">Seleccionar...</option>
                                {accounts.filter(a => a.isActive !== false).map(a => (
                                    <option key={a._id} value={a._id}>{a.name} ({a.currency})</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted text-right">
                                Columnas esperadas: Fecha · Descripción · Monto
                            </div>
                            <input
                                type="file"
                                accept=".csv"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                disabled={loading || !accountId}
                            />
                            {!reconciliation && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={loading || !accountId}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-crm-red-gradient px-4 text-xs font-black text-white shadow-crm-shadow-red transition hover:opacity-95 disabled:opacity-50 mt-1"
                                >
                                    <FileUp size={14} /> {loading ? 'Procesando...' : 'Subir extracto CSV'}
                                </button>
                            )}
                        </div>
                    </div>
                </section>
            ) : null}

            <section className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-crm-surface-raised border-b border-crm-border">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Fecha</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted max-w-[300px]">Extracto</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted max-w-[300px]">Sistema</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-right">Monto</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-center">Estado</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-center">Acción / Categoría</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-crm-border">
                            {!reconciliation ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-crm-bg flex items-center justify-center mb-2">
                                                <FileSpreadsheet className="text-crm-fg-muted" size={24} />
                                            </div>
                                            <h4 className="font-bold text-crm-fg">Sin archivo cargado</h4>
                                            <p className="text-sm text-crm-fg-muted max-w-sm">Seleccioná una cuenta y subí tu archivo CSV para comenzar la conciliación.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                reconciliation.lines.map(line => {
                                    const decision = decisions[line.rowIndex] || { action: 'ignore' };

                                    return (
                                        <tr key={line.rowIndex} className="hover:bg-crm-surface-raised transition-colors">
                                            <td className="px-4 py-3 text-sm text-crm-fg">
                                                {new Date(line.csvDate).toLocaleDateString('es-AR')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-bold text-crm-fg truncate max-w-[250px]" title={line.csvDescription}>
                                                    {line.csvDescription}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                {line.matchStatus === 'matched' ? (
                                                    <p className="text-sm text-crm-fg truncate max-w-[250px]" title={line.matchedTransactionId?.description}>
                                                        {line.matchedTransactionId?.description || '---'}
                                                    </p>
                                                ) : line.matchStatus === 'created' ? (
                                                    <p className="text-sm text-crm-fg truncate max-w-[250px]">
                                                        {line.createdTransactionId?.description || 'Creado'}
                                                    </p>
                                                ) : (
                                                    <span className="text-xs text-crm-fg-muted italic">Sin coincidencia</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-bold text-right">
                                                <span className={line.csvAmount >= 0 ? 'text-green-500' : 'text-crm-red'}>
                                                    {line.csvAmount > 0 ? '+' : ''}{formatMoney(line.csvAmount, reconciliation.currency)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {line.errorMessage ? (
                                                    <CrmBadge variant="danger" className="inline-flex items-center gap-1"><AlertTriangle size={12}/> Error</CrmBadge>
                                                ) : line.matchStatus === 'matched' ? (
                                                    <CrmBadge variant="success" className="inline-flex items-center gap-1"><CheckCircle2 size={12}/> Coincidencia</CrmBadge>
                                                ) : line.matchStatus === 'created' ? (
                                                    <CrmBadge variant="success" className="inline-flex items-center gap-1"><FilePlus size={12}/> Creado</CrmBadge>
                                                ) : line.matchStatus === 'ignored' ? (
                                                    <CrmBadge variant="info" className="inline-flex items-center gap-1"><XCircle size={12}/> Ignorado</CrmBadge>
                                                ) : (
                                                    <CrmBadge variant="warning">No Match</CrmBadge>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {isConfirmed ? (
                                                    <div className="text-sm text-crm-fg-muted text-center capitalize">{line.matchStatus}</div>
                                                ) : (
                                                    <div className="flex flex-col gap-1 items-center">
                                                        <select
                                                            value={decision.action}
                                                            onChange={(e) => handleActionChange(line.rowIndex, e.target.value)}
                                                            className="w-full text-xs rounded border border-crm-border bg-crm-bg p-1 text-crm-fg focus:outline-none"
                                                        >
                                                            {line.matchStatus === 'matched' && <option value="match">Confirmar Match</option>}
                                                            <option value="ignore">Ignorar</option>
                                                            <option value="create">Crear Movimiento</option>
                                                        </select>
                                                        {decision.action === 'create' && (
                                                            <input
                                                                type="text"
                                                                value={decision.category || ''}
                                                                onChange={(e) => handleCategoryChange(line.rowIndex, e.target.value)}
                                                                placeholder="Categoría obligatoria..."
                                                                className={`w-full text-xs rounded border bg-crm-bg p-1 focus:outline-none ${!decision.category ? 'border-crm-red text-crm-red' : 'border-crm-border text-crm-fg'}`}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {reconciliation && !isConfirmed && (
                    <div className="p-4 border-t border-crm-border flex justify-end gap-3 bg-crm-surface-raised">
                        <button onClick={() => setReconciliation(null)} className="rounded-lg px-4 py-2 text-sm font-black text-crm-fg-muted hover:bg-crm-bg transition" disabled={loading}>
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirmRequest}
                            disabled={loading || hasMissingCategories}
                            className="inline-flex items-center gap-2 rounded-lg bg-crm-red-gradient px-4 py-2 text-sm font-black text-white shadow-crm-shadow-red transition hover:opacity-95 disabled:opacity-50"
                        >
                            {loading ? 'Confirmando...' : 'Confirmar Conciliación'}
                        </button>
                    </div>
                )}
            </section>

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirm}
                title="¿Confirmar conciliación?"
                message="Se guardarán los matches y se crearán los movimientos solicitados permanentemente en la base de datos."
                confirmText="Confirmar Conciliación"
            />
        </div>
    );
}