"use client";
import { Suspense, useState } from 'react';
import VehicleDialogSurface from './VehicleDialogSurface';
import VehicleDetailWorkspace from './VehicleDetailWorkspace';

export default function VehicleDetailDialog({ vehicle, onClose, initialSection = 'resumen', initialAction, activityTab, onVehicleChanged }) {
    const [section, setSection] = useState(initialSection);
    const [dirty, setDirty] = useState(false);
    const [currentVehicle, setCurrentVehicle] = useState(vehicle);
    const close = () => { if (!dirty || window.confirm('Hay fotos con cambios sin guardar. ¿Cerrar la ficha y descartarlos?')) onClose(); };
    return <VehicleDialogSurface title={`${currentVehicle.marca} ${currentVehicle.modelo} · ${currentVehicle.año}`} subtitle="Ficha comercial y seguimiento" onClose={close}><Suspense fallback={<p role="status" className="p-4 text-sm text-crm-fg-muted">Cargando ficha…</p>}><VehicleDetailWorkspace vehicleId={vehicle.id} embedded section={section} onSectionChange={setSection} onClose={close} initialAction={initialAction} activityTab={activityTab} onVehicleChanged={onVehicleChanged} onVehicleLoaded={setCurrentVehicle} onDirtyChange={setDirty} /></Suspense></VehicleDialogSurface>;
}
