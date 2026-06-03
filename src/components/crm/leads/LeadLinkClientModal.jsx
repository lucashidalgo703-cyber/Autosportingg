import React, { useState, useEffect } from 'react';
import { X, Search, Link as LinkIcon, User, AlertCircle, Phone, Mail, MapPin } from 'lucide-react';
import { useAdminClients } from '../../../hooks/useAdminClients';

export default function LeadLinkClientModal({ isOpen, onClose, onLink, lead }) {
    const { clients, fetchClients, loading, error } = useAdminClients();
    const [searchTerm, setSearchTerm] = useState('');
    const [isLinking, setIsLinking] = useState(false);
    const [linkError, setLinkError] = useState(null);

    // Initial search suggestion based on lead phone or email
    useEffect(() => {
        if (isOpen && lead) {
            setSearchTerm('');
            const initialSearch = lead.phone || lead.email || '';
            
            // We use the initialSearch just as a default value in the input,
            // or we could fetch right away. Let's fetch if there is something.
            if (initialSearch) {
                setSearchTerm(initialSearch);
                fetchClients({ search: initialSearch });
            } else {
                fetchClients(); // fetch last created
            }
            setLinkError(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, lead]);

    // Handle manual search
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchClients({ search: searchTerm });
    };

    const handleLink = async (clientId) => {
        setIsLinking(true);
        setLinkError(null);
        try {
            await onLink(clientId);
            onClose();
        } catch (err) {
            setLinkError(err.message || 'Error al vincular el cliente');
        } finally {
            setIsLinking(false);
        }
    };

    if (!isOpen || !lead) return null;

    // Check if the search term matches lead exactly for suggestion visual cue
    const isSuggestion = searchTerm === lead.phone || searchTerm === lead.email;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <div className="bg-crm-surface border border-crm-border rounded-2xl w-full max-w-3xl flex flex-col my-auto max-h-[90vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-crm-border bg-crm-surface shrink-0 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <LinkIcon size={20} className="text-crm-red" />
                            Vincular Oportunidad a Cliente Real
                        </h2>
                        <p className="text-sm text-crm-fg-muted mt-1">
                            Buscá un cliente existente para asignarle esta oportunidad.
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-lg hover:bg-crm-surface-raised text-crm-fg-muted hover:text-crm-fg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-6">
                    
                    {linkError && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-start gap-3 shrink-0">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <span>{linkError}</span>
                        </div>
                    )}

                    {/* Search Bar */}
                    <form onSubmit={handleSearchSubmit} className="relative shrink-0">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" />
                        <input 
                            type="text" 
                            placeholder="Buscar cliente por nombre, teléfono o email..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-crm-bg border border-crm-border rounded-lg pl-10 pr-24 py-3 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red transition-colors"
                        />
                        <button 
                            type="submit" 
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-crm-red hover:bg-crm-red-hover text-white text-xs font-bold px-4 py-1.5 rounded-md transition-colors"
                        >
                            Buscar
                        </button>
                    </form>

                    {/* Results Area */}
                    <div className="flex flex-col gap-3 flex-1">
                        {loading ? (
                            <div className="flex justify-center items-center h-40">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crm-red"></div>
                            </div>
                        ) : error ? (
                            <div className="text-center text-red-400 p-4 border border-red-500/20 rounded-xl bg-red-500/5">
                                {error}
                            </div>
                        ) : clients.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center py-10 opacity-50">
                                <User size={40} className="text-crm-fg-muted mb-4" />
                                <span className="text-white font-medium">Sin resultados</span>
                                <p className="text-sm text-crm-fg-muted max-w-xs mt-2">
                                    No se encontraron clientes con esos datos. Deberás crearlo primero en el listado de clientes.
                                </p>
                            </div>
                        ) : (
                            <>
                                {isSuggestion && clients.length > 0 && (
                                    <span className="text-xs font-bold text-crm-red bg-crm-red/10 px-3 py-1 rounded w-max border border-crm-red/20 mb-2">
                                        Sugerencias automáticas por coincidencia
                                    </span>
                                )}
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {clients.map(client => (
                                        <div key={client._id} className="bg-crm-surface-raised border border-crm-border p-4 rounded-xl flex flex-col gap-3 hover:border-crm-red/50 transition-colors group">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-crm-red/10 flex items-center justify-center border border-crm-red/20">
                                                        <User size={14} className="text-crm-red" />
                                                    </div>
                                                    <div>
                                                        <span className="text-white font-bold block">{client.fullName || client.firstName}</span>
                                                        <span className="text-[10px] uppercase bg-crm-bg text-crm-fg-muted border border-crm-border px-1.5 py-0.5 rounded">
                                                            {client.type || 'Físico'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1 text-xs text-crm-fg-muted">
                                                <div className="flex items-center gap-2">
                                                    <Phone size={12} /> {client.phone}
                                                </div>
                                                {client.email && (
                                                    <div className="flex items-center gap-2">
                                                        <Mail size={12} /> {client.email}
                                                    </div>
                                                )}
                                                {client.locality && (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin size={12} /> {client.locality}
                                                    </div>
                                                )}
                                            </div>

                                            <button 
                                                onClick={() => handleLink(client._id)}
                                                disabled={isLinking}
                                                className="mt-2 w-full py-2 rounded-lg bg-crm-red/10 hover:bg-crm-red text-crm-red hover:text-white font-medium text-sm transition-all border border-crm-red/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                <LinkIcon size={14} />
                                                Vincular este cliente
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
