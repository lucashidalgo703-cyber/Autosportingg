"use client";
import CrmCard from '../ui/CrmCard';
import { Edit } from 'lucide-react';
import { formatSaleDate } from '../../../utils/saleCalendarDate';

function Field({ label, children }) {
    return <div className="min-w-0"><dt className="mb-1 text-[11px] text-crm-fg-muted">{label}</dt><dd className="m-0 break-words text-sm font-medium text-crm-fg">{children === '' || children === null || children === undefined ? 'No informado' : children}</dd></div>;
}

export default function VehicleInfoPanel({ vehicle, onEdit }) {
    const source = vehicle._original || {};
    return <CrmCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-crm-fg">Datos del vehículo</h2>
            {onEdit && <button type="button" onClick={onEdit} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-crm-border bg-crm-surface-raised px-2.5 text-xs text-crm-fg-muted hover:text-crm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red"><Edit size={13} />Editar datos</button>}
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-3">
            <Field label="Marca">{vehicle.marca}</Field><Field label="Modelo">{vehicle.modelo}</Field><Field label="Año">{vehicle.año}</Field>
            <Field label="Dominio / VIN">{vehicle.dominio}</Field><Field label="Kilometraje">{`${Number(vehicle.kilometraje || 0).toLocaleString('es-AR')} km`}</Field><Field label="Color">{vehicle.color}</Field>
            <Field label="Versión">{vehicle.technicalVersion}</Field><Field label="Combustible">{vehicle.combustible}</Field><Field label="Transmisión">{vehicle.transmission}</Field>
            <Field label="Tipo de vehículo">{source.vehicleType}</Field><Field label="Carrocería">{vehicle.bodyType}</Field><Field label="Puertas">{vehicle.doors}</Field>
            <Field label="Motor / cilindrada">{vehicle.engine}</Field><Field label="Número de motor">{source.engineNumber}</Field><Field label="Chasis">{source.chassisNumber}</Field>
            <Field label="Condición">{vehicle.condicion}</Field><Field label="Ubicación">{source.location}</Field><Field label="Fecha de ingreso">{vehicle.fechaIngreso ? formatSaleDate({ createdAt: vehicle.fechaIngreso }) : null}</Field>
            <Field label="Manuales">{source.hasManuals}</Field><Field label="Duplicado de llaves">{source.hasDuplicateKeys}</Field><Field label="Servicios oficiales">{source.hasOfficialServices}</Field>
        </dl>
        <div className="mt-5 border-t border-crm-border pt-4">
            <h3 className="mb-3 text-xs font-semibold text-crm-fg">Origen y propiedad</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-3">
                <Field label="Origen"><span className="capitalize">{vehicle.origen}</span></Field>
                <Field label="Propietario">{source.ownerName}</Field><Field label="Consignador">{source.consignedBy}</Field>
                <Field label="Teléfono del propietario">{source.ownerPhone}</Field><Field label="Email del propietario">{source.ownerEmail}</Field>
                <Field label="Inversor / participación">{vehicle.investor?.name ? `${vehicle.investor.name} · ${vehicle.investor.percentage ?? 0}%` : null}</Field>
            </dl>
        </div>
        {source.description && <div className="mt-5 border-t border-crm-border pt-4"><h3 className="mb-2 text-xs font-semibold text-crm-fg">Descripción del vehículo</h3><p className="whitespace-pre-wrap break-words text-sm text-crm-fg-muted">{source.description}</p></div>}
        <div className="mt-5 border-t border-crm-border pt-4"><h3 className="mb-2 text-xs font-semibold text-crm-fg">Observaciones internas</h3><p className="whitespace-pre-wrap break-words rounded-lg border border-crm-border bg-crm-bg p-3 text-sm text-crm-fg-muted">{vehicle.observaciones || 'Sin observaciones.'}</p></div>
    </CrmCard>;
}
