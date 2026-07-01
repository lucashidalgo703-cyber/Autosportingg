import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export function useAdminPersonalAssets() {
    const { token } = useAuth();
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchAssets = useCallback(async () => {
        if (!token) return [];
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/my-space/assets', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al cargar assets');
            const data = await res.json();
            setAssets(data);
            return data;
        } catch (err) {
            setError(err.message);
            toast.error(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    }, [token]);

    const createAsset = async (assetData) => {
        try {
            const res = await fetch('/api/admin/my-space/assets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(assetData)
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error al crear asset');
            }
            const data = await res.json();
            setAssets(prev => [data, ...prev]);
            toast.success('Asset creado con éxito');
            return data;
        } catch (err) {
            toast.error(err.message);
            throw err;
        }
    };

    const updateAsset = async (id, assetData) => {
        try {
            const res = await fetch(`/api/admin/my-space/assets/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(assetData)
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error al actualizar asset');
            }
            const data = await res.json();
            setAssets(prev => prev.map(a => a._id === id ? data : a));
            toast.success('Asset actualizado con éxito');
            return data;
        } catch (err) {
            toast.error(err.message);
            throw err;
        }
    };

    const deleteAsset = async (id) => {
        try {
            const res = await fetch(`/api/admin/my-space/assets/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error('Error al eliminar asset');
            setAssets(prev => prev.filter(a => a._id !== id));
            toast.success('Asset eliminado');
        } catch (err) {
            toast.error(err.message);
            throw err;
        }
    };

    return { assets, loading, error, fetchAssets, createAsset, updateAsset, deleteAsset };
}
