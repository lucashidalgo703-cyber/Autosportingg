"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Send, Search, Archive, Plus, Inbox, ChevronLeft, Paperclip, Smile, Trash2, Users, Image as ImageIcon, FileText, X, CheckCircle } from 'lucide-react';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS } from '../../../utils/adminPermissions';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import ConfirmModal from '../../../components/crm/ui/ConfirmModal';

const EMOJIS = ['😀','😂','😍','👍','🙏','🔥','🎉','❤️','👀','🙌','🤔','😎','✅','❌','✨','💡','👋','🤝'];
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'];
const BLOCKED_EXTS = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.scr', '.ps1', '.js', '.vbs', '.jar', '.com'];

export default function MensajesPage() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [activeConvId, setActiveConvId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [search, setSearch] = useState('');
    const [messageSearch, setMessageSearch] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    const [isCreateOpen, setCreateOpen] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchConversations = async (silent = false) => {
        if (!silent) setLoadingConvs(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/messages/conversations', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al cargar conversaciones');
            const data = await res.json();
            // Sort General channel to top always
            const sortedData = data.sort((a, b) => {
                if (a.type === 'general') return -1;
                if (b.type === 'general') return 1;
                return 0; // maintain their lastMessageAt sort from backend
            });
            setConversations(sortedData);
        } catch (error) {
            if (!silent) toast.error('Error al cargar conversaciones');
        } finally {
            if (!silent) setLoadingConvs(false);
        }
    };

    const fetchMessages = async (convId, silent = false) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/messages/conversations/${convId}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al cargar mensajes');
            const data = await res.json();
            setMessages(data);
            if (!silent) setTimeout(scrollToBottom, 100);

            // Marcar como leídos si hay no leídos en esta conve localmente
            const conv = conversations.find(c => c._id === convId);
            if (conv && conv.unreadCount > 0) {
                await fetch(`/api/admin/messages/conversations/${convId}/read`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                fetchConversations(true); // update counts
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (user) fetchConversations();
    }, [user]);

    // Polling setup
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(() => {
            fetchConversations(true);
            if (activeConvId) {
                fetchMessages(activeConvId, true);
            }
        }, 15000); // 15 seconds
        return () => clearInterval(interval);
    }, [user, activeConvId]);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (attachments.length + files.length > 4) {
            toast.error('Máximo 4 archivos permitidos');
            return;
        }

        files.forEach(file => {
            if (file.size > 2 * 1024 * 1024) {
                toast.error(`El archivo ${file.name} supera los 2 MB`);
                return;
            }
            if (!ALLOWED_MIME.includes(file.type)) {
                toast.error(`Tipo de archivo no permitido: ${file.type}`);
                return;
            }
            const lowerName = file.name.toLowerCase();
            if (BLOCKED_EXTS.some(ext => lowerName.endsWith(ext))) {
                toast.error(`Archivo ejecutable bloqueado: ${file.name}`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                setAttachments(prev => [...prev, {
                    filename: file.name,
                    contentType: file.type,
                    size: file.size,
                    url: event.target.result // base64
                }]);
            };
            reader.readAsDataURL(file);
        });

        // Reset input
        e.target.value = null;
    };

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && attachments.length === 0) || !activeConvId) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/messages/conversations/${activeConvId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    content: newMessage,
                    attachments
                })
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Error al enviar');
            }

            setNewMessage('');
            setAttachments([]);
            setShowEmoji(false);
            fetchMessages(activeConvId);
            fetchConversations(true); // update lastMessage
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleArchive = async (convId, archiveStatus) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/messages/conversations/${convId}/archive`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ archive: archiveStatus })
            });
            if (!res.ok) throw new Error('Error al archivar');
            toast.success(archiveStatus ? 'Conversación archivada' : 'Conversación desarchivada');
            if (archiveStatus && activeConvId === convId) setActiveConvId(null);
            fetchConversations();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleClearHistory = async () => {
        if (!activeConvId) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/messages/conversations/${activeConvId}/clear-history`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al borrar historial');
            toast.success('Historial borrado');
            setShowClearConfirm(false);
            setMessages([]);
            fetchConversations(true);
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Filter convs
    const filteredConvs = conversations.filter(c => {
        const isArchived = c.archivedBy.includes(user?.username);
        if (showArchived ? !isArchived : isArchived) return false;

        if (search) {
            const q = search.toLowerCase();
            const groupMatch = c.groupName && c.groupName.toLowerCase().includes(q);
            const partMatch = c.participants.join(' ').toLowerCase().includes(q);
            const subMatch = c.subject && c.subject.toLowerCase().includes(q);
            return groupMatch || partMatch || subMatch;
        }
        return true;
    });

    const activeConv = conversations.find(c => c._id === activeConvId);

    const getChatTitle = (conv) => {
        if (conv.type === 'general') return 'Canal General';
        if (conv.type === 'group') return conv.groupName || 'Grupo sin nombre';
        const otherParticipants = conv.participants.filter(p => p !== user?.username).join(', ');
        return conv.subject || otherParticipants || 'Chat Solitario';
    };

    // Filter messages inside active chat
    const filteredMessages = messages.filter(msg => {
        if (!messageSearch) return true;
        return msg.content.toLowerCase().includes(messageSearch.toLowerCase());
    });

    return (
        <PermissionGuard permission={PERMISSIONS.MENSAJES_READ}>
            <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-crm-bg">
                {/* Panel Izquierdo: Lista de Conversaciones */}
                <div className={`w-full flex-col border-r border-crm-border bg-crm-surface md:flex md:w-80 lg:w-96 ${activeConvId ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-crm-border">
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="text-lg font-black text-crm-fg">Mensajes</h2>
                            <PermissionGuard permission={PERMISSIONS.MENSAJES_WRITE}>
                                <button onClick={() => setCreateOpen(true)} className="p-2 bg-crm-red/10 text-crm-red hover:bg-crm-red hover:text-white rounded-xl transition-colors" title="Nuevo Mensaje">
                                    <Plus size={20} />
                                </button>
                            </PermissionGuard>
                        </div>
                        <p className="text-xs font-medium text-crm-fg-muted mb-4">Conectado como <span className="font-bold text-crm-fg">{user?.username}</span></p>

                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-subtle" size={16} />
                            <input
                                value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar chats o grupos..."
                                className="w-full bg-crm-bg border border-crm-border rounded-xl h-10 pl-10 pr-4 text-sm text-crm-fg focus:border-crm-red outline-none transition-colors"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => setShowArchived(false)} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${!showArchived ? 'bg-crm-bg text-crm-fg border border-crm-border' : 'text-crm-fg-muted hover:bg-crm-bg/50'}`}>
                                <Inbox size={14} className="inline mr-1" /> Bandeja
                            </button>
                            <button onClick={() => setShowArchived(true)} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${showArchived ? 'bg-crm-bg text-crm-fg border border-crm-border' : 'text-crm-fg-muted hover:bg-crm-bg/50'}`}>
                                <Archive size={14} className="inline mr-1" /> Archivados
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {loadingConvs ? (
                            <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-crm-red border-t-transparent rounded-full animate-spin" /></div>
                        ) : filteredConvs.length === 0 ? (
                            <div className="text-center p-8 text-crm-fg-muted text-sm font-medium">No hay conversaciones.</div>
                        ) : (
                            filteredConvs.map(conv => {
                                const title = getChatTitle(conv);
                                const isGeneral = conv.type === 'general';
                                const isGroup = conv.type === 'group';

                                return (
                                    <button
                                        key={conv._id}
                                        onClick={() => { setActiveConvId(conv._id); setMessageSearch(''); fetchMessages(conv._id); }}
                                        className={`w-full text-left p-3 rounded-xl transition-colors flex gap-3 ${activeConvId === conv._id ? 'bg-crm-red/10 border border-crm-red/20' : 'hover:bg-crm-bg border border-transparent'} ${isGeneral ? 'border-l-4 border-l-crm-red' : ''}`}
                                    >
                                        <div className="mt-1 shrink-0">
                                            <div className="w-10 h-10 rounded-full bg-crm-border flex items-center justify-center text-crm-fg-muted font-bold uppercase overflow-hidden">
                                                {isGeneral ? <Users size={20} /> : isGroup ? <Users size={18} /> : title.charAt(0)}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <span className={`text-sm truncate pr-2 ${conv.unreadCount > 0 || isGeneral ? 'font-black text-crm-fg' : 'font-bold text-crm-fg'}`}>
                                                    {title}
                                                </span>
                                                {conv.lastMessageAt && (
                                                    <span className="text-[10px] text-crm-fg-subtle whitespace-nowrap">
                                                        {new Date(conv.lastMessageAt).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'font-bold text-crm-fg-muted' : 'text-crm-fg-subtle'}`}>
                                                    {conv.lastMessage ? `${conv.lastMessage.author === user?.username ? 'Tú: ' : ''}${conv.lastMessage.content || (conv.lastMessage.attachments?.length ? '[Adjunto]' : '')}` : 'Sin mensajes'}
                                                </p>
                                                {conv.unreadCount > 0 && (
                                                    <span className="bg-crm-red text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                                                        {conv.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Panel Derecho: Chat Activo */}
                <div className={`flex-1 flex-col ${activeConvId ? 'flex' : 'hidden md:flex'}`}>
                    {activeConvId && activeConv ? (
                        <>
                            {/* Header Chat */}
                            <div className="h-16 border-b border-crm-border bg-crm-surface flex items-center justify-between px-4 shrink-0 shadow-sm z-10 gap-4">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <button onClick={() => setActiveConvId(null)} className="md:hidden p-2 -ml-2 text-crm-fg-muted">
                                        <ChevronLeft size={24} />
                                    </button>
                                    <div className="w-10 h-10 rounded-full bg-crm-border flex items-center justify-center text-crm-fg-muted font-bold shrink-0 uppercase overflow-hidden">
                                        {activeConv.type === 'general' || activeConv.type === 'group' ? <Users size={18} /> : getChatTitle(activeConv).charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-black text-crm-fg truncate">
                                            {getChatTitle(activeConv)}
                                        </h3>
                                        <p className="text-xs text-crm-fg-muted truncate">
                                            {activeConv.type === 'general' ? 'Toda la empresa' : activeConv.participants.join(', ')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="relative hidden sm:block">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-crm-fg-subtle" size={14} />
                                        <input
                                            value={messageSearch} onChange={e => setMessageSearch(e.target.value)}
                                            placeholder="Buscar en conv..."
                                            className="w-36 bg-crm-bg border border-crm-border rounded-lg h-8 pl-8 pr-3 text-xs text-crm-fg focus:border-crm-red outline-none transition-colors"
                                        />
                                    </div>
                                    <PermissionGuard permission={PERMISSIONS.MENSAJES_WRITE}>
                                        <button
                                            onClick={() => setShowClearConfirm(true)}
                                            className="p-2 text-crm-fg-muted hover:text-crm-red hover:bg-crm-bg rounded-lg transition-colors"
                                            title="Borrar historial local"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </PermissionGuard>
                                    {activeConv.type !== 'general' && (
                                        <button
                                            onClick={() => handleArchive(activeConv._id, !showArchived)}
                                            className="p-2 text-crm-fg-muted hover:text-crm-fg hover:bg-crm-bg rounded-lg transition-colors"
                                            title={showArchived ? 'Desarchivar' : 'Archivar'}
                                        >
                                            <Archive size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Hilo de Mensajes */}
                            <div className="flex-1 overflow-y-auto p-4 bg-crm-bg space-y-4">
                                {filteredMessages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-crm-fg-muted">
                                        <Inbox size={48} className="mb-4 opacity-20" />
                                        <p className="text-sm font-medium">Sé el primero en escribir algo</p>
                                    </div>
                                ) : (
                                    filteredMessages.map((msg, i) => {
                                        const isMe = msg.author === user?.username;
                                        const showHeader = i === 0 || filteredMessages[i-1].author !== msg.author;

                                        return (
                                            <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] sm:max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                                    {!isMe && showHeader && (
                                                        <span className="text-[10px] font-bold text-crm-fg-muted mb-1 ml-1">{msg.author}</span>
                                                    )}
                                                    <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                                                        isMe ? 'bg-crm-red text-white rounded-br-sm' : 'bg-crm-surface text-crm-fg border border-crm-border rounded-bl-sm'
                                                    }`}>
                                                        {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}

                                                        {msg.attachments && msg.attachments.length > 0 && (
                                                            <div className={`grid gap-2 mt-2 ${msg.attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                                {msg.attachments.map((att, aIdx) => (
                                                                    <div key={aIdx} className="rounded-lg overflow-hidden border border-black/10 bg-black/5 relative group">
                                                                        {att.contentType.startsWith('image/') ? (
                                                                            <a href={att.url} target="_blank" rel="noreferrer">
                                                                                <img src={att.url} alt={att.filename} className="w-full h-32 object-cover" />
                                                                            </a>
                                                                        ) : (
                                                                            <a href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 hover:bg-black/10 transition-colors">
                                                                                <FileText size={24} className={isMe ? 'text-white' : 'text-crm-red'} />
                                                                                <span className="text-xs truncate font-medium">{att.filename}</span>
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-crm-fg-subtle mt-1 mx-1 flex items-center gap-1">
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {isMe && <CheckCircle size={10} className={msg.readBy.length > 1 || activeConv.type === 'general' ? 'text-blue-400' : 'text-crm-fg-subtle'} />}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <PermissionGuard permission={PERMISSIONS.MENSAJES_WRITE}>
                                <div className="p-4 bg-crm-surface border-t border-crm-border shrink-0 relative">

                                    {/* Preview Adjuntos */}
                                    {attachments.length > 0 && (
                                        <div className="flex gap-2 overflow-x-auto pb-3 mb-2">
                                            {attachments.map((att, idx) => (
                                                <div key={idx} className="relative w-16 h-16 rounded-lg bg-crm-bg border border-crm-border flex items-center justify-center shrink-0 group">
                                                    {att.contentType.startsWith('image/') ? (
                                                        <img src={att.url} alt="preview" className="w-full h-full object-cover rounded-lg" />
                                                    ) : (
                                                        <FileText size={20} className="text-crm-fg-muted" />
                                                    )}
                                                    <button onClick={() => removeAttachment(idx)} className="absolute -top-2 -right-2 w-5 h-5 bg-crm-red text-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Emoji Panel */}
                                    {showEmoji && (
                                        <div className="absolute bottom-[80px] right-20 bg-crm-surface border border-crm-border rounded-xl shadow-xl p-2 w-64 grid grid-cols-6 gap-2 z-20">
                                            {EMOJIS.map(emoji => (
                                                <button
                                                    key={emoji}
                                                    onClick={() => { setNewMessage(prev => prev + emoji); setShowEmoji(false); }}
                                                    className="w-8 h-8 flex items-center justify-center text-lg hover:bg-crm-bg rounded-lg transition-colors"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                                        <div className="flex-1 bg-crm-bg border border-crm-border rounded-xl flex items-center pr-2 focus-within:border-crm-red transition-colors">
                                            <input
                                                value={newMessage}
                                                onChange={e => setNewMessage(e.target.value)}
                                                placeholder={activeConv.type === 'general' ? 'Mensaje en General...' : `Mensaje en ${getChatTitle(activeConv)}...`}
                                                className="w-full bg-transparent px-4 py-3 text-sm text-crm-fg outline-none"
                                            />
                                            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-crm-fg-muted hover:text-crm-fg transition-colors" title="Adjuntar (Máx 4)">
                                                <Paperclip size={18} />
                                            </button>
                                            <button type="button" onClick={() => setShowEmoji(!showEmoji)} className="p-2 text-crm-fg-muted hover:text-crm-fg transition-colors" title="Emoji">
                                                <Smile size={18} />
                                            </button>
                                            <input type="file" ref={fileInputRef} className="hidden" multiple accept=".jpg,.jpeg,.png,.webp,.pdf,.txt" onChange={handleFileChange} />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={(!newMessage.trim() && attachments.length === 0)}
                                            className="w-12 h-12 flex items-center justify-center bg-crm-red-gradient text-white rounded-xl shadow-crm-shadow-red disabled:opacity-50 transition-opacity shrink-0"
                                        >
                                            <Send size={18} className="ml-1" />
                                        </button>
                                    </form>
                                    <div className="text-[10px] text-crm-fg-subtle text-right mt-1">Soporta hasta 4 archivos de max 2MB (jpg, png, pdf, txt)</div>
                                </div>
                            </PermissionGuard>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-crm-bg">
                            <div className="w-20 h-20 bg-crm-surface rounded-full flex items-center justify-center border border-crm-border mb-4 shadow-sm">
                                <Inbox size={32} className="text-crm-fg-muted" />
                            </div>
                            <h3 className="text-lg font-black text-crm-fg mb-2">Mensajería Interna</h3>
                            <p className="text-sm text-crm-fg-muted max-w-sm">
                                Selecciona una conversación de la lista o crea una nueva para comunicarte con tu equipo.
                            </p>
                            <PermissionGuard permission={PERMISSIONS.MENSAJES_WRITE}>
                                <button onClick={() => setCreateOpen(true)} className="mt-6 px-6 py-2.5 bg-crm-red-gradient text-white text-sm font-black rounded-xl shadow-crm-shadow-red">
                                    Iniciar Conversación
                                </button>
                            </PermissionGuard>
                        </div>
                    )}
                </div>
            </div>

            <NewConversationModal
                isOpen={isCreateOpen}
                onClose={() => setCreateOpen(false)}
                onSuccess={(newConv) => {
                    fetchConversations();
                    setActiveConvId(newConv._id);
                    setCreateOpen(false);
                }}
            />

            <ConfirmModal
                isOpen={showClearConfirm}
                onClose={() => setShowClearConfirm(false)}
                onConfirm={handleClearHistory}
                title="Borrar historial del chat"
                message="¿Estás seguro de borrar el historial local de esta conversación? Los mensajes se borrarán para ti, pero los demás participantes seguirán viéndolos."
                confirmText="Borrar"
                variant="danger"
            />
        </PermissionGuard>
    );
}

function NewConversationModal({ isOpen, onClose, onSuccess }) {
    const [users, setUsers] = useState([]);
    const [isGroup, setIsGroup] = useState(false);
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedGroupUsers, setSelectedGroupUsers] = useState([]);
    const [groupName, setGroupName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const token = localStorage.getItem('token');
            fetch('/api/admin/usuarios', { headers: { 'Authorization': `Bearer ${token}` }})
                .then(res => res.json())
                .then(data => setUsers(data))
                .catch(err => console.error(err));

            // Reset state
            setIsGroup(false);
            setSelectedUser('');
            setSelectedGroupUsers([]);
            setGroupName('');
        }
    }, [isOpen]);

    const handleToggleGroupUser = (username) => {
        if (selectedGroupUsers.includes(username)) {
            setSelectedGroupUsers(prev => prev.filter(u => u !== username));
        } else {
            setSelectedGroupUsers(prev => [...prev, username]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');

            let participants = [];
            if (isGroup) {
                if (selectedGroupUsers.length < 1) throw new Error('Selecciona al menos un participante para el grupo');
                if (!groupName.trim()) throw new Error('El grupo necesita un nombre');
                participants = selectedGroupUsers;
            } else {
                if (!selectedUser) throw new Error('Selecciona un destinatario');
                participants = [selectedUser];
            }

            const res = await fetch('/api/admin/messages/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    participants,
                    isGroup,
                    groupName: isGroup ? groupName.trim() : undefined
                })
            });
            if (!res.ok) throw new Error('Error al crear conversación');
            const data = await res.json();
            onSuccess(data);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-crm-surface shadow-2xl">
                <div className="flex items-center justify-between border-b border-crm-border px-6 py-4">
                    <h3 className="text-lg font-black text-crm-fg">Nueva Conversación</h3>
                    <button onClick={onClose} className="text-crm-fg-muted hover:text-crm-fg"><X size={20} /></button>
                </div>
                <div className="flex border-b border-crm-border">
                    <button onClick={() => setIsGroup(false)} className={`flex-1 py-3 text-sm font-bold ${!isGroup ? 'text-crm-red border-b-2 border-crm-red' : 'text-crm-fg-muted hover:bg-crm-bg'}`}>
                        Mensaje Directo
                    </button>
                    <button onClick={() => setIsGroup(true)} className={`flex-1 py-3 text-sm font-bold ${isGroup ? 'text-crm-red border-b-2 border-crm-red' : 'text-crm-fg-muted hover:bg-crm-bg'}`}>
                        Nuevo Grupo
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {!isGroup ? (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">Destinatario</label>
                            <select
                                required
                                className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg"
                                value={selectedUser}
                                onChange={e => setSelectedUser(e.target.value)}
                            >
                                <option value="">Seleccionar usuario...</option>
                                {users.map(u => <option key={u._id} value={u.username}>{u.name} ({u.role})</option>)}
                            </select>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">Nombre del Grupo</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ej. Ventas 2026"
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg"
                                    value={groupName}
                                    onChange={e => setGroupName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">Participantes</label>
                                <div className="max-h-40 overflow-y-auto rounded-xl border border-crm-border bg-crm-bg p-2 space-y-1">
                                    {users.map(u => (
                                        <label key={u._id} className="flex items-center gap-2 p-2 hover:bg-crm-surface rounded-lg cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedGroupUsers.includes(u.username)}
                                                onChange={() => handleToggleGroupUser(u.username)}
                                                className="rounded text-crm-red focus:ring-crm-red"
                                            />
                                            <span className="text-sm text-crm-fg">{u.name} <span className="text-crm-fg-muted text-xs">({u.role})</span></span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    <div className="pt-4 flex justify-end gap-3 border-t border-crm-border mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-crm-fg-muted hover:text-crm-fg">Cancelar</button>
                        <button disabled={loading || (!isGroup && !selectedUser) || (isGroup && (selectedGroupUsers.length === 0 || !groupName))} type="submit" className="rounded-xl bg-crm-red-gradient px-6 py-2 text-sm font-black text-white shadow-crm-shadow-red disabled:opacity-50">
                            {isGroup ? 'Crear Grupo' : 'Iniciar Chat'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
