import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export function useAdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { logout } = useAuth();

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/users', { headers: getAuthHeaders() });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) logout();
                throw new Error('Error al obtener usuarios');
            }
            const data = await res.json();
            setUsers(data);
            return data;
        } catch (err) {
            setError(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    }, [logout]);

    const createUser = async (userData) => {
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(userData)
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Error al crear usuario');
            }
            const newUser = await res.json();
            setUsers(prev => [newUser, ...prev]);
            toast.success('Usuario creado');
            return newUser;
        } catch (err) {
            toast.error(err.message);
            throw err;
        }
    };

    const updateUser = async (id, userData) => {
        try {
            const res = await fetch(`/api/admin/users/${id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(userData)
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Error al actualizar usuario');
            }
            const updated = await res.json();
            setUsers(prev => prev.map(u => u._id === id ? updated : u));
            toast.success('Usuario actualizado');
            return updated;
        } catch (err) {
            toast.error(err.message);
            throw err;
        }
    };

    const changePassword = async (id, password) => {
        try {
            const res = await fetch(`/api/admin/users/${id}/password`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ password })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Error al cambiar contraseña');
            }
            toast.success('Contraseña actualizada');
            return true;
        } catch (err) {
            toast.error(err.message);
            throw err;
        }
    };

    return {
        users,
        loading,
        error,
        fetchUsers,
        createUser,
        updateUser,
        changePassword
    };
}
