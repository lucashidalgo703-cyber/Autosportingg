export const VEHICLE_DETAIL_SECTIONS = [
    { id: 'general', label: 'General' },
    { id: 'costos', label: 'Costos y capital' },
    { id: 'fotos', label: 'Fotos' },
    { id: 'documentos', label: 'Documentos' },
    { id: 'publicacion', label: 'Publicación' },
    { id: 'permutas', label: 'Permutas' },
    { id: 'historial', label: 'Historial' }
];

export function getVehicleDetailSection(value) {
    return VEHICLE_DETAIL_SECTIONS.some(section => section.id === value) ? value : 'general';
}

export function getVehicleOperationalStatus(vehicle) {
    return String(vehicle?._original?.status || vehicle?.estado || vehicle?.status || '').trim().toLowerCase();
}

export function canReserveVehicle(vehicle, activeReservation) {
    return getVehicleOperationalStatus(vehicle) === 'disponible' && !vehicle?._original?.sold && !activeReservation?._id;
}

export function getVehicleReservationInitialData(vehicle) {
    return {
        vehicleId: vehicle?.id || vehicle?._id,
        vehicleName: [vehicle?.marca, vehicle?.modelo, vehicle?.año].filter(Boolean).join(' '),
        agreedPrice: vehicle?.precioPublicado ?? 0,
        agreedCurrency: vehicle?.moneda || 'USD'
    };
}
