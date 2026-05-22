import React, { useState, useEffect } from 'react';
import { X, Upload, Plus, ArrowLeft, ArrowRight, Star, Scan } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VehicleFormModal({ isOpen, onClose, onSave, editingCar }) {
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState([]);
    const [draggedIndex, setDraggedIndex] = useState(null);

    const [formData, setFormData] = useState({
        brand: '', name: '', year: '', km: '', fuel: 'Nafta', condition: 'Muy bueno',
        description: '', price: '', currency: 'USD', featured: false, sold: false, status: 'Disponible',
        vehicleType: 'Auto', plateOrVin: '', color: '', purchasePrice: '', purchaseCurrency: 'USD',
        location: 'Salón Principal', owners: '1', agencyOwned: false, ownerName: '', linkedClient: '',
        ownerPhone: '', ownerEmail: '', consignedBy: '', engineNumber: '', chassisNumber: '',
        hasManuals: 'No', hasDuplicateKeys: 'No', hasOfficialServices: 'No', publishedOnML: 'No',
        publishedBy: '', mlLink: '', notes: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (editingCar) {
                setFormData({
                    ...editingCar,
                    vehicleType: editingCar.vehicleType || 'Auto',
                    condition: editingCar.condition || 'Muy bueno',
                    currency: editingCar.currency || 'USD',
                    status: editingCar.status || 'Disponible',
                    purchaseCurrency: editingCar.purchaseCurrency || 'USD',
                    location: editingCar.location || 'Salón Principal',
                    owners: editingCar.owners || '1',
                    hasManuals: editingCar.hasManuals || 'No',
                    hasDuplicateKeys: editingCar.hasDuplicateKeys || 'No',
                    hasOfficialServices: editingCar.hasOfficialServices || 'No',
                    publishedOnML: editingCar.publishedOnML || 'No'
                });
                
                // Load existing images if editing
                if (editingCar.images && editingCar.images.length > 0) {
                    const loadedFiles = editingCar.images.map(url => ({
                        preview: url,
                        isExisting: true,
                        url: url
                    }));
                    setFiles(loadedFiles);
                } else {
                    setFiles([]);
                }
            } else {
                setFormData({
                    brand: '', name: '', year: '', km: '', fuel: 'Nafta', condition: 'Muy bueno',
                    description: '', price: '', currency: 'USD', featured: false, sold: false, status: 'Disponible',
                    vehicleType: 'Auto', plateOrVin: '', color: '', purchasePrice: '', purchaseCurrency: 'USD',
                    location: 'Salón Principal', owners: '1', agencyOwned: false, ownerName: '', linkedClient: '',
                    ownerPhone: '', ownerEmail: '', consignedBy: '', engineNumber: '', chassisNumber: '',
                    hasManuals: 'No', hasDuplicateKeys: 'No', hasOfficialServices: 'No', publishedOnML: 'No',
                    publishedBy: '', mlLink: '', notes: ''
                });
                setFiles([]);
            }
        }
    }, [isOpen, editingCar]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleDragStart = (index) => setDraggedIndex(index);
    const handleDragOver = (e) => e.preventDefault();
    const handleDropSort = (index) => {
        if (draggedIndex === null) return;
        const newFiles = [...files];
        const draggedItem = newFiles.splice(draggedIndex, 1)[0];
        newFiles.splice(index, 0, draggedItem);
        setFiles(newFiles);
        setDraggedIndex(null);
    };

    const onDropFiles = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        addFiles(droppedFiles);
    };

    const addFiles = (newFilesRaw) => {
        const newFiles = Array.from(newFilesRaw).map(file => Object.assign(file, { preview: URL.createObjectURL(file) }));
        if (files.length + newFiles.length > 20) {
            toast.error("Máximo 20 imágenes.");
            setFiles(prev => [...prev, ...newFiles.slice(0, 20 - files.length)]);
        } else {
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData, files);
    };

    const InputLabel = ({ children, required }) => (
        <label className="text-[10px] text-gray-400 font-medium mb-1.5 block">
            {children} {required && <span className="text-red-500">*</span>}
        </label>
    );

    const TextInput = ({ name, value, onChange, placeholder, type="text", required }) => (
        <input 
            type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required}
            className="w-full bg-[#1e1e22] border border-white/5 rounded-md px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-red-500 focus:outline-none transition-colors"
        />
    );

    const SelectInput = ({ name, value, onChange, options }) => (
        <select 
            name={name} value={value} onChange={onChange}
            className="w-full bg-[#1e1e22] border border-white/5 rounded-md px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none transition-colors appearance-none"
            style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em' }}
        >
            {options.map((opt, i) => <option key={i} value={opt} className="bg-[#1e1e22] text-white">{opt}</option>)}
        </select>
    );

    return (
        <div className="fixed inset-0 z-50 flex justify-center items-start pt-10 pb-10 bg-black/80 backdrop-blur-sm overflow-y-auto custom-scrollbar animate-in fade-in duration-200">
            <div className="bg-[#141416] w-full max-w-3xl rounded-xl border border-white/10 shadow-2xl relative mb-10 overflow-hidden flex flex-col">
                
                {/* Header */}
                <div className="flex justify-between items-start p-6 border-b border-white/5 bg-[#1a1a1f]">
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-tight">{editingCar ? 'Editar vehículo' : 'Nuevo vehículo'}</h2>
                        <p className="text-[10px] text-gray-500 mt-1">Datos básicos del vehículo. Las fotos se configuran en esta pantalla.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-8">
                    
                    {/* Cédula Escáner (MocK) */}
                    <div className="bg-[#1e1e22] border border-dashed border-white/10 rounded-xl p-4 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                                <Scan size={18} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white mb-0.5">Escanear cédula verde (opcional)</p>
                                <p className="text-[10px] text-gray-400">Subí una foto clara del frente para extraer datos automáticamente.</p>
                            </div>
                        </div>
                        <button className="bg-[#2a2a2e] hover:bg-[#33333a] border border-white/5 text-white text-xs px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                            <Upload size={14} /> Subir foto
                        </button>
                    </div>

                    <form id="vehicleForm" onSubmit={handleSubmit} className="space-y-8">
                        
                        {/* IDENTIDAD */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest"><CarIcon /> Identidad</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><InputLabel>Tipo de vehículo</InputLabel><SelectInput name="vehicleType" value={formData.vehicleType} onChange={handleChange} options={['Auto', 'Moto', 'Camioneta', 'SUV']} /></div>
                                <div><InputLabel required>Marca</InputLabel><TextInput name="brand" value={formData.brand} onChange={handleChange} required /></div>
                                <div><InputLabel required>Modelo / Versión</InputLabel><TextInput name="name" value={formData.name} onChange={handleChange} required /></div>
                                
                                <div><InputLabel required>Año</InputLabel><TextInput name="year" value={formData.year} onChange={handleChange} type="number" required /></div>
                                <div><InputLabel required>Patente / VIN</InputLabel><TextInput name="plateOrVin" value={formData.plateOrVin} onChange={handleChange} required /></div>
                                <div><InputLabel required>Condición</InputLabel><SelectInput name="condition" value={formData.condition} onChange={handleChange} options={['Excelente', 'Muy bueno', 'Bueno', 'Regular']} /></div>
                                
                                <div><InputLabel required>Color</InputLabel><TextInput name="color" value={formData.color} onChange={handleChange} required /></div>
                            </div>
                        </section>

                        {/* PRECIO Y ESTADO */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Precio y Estado</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><InputLabel required>Kilómetros</InputLabel><TextInput name="km" value={formData.km} onChange={handleChange} type="number" required /></div>
                                <div><InputLabel required>Precio de venta</InputLabel><TextInput name="price" value={formData.price} onChange={handleChange} type="number" required /></div>
                                <div><InputLabel>Moneda venta</InputLabel><SelectInput name="currency" value={formData.currency} onChange={handleChange} options={['USD', 'ARS']} /></div>
                                
                                <div><InputLabel>Precio compra (opcional)</InputLabel><TextInput name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} type="number" /></div>
                                <div><InputLabel>Moneda compra</InputLabel><SelectInput name="purchaseCurrency" value={formData.purchaseCurrency} onChange={handleChange} options={['USD', 'ARS']} /></div>
                                <div><InputLabel>Estado inicial</InputLabel><SelectInput name="status" value={formData.status} onChange={handleChange} options={['Disponible', 'Reservado', 'Vendido']} /></div>

                                <div><InputLabel required>Ubicación</InputLabel><SelectInput name="location" value={formData.location} onChange={handleChange} options={['Salón Principal', 'Depósito', 'Taller', 'En tránsito']} /></div>
                                <div><InputLabel>Dueños</InputLabel><TextInput name="owners" value={formData.owners} onChange={handleChange} type="number" /></div>
                            </div>
                        </section>

                        {/* PROPIETARIO */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Propietario</span>
                            </div>
                            
                            <div className="bg-[#1e1e22] border border-white/5 rounded-xl p-4 mb-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" name="agencyOwned" checked={formData.agencyOwned} onChange={handleChange} className="w-4 h-4 rounded border-gray-600 text-red-500 focus:ring-red-500 bg-[#2a2a2e]" />
                                    <div>
                                        <span className="text-xs font-bold text-white block">Vehículo propio de la agencia</span>
                                        <span className="text-[10px] text-gray-500">El auto es de la agencia, no consignado por un tercero.</span>
                                    </div>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><InputLabel>Nombre</InputLabel><TextInput name="ownerName" value={formData.ownerName} onChange={handleChange} /></div>
                                <div><InputLabel>Cliente vinculado</InputLabel><SelectInput name="linkedClient" value={formData.linkedClient} onChange={handleChange} options={['— Sin vincular —']} /></div>
                                <div><InputLabel>Teléfono</InputLabel><TextInput name="ownerPhone" value={formData.ownerPhone} onChange={handleChange} /></div>
                                <div><InputLabel>Email</InputLabel><TextInput name="ownerEmail" value={formData.ownerEmail} onChange={handleChange} type="email" /></div>
                                <div><InputLabel>Consignado por</InputLabel><SelectInput name="consignedBy" value={formData.consignedBy} onChange={handleChange} options={['— Sin asignar —', 'Vendedor 1']} /></div>
                                <div><InputLabel>Nº motor</InputLabel><TextInput name="engineNumber" value={formData.engineNumber} onChange={handleChange} /></div>
                                <div><InputLabel>Nº chasis</InputLabel><TextInput name="chassisNumber" value={formData.chassisNumber} onChange={handleChange} /></div>
                            </div>
                        </section>

                        {/* DOCUMENTACIÓN */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Documentación</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><InputLabel>Manuales</InputLabel><SelectInput name="hasManuals" value={formData.hasManuals} onChange={handleChange} options={['No', 'Sí']} /></div>
                                <div><InputLabel>Duplicado de llaves</InputLabel><SelectInput name="hasDuplicateKeys" value={formData.hasDuplicateKeys} onChange={handleChange} options={['No', 'Sí']} /></div>
                                <div><InputLabel>Servicios oficiales</InputLabel><SelectInput name="hasOfficialServices" value={formData.hasOfficialServices} onChange={handleChange} options={['No', 'Sí']} /></div>
                            </div>
                        </section>

                        {/* PUBLICACIÓN */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Publicación</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div><InputLabel>¿Publicado en MercadoLibre?</InputLabel><SelectInput name="publishedOnML" value={formData.publishedOnML} onChange={handleChange} options={['No', 'Sí']} /></div>
                                <div><InputLabel>Publicado por</InputLabel><TextInput name="publishedBy" value={formData.publishedBy} onChange={handleChange} placeholder="Ej: Richi, Lucia..." /></div>
                            </div>
                            <div className="mb-4">
                                <InputLabel>Link de MercadoLibre</InputLabel>
                                <TextInput name="mlLink" value={formData.mlLink} onChange={handleChange} placeholder="https://articulo.mercadolibre.com.ar/..." />
                            </div>
                            <div>
                                <InputLabel>Notas</InputLabel>
                                <textarea 
                                    name="notes" value={formData.notes} onChange={handleChange} rows="3"
                                    className="w-full bg-[#1e1e22] border border-white/5 rounded-md px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-red-500 focus:outline-none transition-colors resize-none"
                                />
                            </div>
                        </section>

                        {/* IMÁGENES (Dropzone integrada) */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Fotografías</span>
                            </div>
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                                onDrop={onDropFiles}
                                className={`
                                    relative cursor-pointer transition-all duration-300
                                    border border-dashed rounded-xl flex flex-col items-center justify-center
                                    ${files.length > 0 ? 'h-32 border-white/10 bg-[#1e1e22]' : 'h-48 bg-[#1e1e22]'}
                                    ${isDragging ? 'border-red-500 bg-red-500/5' : 'border-white/10 hover:border-white/20'}
                                `}
                            >
                                <input
                                    type="file" multiple accept="image/png, image/jpeg, image/jpg, image/webp"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                    onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
                                />

                                {files.length === 0 ? (
                                    <div className="text-center pointer-events-none z-10">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors ${isDragging ? 'bg-red-500 text-white' : 'bg-[#2a2a2e] text-gray-500'}`}>
                                            <Upload size={18} />
                                        </div>
                                        <p className="text-gray-300 text-xs font-medium">Arrastra imágenes aquí</p>
                                        <p className="text-gray-600 text-[10px] mt-1">o haz clic para explorar</p>
                                    </div>
                                ) : (
                                    <div className="flex gap-4 px-4 overflow-x-auto w-full items-center justify-start h-full z-10 custom-scrollbar py-2">
                                        {files.map((file, i) => (
                                            <div
                                                key={i} draggable
                                                onDragStart={() => handleDragStart(i)}
                                                onDragOver={handleDragOver}
                                                onDrop={() => handleDropSort(i)}
                                                className={`
                                                    flex-shrink-0 relative w-28 h-20 rounded-lg overflow-hidden border shadow-sm group cursor-grab active:cursor-grabbing
                                                    ${i === 0 ? 'border-red-500 ring-1 ring-red-500/50' : 'border-white/5'}
                                                `}
                                            >
                                                <img src={file.preview} className="w-full h-full object-cover" />
                                                {i === 0 && <div className="absolute top-0 left-0 w-full bg-red-500/90 text-white text-[8px] font-bold text-center py-0.5 tracking-wider uppercase z-20">Portada</div>}
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setFiles(files.filter((_, idx) => idx !== i)); }}
                                                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                    </form>
                </div>

                {/* Footer Buttons */}
                <div className="border-t border-white/5 bg-[#1a1a1f] p-4 flex justify-end gap-3 rounded-b-xl sticky bottom-0 z-30">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg text-xs font-medium text-white bg-[#2a2a2e] hover:bg-[#33333a] border border-white/5 transition-colors">
                        Cancelar
                    </button>
                    <button type="submit" form="vehicleForm" className="px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-[#e63027] hover:bg-red-600 shadow-[0_0_15px_rgba(230,48,39,0.3)] transition-all flex items-center gap-2">
                        Dar de alta
                    </button>
                </div>

            </div>
        </div>
    );
}

function CarIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
            <circle cx="7" cy="17" r="2" />
            <path d="M9 17h6" />
            <circle cx="17" cy="17" r="2" />
        </svg>
    )
}
