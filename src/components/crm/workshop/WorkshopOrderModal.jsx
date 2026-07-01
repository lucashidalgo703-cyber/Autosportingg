"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Wrench, AlertTriangle, Plus, FileText, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { workshopFetch } from '../../../utils/workshopApiClient';
import WorkshopClientSelect from './WorkshopClientSelect';
import CrmButton from '../ui/CrmButton';
import CrmInput from '../ui/CrmInput';
import CrmSelect from '../ui/CrmSelect';
import CrmTextarea from '../ui/CrmTextarea';
import CrmModal from '../ui/CrmModal';

const FieldLabel = ({ children, required = false }) => (
    <label className="mb-1.5 block text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider">
        {children}{required && <span className="text-crm-red"> *</span>}
    </label>
);

const SectionTitle = ({ children }) => (
    <h3 className="m-0 mb-3.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">
        {children}
    </h3>
);

export default function WorkshopOrderModal({ isOpen, onClose, onSuccess }) {
    const { token } = useAuth();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [apiError, setApiError] = useState('');

    // Dropdown lists
    const [providers, setProviders] = useState([]);
    const [users, setUsers] = useState([]);

    // Sote CRM Integrated Form States
    const [whenType, setWhenType] = useState('now'); // 'now' | 'schedule'
    const [whenDate, setWhenDate] = useState('');
    const [orderType, setOrderType] = useState('Cliente Externo (de la calle)');
    const [currency, setCurrency] = useState('USD');
    const [stockVehicles, setStockVehicles] = useState([]);
    const [selectedStockVehicleId, setSelectedStockVehicleId] = useState('');
    
    // Client section
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [clientSuggestions, setClientSuggestions] = useState([]);
    const [showClientSuggestions, setShowClientSuggestions] = useState(false);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    // Vehicle section
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [plate, setPlate] = useState('');
    const [year, setYear] = useState('');
    const [km, setKm] = useState('');
    
    // Responsibility & Motive
    const [assignedTo, setAssignedTo] = useState('');
    const [requestedWork, setRequestedWork] = useState('');

    // Ficha de Ingreso (Combustible, Objetos, Daños)
    const [fuelLevel, setFuelLevel] = useState('50');
    const [accessories, setAccessories] = useState('');
    const [damageList, setDamageList] = useState([]);
    const [extraObservations, setExtraObservations] = useState('');

    // Images
    const [images, setImages] = useState([]);

    const fileInputRef = useRef(null);
    const containerRef = useRef(null);

    const popularBrands = [
        'Audi', 'BMW', 'Chery', 'Chevrolet', 'Citroën', 'Dodge', 'Fiat', 'Ford', 
        'Honda', 'Hyundai', 'Jeep', 'Kia', 'Land Rover', 'Mercedes-Benz', 
        'Mini', 'Mitsubishi', 'Nissan', 'Peugeot', 'Porsche', 'Renault', 
        'Subaru', 'Suzuki', 'Toyota', 'Volkswagen', 'Volvo', 'Otro'
    ];

    const revokeAllPreviews = useCallback((imageList) => {
        imageList.forEach(img => {
            if (img.previewUrl) {
                try {
                    URL.revokeObjectURL(img.previewUrl);
                } catch (e) {
                    // Suppressed
                }
            }
        });
    }, []);

    // Close client suggestions on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShowClientSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Fetch client suggestions dynamically as user types
    useEffect(() => {
        if (!token || !isOpen) return;
        if (selectedClientId) {
            setShowClientSuggestions(false);
            return;
        }
        if (clientName.trim().length < 2) {
            setClientSuggestions([]);
            setShowClientSuggestions(false);
            return;
        }

        const delayDebounce = setTimeout(async () => {
            setLoadingSuggestions(true);
            try {
                const res = await workshopFetch(`/api/admin/clients?search=${encodeURIComponent(clientName.trim())}&limit=6`, { token });
                if (res.ok) {
                    const data = await res.json();
                    setClientSuggestions(data.clients || []);
                    setShowClientSuggestions(true);
                }
            } catch (err) {
                console.error('Error fetching client suggestions:', err);
            } finally {
                setLoadingSuggestions(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [clientName, selectedClientId, token, isOpen]);

    // Fetch providers and active users
    const fetchDropdownData = useCallback(async () => {
        if (!token) return;
        setApiError('');
        try {
            const [providersRes, usersRes] = await Promise.all([
                workshopFetch(`/api/admin/workshop/providers?active=true&limit=100`, { token }),
                workshopFetch(`/api/admin/users/active`, { token })
            ]);

            if (providersRes.ok) {
                const providersData = await providersRes.json();
                setProviders(providersData.data || []);
            }
            if (usersRes.ok) {
                const usersData = await usersRes.json();
                setUsers(usersData || []);
            }
        } catch (err) {
            setApiError(err.message || 'Error en la comunicación con el servidor.');
        }
    }, [token]);

    const fetchStockVehicles = useCallback(async () => {
        if (!token) return;
        try {
            const res = await workshopFetch('/api/admin/cars?status=disponible&limit=100', { token });
            if (res.ok) {
                const data = await res.json();
                setStockVehicles(data.cars || []);
            }
        } catch (err) {
            console.error('Error fetching stock vehicles:', err);
        }
    }, [token]);

    useEffect(() => {
        if (isOpen && orderType === 'Auto del Stock (acondicionamiento)') {
            fetchStockVehicles();
        }
    }, [isOpen, orderType, fetchStockVehicles]);

    const handleStockVehicleChange = (id) => {
        setSelectedStockVehicleId(id);
        if (!id) {
            setBrand('');
            setModel('');
            setPlate('');
            setYear('');
            setKm('');
            return;
        }

        const selectedCar = stockVehicles.find(v => v._id === id);
        if (selectedCar) {
            setBrand(selectedCar.brand || '');
            setModel(selectedCar.name || '');
            setPlate(selectedCar.plateOrVin || '');
            setYear(selectedCar.year ? String(selectedCar.year) : '');
            setKm(selectedCar.km ? String(selectedCar.km) : '0');
            
            if (!clientName) {
                setClientName('Autosporting');
                setClientPhone('11 2345 6789');
            }
        }
    };

    // Initial load and reset form data
    useEffect(() => {
        if (isOpen) {
            fetchDropdownData();
            setError('');
            setApiError('');
            setImages([]);
            setWhenType('now');
            setWhenDate('');
            setOrderType('Cliente Externo (de la calle)');
            setCurrency('USD');
            setClientName('');
            setClientPhone('');
            setSelectedClientId('');
            setBrand('');
            setModel('');
            setPlate('');
            setYear('');
            setKm('');
            setAssignedTo('');
            setRequestedWork('');
            setFuelLevel('50');
            setAccessories('');
            setDamageList([]);
            setExtraObservations('');
            setStockVehicles([]);
            setSelectedStockVehicleId('');
        }
    }, [isOpen, fetchDropdownData]);

    // Cleanup previews on unmount
    useEffect(() => {
        return () => {
            revokeAllPreviews(images);
        };
    }, [images, revokeAllPreviews]);

    const handleClose = () => {
        revokeAllPreviews(images);
        setImages([]);
        onClose();
    };

    const handleClientNameChange = (val) => {
        setClientName(val);
        if (selectedClientId) {
            setSelectedClientId('');
            setClientPhone('');
        }
    };

    const handleSelectSuggestion = (client) => {
        const name = (client.fullName || `${client.firstName || ''} ${client.lastName || ''}`).trim();
        setClientName(name);
        setClientPhone(client.phone || '');
        setSelectedClientId(client._id || client.id);
        setShowClientSuggestions(false);
        setClientSuggestions([]);
    };

    const handleAddDamage = () => {
        setDamageList(prev => [...prev, '']);
    };

    const handleDamageChange = (index, value) => {
        setDamageList(prev => {
            const copy = [...prev];
            copy[index] = value;
            return copy;
        });
    };

    const handleRemoveDamage = (index) => {
        setDamageList(prev => prev.filter((_, i) => i !== index));
    };

    // Images handling
    const handleImageChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (images.length + files.length > 20) {
            toast.error('Puedes subir un máximo de 20 imágenes.');
            return;
        }

        const validFiles = [];
        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error(`La imagen "${file.name}" supera el tamaño máximo de 5 MB.`);
                continue;
            }
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                toast.error(`El archivo "${file.name}" no es un formato de imagen permitido (JPEG, PNG o WEBP).`);
                continue;
            }

            validFiles.push({
                file,
                previewUrl: URL.createObjectURL(file)
            });
        }

        setImages(prev => [...prev, ...validFiles]);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeImage = (index) => {
        setImages(prev => {
            const target = prev[index];
            if (target && target.previewUrl) {
                try {
                    URL.revokeObjectURL(target.previewUrl);
                } catch (e) {
                    // Suppressed
                }
            }
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleSubmit = async () => {
        setError('');

        if (!clientName.trim()) {
            setError('El cliente (Nombre y apellido) es obligatorio.');
            return;
        }
        if (!brand) {
            setError('La marca es obligatoria.');
            return;
        }
        if (!model.trim()) {
            setError('El modelo es obligatorio.');
            return;
        }
        if (whenType === 'schedule' && !whenDate) {
            setError('Debe ingresar la fecha programada.');
            return;
        }
        if (!requestedWork.trim()) {
            setError('El motivo de ingreso es obligatorio.');
            return;
        }

        setLoading(true);
        try {
            let clientId = selectedClientId;

            // 1. Si no hay ID seleccionado, buscar cliente por coincidencia exacta de nombre
            if (!clientId) {
                const searchRes = await workshopFetch(`/api/admin/clients?search=${encodeURIComponent(clientName.trim())}&limit=10`, { token });
                if (searchRes.ok) {
                    const searchData = await searchRes.json();
                    const matchedClient = searchData.clients?.find(c => {
                        const matchedName = (c.fullName || `${c.firstName || ''} ${c.lastName || ''}`).trim().toLowerCase();
                        return matchedName === clientName.trim().toLowerCase();
                    });
                    if (matchedClient) {
                        clientId = matchedClient._id || matchedClient.id;
                    }
                }
            }

            if (!clientId) {
                const clientRes = await workshopFetch(`/api/admin/clients`, {
                    method: 'POST',
                    token,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        firstName: clientName.trim(),
                        lastName: '',
                        phone: clientPhone.trim() || undefined,
                        type: 'potencial'
                    })
                });
                if (!clientRes.ok) {
                    const errData = await clientRes.json();
                    throw new Error(errData.message || 'Error al crear el cliente.');
                }
                const clientData = await clientRes.json();
                clientId = clientData.data?._id || clientData.data?.id || clientData._id || clientData.id;
            }

            // 3. Buscar si el vehículo ya existe por patente
            let vehicleId = '';
            const cleanPlate = plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

            if (cleanPlate) {
                const vehRes = await workshopFetch(`/api/admin/workshop/vehicles?plate=${cleanPlate}&limit=5`, { token });
                if (vehRes.ok) {
                    const vehData = await vehRes.json();
                    const matchedVehicle = vehData.data?.find(v => v.plate?.toUpperCase() === cleanPlate);
                    if (matchedVehicle) {
                        vehicleId = matchedVehicle._id || matchedVehicle.id;
                    }
                }
            }

            // 4. Si no existe el vehículo, crearlo
            if (!vehicleId) {
                const tempPlate = cleanPlate || `SP-${Date.now()}`;
                const vehicleRes = await workshopFetch(`/api/admin/workshop/vehicles`, {
                    method: 'POST',
                    token,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clientId,
                        brand,
                        model: model.trim(),
                        year: year ? Number(year) : new Date().getFullYear(),
                        plate: tempPlate,
                        km: km ? Number(km) : 0,
                        active: true
                    })
                });
                if (!vehicleRes.ok) {
                    const errData = await vehicleRes.json();
                    throw new Error(errData.message || 'Error al registrar el vehículo.');
                }
                const vehicleData = await vehicleRes.json();
                vehicleId = vehicleData.data?._id || vehicleData.data?.id || vehicleData._id || vehicleData.id;
            }

            // 5. Preparar la metadata concatenada para requestedWork
            let fullRequestedWork = requestedWork.trim();
            const extraParts = [];
            extraParts.push(`[¿Cuándo?]: ${whenType === 'now' ? 'Ingresa ahora' : whenDate}`);
            extraParts.push(`[Tipo de Orden]: ${orderType}`);
            extraParts.push(`[Moneda]: ${currency}`);
            if (extraObservations.trim()) {
                extraParts.push(`[Observaciones Adicionales]: ${extraObservations.trim()}`);
            }

            fullRequestedWork += `\n\n--- DETALLES SOTE CRM ---\n${extraParts.join('\n')}`;

            // Concatenar daños
            const cleanDamageList = damageList.filter(d => d.trim());
            const damageText = cleanDamageList.join(', ') || 'Sin daños reportados';

            // 6. Enviar la petición de creación de la orden
            const hasImages = images.length > 0;
            let body;
            let headers = {};

            if (hasImages) {
                const data = new FormData();
                data.append('customerVehicleId', vehicleId);
                if (assignedTo) data.append('assignedTo', assignedTo);
                if (km) data.append('km', km);
                data.append('fuelLevel', fuelLevel ? `${fuelLevel}%` : '50%');
                data.append('damage', damageText);
                data.append('accessories', accessories.trim() || 'Ninguno');
                data.append('requestedWork', fullRequestedWork);
                
                // Formato requerido del checklist
                data.append('checklist', '');

                images.forEach(img => {
                    data.append('photos', img.file);
                });

                body = data;
            } else {
                body = JSON.stringify({
                    customerVehicleId: vehicleId,
                    assignedTo: assignedTo || undefined,
                    km: km ? Number(km) : undefined,
                    fuelLevel: fuelLevel ? `${fuelLevel}%` : '50%',
                    checklist: [],
                    damage: damageText,
                    accessories: accessories.trim() || 'Ninguno',
                    requestedWork: fullRequestedWork
                });
                headers['Content-Type'] = 'application/json';
            }

            const res = await workshopFetch(`/api/admin/workshop/orders`, {
                method: 'POST',
                token,
                headers,
                body
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error al crear la orden de taller.');
            }

            toast.success('Orden de trabajo creada con éxito.');
            onSuccess?.();
            handleClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <CrmModal
            isOpen={isOpen}
            onClose={handleClose}
            title={
                <div>
                    <h2 className="m-0 text-lg font-bold text-crm-fg tracking-tight">Nueva orden de trabajo</h2>
                    <p className="m-0 mt-1 text-xs text-crm-fg-muted font-medium">
                        Ingreso del auto al taller: cliente, vehículo y estado de recepción.
                    </p>
                </div>
            }
            maxWidth="max-w-2xl"
            footer={
                <div className="flex gap-3 justify-start w-full">
                    <CrmButton
                        type="button"
                        variant="secondary"
                        onClick={handleClose}
                        disabled={loading}
                        className="px-6 border-crm-border bg-crm-bg text-crm-fg hover:bg-crm-surface-raised font-bold text-xs h-10 rounded-lg"
                    >
                        Cancelar
                    </CrmButton>
                    <CrmButton
                        type="button"
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 bg-crm-red hover:bg-crm-red/90 text-white font-bold text-xs h-10 rounded-lg"
                    >
                        {loading ? 'Procesando...' : 'Crear OT'}
                    </CrmButton>
                </div>
            }
        >
            <div className="px-6 py-5 custom-scrollbar max-h-[72vh] overflow-y-auto space-y-5" ref={containerRef}>
                {error && (
                    <div className="rounded-lg border border-crm-red/30 bg-crm-red/10 px-4 py-2.5 text-xs font-semibold text-crm-red flex items-center gap-2">
                        <AlertTriangle size={14} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {apiError && (
                    <div className="rounded-lg border border-crm-red/30 bg-crm-red/10 px-4 py-2.5 text-xs font-semibold text-crm-red flex items-center gap-2">
                        <AlertTriangle size={14} className="shrink-0" />
                        <span>{apiError}</span>
                    </div>
                )}

                <div className="space-y-4">
                    {/* ¿Cuándo? */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <div>
                            <FieldLabel>¿Cuándo?</FieldLabel>
                            <CrmSelect
                                value={whenType}
                                onChange={(e) => setWhenType(e.target.value)}
                                className="h-10 bg-crm-bg text-crm-fg font-medium"
                            >
                                <option value="now">Ingresa ahora</option>
                                <option value="schedule">Programar fecha</option>
                            </CrmSelect>
                        </div>
                        {whenType === 'schedule' && (
                            <div>
                                <FieldLabel required>Fecha y Hora de Ingreso</FieldLabel>
                                <CrmInput
                                    type="datetime-local"
                                    value={whenDate}
                                    onChange={(e) => setWhenDate(e.target.value)}
                                    className="h-10 bg-crm-bg text-crm-fg font-medium"
                                />
                            </div>
                        )}
                    </div>

                    {/* Tipo de orden y Moneda */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <FieldLabel>Tipo de orden</FieldLabel>
                            <CrmSelect
                                value={orderType}
                                onChange={(e) => setOrderType(e.target.value)}
                                className="h-10 bg-crm-bg text-crm-fg font-medium"
                            >
                                <option value="Cliente Externo (de la calle)">Cliente Externo (de la calle)</option>
                                <option value="Auto del Stock (acondicionamiento)">Auto del Stock (acondicionamiento)</option>
                            </CrmSelect>
                        </div>
                        <div>
                            <FieldLabel>Moneda</FieldLabel>
                            <CrmSelect
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="h-10 bg-crm-bg text-crm-fg font-medium"
                            >
                                <option value="USD">USD (dólares)</option>
                                <option value="ARS">ARS (pesos)</option>
                            </CrmSelect>
                        </div>
                    </div>

                    {/* Auto del stock */}
                    {orderType === 'Auto del Stock (acondicionamiento)' && (
                        <div>
                            <FieldLabel>Auto del stock</FieldLabel>
                            <CrmSelect
                                value={selectedStockVehicleId}
                                onChange={(e) => handleStockVehicleChange(e.target.value)}
                                className="h-10 bg-crm-bg text-crm-fg font-medium"
                            >
                                <option value="">Elegí un auto disponible...</option>
                                {stockVehicles.map(car => (
                                    <option key={car._id} value={car._id}>
                                        {car.brand} {car.name} {car.plateOrVin ? `(${car.plateOrVin})` : ''} - {car.year}
                                    </option>
                                ))}
                            </CrmSelect>
                        </div>
                    )}

                    {/* Cliente y Teléfono */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                        <div className="relative">
                            <FieldLabel required>Cliente</FieldLabel>
                            <CrmInput
                                value={clientName}
                                onChange={(e) => handleClientNameChange(e.target.value)}
                                placeholder="Nombre y apellido"
                                className="h-10 bg-crm-bg text-crm-fg font-medium"
                            />
                            {loadingSuggestions && (
                                <div className="absolute right-3 top-[34px]">
                                    <Loader2 className="animate-spin text-crm-red" size={13} />
                                </div>
                            )}

                            {/* Client Floating Suggestions */}
                            {showClientSuggestions && clientSuggestions.length > 0 && (
                                <div className="absolute z-[110] left-0 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-crm-border bg-crm-surface p-1 shadow-xl custom-scrollbar">
                                    {clientSuggestions.map((c) => {
                                        const name = (c.fullName || `${c.firstName || ''} ${c.lastName || ''}`).trim();
                                        return (
                                            <div
                                                key={c._id || c.id}
                                                onClick={() => handleSelectSuggestion(c)}
                                                className="rounded px-2.5 py-1.5 cursor-pointer hover:bg-crm-bg text-xs text-crm-fg flex flex-col transition-colors"
                                            >
                                                <span className="font-bold">{name}</span>
                                                {c.phone && <span className="text-[10px] text-crm-fg-muted">{c.phone}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div>
                            <FieldLabel>Teléfono</FieldLabel>
                            <CrmInput
                                value={clientPhone}
                                onChange={(e) => setClientPhone(e.target.value)}
                                placeholder="11 2345 6789"
                                className="h-10 bg-crm-bg text-crm-fg font-medium"
                            />
                        </div>
                    </div>

                    {/* Marca y Modelo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <FieldLabel required>Marca</FieldLabel>
                            <CrmSelect
                                value={brand}
                                onChange={(e) => setBrand(e.target.value)}
                                className="h-10 bg-crm-bg text-crm-fg font-medium"
                            >
                                <option value="">Elegí la marca...</option>
                                {popularBrands.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </CrmSelect>
                        </div>
                        <div>
                            <FieldLabel required>Modelo</FieldLabel>
                            <CrmInput
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                placeholder="Modelo"
                                className="h-10 bg-crm-bg text-crm-fg font-medium"
                            />
                        </div>
                    </div>

                    {/* Patente y Año */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <FieldLabel>Patente</FieldLabel>
                            <CrmInput
                                value={plate}
                                onChange={(e) => setPlate(e.target.value)}
                                placeholder="Patente"
                                className="h-10 bg-crm-bg uppercase font-bold text-crm-fg placeholder:normal-case placeholder:font-normal"
                            />
                        </div>
                        <div>
                            <FieldLabel>Año</FieldLabel>
                            <CrmInput
                                type="number"
                                min="1900"
                                max={new Date().getFullYear() + 1}
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                placeholder="2018"
                                className="h-10 bg-crm-bg text-crm-fg font-medium"
                            />
                        </div>
                    </div>

                    {/* Km al ingresar y Mecánico a cargo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <FieldLabel>Km al ingresar</FieldLabel>
                            <CrmInput
                                type="number"
                                min="0"
                                value={km}
                                onChange={(e) => setKm(e.target.value)}
                                placeholder="85000"
                                className="h-10 bg-crm-bg text-crm-fg font-medium"
                            />
                        </div>
                        <div>
                            <FieldLabel>Mecánico a cargo</FieldLabel>
                            <CrmSelect
                                value={assignedTo}
                                onChange={(e) => setAssignedTo(e.target.value)}
                                className="h-10 bg-crm-bg text-crm-fg font-medium"
                            >
                                <option value="">Sin asignar</option>
                                {users.map(u => (
                                    <option key={u._id} value={u._id}>
                                        {u.name || u.email}
                                    </option>
                                ))}
                            </CrmSelect>
                        </div>
                    </div>

                    {/* Motivo de ingreso */}
                    <div>
                        <FieldLabel required>Motivo de ingreso (lo que dice el cliente)</FieldLabel>
                        <CrmTextarea
                            value={requestedWork}
                            onChange={(e) => setRequestedWork(e.target.value)}
                            placeholder="Hace ruido al frenar, luz de check encendida..."
                            className="bg-crm-bg text-crm-fg font-medium min-h-[90px] text-xs py-2 px-3"
                        />
                    </div>

                    {/* Ficha de Ingreso Card */}
                    <div className="bg-crm-surface border border-crm-border rounded-xl p-4 space-y-4">
                        <h4 className="m-0 text-sm font-bold text-crm-fg">Ficha de ingreso</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <FieldLabel>Combustible (%)</FieldLabel>
                                <CrmInput
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={fuelLevel}
                                    onChange={(e) => setFuelLevel(e.target.value)}
                                    placeholder="50"
                                    className="h-10 bg-crm-bg text-crm-fg font-medium"
                                />
                            </div>
                            <div>
                                <FieldLabel>Objetos dejados en el auto</FieldLabel>
                                <CrmInput
                                    value={accessories}
                                    onChange={(e) => setAccessories(e.target.value)}
                                    placeholder="Documentos, llave de rueda..."
                                    className="h-10 bg-crm-bg text-crm-fg font-medium"
                                />
                            </div>
                        </div>

                        {/* Daños / Observaciones dinámicas */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-bold text-crm-fg-muted uppercase tracking-wider block">
                                    Daños / observaciones al ingresar
                                </span>
                                <button
                                    type="button"
                                    onClick={handleAddDamage}
                                    className="text-xs text-crm-red font-bold hover:underline bg-transparent border-0 cursor-pointer"
                                >
                                    + Agregar
                                </button>
                            </div>
                            
                            {damageList.length === 0 && (
                                <p className="text-[11px] text-crm-fg-muted italic m-0">No se han registrado detalles o daños visuales.</p>
                            )}

                            {damageList.map((dmg, idx) => (
                                <div key={idx} className="flex items-center gap-2 mb-2 animate-fade-in">
                                    <CrmInput
                                        value={dmg}
                                        onChange={(e) => handleDamageChange(idx, e.target.value)}
                                        placeholder="Ej: Rayón de 5cm en guardabarros trasero derecho"
                                        className="h-9 bg-crm-bg text-crm-fg text-xs flex-1"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveDamage(idx)}
                                        className="text-crm-fg-muted hover:text-crm-red p-1 bg-transparent border-0 cursor-pointer transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Observaciones adicionales (Opcional pero útil) */}
                        <div>
                            <FieldLabel>Observaciones adicionales</FieldLabel>
                            <CrmInput
                                value={extraObservations}
                                onChange={(e) => setExtraObservations(e.target.value)}
                                placeholder="Notas internas de recepción..."
                                className="h-10 bg-crm-bg text-crm-fg font-medium"
                            />
                        </div>

                        {/* Fotos del estado de ingreso */}
                        <div className="flex flex-col gap-2 pt-1 border-t border-crm-border/40">
                            <span className="text-[11px] font-bold text-crm-fg-muted uppercase tracking-wider block">
                                Fotos del estado de ingreso (máx 20)
                            </span>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 rounded-lg border border-crm-border bg-crm-surface hover:bg-crm-surface-raised text-crm-fg font-semibold text-xs transition-all cursor-pointer flex items-center gap-2"
                                >
                                    Elegir archivos
                                </button>
                                <span className="text-xs text-crm-fg-muted font-medium">
                                    {images.length === 0
                                        ? 'Ningún archivo seleccionado'
                                        : `${images.length} ${images.length === 1 ? 'archivo seleccionado' : 'archivos seleccionados'}`
                                    }
                                </span>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    multiple
                                    className="hidden"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleImageChange}
                                />
                            </div>
                            
                            {/* Previsualización de imágenes */}
                            {images.length > 0 && (
                                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 mt-2">
                                    {images.map((img, index) => (
                                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-crm-border bg-black group">
                                            <img
                                                src={img.previewUrl}
                                                alt={`Previsualización ${index}`}
                                                className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 hover:bg-crm-red flex items-center justify-center text-crm-fg transition-colors cursor-pointer"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </CrmModal>
    );
}
