import React, { useState, useEffect } from 'react';
import { Copy, Check, Upload, X, ChevronDown, ChevronUp, Plus, Info, Star, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useCars } from '../hooks/useCars';

const AdminPanel = () => {
    const { cars, refresh: refreshCars, deleteCar } = useCars();
    const [formData, setFormData] = useState({
        brand: '',
        name: '',
        year: new Date().getFullYear(),
        km: 0,
        fuel: 'Nafta',
        condition: 'Usado',
        price: '',
        currency: '$',
        featured: false,
    });

    const [files, setFiles] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [view, setView] = useState('create');
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Clean up previews on unmount
    useEffect(() => {
        return () => files.forEach(file => URL.revokeObjectURL(file.preview));
    }, [files]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleCreate = async () => {
        if (!formData.brand || !formData.name) return;
        setIsSubmitting(true);

        try {
            const data = new FormData();
            data.append('brand', formData.brand);
            data.append('name', formData.name);
            data.append('year', formData.year);
            data.append('km', formData.km);
            data.append('fuel', formData.fuel);
            data.append('condition', formData.condition);
            data.append('price', formData.price);
            data.append('currency', formData.currency);
            data.append('featured', formData.featured);

            // Append images
            files.forEach(file => {
                data.append('images', file);
            });

            const API_URL = import.meta.env.VITE_API_URL;
            // If API_URL is '/', requests will be relative (e.g. /api/cars). 
            // If it's undefined (local without env), fallback to localhost.
            const baseUrl = API_URL || 'http://localhost:3001';

            // Handle the case where API_URL is '/' explicitly to avoid double slashes if needed, 
            // but fetch handles `${baseUrl}/api/cars` fine if baseUrl is / -> //api/cars is valid or just /api/cars.
            // Let's ensure cleaner path construction.
            const endpoint = baseUrl === '/' ? '/api/cars' : `${baseUrl}/api/cars`;

            const res = await fetch(endpoint, {
                method: 'POST',
                body: data // No headers needed, browser sets multipart/form-data automatically
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error creating vehicle');
            }

            // Success
            setShowModal(true);
            refreshCars(); // Reload list

            // Reset Form
            setFiles([]);
            setFormData(prev => ({ ...prev, name: '', price: '', year: new Date().getFullYear(), km: 0, featured: false }));

        } catch (error) {
            console.error('Error creating vehicle:', error);
            alert('Error creating vehicle: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Files Handling
    const [draggedIndex, setDraggedIndex] = useState(null);

    const onDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length > 0) {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
            const newFiles = Array.from(e.dataTransfer.files)
                .filter(file => allowedTypes.includes(file.type))
                .map(file => Object.assign(file, {
                    preview: URL.createObjectURL(file)
                }));

            if (newFiles.length < e.dataTransfer.files.length) {
                alert("Some files were rejected. Only images (jpg, png, webp) are allowed.");
            }

            if (files.length + newFiles.length > 20) {
                alert("You can only upload a maximum of 20 images.");
                const remainingSlots = 20 - files.length;
                const filesToAdd = newFiles.slice(0, remainingSlots);
                setFiles(prev => [...prev, ...filesToAdd]);
            } else {
                setFiles(prev => [...prev, ...newFiles]);
            }
        }
    };

    const handleDragStart = (index) => { setDraggedIndex(index); };
    const handleDragOver = (e) => { e.preventDefault(); };
    const handleDropSort = (targetIndex) => {
        if (draggedIndex === null || draggedIndex === targetIndex) return;
        const newFiles = [...files];
        const [movedItem] = newFiles.splice(draggedIndex, 1);
        newFiles.splice(targetIndex, 0, movedItem);
        setFiles(newFiles);
        setDraggedIndex(null);
    };

    // Helper for delete
    const handleDelete = async (id) => {
        await deleteCar(id);
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-primary/30">

            {/* Centered Container */}
            <div className="max-w-xl mx-auto px-6 py-20">

                {/* Minimal Header & Tabs */}
                <div className="mb-12 text-center">
                    <h1 className="text-4xl font-light tracking-tighter text-white mb-6">Admin Panel</h1>

                    <div className="inline-flex bg-zinc-900 rounded-full p-1 border border-white/5">
                        <button
                            onClick={() => setView('create')}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${view === 'create' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Create New
                        </button>
                        <button
                            onClick={() => setView('manage')}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${view === 'manage' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Manage List
                        </button>
                    </div>
                </div>

                {/* VIEW: CREATE */}
                {view === 'create' && (
                    <div className="space-y-8">
                        {/* 1. Hero Dropzone - First thing user sees */}
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                            onDrop={onDrop}
                            className={`
                    relative group cursor-pointer transition-all duration-500 ease-out
                    border border-dashed rounded-3xl flex flex-col items-center justify-center
                    ${files.length > 0 ? 'h-40 border-white/20 bg-zinc-900/50' : 'h-64'}
                    ${isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/20'}
                `}
                        >
                            <input
                                type="file" multiple
                                accept="image/png, image/jpeg, image/jpg, image/webp"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                onChange={(e) => {
                                    if (e.target.files) {
                                        const newFiles = Array.from(e.target.files).map(file => Object.assign(file, { preview: URL.createObjectURL(file) }));

                                        if (files.length + newFiles.length > 20) {
                                            alert("You can only upload a maximum of 20 images.");
                                            const remainingSlots = 20 - files.length;
                                            const filesToAdd = newFiles.slice(0, remainingSlots);
                                            setFiles(prev => [...prev, ...filesToAdd]);
                                        } else {
                                            setFiles(prev => [...prev, ...newFiles]);
                                        }
                                    }
                                }}
                            />

                            {files.length === 0 ? (
                                <div className="text-center pointer-events-none z-10">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300 ${isDragging ? 'bg-primary text-white' : 'bg-zinc-800 text-gray-500'}`}>
                                        <Upload size={22} strokeWidth={1.5} />
                                    </div>
                                    <p className="text-gray-300 font-medium">Drag images here</p>
                                    <p className="text-gray-600 text-sm mt-1">or click to browse</p>
                                </div>
                            ) : (
                                // Preview Strip when files exist
                                <div className="flex gap-4 px-6 overflow-x-auto w-full items-center justify-start h-full z-10 no-scrollbar py-2">
                                    {files.map((file, i) => (
                                        <div
                                            key={i}
                                            draggable
                                            onDragStart={() => handleDragStart(i)}
                                            onDragOver={handleDragOver}
                                            onDrop={() => handleDropSort(i)}
                                            className={`
                                            flex-shrink-0 relative w-36 h-28 rounded-xl overflow-hidden border shadow-lg group hover:scale-95 transition-transform cursor-grab active:cursor-grabbing
                                            ${i === 0 ? 'border-primary ring-2 ring-primary/50' : 'border-white/10'}
                                            ${draggedIndex === i ? 'opacity-50' : 'opacity-100'}
                                        `}
                                        >
                                            <img src={file.preview} className="w-full h-full object-cover" />

                                            {/* Cover Badge */}
                                            {i === 0 && (
                                                <div className="absolute top-0 left-0 w-full bg-primary/90 text-white text-[9px] font-bold text-center py-0.5 tracking-wider uppercase z-20">
                                                    Cover
                                                </div>
                                            )}

                                            {/* CONTROLS (Always Visible) */}
                                            <div className="absolute inset-0 bg-black/30 hover:bg-black/60 transition-colors flex flex-col items-center justify-center gap-1 z-10"
                                                onMouseDown={(e) => e.stopPropagation()} // Prevent drag start
                                            >

                                                {/* Set as Cover */}
                                                {i !== 0 && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const newFiles = [...files];
                                                            const [item] = newFiles.splice(i, 1);
                                                            newFiles.unshift(item);
                                                            setFiles(newFiles);
                                                        }}
                                                        className="text-white hover:text-yellow-400 transform hover:scale-110 transition-all font-bold text-[10px] flex items-center gap-1 bg-black/40 px-2 py-1 rounded-full mb-1"
                                                        title="Set as Cover"
                                                    >
                                                        <Star size={10} fill="currentColor" /> Cover
                                                    </button>
                                                )}

                                                <div className="flex items-center gap-2">
                                                    {/* Move Left */}
                                                    {i > 0 && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newFiles = [...files];
                                                                [newFiles[i - 1], newFiles[i]] = [newFiles[i], newFiles[i - 1]];
                                                                setFiles(newFiles);
                                                            }}
                                                            className="p-1 bg-white/20 hover:bg-white text-white hover:text-black rounded-full transition-colors"
                                                            title="Move Left"
                                                        >
                                                            <ArrowLeft size={10} />
                                                        </button>
                                                    )}

                                                    {/* Move Right */}
                                                    {i < files.length - 1 && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newFiles = [...files];
                                                                [newFiles[i + 1], newFiles[i]] = [newFiles[i], newFiles[i + 1]];
                                                                setFiles(newFiles);
                                                            }}
                                                            className="p-1 bg-white/20 hover:bg-white text-white hover:text-black rounded-full transition-colors"
                                                            title="Move Right"
                                                        >
                                                            <ArrowRight size={10} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Remove Button */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setFiles(files.filter((_, idx) => idx !== i)); }}
                                                className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-full z-20 group-hover:block hidden"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="flex-shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center text-gray-600 ml-2">
                                        <Plus size={20} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. Primary Fields (Clean Input Design) */}
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1.5 focus-within:text-primary transition-colors">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Brand</label>
                                    <input
                                        type="text" name="brand" value={formData.brand} onChange={handleChange}
                                        placeholder="Toyota"
                                        className="w-full bg-transparent border-b border-zinc-800 py-3 text-xl placeholder-zinc-800 focus:border-primary outline-none transition-colors"
                                    />
                                </div>
                                <div className="space-y-1.5 focus-within:text-primary transition-colors">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Model</label>
                                    <input
                                        type="text" name="name" value={formData.name} onChange={handleChange}
                                        placeholder="Hilux GR"
                                        className="w-full bg-transparent border-b border-zinc-800 py-3 text-xl placeholder-zinc-800 focus:border-primary outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6 pt-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Year</label>
                                    <input type="number" name="year" value={formData.year} onChange={handleChange} className="w-full bg-transparent border-b border-zinc-800 py-2 text-primary focus:border-white outline-none font-mono" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Km</label>
                                    <input type="number" name="km" value={formData.km} onChange={handleChange} className="w-full bg-transparent border-b border-zinc-800 py-2 text-primary focus:border-white outline-none font-mono" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Price ({formData.currency})</label>
                                    <div className="flex items-center border-b border-zinc-800 focus-within:border-white transition-colors">
                                        <select
                                            name="currency"
                                            value={formData.currency}
                                            onChange={handleChange}
                                            className="bg-transparent text-gray-500 text-sm mr-2 outline-none font-bold cursor-pointer hover:text-white transition-colors appearance-none"
                                        >
                                            <option value="$" className="bg-black text-white">$ ARS</option>
                                            <option value="USD" className="bg-black text-white">USD</option>
                                        </select>
                                        <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="0" className="w-full bg-transparent py-2 text-white outline-none font-mono" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Toggles */}
                        <div className="flex items-center justify-between pt-8 border-t border-zinc-900">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${formData.featured ? 'bg-white' : 'bg-zinc-800'}`}>
                                    <div className={`w-5 h-5 rounded-full bg-black shadow-lg transform transition-transform duration-300 ${formData.featured ? 'translate-x-5' : ''}`}></div>
                                </div>
                                <span className={`text-sm tracking-wide ${formData.featured ? 'text-white' : 'text-gray-600'}`}>Start in Featured?</span>
                            </label>
                        </div>

                        {/* 4. Action */}
                        <div className="pt-8">
                            <button
                                onClick={handleCreate}
                                disabled={!formData.brand || !formData.name || isSubmitting}
                                className={`
                        w-full py-5 rounded-full font-medium text-lg tracking-wide transition-all duration-300 transform flex items-center justify-center gap-2
                        ${(!formData.brand || !formData.name || isSubmitting)
                                        ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed'
                                        : 'bg-white text-black hover:scale-[1.02] shadow-xl shadow-white/5'}
                    `}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" /> Uploading Vehicle...
                                    </>
                                ) : (
                                    'Create Vehicle'
                                )}
                            </button>
                        </div>

                    </div>
                )}

                {/* VIEW: MANAGE */}
                {view === 'manage' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {cars.length === 0 ? (
                            <p className="text-center text-gray-500 py-12">No vehicles found in database.</p>
                        ) : (
                            cars.map((car) => (
                                <div key={car._id} className="bg-zinc-900/40 p-4 rounded-2xl flex items-center justify-between border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-6">
                                        <div className="relative group">
                                            <div className="w-[120px] h-[90px] rounded-xl bg-zinc-800 overflow-hidden relative shadow-lg">
                                                {car.coverImage || (car.images && car.images[0]) ? (
                                                    <img
                                                        src={car.coverImage || car.images[0]}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600">No img</div>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="font-bold text-white text-xl mb-1">{car.brand} {car.name}</h3>
                                            <p className="text-sm text-gray-500 uppercase tracking-wider font-mono">{car.year} • {car.fuel}</p>
                                        </div>
                                    </div>
                                    {/* Delete / Confirmation */}
                                    {deleteConfirm === car._id ? (
                                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(car._id); }}
                                                className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 shadow-lg"
                                                title="Confirm Delete"
                                            >
                                                <Check size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }}
                                                className="bg-zinc-700 text-white p-2 rounded-full hover:bg-zinc-600 shadow-lg"
                                                title="Cancel"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(car._id); }}
                                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                                            title="Delete Vehicle"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

            </div>

            {/* SUCCESS MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-black/80 animate-in fade-in duration-300">
                    <div className="bg-[#111] max-w-2xl w-full rounded-3xl border border-white/10 shadow-2xl overflow-hidden scale-in-center animate-in zoom-in-95 duration-300">

                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-green-500/10 to-transparent p-8 border-b border-white/5 flex justify-between items-start">
                            <div>
                                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 mb-4">
                                    <Check size={24} />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-1">Vehicle Uploaded</h2>
                                <p className="text-gray-400 text-sm">
                                    Successfully added <span className="text-white">{formData.brand} {formData.name}</span> to the cloud database.
                                </p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-zinc-900/50 border-t border-white/5 text-center">
                            <p className="text-xs text-gray-600">Clicking 'Close' will let you add another vehicle.</p>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .scale-in-center { animation: scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes scale-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>

        </div>
    );
};

export default AdminPanel;
