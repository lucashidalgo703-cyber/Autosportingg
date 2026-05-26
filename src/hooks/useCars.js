"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export const useCars = () => {
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { logout } = useAuth();

    const fetchCars = async (isAdmin = false) => {
        try {
            setLoading(true);
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            
            // Si el token existe e isAdmin es true, intentamos endpoint protegido, sino el publico saneado
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const useAdminEndpoint = isAdmin || !!token;
            const endpoint = `${baseUrl}/api/${useAdminEndpoint ? 'admin' : 'public'}/cars`;

            const headers = {};
            if (useAdminEndpoint && token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${endpoint}?t=${Date.now()}`, { headers });
            
            // Fallback en caso de que el token sea invalido y de un 401/403
            if (!response.ok) {
                if (useAdminEndpoint && (response.status === 401 || response.status === 403)) {
                    // Limpiar token si es invalido y falló
                    localStorage.removeItem('token');
                    // Volver a intentar sin token en la ruta publica
                    const publicResponse = await fetch(`${baseUrl}/api/public/cars?t=${Date.now()}`);
                    if (publicResponse.ok) {
                        const data = await publicResponse.json();
                        setCars(data);
                        return;
                    }
                }
                throw new Error('Failed to fetch cars');
            }
            const data = await response.json();
            setCars(data);
        } catch (err) {
            console.error("Error fetching cars:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // En el primer render, trata de determinar si debe usar el endpoint de admin
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        fetchCars(!!token);
    }, []);

    const deleteCar = async (id) => {
        if (!confirm('Are you sure?')) return;
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const endpoint = `${baseUrl}/api/cars/${id}`;

            const res = await fetch(endpoint, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    toast.error('Sesión expirada');
                    logout();
                    return;
                }
                throw new Error('Failed to delete');
            }

            setCars(prev => prev.filter(c => c._id !== id));
        } catch (err) {
            console.error("Error deleting car:", err);
            toast.error("Error al eliminar vehículo");
        }
    };

    return { cars, loading, error, refresh: () => fetchCars(!!localStorage.getItem('token')), deleteCar, setCars };
};
