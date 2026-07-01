"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { workshopFetch } from '../../../utils/workshopApiClient';

export default function WorkshopClientSelect({
    value,
    onChange,
    token,
    placeholder = "Buscar cliente por nombre o email...",
    initialLabel = "",
    required = false,
    id = "workshop-client-select"
}) {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedLabel, setSelectedLabel] = useState(initialLabel);
    const [activeIndex, setActiveIndex] = useState(-1);

    const searchTimeoutRef = useRef(null);
    const abortControllerRef = useRef(null);
    const containerRef = useRef(null);
    const optionRefs = useRef([]);

    const listboxId = `${id}-listbox`;

    // Sync initialLabel when it changes, and clear selectedLabel when value is cleared
    useEffect(() => {
        if (!value) {
            setSelectedLabel('');
        } else if (initialLabel) {
            setSelectedLabel(initialLabel);
        }
    }, [initialLabel, value]);

    // If client is selected, and we don't have a label yet, try fetching client info
    useEffect(() => {
        if (value && !selectedLabel && token) {
            let active = true;
            workshopFetch(`/api/admin/clients/${value}`, { token })
                .then(async (res) => {
                    if (res.ok && active) {
                        const data = await res.json();
                        if (data) {
                            const name = data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Cliente';
                            setSelectedLabel(name);
                        }
                    }
                })
                .catch(() => {
                    // Suppressed error
                });
            return () => {
                active = false;
            };
        }
    }, [value, selectedLabel, token]);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setActiveIndex(-1);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Cleanup refs on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Reset activeIndex and clear option refs when clients list changes
    useEffect(() => {
        setActiveIndex(-1);
        optionRefs.current = [];
    }, [clients]);

    // Scroll selected option into view when activeIndex changes
    useEffect(() => {
        if (activeIndex >= 0 && optionRefs.current[activeIndex]) {
            optionRefs.current[activeIndex].scrollIntoView({ block: 'nearest' });
        }
    }, [activeIndex]);

    // Perform remote fetch
    const fetchClientsList = (searchTerm) => {
        if (!token) return;

        // Cancel previous pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoading(true);
        setError('');

        const query = encodeURIComponent(searchTerm.trim());
        workshopFetch(`/api/admin/clients?search=${query}&page=1&limit=50`, {
            token,
            signal: controller.signal
        })
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error('Error al buscar clientes.');
                }
                const data = await res.json();
                if (controller.signal.aborted) return;

                if (data && Array.isArray(data.clients)) {
                    setClients(data.clients);
                } else {
                    setClients([]);
                }
            })
            .catch((err) => {
                if (err.name !== 'AbortError' && !controller.signal.aborted) {
                    setError(err.message || 'Error al conectar con la base de datos.');
                }
            })
            .finally(() => {
                if (abortControllerRef.current === controller) {
                    setLoading(false);
                }
            });
    };

    // Debounce search input
    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearch(val);
        setIsOpen(true);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            fetchClientsList(val);
        }, 300);
    };

    // Fetch initial list when dropdown opens
    const handleFocus = () => {
        setIsOpen(true);
        if (clients.length === 0 && !search) {
            fetchClientsList('');
        }
    };

    const handleSelectClient = (client) => {
        const name = client.fullName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Cliente';
        setSelectedLabel(name);
        onChange(client._id || client.id);
        setSearch('');
        setIsOpen(false);
        setActiveIndex(-1);
    };

    const handleClear = () => {
        setSelectedLabel('');
        onChange('');
        setSearch('');
        setClients([]);
        setIsOpen(false);
        setActiveIndex(-1);
    };

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
                setIsOpen(true);
                if (clients.length === 0) {
                    fetchClientsList(search);
                }
                e.preventDefault();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (clients.length > 0) {
                    setActiveIndex((prev) => (prev + 1) % clients.length);
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (clients.length > 0) {
                    setActiveIndex((prev) => (prev - 1 + clients.length) % clients.length);
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (activeIndex >= 0 && activeIndex < clients.length) {
                    handleSelectClient(clients[activeIndex]);
                } else if (clients.length > 0) {
                    handleSelectClient(clients[0]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setActiveIndex(-1);
                break;
            default:
                break;
        }
    };

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="relative">
                <input
                    type="text"
                    id={id}
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-autocomplete="list"
                    aria-haspopup="listbox"
                    aria-required={required}
                    aria-controls={listboxId}
                    aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
                    value={isOpen ? search : (selectedLabel || '')}
                    onChange={handleSearchChange}
                    onFocus={handleFocus}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedLabel ? selectedLabel : placeholder}
                    className="h-10 w-full rounded-lg border border-crm-border bg-crm-bg px-3 pl-9 pr-8 text-xs font-medium text-crm-fg placeholder-crm-fg-muted focus:border-crm-red focus:outline-none transition-colors"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted pointer-events-none" size={14} />

                {selectedLabel && (
                    <button
                        type="button"
                        onClick={handleClear}
                        aria-label="Limpiar cliente seleccionado"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-crm-fg-muted hover:text-crm-red transition-colors"
                    >
                        Limpiar
                    </button>
                )}
            </div>

            {isOpen && (
                <div
                    id={listboxId}
                    role="listbox"
                    className="absolute z-[100] mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-crm-border bg-crm-surface p-1 shadow-lg custom-scrollbar"
                >
                    {loading && (
                        <div className="flex items-center justify-center gap-2 py-3 px-2 text-xs text-crm-fg-muted font-bold">
                            <Loader2 className="animate-spin text-crm-red" size={13} />
                            <span>Buscando clientes...</span>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 py-2 px-3 text-xs text-crm-red/80 font-bold">
                            <AlertCircle size={13} />
                            <span>{error}</span>
                        </div>
                    )}

                    {!loading && !error && clients.length === 0 && (
                        <div className="py-3 px-3 text-xs text-crm-fg-muted italic">
                            No se encontraron clientes que coincidan.
                        </div>
                    )}

                    {!loading && !error && clients.map((client, index) => {
                        const name = client.fullName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Cliente sin nombre';
                        const extraDetails = client.email || '';

                        return (
                            <div
                                ref={(el) => { optionRefs.current[index] = el; }}
                                key={client._id || client.id}
                                id={`${id}-option-${index}`}
                                role="option"
                                aria-selected={value === (client._id || client.id)}
                                onClick={() => handleSelectClient(client)}
                                className={`flex flex-col rounded px-3 py-2 cursor-pointer transition-colors ${
                                    activeIndex === index
                                        ? 'bg-crm-red/10 text-crm-fg'
                                        : value === (client._id || client.id)
                                            ? 'bg-crm-red/5 text-crm-fg border-l-2 border-crm-red'
                                            : 'text-crm-fg hover:bg-crm-bg'
                                }`}
                            >
                                <span className="text-xs font-bold">{name}</span>
                                {extraDetails && <span className="text-[10px] text-crm-fg-muted mt-0.5">{extraDetails}</span>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
