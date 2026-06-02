"use client";
import React, { useState } from 'react';
import { Search, Plus, Edit, Trash2, Image as ImageIcon, Hand, ChevronDown, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import VehicleFormModal from '../components/VehicleFormModal';

const Stock = ({ cars = [], refreshCars, handleEdit, handleDelete, handleMove }) => {
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [activeTab, setActiveTab] = useState('Stock general');
    const [activeFilter, setActiveFilter] = useState('Todos');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCar, setEditingCar] = useState(null);

    // Mock metrics based on instructions
    const totalCars = cars.length;
    const totalDisponibles = cars.filter(c => c.status === 'Disponible' || !c.status).length;

    // Filter logic
    const filteredCars = cars.filter(car => {
        const matchesSearch = (car.brand + ' ' + car.name + ' ' + (car.plateOrVin || '')).toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = activeFilter === 'Todos' || car.status === activeFilter;
        // Tab filtering logic could be added here if we had 'agencyOwned' consistently, 
        // e.g. Stock general (all?), Consignaciones (!agencyOwned), Mandatos (?)
        return matchesSearch && matchesFilter;
    });

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Disponible': return 'text-[#4ade80] border-[#4ade80]/30 bg-[#4ade80]/10';
            case 'Señado': return 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10';
            case 'Vendido sin confirmar': return 'text-orange-500 border-orange-500/30 bg-orange-500/10';
            case 'Vendido': return 'text-red-500 border-red-500/30 bg-red-500/10';
            default: return 'text-[#4ade80] border-[#4ade80]/30 bg-[#4ade80]/10';
        }
    };

    const handleOpenModal = (car = null) => {
        setEditingCar(car);
        setIsModalOpen(true);
    };

    const handleSaveVehicle = async (formData, files) => {
        try {
            const formDataToSend = new FormData();
            
            // Append all string/number fields
            Object.keys(formData).forEach(key => {
                if (formData[key] !== undefined && formData[key] !== null) {
                    formDataToSend.append(key, formData[key]);
                }
            });

            // Append files
            files.forEach(file => {
                if (!file.isExisting) {
                    formDataToSend.append('images', file);
                }
            });

            // Handle image order
            const imageOrder = files.map((f, i) => f.isExisting ? f.url : `__new__${i}`);
            formDataToSend.append('imageOrder', JSON.stringify(imageOrder));

            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const token = localStorage.getItem('token');
            
            const url = editingCar ? `${baseUrl}/api/cars/${editingCar._id}` : `${baseUrl}/api/cars`;
            const method = editingCar ? 'PUT' : 'POST';

            toast.loading(editingCar ? "Actualizando vehículo..." : "Guardando vehículo...", { id: 'saveCar' });
            
            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: formDataToSend
            });

            if (!res.ok) throw new Error("Error al guardar el vehículo");

            toast.success(editingCar ? "Vehículo actualizado" : "Vehículo creado", { id: 'saveCar' });
            setIsModalOpen(false);
            if (refreshCars) refreshCars();
        } catch (error) {
            toast.error(error.message, { id: 'saveCar' });
        }
    };

    return (
        <div className="w-full min-h-screen bg-black text-[#fafafa] p-6 space-y-6 animate-in fade-in duration-300 overflow-x-hidden custom-scrollbar">
            
            {/* Header Secundario */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">Stock</h1>
                    <p className="text-xs text-gray-400 mt-1">{totalCars} vehículos • {totalDisponibles} disponibles</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2 text-xs font-semibold text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 rounded-lg transition-colors">Vista previa</button>
                    <button className="px-4 py-2 text-xs font-semibold text-gray-300 bg-[#2a2a2e] border border-white/5 hover:bg-[#33333a] rounded-lg transition-colors flex items-center gap-2">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Exportar XLSX
                    </button>
                    <button className="px-4 py-2 text-xs font-semibold text-white bg-[#2a2a2e] border border-white/5 hover:bg-[#33333a] rounded-lg transition-colors flex items-center gap-2">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Nuevo mandato + Stock
                    </button>
                    <button onClick={() => handleOpenModal()} className="px-5 py-2 text-xs font-semibold text-white bg-[#e63027] hover:bg-red-600 rounded-lg shadow-[0_0_15px_rgba(230,48,39,0.2)] transition-colors flex items-center gap-2">
                        <Plus size={16} /> Nuevo vehículo
                    </button>
                </div>
            </div>

            {/* Valor Activo */}
            <div className="bg-[#141416] border border-white/5 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                <div className="flex items-center gap-2 bg-[#4ade80]/10 border border-[#4ade80]/20 px-3 py-1.5 rounded-full text-xs font-bold text-[#4ade80]">
                    <div className="w-1.5 h-1.5 bg-[#4ade80] rounded-full"></div>
                    {totalDisponibles} disponibles
                </div>
                <div className="text-xs text-gray-500">/ {totalCars} total</div>
                <div className="text-xs text-gray-400 font-medium ml-4 uppercase tracking-widest flex items-center gap-2">
                    VALOR ACTIVO (disponible) <span className="text-white text-sm tracking-normal">$ 0</span>
                </div>
            </div>

            {/* Sub-Tabs */}
            <div className="flex border-b border-white/5 gap-6 mt-2">
                {['Stock general', 'Consignaciones', 'Mandatos'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 text-xs font-bold transition-all relative ${activeTab === tab ? 'text-[#e63027]' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        {tab} {tab === 'Stock general' && <span className="ml-1 bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded-full text-[9px]">{totalCars}</span>}
                        {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#e63027] rounded-t-full"></div>}
                    </button>
                ))}
            </div>

            {/* Filtros Píldora */}
            <div className="flex items-center gap-3 mt-4">
                {[
                    { label: 'Disponible', color: 'bg-[#4ade80]', type: 'check' },
                    { label: 'Señado', color: 'bg-yellow-500', type: 'triangle' },
                    { label: 'Vendido sin confirmar', color: 'bg-orange-500', type: 'hourglass' },
                    { label: 'Vendido', color: 'bg-red-500', type: 'minus' }
                ].map(f => {
                    const isActive = activeFilter === f.label;
                    return (
                        <button
                            key={f.label}
                            onClick={() => setActiveFilter(isActive ? 'Todos' : f.label)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border
                                ${isActive ? `border-${f.color.split('-')[1]}-500/50 bg-[#1e1e22]` : 'border-white/5 bg-[#141416] text-gray-400 hover:bg-[#1a1a1f]'}
                            `}
                        >
                            <div className={`w-3 h-3 rounded-full flex items-center justify-center ${f.color} text-black`}>
                                {f.type === 'check' && <Check size={8} strokeWidth={4} />}
                                {f.type === 'triangle' && <span className="text-[6px] mb-0.5">▲</span>}
                                {f.type === 'hourglass' && <span className="text-[6px]">⌛</span>}
                                {f.type === 'minus' && <div className="w-1.5 h-0.5 bg-white"></div>}
                            </div>
                            <span className={isActive ? 'text-white' : ''}>{f.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* Search Bar */}
            <div className="flex gap-2">
                <div className="flex-1 flex items-center bg-[#141416] rounded-lg px-4 py-3 border border-white/5 text-gray-400 focus-within:border-gray-500 transition-colors shadow-sm">
                    <Search size={16} className="shrink-0" />
                    <input 
                        type="text" 
                        placeholder="Buscar marca, modelo, patente, año, propietario, teléfono, consig., ubicación, notas..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none text-xs w-full ml-3 text-white placeholder-gray-600"
                    />
                </div>
                <div className="w-48 bg-[#141416] rounded-lg border border-white/5 flex items-center px-4">
                    <select className="bg-transparent text-xs text-white outline-none w-full appearance-none font-medium cursor-pointer">
                        <option value="">Todas las marcas</option>
                    </select>
                    <ChevronDown size={14} className="text-gray-500 pointer-events-none" />
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-[#141416] border border-white/5 rounded-xl overflow-hidden shadow-sm mt-4">
                <div className="bg-[#1a1a1f] px-4 py-3 border-b border-white/5 flex items-center justify-between text-xs font-bold text-white">
                    <div className="flex items-center gap-2">
                        {filteredCars.length} vehículo en lista <span className="text-gray-500 font-normal ml-2">• $ 0</span>
                    </div>
                </div>

                {/* Table Headers */}
                <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-white/5 bg-[#141416] text-[9px] font-bold text-[#8a8a8e] uppercase tracking-wider">
                    <div className="col-span-3 flex items-center gap-1 cursor-pointer">Vehículo <span className="text-[8px]">↑↓</span></div>
                    <div className="col-span-1 flex items-center gap-1 cursor-pointer">Año <span className="text-[8px]">↑↓</span></div>
                    <div className="col-span-1 flex items-center gap-1 cursor-pointer">Patente/VIN <span className="text-[8px]">↑↓</span></div>
                    <div className="col-span-1 flex items-center gap-1 cursor-pointer">KM <span className="text-[8px]">↑↓</span></div>
                    <div className="col-span-1 flex items-center gap-1 cursor-pointer">Precio <span className="text-[8px]">↑↓</span></div>
                    <div className="col-span-1 flex items-center gap-1 cursor-pointer">Consig. <span className="text-[8px]">↑↓</span></div>
                    <div className="col-span-1 flex items-center gap-1 cursor-pointer">Estado <span className="text-[8px]">↑↓</span></div>
                    <div className="col-span-1 flex items-center gap-1 cursor-pointer">Ubicación <span className="text-[8px]">↑↓</span></div>
                    <div className="col-span-1 flex items-center gap-1 cursor-pointer">Ingreso <span className="text-[8px]">↑↓</span></div>
                    <div className="col-span-1 text-right">Acciones</div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-white/5">
                    {filteredCars.length === 0 ? (
                        <div className="p-12 text-center text-sm text-gray-500">No se encontraron vehículos.</div>
                    ) : (
                        filteredCars.map((car, i) => (
                            <div key={car._id || i} className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-[#1a1a1f] transition-colors group">
                                {/* Vehículo */}
                                <div className="col-span-3 flex items-center gap-3">
                                    <div className="w-10 h-8 rounded bg-[#222] overflow-hidden border border-white/5 shrink-0 relative">
                                        {car.coverImage || (car.images && car.images[0]) ? (
                                            <img src={car.coverImage || car.images[0]} className="w-full h-full object-cover" alt="auto" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-600"><ImageIcon size={10} /></div>
                                        )}
                                        {car.images && car.images.length > 0 && (
                                            <div className="absolute bottom-0 right-0 bg-black/80 px-1 text-[8px] text-white font-bold rounded-tl">{car.images.length}</div>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-white truncate leading-tight">{car.brand} {car.name}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] text-[#4ade80]">0d / 60d</span>
                                            <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden"><div className="w-0 h-full bg-[#4ade80]"></div></div>
                                            <span className="text-[8px] text-gray-500">0%</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="col-span-1 text-xs font-bold text-white">{car.year}</div>
                                <div className="col-span-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{car.plateOrVin || '—'}</div>
                                <div className="col-span-1 text-xs font-bold text-white">{Number(car.km || 0).toLocaleString()} km</div>
                                <div className="col-span-1 text-xs font-bold text-white">{car.currency === 'USD' ? 'U$S' : '$'} {Number(car.price || 0).toLocaleString()}</div>
                                <div className="col-span-1 text-[10px] text-gray-500">—</div>
                                
                                <div className="col-span-1 flex flex-col gap-1">
                                    <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1 w-max ${getStatusStyle(car.status || 'Disponible')}`}>
                                        <div className="w-1 h-1 bg-current rounded-full"></div>
                                        {car.status || 'Disponible'}
                                    </span>
                                    {car.visibleEnWeb !== false && !['vendido', 'reservado', 'pausado', 'cancelado', 'eliminado'].includes((car.status || '').toLowerCase()) ? (
                                        <span className="text-[8px] text-blue-400 font-bold uppercase tracking-wider flex items-center gap-0.5">
                                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full inline-block"></span> Publicado
                                        </span>
                                    ) : (
                                        <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-0.5">
                                            <span className="w-1.5 h-1.5 border border-gray-500 rounded-full inline-block"></span> Oculto web
                                        </span>
                                    )}
                                </div>

                                <div className="col-span-1 text-[10px] text-gray-400 flex items-center gap-1"><span className="text-[8px]">📍</span> {car.location || 'Salón Principal'}</div>
                                <div className="col-span-1 text-[10px] text-gray-500">{new Date(car.createdAt || Date.now()).toISOString().split('T')[0]}</div>
                                
                                {/* Acciones */}
                                <div className="col-span-1 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); handleOpenModal(car); }} className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-0.5 transition-colors">
                                        <Edit size={10} /> Editar
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); }} className="text-[10px] font-bold text-yellow-500 hover:text-yellow-400 flex items-center gap-0.5 transition-colors">
                                        <Hand size={10} /> Señar
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(car._id); }} className="text-[10px] font-bold text-gray-500 hover:text-red-500 transition-colors">
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#141416] w-full max-w-sm rounded-xl border border-white/10 shadow-2xl p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20 text-red-500">
                            <Trash2 size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">¿Eliminar vehículo?</h3>
                        <p className="text-xs text-gray-400 mb-6">Esta acción no se puede deshacer. El vehículo será borrado permanentemente del stock.</p>
                        <div className="flex justify-center gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2 rounded-lg text-xs font-medium text-white bg-[#2a2a2e] hover:bg-[#33333a] border border-white/5 transition-colors">Cancelar</button>
                            <button 
                                onClick={() => {
                                    if(handleDelete) handleDelete(deleteConfirm);
                                    setDeleteConfirm(null);
                                }} 
                                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-[#e63027] hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(230,48,39,0.2)]"
                            >
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <VehicleFormModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSaveVehicle}
                editingCar={editingCar}
            />

        </div>
    );
};

export default Stock;

