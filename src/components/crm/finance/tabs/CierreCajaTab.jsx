import React, { useState, useEffect, useCallback } from 'react';
import { Lock, DownloadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFinanceDailyCloses } from '../../../../hooks/useFinanceDailyCloses';
import ConfirmModal from '../../ui/ConfirmModal';

export default function CierreCajaTab() {
    const { fetchDailyCloses, createDailyClose, exportDailyCloses, loading } = useFinanceDailyCloses();
    const [closes, setCloses] = useState([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notes, setNotes] = useState('');
    const [confirmCloseModal, setConfirmCloseModal] = useState({ isOpen: false, force: false });

    const loadData = useCallback(async () => {
        try {
            const data = await fetchDailyCloses();
            setCloses(data);
        } catch (err) {
            toast.error(err.message || 'Error al cargar cierres');
        }
    }, [fetchDailyCloses]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCloseDay = (force = false) => {
        setConfirmCloseModal({ isOpen: true, force });
    };

    const confirmCloseDay = async () => {
        const { force } = confirmCloseModal;
        setIsSubmitting(true);
        try {
            await createDailyClose({ notes, force });
            toast.success('Cierre diario generado correctamente');
            setNotes('');
            loadData();
            setConfirmCloseModal({ isOpen: false, force: false });
        } catch (err) {
            if (err.status === 409) {
                setConfirmCloseModal({ isOpen: true, force: true });
            } else {
                toast.error(err.message || 'Error al generar cierre');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleExport = async () => {
        try {
            await exportDailyCloses();
            toast.success('CSV Exportado');
        } catch (err) {
            toast.error(err.message || 'Error al exportar');
        }
    };

    const formatMoney = (amount, currency = 'USD') => {
        return `${currency === 'USD' ? 'USD' : '$'} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    return (
        <div className="space-y-4">
            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-md">
                        <h2 className="text-lg font-black text-crm-fg">Cierre de Caja</h2>
                        <p className="text-sm text-crm-fg-muted mb-3">Genera una foto instantánea e inmutable de los saldos de todas las cuentas al final del día. Esto es vital para auditorías.</p>
                        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas opcionales sobre el cierre..." className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none" />
                    </div>
                    <div className="flex gap-2 shrink-0 pt-2 md:pt-0">
                        <button onClick={handleExport} disabled={loading} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-crm-surface-raised px-4 text-xs font-black text-crm-fg border border-crm-border transition hover:bg-crm-bg disabled:opacity-50">
                            <DownloadCloud size={14} /> Exportar CSV
                        </button>
                        <button onClick={() => handleCloseDay(false)} disabled={isSubmitting} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-crm-red-gradient px-4 text-xs font-black text-white shadow-crm-shadow-red transition hover:opacity-95 disabled:opacity-50">
                            <Lock size={14} /> {isSubmitting ? 'Cerrando...' : 'Cerrar Día Actual'}
                        </button>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-crm-surface-raised border-b border-crm-border">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Fecha</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Secuencia</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Total ARS</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Total USD</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Usuario</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Cerrado En</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-crm-border">
                            {loading && closes.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-sm text-crm-fg-muted">Cargando...</td></tr>
                            ) : closes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <span className="text-2xl text-crm-fg-muted">🔒</span>
                                            <h4 className="font-bold text-crm-fg">Sin cierres</h4>
                                            <p className="text-sm text-crm-fg-muted">Aún no se ha realizado ningún cierre de caja.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                closes.map(c => (
                                    <tr key={c._id} className="hover:bg-crm-surface-raised transition-colors">
                                        <td className="px-4 py-3 text-sm font-bold text-crm-fg">{c.date}</td>
                                        <td className="px-4 py-3 text-sm text-crm-fg-muted">#{c.sequence}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-crm-fg">{formatMoney(c.totalsARS, 'ARS')}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-crm-fg">{formatMoney(c.totalsUSD, 'USD')}</td>
                                        <td className="px-4 py-3 text-sm text-crm-fg">
                                            {c.createdBy || 'Sistema'}
                                            {c.notes && <span className="block text-xs text-crm-fg-muted truncate max-w-[150px]" title={c.notes}>{c.notes}</span>}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-crm-fg-muted">{new Date(c.closedAt).toLocaleString('es-AR')}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <ConfirmModal
                isOpen={confirmCloseModal.isOpen}
                onClose={() => setConfirmCloseModal({ isOpen: false, force: false })}
                onConfirm={confirmCloseDay}
                title="Generar Cierre Diario"
                message={confirmCloseModal.force ? "Ya existe un cierre para el día de hoy. ¿Querés forzar la creación de un nuevo cierre (Secuencia mayor) para el mismo día?" : "¿Seguro que querés generar el cierre del día actual? Esto guardará una foto inmutable de todos los saldos actuales."}
                confirmText={confirmCloseModal.force ? "Forzar Cierre" : "Cerrar Día"}
                isDestructive={false}
            />
        </div>
    );
}