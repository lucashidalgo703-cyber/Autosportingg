"use client";
import React, { useState, useEffect } from 'react';
import { X, Users, CheckCircle, AlertTriangle } from 'lucide-react';

export default function QuickAssignModal({ isOpen, onClose, entityType, entityId, entityTitle, onAssigned }) {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            setSelectedUser('');
            setError('');
        }
    }, [isOpen]);

    const fetchUsers = async () => {
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
            console.error('Error fetching users:', err);
        }
    };

    const handleAssign = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/assignments', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    entityType,
                    entityId,
                    assignedTo: selectedUser
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Error al asignar responsable');
            }

            onAssigned();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-[#161619] border border-[#33333A] rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-[#33333A]">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Users size={18} className="text-indigo-500" />
                        Asignación Rápida
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4">
                    <p className="text-sm text-gray-400 mb-4">
                        Asignando responsable a:<br/>
                        <span className="font-bold text-white uppercase">{entityType}:</span> {entityTitle}
                    </p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg flex items-start gap-2 text-red-400 text-sm">
                            <AlertTriangle size={16} className="mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Seleccionar Responsable</label>
                        <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="w-full bg-[#24242B] border border-[#33333A] text-white rounded-lg p-2 focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">Sin responsable (Quitar asignación)</option>
                            {users.map(u => (
                                <option key={u._id} value={u._id}>{u.name} ({u.role.replace('_', ' ')})</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2 justify-end mt-6">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 bg-transparent text-white border border-[#33333A] rounded-lg hover:bg-[#33333A] transition-colors text-sm"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleAssign}
                            disabled={loading}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : (
                                <>
                                    <CheckCircle size={16} />
                                    Confirmar
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
