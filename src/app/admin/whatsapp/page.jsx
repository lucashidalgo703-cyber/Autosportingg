"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Send, Search, AlertTriangle, Phone, CheckCircle, ChevronLeft, MessageCircle, Sparkles } from 'lucide-react';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS } from '../../../utils/adminPermissions';
import { parseResponseSafe } from '../../../utils/apiHelper';
import toast from 'react-hot-toast';

export default function WhatsAppPage() {
    const [isConfigured, setIsConfigured] = useState(false);
    const [inbox, setInbox] = useState([]);
    const [activeContactId, setActiveContactId] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Arturito IA State
    const [arturitoStatus, setArturitoStatus] = useState({ available: false, enabled: false, configured: false });
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [suggestedText, setSuggestedText] = useState('');
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');

    // New State for Tabs and New Message feature
    const [activeTab, setActiveTab] = useState('Bandeja');
    const [contactsList, setContactsList] = useState([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [newMsgTarget, setNewMsgTarget] = useState('');
    const [newMsgText, setNewMsgText] = useState('');

    const loadContactsForNewMessage = async () => {
        if (contactsList.length > 0) return;
        setLoadingContacts(true);
        try {
            const token = localStorage.getItem('token');
            const [cRes, lRes] = await Promise.all([
                fetch('/api/admin/clients?limit=1000', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/admin/leads?limit=1000', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const cData = cRes.ok ? await parseResponseSafe(cRes) : { clients: [] };
            const lData = lRes.ok ? await parseResponseSafe(lRes) : { leads: [] };

            const clients = (cData.clients || cData || []).filter(c => c.phone).map(c => ({...c, type: 'client'}));
            const leads = (lData.leads || lData || []).filter(l => l.phone).map(l => ({...l, type: 'lead'}));

            setContactsList([...clients, ...leads].sort((a,b) => (a.firstName || '').localeCompare(b.firstName || '')));
        } catch (e) {
            toast.error('Error cargando contactos para nuevo mensaje');
        } finally {
            setLoadingContacts(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'Nuevo mensaje') {
            loadContactsForNewMessage();
        }
    }, [activeTab]);

    const checkConfig = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/whatsapp/config', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await parseResponseSafe(res);
            setIsConfigured(data.configured);
        } catch (e) {
            setIsConfigured(false);
        }
    };

    const fetchTemplates = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/whatsapp/templates', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await parseResponseSafe(res);
            setTemplates(Array.isArray(data) ? data : []);
        } catch (e) {
            setTemplates([]);
        }
    };

    const fetchArturitoStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/arturito/status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await parseResponseSafe(res);
            setArturitoStatus(data);
        } catch (e) {
            setArturitoStatus({ available: false, enabled: false, configured: false });
        }
    };

    const fetchInbox = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/whatsapp/inbox', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await parseResponseSafe(res);
            setInbox(data);
        } catch (e) {
            toast.error(e.message);
        }
    };

    useEffect(() => {
        checkConfig();
        fetchArturitoStatus();
        fetchTemplates();
        fetchInbox();

        // Simple polling for new messages if needed
        const interval = setInterval(fetchInbox, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeContactId, inbox]);

    useEffect(() => {
        setSuggestedText('');
    }, [activeContactId, activeTab, newMsgTarget]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!isConfigured) return toast.error('Integración no configurada');

        const activeItem = inbox.find(i => i.contact?._id === activeContactId);
        if (!activeItem || !activeItem.contact?.phone) return toast.error('El contacto no tiene teléfono válido');

        // Verify if it's within 24h
        const lastInboundMsg = [...activeItem.messages].sort((a,b) => new Date(b.contactDate) - new Date(a.contactDate)).find(m => m.direction === 'inbound');
        const diffHours = lastInboundMsg ? (new Date() - new Date(lastInboundMsg.contactDate)) / (1000 * 60 * 60) : Infinity;
        const isWithin24h = diffHours < 24;

        if (!isWithin24h && !selectedTemplate) {
            return toast.error('Debes seleccionar una plantilla para contactos fuera de la ventana de 24h.');
        }

        if (isWithin24h && !newMessage.trim()) return;

        const isAssisted = !!suggestedText;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                to: activeItem.contact.phone,
                text: isWithin24h ? newMessage : '',
                templateName: !isWithin24h ? selectedTemplate : undefined,
                templateLanguage: !isWithin24h ? templates.find(t => t.name === selectedTemplate)?.language : undefined,
                [activeItem.type === 'client' ? 'clientId' : 'leadId']: activeItem.contact._id,
                wasAiAssisted: isAssisted,
                suggestedMessage: isAssisted ? suggestedText : undefined
            };

            const res = await fetch('/api/admin/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            await parseResponseSafe(res);

            setNewMessage('');
            setSelectedTemplate('');
            setSuggestedText('');
            fetchInbox();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSendNew = async (e) => {
        e.preventDefault();
        if (!isConfigured) return toast.error('Integración no configurada');
        if (!newMsgText.trim() || !newMsgTarget) return;

        const targetContact = contactsList.find(c => c._id === newMsgTarget);
        if (!targetContact || !targetContact.phone) return toast.error('El contacto seleccionado no tiene un teléfono válido');

        const isAssisted = !!suggestedText;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                to: targetContact.phone,
                text: newMsgText,
                [targetContact.type === 'client' ? 'clientId' : 'leadId']: targetContact._id,
                wasAiAssisted: isAssisted,
                suggestedMessage: isAssisted ? suggestedText : undefined
            };

            const res = await fetch('/api/admin/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            await parseResponseSafe(res);

            toast.success('Mensaje enviado exitosamente');
            setNewMsgText('');
            setNewMsgTarget('');
            setSuggestedText('');
            setActiveTab('Bandeja');
            fetchInbox();
            setActiveContactId(targetContact._id);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSuggestReply = async (contactId, contactType, setTextFn) => {
        if (!arturitoStatus.available) return;
        setIsAiLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/arturito/suggest-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ contactId, contactType })
            });
            const data = await parseResponseSafe(res);
            if (data.suggestion) {
                setTextFn(data.suggestion);
                setSuggestedText(data.suggestion);
                toast.success('Sugerencia generada', { icon: '✨' });
            } else {
                toast.error('No se pudo generar sugerencia');
            }
        } catch (error) {
            toast.error(error.message || 'Error al sugerir respuesta');
        } finally {
            setIsAiLoading(false);
        }
    };

    const filteredInbox = inbox.filter(item => {
        if (activeTab === 'Leads' && item.type !== 'lead') return false;

        if (!search) return true;
        const name = `${item.contact?.firstName || ''} ${item.contact?.lastName || ''}`.toLowerCase();
        const phone = item.contact?.phone || '';
        const notes = item.messages?.[0]?.notes || '';
        const s = search.toLowerCase();
        return name.includes(s) || phone.includes(s) || notes.toLowerCase().includes(s);
    });

    const activeItem = inbox.find(i => i.contact?._id === activeContactId);
    // Sort messages oldest first for display
    const activeMessages = activeItem ? [...activeItem.messages].sort((a,b) => new Date(a.contactDate) - new Date(b.contactDate)) : [];

    // Evaluate 24h window for the active chat
    const lastInboundMsg = activeMessages.slice().reverse().find(m => m.direction === 'inbound');
    const diffHours = lastInboundMsg ? (new Date() - new Date(lastInboundMsg.contactDate)) / (1000 * 60 * 60) : Infinity;
    const isWithin24h = diffHours < 24;

    return (
        <PermissionGuard permission={PERMISSIONS.WHATSAPP_READ}>
            <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-crm-bg flex-col">
                {/* Header Principal */}
                <div className="bg-crm-bg p-4 md:px-6 md:pt-6 md:pb-2 shrink-0">
                    <h1 className="text-2xl font-black text-crm-fg">Conversaciones (Arturito)</h1>
                    <p className="text-crm-fg-muted mt-1 text-sm">{filteredInbox.length} leads con conversación · sync cada 1 min</p>
                </div>

                {/* Sidebar Navigation */}
                <div className="flex border-b border-crm-border bg-crm-bg shrink-0 px-4 md:px-6">
                    {['Bandeja', 'Leads', 'Nuevo mensaje'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                if (tab !== 'Bandeja' && tab !== 'Leads') setActiveContactId(null);
                            }}
                            className={`px-4 py-3 text-sm font-black transition-colors ${activeTab === tab ? 'border-b-2 border-green-500 text-green-500' : 'text-crm-fg-muted hover:text-crm-fg bg-transparent border-0 appearance-none'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Panel Izquierdo: Lista de Contactos */}
                    <div className={`w-full flex-col border-r border-crm-border bg-crm-surface md:flex md:w-80 lg:w-96 ${activeContactId || activeTab === 'Nuevo mensaje' ? 'hidden md:flex' : 'flex'}`}>
                        <div className="p-4 border-b border-crm-border bg-crm-bg">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-subtle" size={16} />
                                <input
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    placeholder="Buscar conversaciones"
                                    className="w-full bg-crm-bg border border-crm-border rounded-xl h-10 pl-10 pr-4 text-sm text-crm-fg focus:border-green-500 outline-none transition-colors"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {filteredInbox.length === 0 ? (
                                <div className="text-center p-8 text-crm-fg-muted text-sm font-medium">Sin leads de Arturito todavía.</div>
                            ) : (
                                filteredInbox.map(item => {
                                    const contact = item.contact;
                                    if (!contact) return null;
                                    const latestMsg = item.messages[0]; // because inbox is sorted -1

                                    return (
                                        <button
                                            key={contact._id}
                                            onClick={() => setActiveContactId(contact._id)}
                                            className={`w-full text-left p-3 rounded-xl transition-colors flex gap-3 ${activeContactId === contact._id ? 'bg-crm-red/10 border border-crm-red/20' : 'hover:bg-crm-bg border border-transparent'}`}
                                        >
                                            <div className="mt-1">
                                                <div className="w-10 h-10 rounded-full bg-crm-border flex items-center justify-center text-crm-fg-muted font-bold uppercase">
                                                    {(contact.firstName || 'C').charAt(0)}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <span className="text-sm font-bold text-crm-fg truncate pr-2">
                                                        {contact.firstName} {contact.lastName}
                                                    </span>
                                                    <span className="text-[10px] text-crm-fg-subtle whitespace-nowrap">
                                                        {new Date(latestMsg.contactDate).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-crm-fg-subtle truncate">
                                                    {latestMsg.direction === 'outbound' ? 'Tú: ' : ''}{latestMsg.notes}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Panel Derecho: Chat Activo o Nuevo Mensaje */}
                    <div className={`flex-1 flex-col ${activeContactId || activeTab === 'Nuevo mensaje' ? 'flex' : 'hidden md:flex'}`}>
                        {activeTab === 'Nuevo mensaje' ? (
                            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-crm-bg">
                                <div className="max-w-2xl mx-auto bg-crm-surface border border-crm-border rounded-2xl shadow-sm p-6">
                                    <h2 className="text-xl font-black text-crm-fg mb-2 flex items-center gap-2">
                                        <MessageCircle className="text-green-500" />
                                        Nuevo Mensaje de WhatsApp
                                    </h2>
                                    <p className="text-sm text-crm-fg-muted mb-6">
                                        Selecciona un cliente o lead para enviarle un mensaje inicial. Recuerda que si está fuera de la ventana de 24h, Meta requiere plantillas pre-aprobadas (función no disponible en esta fase).
                                    </p>

                                    {!isConfigured && (
                                        <div className="p-4 mb-6 bg-crm-warning/10 border border-crm-warning/20 rounded-xl flex items-start gap-3 text-crm-warning text-sm font-bold">
                                            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                                            <div>
                                                Integración de Meta/WhatsApp no configurada. No podrás enviar mensajes.
                                            </div>
                                        </div>
                                    )}

                                    <form onSubmit={handleSendNew} className="space-y-5">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">Destinatario</label>
                                            <select
                                                required
                                                disabled={loadingContacts || !isConfigured}
                                                value={newMsgTarget}
                                                onChange={e => setNewMsgTarget(e.target.value)}
                                                className="w-full h-11 bg-crm-bg border border-crm-border rounded-xl px-4 text-sm text-crm-fg focus:border-green-500 outline-none transition-colors disabled:opacity-50"
                                            >
                                                <option value="">Seleccionar contacto...</option>
                                                {contactsList.map(c => (
                                                    <option key={c._id} value={c._id}>
                                                        {c.firstName} {c.lastName} ({c.phone}) - {c.type === 'lead' ? 'Lead' : 'Cliente'}
                                                    </option>
                                                ))}
                                            </select>
                                            {loadingContacts && <p className="text-xs text-crm-fg-muted mt-2">Cargando contactos...</p>}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5 flex justify-between items-center">
                                                <span>Mensaje</span>
                                                <button
                                                    type="button"
                                                    disabled={!newMsgTarget || !arturitoStatus.available || isAiLoading}
                                                    onClick={() => {
                                                        const targetContact = contactsList.find(c => c._id === newMsgTarget);
                                                        if (targetContact) handleSuggestReply(targetContact._id, targetContact.type, setNewMsgText);
                                                    }}
                                                    className="flex items-center gap-1 text-green-500 hover:text-green-600 disabled:opacity-50 disabled:text-crm-fg-subtle transition-colors"
                                                    title={!arturitoStatus.available ? "Arturito no configurado" : "Generar sugerencia con IA"}
                                                >
                                                    {isAiLoading ? <div className="w-3 h-3 border border-green-500 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={14} />}
                                                    <span className="hidden sm:inline">Sugerir</span>
                                                </button>
                                            </label>
                                            <textarea
                                                required
                                                disabled={!isConfigured || loading}
                                                value={newMsgText}
                                                onChange={e => setNewMsgText(e.target.value)}
                                                placeholder="Escribe el mensaje..."
                                                rows={5}
                                                className="w-full bg-crm-bg border border-crm-border rounded-xl p-4 text-sm text-crm-fg focus:border-green-500 outline-none transition-colors resize-y disabled:opacity-50"
                                            />
                                        </div>

                                        <PermissionGuard permission={PERMISSIONS.WHATSAPP_WRITE}>
                                            <div className="pt-2 flex justify-end">
                                                <button
                                                    type="submit"
                                                    disabled={loading || !newMsgTarget || !newMsgText.trim() || !isConfigured}
                                                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-green-600 px-6 text-sm font-black text-white hover:bg-green-500 transition-colors disabled:opacity-50"
                                                >
                                                    {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={18} />}
                                                    Enviar Mensaje
                                                </button>
                                            </div>
                                        </PermissionGuard>
                                    </form>
                                </div>
                            </div>
                        ) : activeContactId && activeItem && activeItem.contact ? (
                            <>
                                {/* Header Chat */}
                                <div className="h-16 border-b border-crm-border bg-crm-surface flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <button onClick={() => setActiveContactId(null)} className="md:hidden p-2 -ml-2 text-crm-fg-muted">
                                            <ChevronLeft size={24} />
                                        </button>
                                        <div className="w-10 h-10 rounded-full bg-crm-border flex items-center justify-center text-crm-fg-muted font-bold shrink-0 uppercase">
                                            {(activeItem.contact.firstName || 'C').charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-black text-crm-fg truncate">
                                                {activeItem.contact.firstName} {activeItem.contact.lastName}
                                            </h3>
                                            <p className="text-xs text-crm-fg-muted truncate flex items-center gap-1">
                                                <Phone size={10} /> {activeItem.contact.phone || 'Sin número'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Hilo de Mensajes */}
                                <div className="flex-1 overflow-y-auto p-4 bg-crm-bg space-y-4">
                                    {activeMessages.map((msg, i) => {
                                        const isOutbound = msg.direction === 'outbound';

                                        return (
                                            <div key={msg._id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[75%] ${isOutbound ? 'items-end' : 'items-start'} flex flex-col`}>
                                                    <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                                                        isOutbound ? 'bg-green-600 text-white rounded-br-sm' : 'bg-crm-surface text-crm-fg border border-crm-border rounded-bl-sm'
                                                    }`}>
                                                        <p className="whitespace-pre-wrap break-words">{msg.notes}</p>
                                                    </div>
                                                    <div className="text-[10px] text-crm-fg-subtle mt-1 mx-1 flex items-center gap-1">
                                                        {new Date(msg.contactDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {isOutbound && (
                                                            <span className={msg.deliveryStatus === 'read' ? 'text-blue-400' : 'text-crm-fg-subtle'}>
                                                                {msg.deliveryStatus === 'failed' ? '❌' : (msg.deliveryStatus === 'sent' || msg.deliveryStatus === 'delivered' || msg.deliveryStatus === 'read' ? '✓✓' : '✓')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {msg.errorMessage && <div className="text-[10px] text-red-500 mt-0.5 mx-1">Error: {msg.errorMessage}</div>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area */}
                                <PermissionGuard permission={PERMISSIONS.WHATSAPP_WRITE}>
                                    <div className="p-4 bg-crm-surface border-t border-crm-border shrink-0">
                                        {!isConfigured ? (
                                            <div className="p-3 bg-crm-warning/10 border border-crm-warning/20 rounded-xl flex items-center gap-2 text-crm-warning text-sm font-bold">
                                                <AlertTriangle size={16} />
                                                Integración no configurada. No se pueden enviar mensajes.
                                            </div>
                                        ) : (
                                            <>
                                                <div className="mb-2 text-xs font-bold text-crm-warning flex items-center justify-between gap-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <AlertTriangle size={14} />
                                                        Mensajes libres solo dentro de ventana activa (24h).
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2 relative">
                                                    {!isWithin24h ? (
                                                        <div className="flex flex-col gap-2">
                                                            <div className="text-xs font-bold text-red-500 mb-1">
                                                                Ventana de 24h vencida. Selecciona una plantilla pre-aprobada para reconectar:
                                                            </div>
                                                            {templates.length > 0 ? (
                                                                <select
                                                                    value={selectedTemplate}
                                                                    onChange={e => setSelectedTemplate(e.target.value)}
                                                                    className="w-full bg-crm-bg border border-crm-border rounded-xl px-4 py-3 text-sm text-crm-fg focus:border-green-500 outline-none transition-colors disabled:opacity-50"
                                                                >
                                                                    <option value="">Seleccionar plantilla...</option>
                                                                    {templates.map(t => (
                                                                        <option key={t.name} value={t.name}>{t.label || t.name} ({t.language})</option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                                                                    No hay plantillas configuradas.
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <textarea
                                                            value={newMessage}
                                                            onChange={e => setNewMessage(e.target.value)}
                                                            placeholder="Escribe un mensaje..."
                                                            disabled={loading}
                                                            rows={2}
                                                            className="w-full bg-crm-bg border border-crm-border rounded-xl px-4 py-3 text-sm text-crm-fg focus:border-green-500 outline-none transition-colors disabled:opacity-50 resize-none pr-12"
                                                        />
                                                    )}
                                                    <div className="flex justify-between items-center">
                                                        <button
                                                            type="button"
                                                            disabled={!arturitoStatus.available || isAiLoading}
                                                            onClick={() => handleSuggestReply(activeItem.contact._id, activeItem.type, setNewMessage)}
                                                            className="flex items-center gap-1.5 text-xs font-bold text-green-500 hover:bg-green-500/10 px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                                                            title={!arturitoStatus.available ? "Arturito no configurado" : "Sugerir respuesta con Arturito"}
                                                        >
                                                            {isAiLoading ? <div className="w-3.5 h-3.5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={14} />}
                                                            Sugerir Respuesta
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleSend}
                                                            disabled={(isWithin24h ? !newMessage.trim() : !selectedTemplate) || loading}
                                                            className="h-9 px-4 flex items-center justify-center bg-green-600 text-white font-black text-sm rounded-lg hover:bg-green-500 shadow-sm disabled:opacity-50 transition-colors"
                                                        >
                                                            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Enviar <Send size={14} className="ml-1.5" /></>}
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </PermissionGuard>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-crm-bg">
                                <div className="w-20 h-20 bg-crm-surface rounded-full flex items-center justify-center border border-crm-border mb-4 shadow-sm">
                                    <MessageCircle size={32} className="text-crm-fg-muted" />
                                </div>
                                <h3 className="text-lg font-black text-crm-fg mb-2">Conversaciones (Arturito)</h3>
                                <p className="text-sm text-crm-fg-muted max-w-sm mb-4">
                                    Seleccioná una conversación.
                                </p>
                                {!isConfigured && (
                                    <div className="px-4 py-2 bg-crm-warning/10 text-crm-warning border border-crm-warning/20 rounded-lg text-sm font-bold flex items-center gap-2">
                                        <AlertTriangle size={16} />
                                        Estado: No configurado
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PermissionGuard>
    );
}
