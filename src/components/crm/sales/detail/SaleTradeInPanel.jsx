import React, { useState } from 'react';
import { CarFront, Plus, Edit2, CheckCircle2, AlertTriangle, ArrowRight, X } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../../utils/adminPermissions';

export default function SaleTradeInPanel({ sale, onUpdate }) {
    const { user, token } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [stockError, setStockError] = useState(null);
    const [enteringStockIndex, setEnteringStockIndex] = useState(null);
    const [formData, setFormData] = useState({
        brand: '', model: '', version: '', year: new Date().getFullYear(),
        plate: '', mileage: 0, estimatedValue: 0, currency: 'ARS',
        ownerName: '', ownerDocument: '', conditionNotes: '', mechanicalNotes: '',
        documentationStatus: 'pendiente', transferStatus: 'pendiente',
        hasDebt: false, debtAmount: 0, hasLien: false
    });
    const [editingIndex, setEditingIndex] = useState(-1);

    const hasWritePermission = ['owner', 'admin'].includes(user?.role) || hasPermission(user, PERMISSIONS.VENTAS_WRITE);

    if (!sale) return null;

    const handleAddClick = () => {
        setFormData({
            brand: '', model: '', version: '', year: new Date().getFullYear(),
            plate: '', mileage: 0, estimatedValue: 0, currency: 'ARS',
            ownerName: '', ownerDocument: '', conditionNotes: '', mechanicalNotes: '',
            documentationStatus: 'pendiente', transferStatus: 'pendiente',
            hasDebt: false, debtAmount: 0, hasLien: false
        });
        setEditingIndex(-1);
        setIsEditing(true);
        setError(null);
    };

    const handleEditClick = (index) => {
        const tradeIn = sale.tradeIns[index];
        setFormData({
            ...tradeIn,
            year: tradeIn.year || new Date().getFullYear(),
            estimatedValue: tradeIn.estimatedValue || 0,
            mileage: tradeIn.mileage || 0,
            debtAmount: tradeIn.debtAmount || 0,
        });
        setEditingIndex(index);
        setIsEditing(true);
        setError(null);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
        }));
    };

    const handleSave = async () => {
        if (!formData.brand || !formData.model || !formData.year || !formData.estimatedValue) {
            setError('Marca, modelo, año y valor tomado son obligatorios.');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const newTradeIns = [...(sale.tradeIns || [])];
            
            const yearNum = formData.year ? Number(formData.year) : undefined;
            const estValueNum = Number(formData.estimatedValue) || 0;
            const mileageNum = formData.mileage ? Number(formData.mileage) : undefined;
            const debtNum = formData.debtAmount ? Number(formData.debtAmount) : 0;
            
            const normalizedData = {
                ...formData,
                year: isNaN(yearNum) ? undefined : yearNum,
                estimatedValue: isNaN(estValueNum) ? 0 : estValueNum,
                mileage: isNaN(mileageNum) ? undefined : mileageNum,
                debtAmount: isNaN(debtNum) ? 0 : debtNum
            };

            if (editingIndex >= 0) {
                newTradeIns[editingIndex] = { ...newTradeIns[editingIndex], ...normalizedData };
            } else {
                newTradeIns.push({ ...normalizedData, receivedAt: new Date(), receivedBy: user?.username });
            }

            const totalAmount = newTradeIns.reduce((sum, t) => sum + (Number(t.estimatedValue) || 0), 0);
            const balance = (sale.salePrice || 0) - (sale.depositAppliedAmount || 0) - totalAmount;

            const res = await fetch(`/api/admin/sales/${sale._id}/trade-ins`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tradeIns: newTradeIns,
                    tradeInTotalAmount: totalAmount,
                    balanceAfterTradeIn: balance
                })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                let errorMsg = data.error || 'Error al guardar el vehículo en parte de pago';
                if (errorMsg.includes('validation failed') || errorMsg.includes('Cast to Number failed')) {
                    errorMsg = 'No se pudo guardar el vehículo recibido. Revisá año y valor tomado.';
                }
                throw new Error(errorMsg);
            }

            setIsEditing(false);
            if (onUpdate) onUpdate();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleEnterStock = async (index) => {
        setStockError(null);
        
        const tradeIn = sale.tradeIns[index];
        if (!tradeIn.brand || !tradeIn.model || !tradeIn.year || !tradeIn.estimatedValue || !tradeIn.currency) {
            setStockError('Completá marca, modelo, año, valor tomado y moneda antes de ingresar al stock.');
            return;
        }

        if (!window.confirm('¿Estás seguro de ingresar este vehículo al stock? Se creará una nueva unidad oculta.')) return;
        
        setEnteringStockIndex(index);
        try {
            const res = await fetch(`/api/admin/sales/${sale._id}/trade-ins/${index}/create-stock-car`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                if (data.details) {
                    console.error("create-stock-car details:", data.details);
                }
                throw new Error(data.error || 'No se pudo ingresar el vehículo al stock. Revisá los datos del vehículo recibido.');
            }

            if (onUpdate) onUpdate();
        } catch (err) {
            setStockError(err.message);
        } finally {
            setEnteringStockIndex(null);
        }
    };

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-[#1E1E24]">
                <div className="flex items-center gap-2">
                    <CarFront size={16} className="text-purple-500" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Permuta / Vehículo Recibido</h3>
                </div>
                {hasWritePermission && sale.status !== 'cancelada' && !isEditing && (
                    <button 
                        onClick={handleAddClick}
                        className="text-[10px] bg-crm-surface-raised hover:bg-neutral-700 text-white px-2 py-1 rounded transition-colors flex items-center gap-1 font-bold uppercase tracking-wider border border-neutral-700"
                    >
                        <Plus size={10} />
                        Agregar
                    </button>
                )}
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
                {isEditing ? (
                    <div className="space-y-4">
                        {error && (
                            <div className="bg-crm-red/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs flex gap-2 items-start">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Marca *</label>
                                <input type="text" name="brand" value={formData.brand} onChange={handleChange} className="w-full bg-black/40 border border-neutral-800 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Modelo *</label>
                                <input type="text" name="model" value={formData.model} onChange={handleChange} className="w-full bg-black/40 border border-neutral-800 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Versión</label>
                                <input type="text" name="version" value={formData.version} onChange={handleChange} className="w-full bg-black/40 border border-neutral-800 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Año *</label>
                                <input type="number" name="year" value={formData.year} onChange={handleChange} className="w-full bg-black/40 border border-neutral-800 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Patente / Dominio</label>
                                <input type="text" name="plate" value={formData.plate} onChange={handleChange} className="w-full bg-black/40 border border-neutral-800 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Kilómetros</label>
                                <input type="number" name="mileage" value={formData.mileage} onChange={handleChange} className="w-full bg-black/40 border border-neutral-800 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500" />
                            </div>
                        </div>

                        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3">
                            <label className="block text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">Valor Tomado *</label>
                            <div className="flex gap-2">
                                <select name="currency" value={formData.currency} onChange={handleChange} className="w-24 bg-black/60 border border-purple-500/30 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500">
                                    <option value="ARS">ARS</option>
                                    <option value="USD">USD</option>
                                </select>
                                <input type="number" name="estimatedValue" value={formData.estimatedValue} onChange={handleChange} className="flex-1 bg-black/60 border border-purple-500/30 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500 font-bold" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Doc. Status</label>
                                <select name="documentationStatus" value={formData.documentationStatus} onChange={handleChange} className="w-full bg-black/40 border border-neutral-800 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500">
                                    <option value="pendiente">Pendiente</option>
                                    <option value="parcial">Parcial</option>
                                    <option value="completo">Completa</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Transferencia</label>
                                <select name="transferStatus" value={formData.transferStatus} onChange={handleChange} className="w-full bg-black/40 border border-neutral-800 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500">
                                    <option value="pendiente">Pendiente</option>
                                    <option value="en_tramite">En trámite</option>
                                    <option value="transferido">Transferido</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-neutral-800">
                            <button 
                                onClick={() => setIsEditing(false)}
                                className="px-3 py-1.5 bg-transparent text-neutral-400 hover:text-white text-xs font-bold rounded"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded transition-colors disabled:opacity-50"
                            >
                                {isSaving ? 'Guardando...' : 'Guardar Vehículo'}
                            </button>
                        </div>
                    </div>
                ) : sale.tradeIns && sale.tradeIns.length > 0 ? (
                    <div className="space-y-4">
                        {stockError && (
                            <div className="bg-crm-red/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs flex gap-2 items-start mb-4">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                <span>{stockError}</span>
                            </div>
                        )}
                        {sale.tradeIns.map((tradeIn, index) => (
                            <div key={index} className="bg-black/30 border border-neutral-800 rounded-xl p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="text-white font-bold">{tradeIn.brand} {tradeIn.model} {tradeIn.version}</h4>
                                        <p className="text-xs text-neutral-400 mt-0.5">Año: {tradeIn.year} • Patente: {tradeIn.plate || 'S/D'} • Km: {tradeIn.mileage?.toLocaleString('es-AR') || 0}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-black text-purple-400 block">{tradeIn.currency} {tradeIn.estimatedValue?.toLocaleString('es-AR')}</span>
                                        <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Valor Tomado</span>
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${tradeIn.documentationStatus === 'completo' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                                        Doc: {tradeIn.documentationStatus}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${tradeIn.transferStatus === 'transferido' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-crm-surface-raised text-neutral-400 border border-neutral-700'}`}>
                                        Transf: {tradeIn.transferStatus.replace('_', ' ')}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-800">
                                    {tradeIn.linkedStockCarId ? (
                                        <Link href={`/admin/stock/${tradeIn.linkedStockCarId}`} className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                                            <CheckCircle2 size={12} />
                                            En Stock
                                        </Link>
                                    ) : (
                                        <button 
                                            onClick={() => handleEnterStock(index)}
                                            disabled={enteringStockIndex === index || sale.status === 'cancelada' || !hasWritePermission}
                                            className="text-[10px] font-bold text-neutral-400 hover:text-white uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-1"
                                        >
                                            <ArrowRight size={12} />
                                            {enteringStockIndex === index ? 'Ingresando...' : 'Ingresar a Stock'}
                                        </button>
                                    )}
                                    
                                    {hasWritePermission && sale.status !== 'cancelada' && (
                                        <button 
                                            onClick={() => handleEditClick(index)}
                                            className="text-xs text-neutral-500 hover:text-white transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        
                        <div className="bg-[#1E1E24] border border-neutral-800 rounded-xl p-3 flex justify-between items-center mt-4">
                            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Saldo / Diferencia</span>
                            <span className="text-lg font-black text-white">
                                {sale.saleCurrency} {sale.balanceAfterTradeIn?.toLocaleString('es-AR')}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
                        <CarFront size={32} className="mb-3 opacity-20" />
                        <p className="text-sm font-medium mb-1">Sin permutas registradas</p>
                        <p className="text-xs">No se entregaron vehículos en parte de pago para esta venta.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
