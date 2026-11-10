"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
    CalendarDays,
    CarFront,
    CheckSquare,
    DollarSign,
    FileText,
    HandCoins,
    Plus,
    Search,
    Tags,
    User,
    X,
    Key,
    Settings,
    Users,
    Briefcase
} from 'lucide-react';
import { useAdminCars } from '../../../hooks/useAdminCars';
import { useAdminClients } from '../../../hooks/useAdminClients';
import { useAdminSales } from '../../../hooks/useAdminSales';
import { useAdminUsers } from '../../../hooks/useAdminUsers';
import CrmButton from '../ui/CrmButton';
import CrmInput from '../ui/CrmInput';
import CrmSelect from '../ui/CrmSelect';
import CrmTextarea from '../ui/CrmTextarea';
import CrmModal from '../ui/CrmModal';
import { createSaleForm, saleToForm, buildSaleCreatePayload } from '../../../utils/saleDraftForm';

const FieldLabel = ({ children, required = false }) => (
    <label className="mb-1.5 block text-[11px] font-bold text-crm-fg-muted uppercase tracking-wider">
        {children}{required && <span className="text-crm-red"> *</span>}
    </label>
);

const SectionTitle = ({ icon: Icon, children, className = "" }) => (
    <h3 className={`m-0 mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted ${className}`}>
        {Icon && <Icon size={14} className="text-crm-fg-muted" />}
        {children}
    </h3>
);

