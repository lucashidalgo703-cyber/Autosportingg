"use client";
import React, { useEffect, useMemo, useState } from 'react';
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
    X
} from 'lucide-react';
import { useAdminCars } from '../../../hooks/useAdminCars';
import { useAdminClients } from '../../../hooks/useAdminClients';
import { useAdminSales } from '../../../hooks/useAdminSales';
import CrmButton from '../ui/CrmButton';
import CrmInput from '../ui/CrmInput';
import CrmSelect from '../ui/CrmSelect';
import CrmTextarea from '../ui/CrmTextarea';

const today = () => new Date().toISOString().slice(0, 10);

const FieldLabel = ({ children, required = false }) => (
    <label className="mb-1.5 block text-[11px] font-bold text-crm-fg-muted">
        {children}{required && <span className="text-crm-red"> *</span>}
    </label>
);

const SectionTitle = ({ icon: Icon, children }) => (
    <h3 className="m-0 mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.08em] text-crm-fg-muted">
        {Icon && <Icon size={16} className="text-crm-fg-muted" />}
        {children}
    </h3>
);

export default function SaleCreateModal({ isOpen, onClose, onSuccess }) {
    const { cars } = useAdminCars();
    const { clients, fetchClients } = useAdminClients();
    const { createSale } = useAdminSales();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [vehicleSearch, setVehicleSearch] = useState('');
    const [formData, setFormData] = useState({
        manualImport: false,
        vehicleId: '',
        status: 'borrador',
        mileage: '',
        saleCurrency: 'USD',
        salePrice: '',
        salesperson: '',
        saleDate: today(),
        clientId: '',
        buyerName: '',
        buyerPhone: '',
        buyerEmail: '',
        buyerDni: '',
        paymentMethod: '',
        installments: '',
        hasTradeIn: false,
        consignationOwner: '',
        consignationManager: '',
        manualCommission: false,
        extraCommissionCurrency: 'USD',
        extraCommissionAmount: '',
        splitCommission: false,
        estimatedDeliveryDate: '',
        notes: ''
    });

    useEffect(() => {
        if (isOpen) {
            fetchClients({ limit: 80 });
            setError('');
        }
    }, [fetchClients, isOpen]);

    const availableCars = useMemo(() => {
        const search = vehicleSearch.trim().toLowerCase();
        return (cars || [])
            .filter((car) => (car.status || '').toLowerCase() === 'disponible')
            .filter((car) => {
                if (!search) return true;
                return `${car.brand || ''} ${car.name || ''} ${car.model || ''} ${car.version || ''} ${car.plateOrVin || ''}`.toLowerCase().includes(search);
            })
            .slice(0, 30);
    }, [cars, vehicleSearch]);

    const selectedVehicle = useMemo(
        () => (cars || []).find((car) => car._id === formData.vehicleId),
        [cars, formData.vehicleId]
    );

    if (!isOpen) return null;

    const updateField = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const resetAndClose = () => {
        setLoading(false);
        setError('');
        onClose?.();
    };

    const handleSubmit = async () => {
        setError('');

        if (!formData.vehicleId) {
            setError('Seleccioná un vehículo disponible del stock para crear la venta.');
            return;
        }

        const salePrice = Number(formData.salePrice);
        if (!Number.isFinite(salePrice) || salePrice < 0) {
            setError('Ingresá un precio de venta válido.');
            return;
        }

        setLoading(true);
        try {
            const buyerNotes = [
                formData.buyerName ? `Comprador: ${formData.buyerName}` : '',
                formData.buyerPhone ? `Telefono: ${formData.buyerPhone}` : '',
                formData.buyerEmail ? `Email: ${formData.buyerEmail}` : '',
                formData.buyerDni ? `DNI: ${formData.buyerDni}` : '',
                formData.notes ? `Notas: ${formData.notes}` : ''
            ].filter(Boolean).join('\n');

            await createSale({
                vehicleId: formData.vehicleId,
                clientId: formData.clientId || undefined,
                salePrice,
                saleCurrency: formData.saleCurrency,
                paymentMethod: formData.paymentMethod || 'contado',
                salesperson: formData.salesperson,
                saleDate: formData.saleDate,
                notes: buyerNotes
            });

            await onSuccess?.();
            resetAndClose();
        } catch (err) {
            setError(err.message || 'No se pudo crear la venta. Reintentá en unos segundos.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 px-4 py-8 backdrop-blur-sm">
            <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-crm-border bg-crm-surface shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-crm-border px-5 py-4">
                    <div>
                        <h2 className="m-0 text-xl font-bold text-crm-fg">Nueva venta</h2>
                        <p className="m-0 mt-1 text-sm text-crm-fg-muted">
                            Se crea en estado Activa si hay vehículo del stock asignado. El estado operativo se ajusta después desde el detalle.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={resetAndClose}
                        className="m-0 flex h-9 w-9 appearance-none items-center justify-center rounded-lg border border-transparent bg-transparent text-crm-fg-muted transition-colors hover:bg-crm-surface-raised hover:text-crm-fg"
                        aria-label="Cerrar"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="max-h-[72vh] overflow-y-auto px-5 py-5">
                    {error && (
                        <div className="mb-5 rounded-xl border border-crm-red/30 bg-crm-red/10 px-4 py-3 text-sm font-semibold text-red-200">
                            {error}
                        </div>
                    )}

                    <label className="mb-5 flex items-start gap-3 rounded-xl border border-crm-border bg-crm-bg p-4 text-sm text-crm-fg">
                        <input
                            type="checkbox"
                            checked={formData.manualImport}
                            onChange={(event) => updateField('manualImport', event.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-crm-border bg-crm-surface text-crm-red focus:ring-crm-red"
                        />
                        <span>
                            <span className="block font-bold">Carga manual <span className="text-crm-fg-muted">(venta vieja importada desde Excel)</span></span>
                            <span className="mt-1 block text-xs leading-5 text-crm-fg-muted">
                                Form simplificado para registrar ventas históricas. La operación queda registrada desde este módulo sin copiar datos privados de Sote.
                            </span>
                        </span>
                    </label>

                    <section className="border-b border-crm-border pb-6">
                        <SectionTitle icon={Tags}>Datos de la operación</SectionTitle>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                            <div className="lg:col-span-2">
                                <FieldLabel required>Vehículo</FieldLabel>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={16} />
                                    <CrmInput
                                        value={vehicleSearch}
                                        onChange={(event) => setVehicleSearch(event.target.value)}
                                        placeholder="Buscar marca, modelo, patente..."
                                        className="h-11 bg-crm-bg pl-10"
                                    />
                                </div>
                                <CrmSelect
                                    value={formData.vehicleId}
                                    onChange={(event) => updateField('vehicleId', event.target.value)}
                                    className="mt-2 h-11 bg-crm-bg"
                                >
                                    <option value="">Sin vehículo</option>
                                    {availableCars.map((car) => (
                                        <option key={car._id} value={car._id}>
                                            {`${car.brand || ''} ${car.name || car.model || ''}`.trim()} {car.plateOrVin ? `- ${car.plateOrVin}` : ''}
                                        </option>
                                    ))}
                                </CrmSelect>
                                {selectedVehicle && (
                                    <p className="m-0 mt-2 flex items-center gap-2 text-xs text-crm-fg-muted">
                                        <CarFront size={14} /> {selectedVehicle.brand} {selectedVehicle.name || selectedVehicle.model}
                                    </p>
                                )}
                            </div>

                            <div>
                                <FieldLabel>Estado</FieldLabel>
                                <CrmSelect value={formData.status} onChange={(event) => updateField('status', event.target.value)} className="h-11 bg-crm-bg">
                                    <option value="borrador">Borrador</option>
                                    <option value="confirmada">Activa</option>
                                    <option value="reserva">Reserva</option>
                                    <option value="entregada">Cerrada</option>
                                    <option value="cancelada">Cancelada</option>
                                </CrmSelect>
                                <p className="m-0 mt-2 text-xs text-crm-fg-muted">El backend actual crea la venta activa; luego se ajusta desde el detalle.</p>
                            </div>

                            <div>
                                <FieldLabel>Kilometraje del vehículo</FieldLabel>
                                <CrmInput type="number" min="0" value={formData.mileage} onChange={(event) => updateField('mileage', event.target.value)} className="h-11 bg-crm-bg" />
                            </div>

                            <div>
                                <FieldLabel required>Precio de Venta (al comprador)</FieldLabel>
                                <div className="grid grid-cols-[88px_1fr] gap-2">
                                    <CrmSelect value={formData.saleCurrency} onChange={(event) => updateField('saleCurrency', event.target.value)} className="h-11 bg-crm-bg">
                                        <option value="USD">USD</option>
                                        <option value="ARS">ARS</option>
                                    </CrmSelect>
                                    <CrmInput type="number" min="0" value={formData.salePrice} onChange={(event) => updateField('salePrice', event.target.value)} className="h-11 bg-crm-bg" />
                                </div>
                            </div>

                            <div>
                                <FieldLabel required>Vendedor (cerró la venta)</FieldLabel>
                                <CrmInput value={formData.salesperson} onChange={(event) => updateField('salesperson', event.target.value)} className="h-11 bg-crm-bg" placeholder="Equipo AutoSporting" />
                            </div>

                            <div>
                                <FieldLabel>Fecha de cierre</FieldLabel>
                                <CrmInput type="date" value={formData.saleDate} onChange={(event) => updateField('saleDate', event.target.value)} className="h-11 bg-crm-bg" />
                            </div>
                        </div>
                    </section>

                    <section className="border-b border-crm-border py-6">
                        <SectionTitle icon={User}>Comprador</SectionTitle>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                            <div className="lg:col-span-2">
                                <FieldLabel>Cliente del CRM</FieldLabel>
                                <CrmSelect value={formData.clientId} onChange={(event) => updateField('clientId', event.target.value)} className="h-11 bg-crm-bg">
                                    <option value="">Sin cliente</option>
                                    {(clients || []).map((client) => (
                                        <option key={client._id} value={client._id}>
                                            {client.fullName || client.firstName || client.email || 'Cliente sin nombre'}
                                        </option>
                                    ))}
                                </CrmSelect>
                            </div>
                            <div className="lg:col-span-2">
                                <FieldLabel required>Nombre</FieldLabel>
                                <CrmInput value={formData.buyerName} onChange={(event) => updateField('buyerName', event.target.value)} className="h-11 bg-crm-bg" />
                            </div>
                            <div>
                                <FieldLabel>Teléfono</FieldLabel>
                                <CrmInput value={formData.buyerPhone} onChange={(event) => updateField('buyerPhone', event.target.value)} placeholder="+54 11 5555 5555" className="h-11 bg-crm-bg" />
                            </div>
                            <div>
                                <FieldLabel>Email</FieldLabel>
                                <CrmInput type="email" value={formData.buyerEmail} onChange={(event) => updateField('buyerEmail', event.target.value)} className="h-11 bg-crm-bg" />
                            </div>
                            <div>
                                <FieldLabel>DNI</FieldLabel>
                                <CrmInput value={formData.buyerDni} onChange={(event) => updateField('buyerDni', event.target.value)} className="h-11 bg-crm-bg" />
                            </div>
                        </div>
                    </section>

                    <section className="border-b border-crm-border py-6">
                        <SectionTitle icon={HandCoins}>Pago</SectionTitle>
                        <div className="mb-4 rounded-xl border border-crm-border bg-crm-bg p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="m-0 text-sm font-bold text-crm-fg">Seña / adelanto (0)</p>
                                    <p className="m-0 mt-1 text-xs text-crm-fg-muted">Sin seña registrada. Si el cliente abonó algo a cuenta, agregalo luego desde el detalle.</p>
                                </div>
                                <CrmButton type="button" variant="secondary" size="sm" disabled>
                                    <Plus size={14} /> Agregar seña
                                </CrmButton>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div>
                                <FieldLabel>Método de pago</FieldLabel>
                                <CrmSelect value={formData.paymentMethod} onChange={(event) => updateField('paymentMethod', event.target.value)} className="h-11 bg-crm-bg">
                                    <option value="">—</option>
                                    <option value="contado">Contado</option>
                                    <option value="financiado">Financiado</option>
                                    <option value="mixto">Permuta</option>
                                    <option value="otro">Criptomonedas</option>
                                </CrmSelect>
                            </div>
                            <div>
                                <FieldLabel>Cuotas (plazo)</FieldLabel>
                                <CrmInput type="number" value={formData.installments} onChange={(event) => updateField('installments', event.target.value)} disabled={formData.paymentMethod !== 'financiado'} className="h-11 bg-crm-bg" />
                                <p className="m-0 mt-2 text-xs text-crm-fg-muted">Solo si el método de pago es Financiado</p>
                            </div>
                        </div>
                    </section>

                    <section className="border-b border-crm-border py-6">
                        <SectionTitle icon={DollarSign}>Permuta</SectionTitle>
                        <label className="flex items-start gap-3 rounded-xl border border-crm-border bg-crm-bg p-4 text-sm text-crm-fg">
                            <input
                                type="checkbox"
                                checked={formData.hasTradeIn}
                                onChange={(event) => updateField('hasTradeIn', event.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-crm-border bg-crm-surface text-crm-red focus:ring-crm-red"
                            />
                            <span>
                                <span className="font-bold">Incluir vehículo en permuta</span>
                                <span className="mt-1 block text-xs text-crm-fg-muted">Activá esto si el comprador entrega un auto en parte de pago.</span>
                            </span>
                        </label>
                    </section>

                    <section className="border-b border-crm-border py-6">
                        <SectionTitle icon={CheckSquare}>Items que se entregan con el vehículo</SectionTitle>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {['Tuerca de seguridad', 'Duplicado de llave', 'Manuales', 'Cédula'].map((item) => (
                                <label key={item} className="flex items-center gap-2 rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm font-semibold text-crm-fg-muted">
                                    <input type="checkbox" className="h-4 w-4 rounded border-crm-border bg-crm-surface text-crm-red focus:ring-crm-red" />
                                    {item}
                                </label>
                            ))}
                        </div>
                    </section>

                    <section className="py-6">
                        <SectionTitle icon={FileText}>Documentos y notas</SectionTitle>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            {['DNI Frente', 'DNI Dorso', 'Cédula Verde Frente', 'Cédula Verde Dorso'].map((item) => (
                                <div key={item} className="rounded-lg border border-dashed border-crm-border bg-crm-bg px-4 py-3 text-sm text-crm-fg-muted">
                                    {item}
                                </div>
                            ))}
                            <div>
                                <FieldLabel>Fecha de entrega</FieldLabel>
                                <CrmInput type="date" value={formData.estimatedDeliveryDate} onChange={(event) => updateField('estimatedDeliveryDate', event.target.value)} className="h-11 bg-crm-bg" />
                            </div>
                            <div className="lg:col-span-2">
                                <FieldLabel>Notas generales</FieldLabel>
                                <CrmTextarea value={formData.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Detalles de la operación, contexto..." className="min-h-[90px] bg-crm-bg" />
                            </div>
                        </div>
                    </section>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-crm-border px-5 py-4 sm:flex-row sm:justify-end">
                    <CrmButton type="button" variant="secondary" onClick={resetAndClose} disabled={loading}>
                        Cancelar
                    </CrmButton>
                    <CrmButton type="button" variant="secondary" onClick={() => setError('El guardado como borrador requiere soporte del endpoint actual. Usá Crear venta para registrar una venta activa.')} disabled={loading}>
                        <FileText size={15} /> Guardar borrador
                    </CrmButton>
                    <CrmButton type="button" variant="primary" onClick={handleSubmit} disabled={loading}>
                        <CalendarDays size={15} /> {loading ? 'Creando...' : 'Crear venta'}
                    </CrmButton>
                </div>
            </div>
        </div>
    );
}
