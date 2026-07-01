import React, { useState } from 'react';
import { Edit2, Shield, Key, AlertTriangle, ShieldCheck } from 'lucide-react';
import { CrmIconButton } from '../ui/CrmButton';

export default function AdminUsersTable({ users, onEdit, onChangePassword }) {
    if (!users || users.length === 0) {
        return (
            <div className="text-center py-10 text-crm-fg-muted bg-crm-bg rounded-2xl border border-crm-border">
                No hay usuarios configurados.
            </div>
        );
    }

    const getRoleBadge = (role) => {
        switch(role) {
            case 'owner': return <span className="bg-crm-red/10 text-crm-red border border-crm-red/20 px-2 py-1 rounded text-[10px] font-bold uppercase">Owner</span>;
            case 'admin': return <span className="bg-purple-500/10 text-purple-500 border border-purple-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase">Admin</span>;
            case 'ventas': return <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase">Ventas</span>;
            case 'administrativo': return <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase">Admin.</span>;
            default: return <span className="bg-crm-surface text-crm-fg-muted border border-crm-border px-2 py-1 rounded text-[10px] font-bold uppercase">Lectura</span>;
        }
    };

    return (
        <div className="bg-crm-bg border border-crm-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-crm-surface border-b border-crm-border text-xs uppercase text-crm-fg-muted">
                        <tr>
                            <th className="px-6 py-4 font-bold">Usuario</th>
                            <th className="px-6 py-4 font-bold">Email</th>
                            <th className="px-6 py-4 font-bold">Rol</th>
                            <th className="px-6 py-4 font-bold">Estado</th>
                            <th className="px-6 py-4 font-bold text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-crm-border">
                        {users.map((user) => (
                            <tr key={user._id} className="hover:bg-crm-surface-raised transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-crm-fg flex items-center gap-2">
                                        {user.role === 'owner' && <ShieldCheck size={14} className="text-crm-red" />}
                                        {user.name}
                                    </div>
                                    <div className="text-[10px] text-crm-fg-muted">
                                        Creado: {new Date(user.createdAt).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-crm-fg-muted">{user.email}</td>
                                <td className="px-6 py-4">
                                    {getRoleBadge(user.role)}
                                </td>
                                <td className="px-6 py-4">
                                    {user.active ? (
                                        <span className="text-green-500 bg-green-500/10 px-2 py-1 rounded-full text-xs font-medium">
                                            Activo
                                        </span>
                                    ) : (
                                        <span className="text-red-500 bg-red-500/10 px-2 py-1 rounded-full text-xs font-medium">
                                            Inactivo
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <CrmIconButton
                                            onClick={() => onChangePassword(user)}
                                            title="Cambiar Contraseña"
                                        >
                                            <Key size={16} />
                                        </CrmIconButton>
                                        <CrmIconButton
                                            onClick={() => onEdit(user)}
                                            title="Editar Usuario"
                                        >
                                            <Edit2 size={16} />
                                        </CrmIconButton>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
