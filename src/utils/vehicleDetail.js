export const VEHICLE_DETAIL_SECTIONS = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'actividad', label: 'Actividad comercial' },
    { id: 'publicaciones', label: 'Publicaciones' },
    { id: 'documentacion', label: 'Documentación' },
    { id: 'gastos', label: 'Gastos y margen' },
    { id: 'precios', label: 'Precios e historial' },
    { id: 'portal', label: 'Portal del propietario' }
];

export function getVehicleDetailSection(value) {
    const aliases = { general: 'resumen', costos: 'gastos', fotos: 'resumen', documentos: 'documentacion', publicacion: 'publicaciones', permutas: 'gastos', historial: 'precios' };
    const resolved = aliases[value] || value;
    return VEHICLE_DETAIL_SECTIONS.some(section => section.id === resolved) ? resolved : 'resumen';
}

export function getVehicleOperationalStatus(vehicle) {
    return String(vehicle?._original?.status || vehicle?.estado || vehicle?.status || '').trim().toLowerCase();
}

export function getVehicleStatusLabel(vehicleOrStatus) {
    const status = typeof vehicleOrStatus === 'string' ? vehicleOrStatus.trim().toLowerCase() : getVehicleOperationalStatus(vehicleOrStatus);
    return ({ disponible: 'Disponible', reservado: 'Señado', pausado: 'Vendido sin confirmar', vendido: 'Vendido', retirado: 'Fuera de venta' })[status] || status || 'Sin estado informado';
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
