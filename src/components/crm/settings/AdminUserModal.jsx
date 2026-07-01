import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { ROLES, PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../../../utils/adminPermissions';

export default function AdminUserModal({ user, onClose, onSave }) {
    const isEditing = !!user;

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: ROLES.SOLO_LECTURA,
        active: true,
        permissions: []
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                password: '', // Edit mode doesn't show password
                role: user.role || ROLES.SOLO_LECTURA,
                active: user.active ?? true,
                permissions: user.permissions || []
            });
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Clean up payload
            const payload = { ...formData };
            if (isEditing) delete payload.password; // Handled in another modal
            await onSave(payload);
            onClose();
        } catch (err) {
            // Error handled by hook
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-crm-surface border border-crm-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                <div className="p-5 border-b border-crm-border flex justify-between items-center bg-crm-surface-raised">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
                    </h2>
                    <button onClick={onClose} className="text-crm-fg-muted hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <form id="userForm" onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-crm-fg-muted uppercase mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-crm-bg border border-crm-border rounded-xl px-4 py-2.5 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red"
                                    placeholder="Ej: Juan Pérez"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-crm-fg-muted uppercase mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full bg-crm-bg border border-crm-border rounded-xl px-4 py-2.5 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red"
                                    placeholder="Ej: juan@autosporting.com"
                                />
                            </div>

                            {!isEditing && (
                                <div>
                                    <label className="block text-xs font-bold text-crm-fg-muted uppercase mb-1">Contraseña Inicial</label>
                                    <input
                                        type="password"
                                        required={!isEditing}
                                        value={formData.password}
                                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                        className="w-full bg-crm-bg border border-crm-border rounded-xl px-4 py-2.5 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red"
                                        placeholder="Contraseña segura"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-crm-fg-muted uppercase mb-1">Rol Base</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value, permissions: [] }))}
                                    className="w-full bg-crm-bg border border-crm-border rounded-xl px-4 py-2.5 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red"
                                >
                                    {Object.values(ROLES).map(r => (
                                        <option key={r} value={r}>{r.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>

                            {isEditing && (
                                <div className="flex items-center gap-3 bg-crm-bg p-4 rounded-xl border border-crm-border">
                                    <input
                                        type="checkbox"
                                        checked={formData.active}
                                        onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                                        className="w-4 h-4 rounded border-crm-border bg-crm-bg text-crm-red focus:ring-crm-red"
                                    />
                                    <label className="text-sm font-medium text-white">Usuario Activo</label>
                                </div>
                            )}
                            
                            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex items-start gap-2 mt-2">
                                <AlertCircle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-blue-300">
                                    El rol define los permisos automáticos. Un Owner tiene acceso total. Un Admin no puede eliminar al Owner.
                                </p>
                            </div>

                        </div>
                    </form>
                </div>

                <div className="p-5 border-t border-crm-border bg-crm-surface flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl font-bold text-sm text-crm-fg-muted hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="userForm"
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-crm-red hover:bg-crm-red-hover text-white transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : (
                            <>
                                <Save size={16} />
                                {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