export default function SaleCreateModal({ isOpen, onClose, onSuccess, initialSale = null }) {
    const { cars, refresh: fetchCars } = useAdminCars();
    const { clients, fetchClients } = useAdminClients();
    const { createSale, updateSale } = useAdminSales();
    const { users, fetchUsers } = useAdminUsers();
    const fetchCarsRef = useRef(fetchCars);
    const submittingRef = useRef(false);
    const statusChosenRef = useRef(false);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [vehicleSearch, setVehicleSearch] = useState('');
    const [isAddingDeposit, setIsAddingDeposit] = useState(false);
    
    const [formData, setFormData] = useState(createSaleForm);

    useEffect(() => {
        if (!isOpen) return;
        setFormData(saleToForm(initialSale));
        setVehicleSearch('');
        setIsAddingDeposit(false);
        setError('');
        statusChosenRef.current = Boolean(initialSale?._id);
    }, [isOpen, initialSale]);

    useEffect(() => {
        fetchCarsRef.current = fetchCars;
    }, [fetchCars]);

    useEffect(() => {
        if (isOpen) {
            fetchClients({ limit: 80 });
            fetchUsers();
            fetchCarsRef.current({ limit: 200, status: 'disponible' });
            setError('');
        }
    }, [fetchClients, fetchUsers, isOpen]);

    const availableCars = useMemo(() => {
        const search = vehicleSearch.trim().toLowerCase();
        const originalVehicle = typeof initialSale?.vehicleId === 'object' ? initialSale.vehicleId : null;
        const options = originalVehicle?._id && !(cars || []).some((car) => car._id === originalVehicle._id)
            ? [originalVehicle, ...(cars || [])]
            : (cars || []);
        return options
            .filter((car) => (car.status || '').toLowerCase() === 'disponible' || car._id === formData.vehicleId)
            .filter((car) => {
                if (car._id === formData.vehicleId) return true;
                if (!search) return true;
                return `${car.brand || ''} ${car.name || ''} ${car.model || ''} ${car.version || ''} ${car.plateOrVin || ''}`.toLowerCase().includes(search);
            })
            .slice(0, 100);
    }, [cars, vehicleSearch, formData.vehicleId, initialSale]);

    const selectedVehicle = useMemo(
        () => (cars || []).find((car) => car._id === formData.vehicleId),
        [cars, formData.vehicleId]
    );

    // Si la comisión está compartida (split), forzamos los valores
    useEffect(() => {
        if (formData.splitCommission) {
            setFormData(prev => ({
                ...prev,
                sellerPct: 0.5,
                consignationPct: 0.5
            }));
        }
    }, [formData.splitCommission]);

    if (!isOpen) return null;

    const updateField = (field, value) => {
        if (field === 'status') statusChosenRef.current = true;
        const selectedClient = field === 'clientId' && value
            ? (clients || []).find((client) => client._id === value)
            : null;
        setFormData((prev) => ({
            ...prev,
            [field]: value,
            ...(field === 'vehicleId' && !statusChosenRef.current
                ? { status: value ? 'confirmada' : 'borrador' }
                : {}),
            ...(field === 'manualImport'
                ? { status: value ? 'entregada' : (prev.vehicleId ? 'confirmada' : 'borrador') }
                : {}),
            ...(selectedClient ? {
                buyerName: selectedClient.fullName || selectedClient.firstName || '',
                buyerPhone: selectedClient.phone || '',
                buyerEmail: selectedClient.email || '',
                buyerDni: selectedClient.dni || ''
            } : {})
        }));
    };

    const updateDeliveryItem = (item, value) => {
        setFormData(prev => ({
            ...prev,
            deliveryItems: { ...prev.deliveryItems, [item]: value }
        }));
    };

    const resetAndClose = () => {
        if (submittingRef.current) return;
        setLoading(false);
        setError('');
        onClose?.();
    };

    const handleSubmit = async (asDraft = false) => {
        if (submittingRef.current) return;
        setError('');
        let payload;
        try {
            payload = buildSaleCreatePayload(formData, asDraft ? 'borrador' : formData.status);
        } catch (err) {
            setError(err.message);
            toast.error(err.message);
            return;
        }
        submittingRef.current = true;
        setLoading(true);
        try {
            const saved = initialSale?._id
                ? await updateSale(initialSale._id, payload)
                : await createSale(payload);
            toast.success(payload.status === 'borrador' ? 'Borrador guardado.' : 'Venta guardada correctamente.');
            onClose?.();
            try {
                await onSuccess?.(saved);
            } catch {
                toast.error('La operación se guardó. Recargá la lista para ver los cambios.');
            }
        } catch (err) {
            const message = err.message || 'No se pudo crear la venta. Reintentá en unos segundos.';
            setError(message);
            toast.error(message);
        } finally {
            submittingRef.current = false;
            setLoading(false);
        }
    };

    const noVehicleSelected = !formData.vehicleId || formData.vehicleId === '';

    const modalTitle = (
        <div>
            <h2 className="m-0 text-xl font-bold text-white tracking-tight">{initialSale?._id ? 'Continuar borrador' : 'Nueva venta'}</h2>
            <p className="m-0 mt-1 text-sm text-crm-fg-muted">
                Podés guardar un borrador con datos incompletos. Para activar la operación, seleccioná una unidad disponible y revisá el estado.
            </p>
        </div>
    );

    const modalFooter = (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-start">
            <CrmButton type="button" variant="secondary" onClick={resetAndClose} disabled={loading} className="px-6 border-neutral-700 bg-transparent hover:bg-crm-surface-raised">
                Cancelar
            </CrmButton>
            <div className="flex-1 hidden sm:block"></div>
            <CrmButton type="button" variant="secondary" onClick={() => handleSubmit(true)} disabled={loading || formData.manualImport} className="px-6 border-neutral-700 bg-crm-bg hover:bg-crm-surface-raised text-white">
                <FileText size={15} /> Guardar borrador
            </CrmButton>
            <CrmButton type="button" variant="primary" onClick={() => handleSubmit(false)} disabled={loading} className="px-6 bg-crm-red hover:bg-red-600 text-white">
                <FileText size={15} /> {loading ? 'Guardando...' : (initialSale?._id ? 'Guardar cambios' : 'Crear venta')}
            </CrmButton>
        </div>
    );

    return (
        <CrmModal
            isOpen={isOpen}
            onClose={resetAndClose}
            title={modalTitle}
            maxWidth="max-w-4xl"
            footer={modalFooter}
        >
            <div className="px-6 py-6">
                    {error && (
                        <div className="mb-6 rounded-xl border border-crm-red/30 bg-crm-red/10 px-4 py-3 text-sm font-semibold text-red-300 flex items-center gap-2">
                            <X size={16} className="text-red-400" /> {error}
                        </div>
                    )}

                    {/* Carga manual toggle */}
                    <div className="mb-8">
                        <label className="flex items-start gap-4 rounded-xl border border-neutral-700 bg-crm-surface p-4 cursor-pointer hover:border-neutral-600 transition-colors">
                            <input
                                type="checkbox"
                                checked={formData.manualImport}
                                onChange={(e) => updateField('manualImport', e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-crm-border bg-crm-surface text-crm-red focus:ring-crm-red cursor-pointer"
                            />
                            <div>
                                <span className="block text-sm text-white font-semibold">
                                    <FileText size={14} className="inline mr-2 text-crm-fg-muted relative -top-0.5" />
                                    Carga manual <span className="text-crm-fg-muted font-normal">(venta vieja importada desde Excel)</span>
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-crm-fg-muted">
                                    Form simplificado para registrar ventas históricas. Se oculta seña, permuta, comisiones detalladas, comprador completo, consignación, financiación y entrega. La venta nace en estado <span className="font-bold text-white">Cerrada</span> y <span className="italic">no</span> abre expediente ni notifica a Gestoría/Tesorería.
                                </span>
                            </div>
                        </label>
                    </div>

                    <SectionTitle>DATOS DE LA OPERACIÓN</SectionTitle>
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mb-8">
                        <div>
                            <FieldLabel required={!formData.manualImport}>Vehículo</FieldLabel>
                            <div className="relative mb-2">
                                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={16} />
                                <CrmInput
                                    value={vehicleSearch}
                                    onChange={(e) => setVehicleSearch(e.target.value)}
                                    placeholder="Buscar marca, modelo, patente..."
                                    className="h-10 bg-crm-bg pl-10"
                                />
                            </div>
                            <CrmSelect
                                aria-label="Vehículo"
                                value={formData.vehicleId}
                                onChange={(e) => updateField('vehicleId', e.target.value)}
                                className="h-10 bg-crm-bg text-white font-medium"
                            >
                                <option value="">— Sin vehículo asignado —</option>
                                {availableCars.map((car) => (
                                    <option key={car._id} value={car._id}>
                                        {`${car.brand || ''} ${car.name || car.model || ''}`.trim()} {car.plateOrVin ? `- ${car.plateOrVin}` : ''}
                                        {(car.status || '').toLowerCase() !== 'disponible' ? ' — no disponible' : ''}
                                    </option>
                                ))}
                            </CrmSelect>
                        </div>

                        <div>
                            <FieldLabel>Estado</FieldLabel>
                            <CrmSelect aria-label="Estado de la venta" value={formData.status} onChange={(e) => updateField('status', e.target.value)} disabled={formData.manualImport} className="h-10 bg-crm-bg text-white font-medium mb-2">
                                <option value="borrador">Borrador</option>
                                <option value="señado">Señada (Reserva)</option>
                                <option value="confirmada">Activa</option>
                                <option value="entregada">Cerrada</option>
                            </CrmSelect>
                            <p className="m-0 text-xs text-crm-fg-muted">Por default según vehículo. Cambialo si la venta arranca en otro estado.</p>
                        </div>

                        <div>
                            <FieldLabel>Kilometraje del vehículo</FieldLabel>
                            <CrmInput type="number" min="0" value={formData.mileage} onChange={(e) => updateField('mileage', e.target.value)} className="h-10 bg-crm-bg mb-2" placeholder="Ej: 45000" />
                            <p className="m-0 text-xs text-crm-fg-muted">Km del auto vendido al momento de la operación.</p>
                        </div>
                        <div className="hidden lg:block"></div>

                        <div>
                            <FieldLabel required>Precio de Venta (al comprador)</FieldLabel>
                            <div className="flex gap-2">
                                <div className="w-24 shrink-0">
                                    <CrmSelect aria-label="Moneda de venta" value={formData.saleCurrency} onChange={(e) => updateField('saleCurrency', e.target.value)} className="h-10 bg-crm-bg font-bold">
                                        <option value="USD">USD</option>
                                        <option value="ARS">ARS</option>
                                    </CrmSelect>
                                </div>
                                <div className="flex-1">
                                    <CrmInput aria-label="Precio de venta" type="number" min="0" value={formData.salePrice} onChange={(e) => updateField('salePrice', e.target.value)} className="h-10 bg-crm-bg" placeholder="Ej: 38800" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <FieldLabel required>Vendedor (cerró la venta)</FieldLabel>
                            <CrmSelect value={formData.salesperson} onChange={(e) => updateField('salesperson', e.target.value)} className="h-10 bg-crm-bg">
                                <option value="">—</option>
                                {users.map(u => (
                                    <option key={u._id} value={u.username}>{u.name || u.username}</option>
                                ))}
                                <option value="admin">Equipo AutoSporting</option>
                            </CrmSelect>
                        </div>

                        <div>
                            <FieldLabel>Fecha de cierre</FieldLabel>
                            <div className="relative">
                                <CalendarDays className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={16} />
                                <CrmInput type="date" value={formData.saleDate} onChange={(e) => updateField('saleDate', e.target.value)} className="h-10 bg-crm-bg pr-10" />
                            </div>
                        </div>
                    </div>

                    <SectionTitle>COMPRADOR</SectionTitle>
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mb-8">
                        <div>
                            <FieldLabel>Cliente del CRM</FieldLabel>
                            <CrmSelect aria-label="Cliente del CRM" value={formData.clientId} onChange={(e) => updateField('clientId', e.target.value)} className="h-10 bg-crm-bg">
                                <option value="">—</option>
                                {(clients || []).map((client) => (
                                    <option key={client._id} value={client._id}>
                                        {client.fullName || client.firstName || client.email || 'Cliente sin nombre'}
                                    </option>
                                ))}
                            </CrmSelect>
                        </div>
                        <div>
                            <FieldLabel required>Nombre</FieldLabel>
                            <CrmInput aria-label="Nombre del comprador" value={formData.buyerName} onChange={(e) => updateField('buyerName', e.target.value)} className="h-10 bg-crm-bg" />
                        </div>
                        <div>
                            <FieldLabel>Teléfono</FieldLabel>
                            <CrmInput aria-label="Teléfono del comprador" value={formData.buyerPhone} onChange={(e) => updateField('buyerPhone', e.target.value)} placeholder="+54 11 5555 5555" className="h-10 bg-crm-bg" />
                        </div>
                        <div className="flex gap-5">
                            <div className="flex-1">
                                <FieldLabel>Email</FieldLabel>
                                <CrmInput aria-label="Email del comprador" type="email" value={formData.buyerEmail} onChange={(e) => updateField('buyerEmail', e.target.value)} className="h-10 bg-crm-bg" />
                            </div>
                            <div className="flex-1">
                                <FieldLabel>DNI</FieldLabel>
                                <CrmInput aria-label="DNI del comprador" value={formData.buyerDni} onChange={(e) => updateField('buyerDni', e.target.value)} className="h-10 bg-crm-bg" />
                            </div>
                        </div>
                    </div>

                    <SectionTitle className="text-yellow-500" icon={() => <Key size={14} className="text-yellow-500" />}>
                        PROPIETARIO DEL VEHÍCULO
                    </SectionTitle>
                    <p className="text-xs text-crm-fg-muted mb-4 -mt-3">Sin vehículo del stock linkeado — cargá los datos del propietario a mano (ventas históricas / vehículo libre).</p>
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mb-8">
                        <div>
                            <FieldLabel>Nombre</FieldLabel>
                            <CrmInput 
                                value={noVehicleSelected ? formData.vehicleOwnerName : ''} 
                                onChange={(e) => updateField('vehicleOwnerName', e.target.value)} 
                                disabled={!noVehicleSelected}
                                placeholder="— s/d —"
                                className="h-10 bg-crm-bg disabled:opacity-50" 
                            />
                        </div>
                        <div>
                            <FieldLabel>Teléfono</FieldLabel>
                            <CrmInput 
                                value={noVehicleSelected ? formData.vehicleOwnerPhone : ''} 
                                onChange={(e) => updateField('vehicleOwnerPhone', e.target.value)} 
                                disabled={!noVehicleSelected}
                                placeholder="— s/d —"
                                className="h-10 bg-crm-bg disabled:opacity-50" 
                            />
                        </div>
                    </div>

                    {!formData.manualImport && (
                        <>
                            <SectionTitle>PAGO</SectionTitle>
                            
                            <div className="mb-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                    <div>
                                        <p className="m-0 text-sm font-bold text-yellow-500 flex items-center gap-2">
                                            <DollarSign size={16} /> Seña / adelanto ({formData.depositAppliedAmount > 0 ? '1' : '0'})
                                        </p>
                                        <p className="m-0 mt-1 text-xs text-crm-fg-muted max-w-[80%]">Cargá cada pago a cuenta con su monto, moneda y fecha, y adjuntá el comprobante. El total se acredita como seña en la liquidación del expediente — lo ven Tesorería y Gestoría.</p>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsAddingDeposit(!isAddingDeposit)} 
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors border ${isAddingDeposit ? 'bg-transparent text-crm-fg-muted hover:text-white border-neutral-700' : 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20'}`}
                                    >
                                        {isAddingDeposit ? <X size={14} /> : <Plus size={14} />} 
                                        {isAddingDeposit ? 'Cancelar seña' : 'Agregar seña'}
                                    </button>
                                </div>
                                
                                {isAddingDeposit ? (
                                    <div className="rounded-lg border border-yellow-500/20 bg-black/20 p-4">
                                        <div className="flex gap-4 items-end">
                                            <div className="w-1/3">
                                                <FieldLabel>Moneda</FieldLabel>
                                                <CrmSelect value={formData.depositAppliedCurrency} onChange={(e) => updateField('depositAppliedCurrency', e.target.value)} className="h-10 bg-crm-bg border-yellow-500/20 focus:border-yellow-500 text-yellow-500 font-bold">
                                                    <option value="USD">USD</option>
                                                    <option value="ARS">ARS</option>
                                                </CrmSelect>
                                            </div>
                                            <div className="flex-1">
                                                <FieldLabel>Monto de la seña</FieldLabel>
                                                <CrmInput type="number" min="0" value={formData.depositAppliedAmount || ''} onChange={(e) => updateField('depositAppliedAmount', e.target.value)} placeholder="Ej: 1000" className="h-10 bg-crm-bg border-yellow-500/20 focus:border-yellow-500 text-yellow-500 font-bold" />
                                            </div>
                                            <button type="button" onClick={() => setIsAddingDeposit(false)} className="h-10 px-4 bg-yellow-500 text-black font-bold text-sm rounded-lg hover:bg-yellow-400 transition-colors">Guardar</button>
                                        </div>
                                    </div>
                                ) : formData.depositAppliedAmount > 0 ? (
                                    <div className="rounded-lg border border-dashed border-yellow-500/40 p-4 flex justify-between items-center bg-yellow-500/10">
                                        <span className="text-sm text-yellow-500 font-bold flex items-center gap-2">
                                            <CheckSquare size={16} className="text-yellow-500" />
                                            Seña registrada: {formData.depositAppliedCurrency} {Number(formData.depositAppliedAmount).toLocaleString()}
                                        </span>
                                        <button type="button" onClick={() => updateField('depositAppliedAmount', 0)} className="text-xs text-crm-red hover:text-red-400 font-medium">Eliminar</button>
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-dashed border-yellow-500/20 p-4 text-center">
                                        <span className="text-xs text-crm-fg-muted font-medium">Sin seña registrada. Si el cliente abonó algo a cuenta, agregalo con el botón de arriba.</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mb-8">
                                <div>
                                    <FieldLabel>Método de pago</FieldLabel>
                                    <CrmSelect value={formData.paymentMethod} onChange={(e) => updateField('paymentMethod', e.target.value)} className="h-10 bg-crm-bg">
                                        <option value="">—</option>
                                        <option value="contado">Contado</option>
                                        <option value="financiado">Financiado</option>
                                        <option value="mixto">Mixto</option>
                                        <option value="leasing">Leasing</option>
                                        <option value="permuta">Permuta</option>
                                        <option value="criptomonedas">Criptomonedas</option>
                                        <option value="otro">Otro</option>
                                    </CrmSelect>
                                </div>
                                <div>
                                    <FieldLabel>Cantidad de cuotas</FieldLabel>
                                    <CrmSelect 
                                        value={formData.installmentsCount || 6} 
                                        onChange={(e) => updateField('installmentsCount', Number(e.target.value))} 
                                        disabled={formData.paymentMethod !== 'financiado'} 
                                        className="h-10 bg-crm-bg disabled:opacity-50"
                                    >
                                        <option value="3">3 cuotas</option>
                                        <option value="6">6 cuotas</option>
                                        <option value="12">12 cuotas</option>
                                        <option value="18">18 cuotas</option>
                                        <option value="24">24 cuotas</option>
                                        <option value="36">36 cuotas</option>
                                        <option value="48">48 cuotas</option>
                                    </CrmSelect>
                                    <p className="m-0 mt-2 text-xs text-crm-fg-muted">Solo si el método de pago es Financiado</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mb-3">
                                <SectionTitle className="!mb-0">PERMUTA</SectionTitle>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.hasTradeIn} onChange={(e) => updateField('hasTradeIn', e.target.checked)} className="h-4 w-4 rounded border-neutral-600 bg-crm-bg text-crm-red" />
                                    <span className="text-xs font-bold text-crm-fg-muted">Incluir vehículo en permuta</span>
                                </label>
                            </div>
                            <div className="rounded-xl border border-neutral-800 bg-crm-bg p-4 mb-8">
                                <span className="text-xs text-crm-fg-muted">Sin permuta. Activá el toggle si el comprador entrega un auto en parte de pago.</span>
                            </div>

                            <SectionTitle className="text-yellow-500" icon={() => <Briefcase size={14} className="text-yellow-500" />}>CONSIGNACIÓN</SectionTitle>
                            <p className="text-xs text-crm-fg-muted mb-4 -mt-3">Elegí quién es el responsable. Él completará el precio y las observaciones directamente en el expediente.</p>
                            <div className="grid grid-cols-1 gap-5 mb-8">
                                <div>
                                    <FieldLabel>Responsable de la consignación</FieldLabel>
                                    <CrmSelect value={formData.consignationOwnerId} onChange={(e) => updateField('consignationOwnerId', e.target.value)} className="h-10 bg-crm-bg">
                                        <option value="">— Seleccioná responsable —</option>
                                        {users.map(u => (
                                            <option key={u._id} value={u._id}>{u.name || u.username}</option>
                                        ))}
                                    </CrmSelect>
                                </div>
                                <div>
                                    <FieldLabel>Gestor asignado (quién va a llevar el trámite)</FieldLabel>
                                    <CrmSelect value={formData.consignationManagerId} onChange={(e) => updateField('consignationManagerId', e.target.value)} className="h-10 bg-crm-bg">
                                        <option value="">— Sin asignar (lo define admin/gestoría) —</option>
                                        {users.map(u => (
                                            <option key={u._id} value={u._id}>{u.name || u.username}</option>
                                        ))}
                                    </CrmSelect>
                                </div>
                            </div>

                            <SectionTitle>COMISIÓN</SectionTitle>
                            
                            <div className="rounded-xl border border-yellow-500/30 bg-crm-surface p-5 mb-8">
                                <label className="flex items-start gap-3 cursor-pointer mb-6">
                                    <input type="checkbox" checked={formData.manualCommission} onChange={(e) => updateField('manualCommission', e.target.checked)} className="mt-1 h-4 w-4 rounded border-neutral-600 bg-crm-bg text-yellow-500" />
                                    <div>
                                        <span className="block text-sm font-bold text-white flex items-center gap-2">
                                            <Settings size={14} /> Carga manual de comisión
                                        </span>
                                        <span className="text-xs text-crm-fg-muted">Activá para editar libremente los % de comisión, salteando la regla fija.</span>
                                    </div>
                                </label>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div>
                                        <FieldLabel>% vendedor</FieldLabel>
                                        <CrmInput type="number" step="any" value={formData.sellerPct} onChange={(e) => updateField('sellerPct', e.target.value)} disabled={!formData.manualCommission || formData.splitCommission} className="h-10 bg-crm-bg disabled:opacity-50" />
                                        <p className="m-0 mt-1 text-[10px] text-crm-fg-muted">Fijo 1% — sin selección manual</p>
                                    </div>
                                    <div>
                                        <FieldLabel>% consignación</FieldLabel>
                                        <CrmInput type="number" step="any" value={formData.consignationPct} onChange={(e) => updateField('consignationPct', e.target.value)} disabled={!formData.manualCommission || formData.splitCommission} className="h-10 bg-crm-bg disabled:opacity-50" />
                                        <p className="m-0 mt-1 text-[10px] text-crm-fg-muted">Fijo — se calcula automático en el panel verde.</p>
                                    </div>
                                    <div>
                                        <FieldLabel>Extra cobrado al cliente (bruto)</FieldLabel>
                                        <div className="flex gap-2">
                                            <div className="w-24 shrink-0">
                                                <CrmSelect value={formData.extraCurrency} onChange={(e) => updateField('extraCurrency', e.target.value)} disabled={!formData.manualCommission} className="h-10 bg-crm-bg disabled:opacity-50">
                                                    <option value="USD">USD</option>
                                                    <option value="ARS">ARS</option>
                                                </CrmSelect>
                                            </div>
                                            <div className="flex-1">
                                                <CrmInput type="number" step="any" value={formData.extraAmount} onChange={(e) => updateField('extraAmount', e.target.value)} disabled={!formData.manualCommission} placeholder="Monto fijo" className="h-10 bg-crm-bg disabled:opacity-50" />
                                            </div>
                                        </div>
                                        <p className="m-0 mt-1 text-[10px] text-crm-fg-muted leading-tight">Recargo a favor de la agencia (ej. gestión de transferencia). De acá se liquida la parte del vendedor según el % de abajo.</p>
                                    </div>
                                </div>

                                <label className="flex items-start gap-3 rounded-lg border border-neutral-700 bg-crm-bg p-4 cursor-pointer">
                                    <input type="checkbox" checked={formData.splitCommission} onChange={(e) => updateField('splitCommission', e.target.checked)} className="mt-1 h-4 w-4 rounded border-neutral-600 bg-crm-surface text-yellow-500" />
                                    <div>
                                        <span className="block text-sm font-bold text-white flex items-center gap-2">
                                            <Users size={14} className="text-yellow-500" /> Vendedor compartido (split comisión 50/50)
                                        </span>
                                        <span className="text-xs text-crm-fg-muted">Activá esto si la comisión se reparte con otro vendedor — ambos pasan automáticamente a 0.5% cada uno (no editable).</span>
                                    </div>
                                </label>
                            </div>

                            <SectionTitle>ITEMS QUE SE ENTREGAN CON EL VEHÍCULO</SectionTitle>
                            <p className="text-xs text-crm-fg-muted mb-4 -mt-3">Marcá los que correspondan al cargar la operación. Sirve para el checklist de entrega y como conformidad para el comprador.</p>
                            
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                <label className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-crm-surface p-4 cursor-pointer hover:border-neutral-700 transition-colors">
                                    <input type="checkbox" checked={formData.deliveryItems.securityNut} onChange={(e) => updateDeliveryItem('securityNut', e.target.checked)} className="h-4 w-4 rounded border-neutral-600 bg-crm-bg text-crm-red" />
                                    <div>
                                        <span className="text-sm font-bold text-white block">🔩 Tuerca de<br/>seguridad</span>
                                        <span className="text-[10px] text-crm-fg-muted">si corresponde</span>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-crm-surface p-4 cursor-pointer hover:border-neutral-700 transition-colors">
                                    <input type="checkbox" checked={formData.deliveryItems.spareKey} onChange={(e) => updateDeliveryItem('spareKey', e.target.checked)} className="h-4 w-4 rounded border-neutral-600 bg-crm-bg text-crm-red" />
                                    <span className="text-sm font-bold text-white">🔑 Duplicado de llave</span>
                                </label>
                                <label className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-crm-surface p-4 cursor-pointer hover:border-neutral-700 transition-colors">
                                    <input type="checkbox" checked={formData.deliveryItems.manuals} onChange={(e) => updateDeliveryItem('manuals', e.target.checked)} className="h-4 w-4 rounded border-neutral-600 bg-crm-bg text-crm-red" />
                                    <span className="text-sm font-bold text-white">📘 Manuales</span>
                                </label>
                                <label className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-crm-surface p-4 cursor-pointer hover:border-neutral-700 transition-colors">
                                    <input type="checkbox" checked={formData.deliveryItems.vehicleCard} onChange={(e) => updateDeliveryItem('vehicleCard', e.target.checked)} className="h-4 w-4 rounded border-neutral-600 bg-crm-bg text-crm-red" />
                                    <span className="text-sm font-bold text-white">🪪 Cédula</span>
                                </label>
                            </div>

                            <SectionTitle>DOCUMENTOS PARA EL EXPEDIENTE</SectionTitle>
                            <p className="mb-8 text-xs leading-5 text-crm-fg-muted">
                                Los archivos no se adjuntan en esta carga ni al borrador. Conservá los documentos para incorporarlos al expediente.
                            </p>
                        </>
                    )}

                    <div className="grid grid-cols-1 gap-5 mb-4">
                        {!formData.manualImport && (
                            <div>
                                <FieldLabel>Fecha de entrega</FieldLabel>
                                <div className="relative lg:w-1/3">
                                    <CalendarDays className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={16} />
                                    <CrmInput type="date" value={formData.estimatedDeliveryDate} onChange={(e) => updateField('estimatedDeliveryDate', e.target.value)} className="h-10 bg-crm-bg pr-10" />
                                </div>
                            </div>
                        )}
                        <div>
                            <FieldLabel>Notas generales</FieldLabel>
                            <CrmTextarea value={formData.notes} onChange={(e) => updateField('notes', e.target.value)} className="min-h-[100px] bg-crm-bg" />
                        </div>
                    </div>

            </div>
        </CrmModal>
    );
}
