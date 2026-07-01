import React from 'react';

export default function VehicleFlyerPdf({ vehicle }) {
    if (!vehicle) return null;

    const formattedPrice = Number(vehicle.precioPublicado || 0).toLocaleString('es-AR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

    const formattedKm = vehicle.kilometraje !== undefined
        ? Number(vehicle.kilometraje).toLocaleString('es-AR')
        : '-';

    const mainImage = vehicle.fotos && vehicle.fotos.length > 0 ? vehicle.fotos[0] : null;

    return (
        <div className="vehicle-flyer-print-root bg-white text-black p-8 font-sans w-full max-w-[21cm] mx-auto min-h-[29.7cm] flex flex-col justify-between" style={{ color: '#000000', backgroundColor: '#ffffff' }}>
            <div>
                {/* Header */}
                <div className="flex items-center justify-between border-b-2 border-red-600 pb-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-neutral-900" style={{ fontFamily: 'sans-serif' }}>AUTOSPORTING</h1>
                        <p className="text-xs text-neutral-500 uppercase tracking-widest mt-0.5">Seleccionados & 0km</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-neutral-800 uppercase tracking-wider">Ficha Técnica de Unidad</p>
                        <p className="text-xs text-neutral-500 mt-1">Impreso: {new Date().toLocaleDateString('es-AR')}</p>
                    </div>
                </div>

                {/* Primary Panel */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    {/* Cover image */}
                    <div className="border border-neutral-200 rounded-lg overflow-hidden bg-neutral-100 flex items-center justify-center aspect-[4/3] relative">
                        {mainImage ? (
                            <img
                                src={mainImage}
                                alt={`${vehicle.marca} ${vehicle.modelo}`}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-neutral-400 text-sm font-semibold">Sin imagen disponible</span>
                        )}
                    </div>

                    {/* Details and Price */}
                    <div className="flex flex-col justify-between py-1">
                        <div>
                            <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black uppercase rounded mb-2">
                                {vehicle.estado || 'Disponible'}
                            </span>
                            <h2 className="text-2xl font-extrabold text-neutral-900 leading-tight">
                                {vehicle.marca}
                            </h2>
                            <h3 className="text-xl font-bold text-neutral-700 mt-1">
                                {vehicle.modelo}
                            </h3>
                            <p className="text-xs text-neutral-500 mt-2 line-clamp-3">
                                {vehicle.version && vehicle.version !== 'N/A' ? vehicle.version : ''}
                            </p>
                        </div>

                        <div className="border-t border-neutral-200 pt-4">
                            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Precio de venta</span>
                            <span className="text-3xl font-black text-red-600 mt-1 block">
                                {vehicle.moneda || 'USD'} {formattedPrice}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Specs block */}
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6 mb-8">
                    <h3 className="text-xs font-black text-neutral-800 uppercase tracking-widest border-b border-neutral-200 pb-2 mb-4">
                        Especificaciones del Vehículo
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
                        <div>
                            <span className="block text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Año</span>
                            <span className="font-semibold text-neutral-900">{vehicle.año || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Kilometraje</span>
                            <span className="font-semibold text-neutral-900">{formattedKm} km</span>
                        </div>
                        <div>
                            <span className="block text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Combustible</span>
                            <span className="font-semibold text-neutral-900">{vehicle.combustible || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Color</span>
                            <span className="font-semibold text-neutral-900">{vehicle.color || '-'}</span>
                        </div>
                    </div>
                </div>

                {/* Internal description / notes */}
                {vehicle.observaciones && vehicle.observaciones !== 'Sin observaciones.' && (
                    <div className="mb-8">
                        <h3 className="text-xs font-black text-neutral-800 uppercase tracking-widest border-b border-neutral-200 pb-2 mb-3">
                            Equipamiento y Detalles
                        </h3>
                        <p className="text-xs text-neutral-600 leading-relaxed whitespace-pre-line">
                            {vehicle.observaciones}
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="border-t border-neutral-200 pt-6">
                <div className="grid grid-cols-3 gap-6 text-[10px] text-neutral-500 font-medium leading-relaxed">
                    <div>
                        <span className="font-bold text-neutral-800 uppercase tracking-wider block mb-1">Nuestra Agencia</span>
                        <p>AutoSporting Chubut</p>
                        <p>Av. Julio Argentino Roca 116</p>
                        <p>Comodoro Rivadavia, Chubut</p>
                    </div>
                    <div>
                        <span className="font-bold text-neutral-800 uppercase tracking-wider block mb-1">Contacto Comercial</span>
                        <p>Tel/WhatsApp: +54 9 297 404-5378</p>
                        <p>Email: contacto@autosportingg.com</p>
                    </div>
                    <div className="text-right flex flex-col justify-end">
                        <span className="font-bold text-neutral-800 uppercase tracking-wider block mb-1">Catálogo Online</span>
                        <p className="text-red-600 font-bold text-xs">www.autosportingg.com</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
