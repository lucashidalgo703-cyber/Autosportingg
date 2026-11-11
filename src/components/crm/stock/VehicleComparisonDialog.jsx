"use client";
import { getVehicleStatusLabel } from "../../../utils/vehicleDetail";
import CrmModal from '../ui/CrmModal';

export default function VehicleComparisonDialog({ vehicles = [], isOpen, onClose }) {
    const rows = [
        ['Año', vehicle => vehicle.año], ['Kilometraje', vehicle => `${Number(vehicle.kilometraje || 0).toLocaleString('es-AR')} km`],
        ['Precio publicado', vehicle => Number(vehicle.precioPublicado) > 0 ? `${vehicle.moneda} ${Number(vehicle.precioPublicado).toLocaleString('es-AR')}` : 'Sin precio'],
        ['Transmisión', vehicle => vehicle.transmission], ['Combustible', vehicle => vehicle.combustible], ['Carrocería', vehicle => vehicle.bodyType], ['Motor', vehicle => vehicle.engine],
        ['Dominio', vehicle => vehicle.dominio], ['Estado', vehicle => getVehicleStatusLabel(vehicle)], ['Origen', vehicle => vehicle.origen], ['Ubicación', vehicle => vehicle._original?.location],
        ['Días en stock', vehicle => vehicle.diasEnStock == null ? 'Sin fecha' : vehicle.diasEnStock],
    ];
    return <CrmModal isOpen={isOpen} onClose={onClose} title="Comparar vehículos" maxWidth="max-w-5xl" footer={<p className="m-0 text-xs text-crm-fg-muted">Precios registrados por moneda. No se aplica una conversión automática.</p>}><div className="overflow-x-auto p-4"><table className="w-full border-collapse text-left text-xs"><thead><tr><th className="min-w-32 border-b border-crm-border p-3 text-crm-fg-muted">Característica</th>{vehicles.map(vehicle => <th key={vehicle.id} className="min-w-48 border-b border-crm-border p-3 text-crm-fg">{vehicle.marca} {vehicle.modelo}</th>)}</tr></thead><tbody>{rows.map(([label, value]) => <tr key={label}><th className="border-b border-crm-border/60 p-3 font-medium text-crm-fg-muted">{label}</th>{vehicles.map(vehicle => <td key={vehicle.id} className="border-b border-crm-border/60 p-3 capitalize text-crm-fg">{value(vehicle) === '' || value(vehicle) == null ? 'No informado' : value(vehicle)}</td>)}</tr>)}</tbody></table></div></CrmModal>;
}
