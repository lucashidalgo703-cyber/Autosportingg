import React, { useEffect, useState } from 'react';
import { AlertCircle, Link as LinkIcon, Mail, MapPin, Phone, Search, User, X } from 'lucide-react';
import { useAdminClients } from '../../../hooks/useAdminClients';

export default function LeadLinkClientModal({ isOpen, onClose, onLink, lead }) {
    const { clients, fetchClients, loading, error } = useAdminClients();
    const [searchTerm, setSearchTerm] = useState('');
    const [isLinking, setIsLinking] = useState(false);
    const [linkError, setLinkError] = useState(null);

    useEffect(() => {
        if (isOpen && lead) {
            setSearchTerm('');
            const initialSearch = lead.phone || lead.email || '';

            if (initialSearch) {
                setSearchTerm(initialSearch);
                fetchClients({ search: initialSearch });
            } else {
                fetchClients();
            }
            setLinkError(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, lead]);

    const handleSearchSubmit = (event) => {
        event.preventDefault();
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

    const isSuggestion = searchTerm === lead.phone || searchTerm === lead.email;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
            <div className="my-auto flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-crm-border bg-crm-surface">
                <div className="flex shrink-0 items-center justify-between border-b border-crm-border bg-crm-topbar p-5">
                    <div>
                        <h2 className="m-0 flex items-center gap-2 text-lg font-bold text-crm-fg">
                            <LinkIcon size={20} className="text-crm-red" />
                            Vincular lead a cliente real
                        </h2>
                        <p className="m-0 mt-1 text-sm text-crm-fg-muted">
                            Busca un cliente existente para asignarle este lead.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="m-0 flex h-9 w-9 appearance-none items-center justify-center rounded-lg border border-transparent bg-transparent text-crm-fg-muted transition-colors hover:bg-crm-surface hover:text-crm-fg"
                    >
                        <X size={19} />
                    </button>
                </div>

                <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5 custom-scrollbar">
                    {linkError && (
                        <div className="flex shrink-0 items-start gap-3 rounded-xl border border-crm-red/20 bg-crm-red/10 p-4 text-sm text-red-300">
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            <span>{linkError}</span>
                        </div>
                    )}

                    <form onSubmit={handleSearchSubmit} className="relative shrink-0">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" />
                        <input
                            type="text"
                            placeholder="Buscar cliente por nombre, telefono o email..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="w-full rounded-lg border border-crm-border bg-crm-bg py-3 pl-10 pr-24 text-crm-fg transition-colors focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red"
                        />
                        <button
                            type="submit"
                            className="absolute right-1.5 top-1/2 rounded-md bg-crm-red px-4 py-1.5 text-xs font-bold text-white transition-colors -translate-y-1/2 hover:bg-crm-red-hover"
                        >
                            Buscar
                        </button>
                    </form>

                    <div className="flex flex-1 flex-col gap-3">
                        {loading ? (
                            <div className="flex h-40 items-center justify-center">
                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                            </div>
                        ) : error ? (
                            <div className="rounded-xl border border-crm-red/20 bg-crm-red/10 p-4 text-center text-red-300">
                                {error}
                            </div>
                        ) : clients.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <User size={40} className="mb-4 text-crm-fg-muted" />
                                <span className="font-semibold text-crm-fg">Sin resultados</span>
                                <p className="m-0 mt-2 max-w-xs text-sm text-crm-fg-muted">
                                    No se encontraron clientes con esos datos. Primero crealo en el listado de clientes.
                                </p>
                            </div>
                        ) : (
                            <>
                                {isSuggestion && clients.length > 0 && (
                                    <span className="mb-2 w-max rounded border border-crm-red/20 bg-crm-red/10 px-3 py-1 text-xs font-bold text-crm-red">
                                        Sugerencias automaticas por coincidencia
                                    </span>
                                )}

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {clients.map(client => (
                                        <div key={client._id} className="flex flex-col gap-3 rounded-xl border border-crm-border bg-crm-bg p-4 transition-colors hover:border-crm-red/50">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-crm-red/20 bg-crm-red/10 text-crm-red">
                                                        <User size={14} />
                                                    </div>
                                                    <div>
                                                        <span className="block font-bold text-crm-fg">{client.fullName || client.firstName}</span>
                                                        <span className="rounded border border-crm-border bg-crm-surface px-1.5 py-0.5 text-[10px] uppercase text-crm-fg-muted">
                                                            {client.type || 'Fisico'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1 text-xs text-crm-fg-muted">
                                                <div className="flex items-center gap-2">
                                                    <Phone size={12} />
                                                    {client.phone || '--'}
                                                </div>
                                                {client.email && (
                                                    <div className="flex items-center gap-2">
                                                        <Mail size={12} />
                                                        {client.email}
                                                    </div>
                                                )}
                                                {client.locality && (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin size={12} />
                                                        {client.locality}
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleLink(client._id)}
                                                disabled={isLinking}
                                                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-crm-red/20 bg-crm-red/10 py-2 text-sm font-semibold text-crm-red transition-all hover:bg-crm-red hover:text-white disabled:opacity-50"
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
