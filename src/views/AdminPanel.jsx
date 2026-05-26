"use client";
import React, { useState, useEffect } from 'react';
import { Copy, Check, Upload, X, ChevronDown, ChevronUp, Plus, Info, Star, ArrowLeft, ArrowRight, Loader2, Menu, Search, Sun, Moon, Bell, MessageCircle } from 'lucide-react';
import { useAdminCars } from '../hooks/useAdminCars';
import toast from 'react-hot-toast';
import CRMBoard from './CRMBoard';
import AdminSidebar from '../components/AdminSidebar';
import ConstructionPlaceholder from '../components/ConstructionPlaceholder';
import Dashboard from './Dashboard';
import Stock from './Stock';
import Calendario from './Calendario';
import Alertas from './Alertas';
import Cotizacion from './Cotizacion';
import Ventas from './Ventas';
import Clientes from './Clientes';
import MisVentas from './MisVentas';
import Operaciones from './Operaciones';
import Finanzas from './Finanzas';
import Colaboraciones from './Colaboraciones';
import Administracion from './Administracion';

const AdminPanel = () => {
    const { cars, refresh: refreshCars, deleteCar, setCars } = useAdminCars();
    // Making it easier: I'll update useCars hook to expose setCars or just fetch.
    // Actually, to make UI responsive, I should optimistically update local state.
    // I need to update useCars hook to expose setCars.
    const [formData, setFormData] = useState({
        brand: '',
        name: '',
        year: new Date().getFullYear(),
        km: 0,
        fuel: 'Nafta',
        condition: 'Usado',
        description: '',
        price: '',
        currency: '$',
        featured: false,
        status: 'Disponible',
        imagePosition: '50% 75%',
    });

    const [files, setFiles] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [view, setView] = useState('stock'); // Default to stock
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [editingId, setEditingId] = useState(null); // ID of car being edited

    const [isLightMode, setIsLightMode] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showNotifications && !e.target.closest('.notification-container')) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showNotifications]);
    // Clean up previews on unmount
    useEffect(() => {
        return () => files.forEach(file => {
            if (file.preview && !file.isExisting) URL.revokeObjectURL(file.preview);
        });
    }, [files]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleEdit = (car) => {
        setEditingId(car._id);
        setFormData({
            brand: car.brand,
            name: car.name,
            year: car.year,
            km: car.km,
            fuel: car.fuel,
            condition: car.condition,
            description: car.description || '',
            price: car.price,
            currency: car.currency,
            featured: car.featured,
            status: car.status || 'Disponible',
            imagePosition: car.imagePosition || '50% 75%',
        });

        // Prepare files for preview
        const existingFiles = (car.images || []).map(url => ({
            preview: url,
            isExisting: true,
            url: url
        }));
        setFiles(existingFiles);

        setView('stock-create'); // Switch to form view
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({
            brand: '',
            name: '',
            year: new Date().getFullYear(),
            km: 0,
            fuel: 'Nafta',
            condition: 'Usado',
            price: '',
            currency: '$',
            featured: false,
            status: 'Disponible',
        });
        setFiles([]);
        setView('stock');
    };

    const handleSubmit = async () => {
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
            data.append('description', formData.description);
            data.append('price', formData.price);
            data.append('currency', formData.currency);
            data.append('featured', formData.featured);
            data.append('status', formData.status);
            data.append('imagePosition', formData.imagePosition);

            // Separate new files and calculate order
            const newFiles = files.filter(f => !f.isExisting);

            // Construct imageOrder
            let newFileIndex = 0;
            const imageOrder = files.map(f => {
                if (f.isExisting) return f.url;
                else {
                    const placeholder = `__new__${newFileIndex}`;
                    newFileIndex++;
                    return placeholder;
                }
            });

            // Append new images
            newFiles.forEach(file => {
                data.append('images', file);
            });

            // Send order if editing (or if we want to support reordering on create too, but logic is mostly for edit/update mixed)
            if (editingId) {
                data.append('imageOrder', JSON.stringify(imageOrder));
            }

            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const endpointBase = `${baseUrl}/api/cars`;

            let url = endpointBase;
            let method = 'POST';

            if (editingId) {
                url = `${endpointBase}/${editingId}`;
                method = 'PUT';
            }

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: data
            });

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    toast.error('Sesión expirada o inválida. Por favor inicia sesión nuevamente.');
                    window.location.href = '/login'; // Simple redirect for now, or use useNavigate/AuthContext
                    return;
                }
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error saving vehicle');
            }

            // Success
            setShowModal(true);
            refreshCars(); // Reload list

            // Reset Form if creating, or switch back if editing?
            // Usually nice to reset.
            if (!editingId) {
                setFiles([]);
                setFormData(prev => ({ ...prev, name: '', price: '', year: new Date().getFullYear(), km: 0, featured: false }));
            } else {
                // If editing, maybe go back to manage or just say success?
                // Let's stay in form but reset editingId to allow new creation?
                // Or just wait for user to close modal.
            }

        } catch (error) {
            console.error('Error saving vehicle:', error);
            toast.error('Error saving vehicle: ' + error.message);
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
                toast.error("Some files were rejected. Only images (jpg, png, webp) are allowed.");
            }

            if (files.length + newFiles.length > 20) {
                toast.error("You can only upload a maximum of 20 images.");
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

    const handleMove = async (index, direction) => {
        const newCars = [...cars];
        const targetIndex = index + direction;

        if (targetIndex < 0 || targetIndex >= newCars.length) return;

        // Swap in local state for instant feedback
        [newCars[index], newCars[targetIndex]] = [newCars[targetIndex], newCars[index]];
        setCars(newCars);

        // Send new order to backend
        try {
            const orderedIds = newCars.map(c => c._id);
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const endpoint = `${baseUrl}/api/cars/reorder/batch`;

            await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ orderedIds })
            });
        } catch (error) {
            console.error("Error reordering:", error);
            refreshCars(); // Revert on error
        }
    };

    return (
        <div className={`min-h-screen text-white selection:bg-red-500/30 flex font-sans ${isLightMode ? 'light-mode' : 'bg-[#0a0a0a]'}`}>
            {isLightMode && (
                <style dangerouslySetInnerHTML={{__html: `
                    .light-mode { filter: invert(1) hue-rotate(180deg); background-color: #fafafa; }
                    .light-mode img, .light-mode video, .light-mode .preserve-color { filter: invert(1) hue-rotate(180deg); }
                `}} />
            )}

            {/* Sidebar */}
            <AdminSidebar activeView={view} setActiveView={setView} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-screen lg:ml-[260px] transition-all duration-300 relative w-full overflow-x-hidden">
                
                {/* Sote CRM Top Nav */}
                <header className="h-[72px] border-b border-[#33333a] flex items-center px-6 lg:px-10 justify-between bg-[#0b0b0d] sticky top-0 z-30">
                    <div className="flex items-center gap-4 flex-1">
                        <button onClick={() => setIsMobileOpen(true)} className="lg:hidden p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
                            <Menu size={24} />
                        </button>
                        
                        {/* Buscador Sote */}
                        <div className="hidden md:flex items-center bg-[#1e1e24] rounded-full px-4 py-2 border border-[#33333a] w-full max-w-md text-gray-400 focus-within:border-gray-500 focus-within:text-gray-300 transition-colors">
                            <Search size={18} className="shrink-0" />
                            <input 
                                type="text" 
                                placeholder="Buscar clientes, vehiculos, ventas..." 
                                className="bg-transparent border-none outline-none text-sm w-full ml-3 text-white placeholder-gray-500"
                            />
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-end gap-3 md:gap-5 flex-1 shrink-0">
                        {/* Contextual Actions Removed (Moved to Stock view) */}

                        {/* Cápsulas Verdes */}
                        <div className="hidden lg:flex items-center gap-2">
                            <div className="flex items-center bg-[#0c1912] border border-[#1b3d2b] px-3 py-1.5 rounded-full text-[11px] font-medium text-[#4ade80]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] mr-2"></span>
                                0 ventas este mes
                            </div>
                            <div className="flex items-center bg-[#0c1912] border border-[#1b3d2b] px-3 py-1.5 rounded-full text-[11px] font-medium text-[#4ade80]">
                                💵 Caja: USD 0 - ARS 0
                            </div>
                            <div className="flex items-center bg-[#0c1912] border border-[#1b3d2b] px-3 py-1.5 rounded-full text-[11px] font-medium text-[#4ade80]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] mr-2"></span>
                                0 ventas este mes
                            </div>
                        </div>

                        {/* Iconos */}
                        <div className="flex items-center gap-4 text-gray-400 ml-2">
                            <button onClick={() => setIsLightMode(!isLightMode)} className="hover:text-white transition-colors preserve-color">
                                {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
                            </button>
                            <div className="relative notification-container">
                                <button onClick={() => setShowNotifications(!showNotifications)} className="hover:text-white transition-colors relative preserve-color">
                                    <Bell size={18} />
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                                </button>
                                
                                {/* Dropdown de Notificaciones */}
                                {showNotifications && (
                                    <div className="absolute top-full right-0 mt-4 w-72 bg-[#18181b] border border-white/5 rounded-xl shadow-2xl z-50 overflow-hidden preserve-color">
                                        <div className="p-3 border-b border-white/5 flex justify-between items-center bg-[#1c1c1e]">
                                            <span className="text-xs font-semibold text-white uppercase tracking-wider">Notificaciones</span>
                                            <button className="text-[10px] text-gray-500 hover:text-white">Marcar leídas</button>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                            <div className="p-3 border-b border-white/5 hover:bg-[#222226] cursor-pointer transition-colors flex gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                                    <Info size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-white font-medium mb-0.5">Nueva cotización recibida</p>
                                                    <p className="text-[10px] text-gray-400">Cliente interesado en BMW Serie 3.</p>
                                                    <p className="text-[9px] text-gray-500 mt-1">Hace 10 min</p>
                                                </div>
                                            </div>
                                            <div className="p-3 hover:bg-[#222226] cursor-pointer transition-colors flex gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                                                    <Check size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-white font-medium mb-0.5">Actualización de stock de usados</p>
                                                    <p className="text-[10px] text-gray-400">3 nuevos vehículos ingresados al sistema.</p>
                                                    <p className="text-[9px] text-gray-500 mt-1">Hace 1 hora</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Avatar */}
                        <div className="flex items-center gap-3 ml-2 border-l border-[#33333a] pl-5">
                            <div className="flex flex-col items-end hidden sm:flex">
                                <span className="text-sm font-semibold text-white leading-tight">Bondoliona</span>
                                <span className="bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider mt-0.5">administrador</span>
                            </div>
                            <div className="w-9 h-9 bg-[#e63027] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-[0_0_15px_rgba(230,48,39,0.5)] cursor-pointer hover:shadow-[0_0_20px_rgba(230,48,39,0.8)] transition-all">
                                B
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Container */}
                <main className={`flex-1 p-6 lg:p-8 w-full ${(view === 'stock-create' || view === 'stock') ? 'max-w-5xl mx-auto' : 'max-w-none'}`}>

                {/* VIEW: CREATE (Removido a favor de VehicleFormModal en Stock.jsx) */}

                {/* VIEW: MANAGE */}
                {
                    view === 'stock' && (
                        <Stock 
                            cars={cars} 
                            refreshCars={refreshCars} 
                            handleEdit={handleEdit} 
                            handleDelete={handleDelete} 
                            handleMove={handleMove} 
                        />
                    )}

                {/* VIEW: DASHBOARD */}
                {view === 'dashboard' && <Dashboard cars={cars} />}

                {/* VIEW: CALENDARIO */}
                {view === 'calendario' && <Calendario cars={cars} />}

                {/* VIEW: ALERTAS */}
                {view === 'alertas' && <Alertas cars={cars} />}

                {/* VIEW: CRM BOARD (Ventas) */}
                {view === 'ventas' && (
                    <CRMBoard cars={cars} refreshCars={refreshCars} />
                )}

                {/* VIEW: CLIENTES (Directorio) */}
                {view === 'clientes' && (
                    <Clientes cars={cars} />
                )}

                {/* VIEW: FINANZAS */}
                {view === 'finanzas' && <Finanzas cars={cars} />}

                {/* VIEW: COLABORACIONES */}
                {view === 'colaboraciones' && <Colaboraciones />}

                {/* VIEW: ADMINISTRACION */}
                {view === 'administracion' && <Administracion />}

                {/* PLACEHOLDER FOR OTHERS */}
                {view !== 'stock' && view !== 'stock-create' && view !== 'clientes' && view !== 'ventas' && view !== 'dashboard' && view !== 'calendario' && view !== 'alertas' && view !== 'finanzas' && view !== 'colaboraciones' && view !== 'administracion' && (
                    <ConstructionPlaceholder title={view.charAt(0).toUpperCase() + view.slice(1).replace('-', ' ')} />
                )}

                </main>

                {/* SUCCESS MODAL REMOVED (Now using toast in Stock.jsx) */}

                {/* Sote CRM Floating Actions */}
                <div className="fixed bottom-6 right-6 flex flex-col items-center gap-3 z-50">
                    <button className="w-14 h-14 bg-[#e63027] hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(230,48,39,0.5)] hover:shadow-[0_0_25px_rgba(230,48,39,0.8)] transition-all hover:scale-110">
                        <Plus size={28} />
                    </button>
                    <button className="w-12 h-12 bg-[#1e1e24] border border-[#33333a] text-gray-400 hover:text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:border-gray-500 hover:scale-110">
                        <MessageCircle size={22} />
                    </button>
                    <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110">
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><path d="M16.5 16c0-1-.5-1.5-1-1.5s-1.5 .5-1.5 1-1-1.5-1-1.5-1.5-1-1.5-1 .5-1.5 1.5-1.5 1-.5 1-1.5-1.5-1-1.5-1"/></svg>
                    </a>
                </div>

                <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .scale-in-center { animation: scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes scale-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>

            </div>
        </div>
    );
};

export default AdminPanel;
