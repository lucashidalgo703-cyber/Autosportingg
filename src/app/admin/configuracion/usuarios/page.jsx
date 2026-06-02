"use client";
import React, { useState, useEffect } from 'react';
import { useAdminUsers } from '../../../../hooks/useAdminUsers';
import { useAuth } from '../../../../context/AuthContext';
import { Plus, Users, ShieldAlert } from 'lucide-react';
import CrmButton from '../../../../components/crm/ui/CrmButton';
import AdminUsersTable from '../../../../components/crm/settings/AdminUsersTable';
import AdminUserModal from '../../../../components/crm/settings/AdminUserModal';
import { hasPermission, PERMISSIONS } from '../../../../utils/adminPermissions';
import toast from 'react-hot-toast';

export default function UsuariosConfigPage() {
    const { users, fetchUsers, createUser, updateUser, changePassword, loading, error } = useAdminUsers();
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        if (hasPermission(user, PERMISSIONS.USUARIOS_READ)) {
            fetchUsers();
        }
    }, [user, fetchUsers]);

    if (!hasPermission(user, PERMISSIONS.USUARIOS_READ)) {
        return (
            <div className="p-8">
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl flex items-center gap-4">
                    <ShieldAlert size={24} />
                    <div>
                        <h2 className="text-lg font-bold">Acceso Denegado</h2>
                        <p className="text-sm">No tienes permisos para ver o gestionar usuarios.</p>
                    </div>
                </div>
            </div>
        );
    }

    const handleCreate = () => {
        setSelectedUser(null);
        setIsModalOpen(true);
    };

    const handleEdit = (u) => {
        setSelectedUser(u);
        setIsModalOpen(true);
    };

    const handleSave = async (data) => {
        if (selectedUser) {
            await updateUser(selectedUser._id, data);
        } else {
            await createUser(data);
        }
    };

    const handleChangePassword = async (u) => {
        const newPass = prompt(`Ingresa la nueva contraseña para ${u.name}:`);
        if (newPass && newPass.length >= 6) {
            await changePassword(u._id, newPass);
        } else if (newPass) {
            toast.error("La contraseña debe tener al menos 6 caracteres.");
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-[#FAFAFA] tracking-tighter flex items-center gap-3">
                        <Users className="text-[#A1A1AA]" size={32} />
                        Gestión de Usuarios
                    </h1>
                    <p className="text-[#A1A1AA] mt-1">Configura accesos, roles y permisos internos del CRM.</p>
                </div>
                
                {hasPermission(user, PERMISSIONS.USUARIOS_WRITE) && (
                    <CrmButton
                        variant="primary"
                        onClick={handleCreate}
                        className="gap-2"
                    >
                        <Plus size={20} />
                        Nuevo Usuario
                    </CrmButton>
                )}
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
                    <ShieldAlert size={20} />
                    {error}
                </div>
            )}

            {loading && users.length === 0 ? (
                <div className="text-center py-10 text-[#71717A]">Cargando usuarios...</div>
            ) : (
                <AdminUsersTable 
                    users={users} 
                    onEdit={hasPermission(user, PERMISSIONS.USUARIOS_WRITE) ? handleEdit : () => toast.error("Sin permisos de edición")}
                    onChangePassword={hasPermission(user, PERMISSIONS.USUARIOS_WRITE) ? handleChangePassword : () => toast.error("Sin permisos")}
                />
            )}

            {isModalOpen && (
                <AdminUserModal 
                    user={selectedUser} 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={handleSave} 
                />
            )}
        </div>
    );
}
