"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { parseResponseSafe } from '../utils/apiHelper';
import toast from 'react-hot-toast';

export const useAdminDashboard = () => {
    const [data, setData] = useState({ cars: [], sales: [], transactions: [], installments: [], dolarBlue: null, dolarBlueHistory: null, cockpitTargetUSD: 110000 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { logout } = useAuth();

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            // Producción (dominio real): misma origen, igual que el resto de hooks y el login.
            // Desarrollo o `next start` en localhost/127.0.0.1: NEXT_PUBLIC_API_URL o backend local en :3001.
            // Un NEXT_PUBLIC_API_URL incrustado en el build nunca debe redirigir el dashboard en producción.
            const host = typeof window !== 'undefined' ? window.location.hostname : '';
            const isLocalHost = host === 'localhost' || host === '127.0.0.1';
            const baseUrl = (process.env.NODE_ENV === 'production' && !isLocalHost)
                ? ''
                : (API_URL || 'http://localhost:3001');
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            
            if (!token) throw new Error('No admin token found');

            const endpoint = `${baseUrl}/api/admin/dashboard?t=${Date.now()}`;
            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('token');
                    logout();
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to fetch dashboard data (status: ${response.status})`);
            }

            const json = await parseResponseSafe(response);
            if (json) {
                setData({
                    cars: json.cars || [],
                    sales: json.sales || [],
                    transactions: json.transactions || [],
                    installments: json.installments || [],
                    dolarBlue: json.dolarBlue || null,
                    dolarBlueHistory: json.dolarBlueHistory || null,
                    cockpitTargetUSD: json.cockpitTargetUSD || 110000
                });
            }
        } catch (err) {
            console.error("Error fetching dashboard data:", err);
            setError(err.message);
            toast.error(err.message || 'Error al cargar datos del dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    return { data, loading, error, refresh: fetchDashboard };
};
