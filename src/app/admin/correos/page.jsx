"use client";

import React, { useEffect, useState } from 'react';
import { Send, AlertTriangle, Mail, Paperclip, CheckCircle, Trash2, Key, X } from 'lucide-react';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS } from '../../../utils/adminPermissions';
import { parseResponseSafe } from '../../../utils/apiHelper';
import toast from 'react-hot-toast';
import CrmModal from '../../../components/crm/ui/CrmModal';
import CrmButton from '../../../components/crm/ui/CrmButton';
import ConfirmModal from '../../../components/crm/ui/ConfirmModal';

export default function CorreosPage() {
    const [oauthConfig, setOauthConfig] = useState(null);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clientIdInput, setClientIdInput] = useState('');
    const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);

    // Form state
    const [selectedContact, setSelectedContact] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [fileError, setFileError] = useState('');

    const checkConfig = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/email/oauth-config', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await parseResponseSafe(res);
            setOauthConfig(data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchContacts = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/clients?limit=1000', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await parseResponseSafe(res);
            const clientsList = data.clients || data || [];
            if (Array.isArray(clientsList)) {
                setClients(clientsList.filter(c => c.email));
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        checkConfig();
        fetchContacts();
    }, []);

    const handleSaveClientId = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/email/oauth-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ clientId: clientIdInput })
            });
            if (!res.ok) throw new Error('Error al guardar configuración');

            await checkConfig();
            setIsModalOpen(false);
            toast.success('Client ID guardado. OAuth real pendiente de configuración en Google Cloud.');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteConfig = async () => {
        setConfirmDeleteModal(true);
    };

    const confirmDeleteConfig = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/email/oauth-config', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al borrar configuración');

            await checkConfig();
            setConfirmDeleteModal(false);
            toast.success('Configuración borrada exitosamente');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const openModal = () => {
        setClientIdInput(oauthConfig?.clientId || '');
        setIsModalOpen(true);
    };

    // SMTP Fallback Form Logic
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setFileError('');
        let validFiles = [];
        for (let file of files) {
            if (file.size > 5 * 1024 * 1024) {
                setFileError(`El archivo ${file.name} excede los 5MB permitidos.`);
                return;
            }
            if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
                setFileError(`El archivo ${file.name} no tiene un formato soportado (solo PDF, JPG, PNG).`);
                return;
            }
            validFiles.push(file);
        }
        setAttachments(validFiles);
    };

    const removeFile = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async (e) => {
        e.preventDefault();
        const client = clients.find(c => c._id === selectedContact);
        if (!client) return toast.error('Selecciona un destinatario');

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const base64Attachments = await Promise.all(attachments.map(async (file) => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve({
                        filename: file.name,
                        contentType: file.type,
                        content: reader.result
                    });
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }));

            const payload = {
                to: client.email,
                subject,
                html: body,
                clientId: client._id,
                attachments: base64Attachments
            };

            const res = await fetch('/api/admin/emails/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            await parseResponseSafe(res);

            toast.success('Correo enviado exitosamente');
            setSubject('');
            setBody('');
            setSelectedContact('');
            setAttachments([]);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const isGmailConfigured = oauthConfig?.provider === 'gmail-oauth' && oauthConfig?.clientId;

    return (
        <PermissionGuard permission={PERMISSIONS.CORREOS_READ}>
            <div className="flex h-[calc(100vh-64px)] w-full flex-col bg-crm-bg p-4 md:p-6 overflow-y-auto">
                <div className="max-w-4xl mx-auto w-full space-y-6">

                    {/* Header Principal */}
                    <div>
                        <h1 className="text-2xl font-black text-crm-fg">Mi Correo</h1>
                        <p className="text-crm-fg-muted mt-1">Conectá tu cuenta de Gmail para ver tu bandeja desde el CRM.</p>
                    </div>

                    {/* Banner OAuth Config */}
                    <div className="bg-crm-surface border border-crm-border rounded-2xl shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-full ${isGmailConfigured ? 'bg-green-500/10 text-green-500' : 'bg-crm-bg text-crm-fg-muted'}`}>
                                <Mail size={32} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-crm-fg">
                                    {isGmailConfigured ? 'Gmail vinculado' : 'Vincular Gmail'}
                                </h3>
                                <p className="text-sm text-crm-fg-muted mt-0.5 max-w-md">
                                    {isGmailConfigured
                                        ? 'Has guardado un Client ID. La sincronización OAuth real está pendiente de configuración en Google Cloud (Fase futura).'
                                        : 'Aún no has conectado tu cuenta. Configura tu Client ID para habilitar la futura sincronización de bandeja.'}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto flex-col sm:flex-row">
                            {!isGmailConfigured ? (
                                <PermissionGuard permission={PERMISSIONS.CORREOS_WRITE}>
                                    <button
                                        onClick={openModal}
                                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm rounded-xl shadow-sm transition-colors whitespace-nowrap"
                                    >
                                        Conectar con Google
                                    </button>
                                </PermissionGuard>
                            ) : (
                                <PermissionGuard permission={PERMISSIONS.CORREOS_WRITE}>
                                    <button
                                        onClick={openModal}
                                        className="px-4 py-2.5 bg-crm-bg border border-crm-border text-crm-fg font-black text-sm rounded-xl hover:bg-crm-surface transition-colors whitespace-nowrap flex items-center justify-center gap-2"
                                    >
                                        <Key size={16} /> Cambiar Client ID
                                    </button>
                                    <button
                                        onClick={handleDeleteConfig}
                                        disabled={loading}
                                        className="px-4 py-2.5 bg-crm-red/10 text-crm-red font-black text-sm rounded-xl hover:bg-crm-red hover:text-white transition-colors whitespace-nowrap flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={16} /> Borrar configuración
                                    </button>
                                </PermissionGuard>
                            )}
                        </div>
                    </div>

                    {/* Fallback Técnico */}
                    <div className="bg-crm-warning/10 border border-crm-warning/20 p-4 rounded-xl flex items-start gap-3 text-crm-warning text-sm font-bold shadow-sm">
                        <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                        <div>
                            <p>Este entorno usa SMTP hasta configurar OAuth.</p>
                            <p className="font-medium mt-1 opacity-90">
                                Puedes usar el formulario debajo como fallback técnico para el envío saliente de correos.
                            </p>
                        </div>
                    </div>

                    {/* Formulario Fallback (Secundario visualmente) */}
                    <div className="bg-crm-surface border border-crm-border rounded-2xl shadow-sm overflow-hidden opacity-90 hover:opacity-100 transition-opacity">
                        <div className="p-4 border-b border-crm-border bg-crm-bg/50">
                            <h2 className="text-sm font-black text-crm-fg uppercase tracking-wider">Redactar vía SMTP (Fallback)</h2>
                        </div>

                        <form onSubmit={handleSend} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">Para</label>
                                <select
                                    required
                                    value={selectedContact}
                                    onChange={e => setSelectedContact(e.target.value)}
                                    className="w-full h-11 bg-crm-bg border border-crm-border rounded-xl px-4 text-sm text-crm-fg focus:border-blue-500 outline-none transition-colors"
                                >
                                    <option value="">Seleccionar cliente...</option>
                                    {clients.map(c => (
                                        <option key={c._id} value={c._id}>{c.firstName} {c.lastName} ({c.email})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">Asunto</label>
                                <input
                                    required
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    placeholder="Motivo del correo"
                                    className="w-full h-11 bg-crm-bg border border-crm-border rounded-xl px-4 text-sm text-crm-fg focus:border-blue-500 outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">Mensaje</label>
                                <textarea
                                    required
                                    value={body}
                                    onChange={e => setBody(e.target.value)}
                                    placeholder="Escribe el cuerpo del mensaje..."
                                    rows={5}
                                    className="w-full bg-crm-bg border border-crm-border rounded-xl p-4 text-sm text-crm-fg focus:border-blue-500 outline-none transition-colors resize-y"
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-2 cursor-pointer w-fit text-sm font-bold text-blue-500 hover:text-blue-400 transition-colors">
                                    <Paperclip size={18} />
                                    Adjuntar Archivos (PDF/IMG, max 5MB)
                                    <input
                                        type="file"
                                        multiple
                                        accept=".pdf,image/jpeg,image/png"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </label>
                                {fileError && <p className="text-xs font-bold text-crm-warning mt-2">{fileError}</p>}

                                {attachments.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {attachments.map((file, idx) => (
                                            <div key={idx} className="flex items-center gap-2 bg-crm-bg border border-crm-border px-3 py-1.5 rounded-lg text-xs font-medium text-crm-fg">
                                                <span className="truncate max-w-[200px]">{file.name}</span>
                                                <button type="button" onClick={() => removeFile(idx)} className="text-crm-fg-muted hover:text-crm-red">✕</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <PermissionGuard permission={PERMISSIONS.CORREOS_WRITE}>
                                <div className="pt-4 border-t border-crm-border flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-black text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
                                    >
                                        {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={18} />}
                                        Enviar vía SMTP
                                    </button>
                                </div>
                            </PermissionGuard>
                        </form>
                    </div>
                </div>

                {/* Modal Client ID */}
                {isModalOpen && (
                    <CrmModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Configurar Gmail OAuth">
                        <form onSubmit={handleSaveClientId} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">Google Client ID</label>
                                <input
                                    required
                                    type="text"
                                    value={clientIdInput}
                                    onChange={e => setClientIdInput(e.target.value)}
                                    placeholder="Ej. 123456789-abc.apps.googleusercontent.com"
                                    className="w-full h-11 bg-crm-bg border border-crm-border rounded-xl px-4 text-sm text-crm-fg focus:border-blue-500 outline-none transition-colors"
                                />
                                <p className="text-xs text-crm-fg-muted mt-2">
                                    El Client Secret deberá configurarse por variable de entorno por seguridad.
                                </p>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-crm-fg-muted hover:text-crm-fg">Cancelar</button>
                                <button disabled={loading || !clientIdInput.trim()} type="submit" className="rounded-xl bg-blue-600 px-6 py-2 text-sm font-black text-white hover:bg-blue-500 shadow-sm disabled:opacity-50">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </CrmModal>
                )}

                <ConfirmModal
                    isOpen={confirmDeleteModal}
                    onClose={() => setConfirmDeleteModal(false)}
                    onConfirm={confirmDeleteConfig}
                    title="Borrar Configuración"
                    message="¿Estás seguro de borrar la configuración de Gmail? Esto desconectará la integración."
                    confirmText="Borrar"
                    isDestructive={true}
                />
            </div>
        </PermissionGuard>
    );
}
