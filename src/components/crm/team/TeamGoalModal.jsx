"use client";
import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';

export default function TeamGoalModal({ isOpen, onClose, goal, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [users, setUsers] = useState([]);

    const [formData, setFormData] = useState({
        userId: '',
        periodType: 'monthly',
        periodLabel: '',
        startDate: '',
        endDate: '',
        active: true,
        targets: {
            tasksCompleted: 0,
            leadsWorked: 0,
            reservationsManaged: 0,
            salesUpdated: 0,
            documentationCompleted: 0,
            postSalesManaged: 0,
        },
        notes: ''
    });

    useEffect(() => {
        if (isOpen) {
            fetchActiveUsers();
            if (goal) {
                setFormData({
                    userId: goal.userId?._id || goal.userId,
                    periodType: goal.periodType,
                    periodLabel: goal.periodLabel,
                    startDate: goal.startDate ? new Date(goal.startDate).toISOString().split('T')[0] : '',
                    endDate: goal.endDate ? new Date(goal.endDate).toISOString().split('T')[0] : '',
                    active: goal.active,
                    targets: { ...formData.targets, ...goal.targets },
                    notes: goal.notes || ''
                });
            } else {
                setFormData({
                    userId: '',
                    periodType: 'monthly',
                    periodLabel: '',
                    startDate: '',
                    endDate: '',
                    active: true,
                    targets: {
                        tasksCompleted: 0,
                        leadsWorked: 0,
                        reservationsManaged: 0,
                        salesUpdated: 0,
                        documentationCompleted: 0,
                        postSalesManaged: 0,
                    },
                    notes: ''
                });
            }
            setError(null);
        }
    }, [isOpen, goal]);

    const fetchActiveUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/users/active', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (err) {
            console.error("Error fetching users:", err);
        }
    };

    const handleTargetChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            targets: {
                ...formData.targets,
                [name]: parseInt(value) || 0
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!formData.userId) return setError("Debe seleccionar un usuario.");
        if (!formData.startDate || !formData.endDate) return setError("Fechas de inicio y fin son obligatorias.");
        if (new Date(formData.startDate) > new Date(formData.endDate)) return setError("La fecha de inicio debe ser menor o igual a la fecha de fin.");

        const totalTargets = Object.values(formData.targets).reduce((a, b) => a + b, 0);
        if (totalTargets === 0) return setError("Debe establecer al menos un objetivo mayor a 0.");

        if (!formData.periodLabel) {
            formData.periodLabel = `${formData.periodType === 'monthly' ? 'Mensual' : 'Personalizado'} - ${formData.startDate} a ${formData.endDate}`;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const url = goal ? `/api/admin/team-goals/${goal._id}` : '/api/admin/team-goals';
            const method = goal ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Error al guardar la meta');
            }

            onSuccess();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4">
            <div className="bg-[#161619] border border-[#33333A] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
                
                <div className="flex justify-between items-center p-6 border-b border-[#33333A]">
                    <h2 className="text-xl font-bold text-white">
                        {goal ? 'Editar Meta Operativa' : 'Crear Meta Operativa'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {error && (
                        <div className="bg-red-900/20 border border-red-900/50 text-red-400 p-4 rounded-lg mb-6 flex items-start gap-3">
                            <AlertTriangle size={20} className="mt-0.5 shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <form id="goalForm" onSubmit={handleSubmit} className="space-y-6">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Usuario Responsable *</label>
                                <select 
                                    value={formData.userId} 
                                    onChange={e => setFormData({...formData, userId: e.target.value})}
                                    disabled={!!goal} // No permitir cambiar usuario si edita
                                    className="w-full bg-[#1E1E24] border border-[#33333A] rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                                >
                                    <option value="">Seleccione un usuario...</option>
                                    {users.map(u => (
                                        <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Tipo de Período</label>
                                <select 
                                    value={formData.periodType} 
                                    onChange={e => setFormData({...formData, periodType: e.target.value})}
                                    className="w-full bg-[#1E1E24] border border-[#33333A] rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="weekly">Semanal</option>
                                    <option value="monthly">Mensual</option>
                                    <option value="custom">Personalizado</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Fecha de Inicio *</label>
                                <input 
                                    type="date" 
                                    value={formData.startDate} 
                                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                                    className="w-full bg-[#1E1E24] border border-[#33333A] rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Fecha de Fin *</label>
                                <input 
                                    type="date" 
                                    value={formData.endDate} 
                                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                                    className="w-full bg-[#1E1E24] border border-[#33333A] rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="border-t border-[#33333A] pt-6">
                            <h3 className="text-sm font-bold text-white mb-4">Objetivos Operativos (Targets)</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Tareas Completadas</label>
                                    <input type="number" min="0" name="tasksCompleted" value={formData.targets.tasksCompleted} onChange={handleTargetChange} className="w-full bg-[#1E1E24] border border-[#33333A] rounded-lg p-2 text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Leads Trabajados</label>
                                    <input type="number" min="0" name="leadsWorked" value={formData.targets.leadsWorked} onChange={handleTargetChange} className="w-full bg-[#1E1E24] border border-[#33333A] rounded-lg p-2 text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Reservas Gestionadas</label>
                                    <input type="number" min="0" name="reservationsManaged" value={formData.targets.reservationsManaged} onChange={handleTargetChange} className="w-full bg-[#1E1E24] border border-[#33333A] rounded-lg p-2 text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Ventas Actualizadas</label>
                                    <input type="number" min="0" name="salesUpdated" value={formData.targets.salesUpdated} onChange={handleTargetChange} className="w-full bg-[#1E1E24] border border-[#33333A] rounded-lg p-2 text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Docs. Completada</label>
                                    <input type="number" min="0" name="documentationCompleted" value={formData.targets.documentationCompleted} onChange={handleTargetChange} className="w-full bg-[#1E1E24] border border-[#33333A] rounded-lg p-2 text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Postventas Cerradas</label>
                                    <input type="number" min="0" name="postSalesManaged" value={formData.targets.postSalesManaged} onChange={handleTargetChange} className="w-full bg-[#1E1E24] border border-[#33333A] rounded-lg p-2 text-white" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Notas / Comentarios</label>
                            <textarea 
                                value={formData.notes} 
                                onChange={e => setFormData({...formData, notes: e.target.value})}
                                rows="3"
                                className="w-full bg-[#1E1E24] border border-[#33333A] rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 custom-scrollbar"
                                placeholder="Ej: Meta mensual de invierno..."
                            ></textarea>
                        </div>

                        {goal && (
                            <div className="flex items-center gap-2 mt-4 p-3 bg-[#1E1E24] border border-[#33333A] rounded-lg">
                                <input 
                                    type="checkbox" 
                                    id="activeGoal" 
                                    checked={formData.active}
                                    onChange={(e) => setFormData({...formData, active: e.target.checked})}
                                    className="w-4 h-4 rounded border-[#33333A] text-indigo-500 focus:ring-indigo-500 bg-[#161619]"
                                />
                                <label htmlFor="activeGoal" className="text-sm font-medium text-gray-300">Meta Activa</label>
                            </div>
                        )}
                    </form>
                </div>

                <div className="p-6 border-t border-[#33333A] bg-[#161619] rounded-b-xl flex justify-end gap-3">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        form="goalForm"
                        disabled={loading}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save size={18} />}
                        {loading ? 'Guardando...' : 'Guardar Meta'}
                    </button>
                </div>

            </div>
        </div>
    );
}
