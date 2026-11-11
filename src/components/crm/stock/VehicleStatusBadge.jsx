"use client";
import CrmBadge from '../ui/CrmBadge';

export default function VehicleStatusBadge({ status }) {
    let variant = 'default';
    let label = status;

    switch (status?.toLowerCase()) {
        case 'disponible':
            variant = 'success';
            label = 'Disponible';
            break;
        case 'reservado':
            variant = 'warning';
            label = 'Reservado';
            break;
        case 'vendido':
            variant = 'primary'; // Usamos primary (rojo) para vendido, o podríamos usar default
            label = 'Vendido';
            break;
        case 'pausado':
            variant = 'danger';
            label = 'Pausado';
            break;
        default:
            variant = 'default';
    }

    return <CrmBadge variant={variant}>{label}</CrmBadge>;
}
