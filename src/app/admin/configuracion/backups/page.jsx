"use client";

import React, { useState } from 'react';
import { DatabaseBackup, Download, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import SettingsTabs from '../../../../components/crm/settings/SettingsTabs';
import toast from 'react-hot-toast';
import ConfirmModal from '../../../../components/crm/ui/ConfirmModal';

export default function BackupsConfigPage() {
    const { user, token } = useAuth();
    const isOwner = user?.role === 'owner';
    const [downloading, setDownloading] = useState(false);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);

    const handleExport = async () => {
        setDownloading(true);
        const loadingToast = toast.loading('Generando Snapshot JSON...');
        
        try {
            const res = await fetch('/api/admin/backups/export', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) throw new Error('Error al generar el backup');
            
            // Trigger file download
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `autosporting-backup-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            toast.success('Backup exportado exitosamente', { id: loadingToast });
        } catch (error) {
            toast.error(error.message, { id: loadingToast });
        } finally {
            setDownloading(false);
        }
    };

    if (!isOwner) {
        return (
            <div className="mx-auto w-full max-w-7xl p-4 md:p-6 pb-20 text-white">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-white">Configuración</h1>
                    <p className="text-crm-fg-muted mt-1 text-sm">Roster del CRM, roles y 2FA</p>
                </div>
                <SettingsTabs />
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-8 rounded-2xl flex flex-col items-center text-center gap-4 max-w-2xl mt-10">
                    <ShieldAlert size={48} />
                    <div>
                        <h2 className="text-xl font-bold mb-2">Acceso Denegado</h2>
                        <p className="text-sm text-red-400">Las exportaciones masivas de datos están restringidas exclusivamente al propietario (Owner).</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-7xl p-4 md:p-6 pb-20 text-white">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-white">Configuración</h1>
                <p className="text-crm-fg-muted mt-1 text-sm">Roster del CRM, roles y 2FA</p>
            </div>

            <SettingsTabs />

            <div className="bg-crm-surface border border-crm-border rounded-2xl p-6 max-w-2xl">
                <div className="flex items-center gap-3 mb-6 border-b border-crm-border pb-4">
                    <DatabaseBackup className="text-purple-500" size={24} />
                    <div>
                        <h2 className="text-lg font-bold">Copias de Seguridad</h2>
                        <p className="text-sm text-crm-fg-muted">Snapshots manuales de la base de datos.</p>
                    </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3 mb-6">
                    <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                    <div className="text-sm text-amber-500 space-y-2">
                        <p><strong>Atención sobre Restauraciones:</strong> El sistema actualmente solo permite <strong>exportar</strong> datos de manera manual mediante formato JSON. La restauración automática desde un archivo JSON no está implementada.</p>
                        <p>En caso de desastre, contacte al administrador de sistemas para realizar una inyección manual en MongoDB utilizando este archivo.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-sm text-crm-fg">El archivo exportado contendrá un volcado en crudo de todas las colecciones principales (Clientes, Leads, Ventas, Cotizaciones). No incluye logs técnicos ni configuraciones volátiles.</p>
                    
                    <button 
                        onClick={() => setConfirmModalOpen(true)}
                        disabled={downloading}
                        className="flex items-center justify-center gap-2 w-full bg-crm-bg border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500 py-4 rounded-xl font-black transition-colors disabled:opacity-50"
                    >
                        <Download size={20} /> 
                        {downloading ? 'Generando Archivo...' : 'Descargar Backup Completo (.JSON)'}
                    </button>
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                onConfirm={handleExport}
                title="Exportar Base de Datos"
                message="Esta acción exportará datos confidenciales de todos los clientes y transacciones. Asegúrate de guardar el archivo en un entorno seguro."
                confirmText="Exportar"
                isDestructive={false}
            />
        </div>
    );
}
