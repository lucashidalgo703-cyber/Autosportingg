"use client";
import { parseResponseSafe } from '../utils/apiHelper';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export const useAdminCars = () => {
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(0);
    const [page, setPage] = useState(1);
    const [summary, setSummary] = useState(null);
    const [brands, setBrands] = useState([]);
    const { logout } = useAuth();

    const fetchCars = async (filters = {}) => {
        try {
            setLoading(true);
            setError(null);
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!token) {
                throw new Error('No admin token found');
            }

            const queryParams = new URLSearchParams();
            queryParams.append('t', Date.now());
            if (filters.page) queryParams.append('page', filters.page);
            if (filters.limit) queryParams.append('limit', filters.limit);
            if (filters.search) queryParams.append('search', filters.search);
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.brand) queryParams.append('brand', filters.brand);
            if (filters.tab) queryParams.append('tab', filters.tab);
            if (filters.ml) queryParams.append('ml', filters.ml);

            const endpoint = `${baseUrl}/api/admin/cars?${queryParams.toString()}`;

            const headers = {
                'Authorization': `Bearer ${token}`
            };

            const response = await fetch(endpoint, { headers });
            
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('token');
                    logout();
                }
                
                let errorMessage = `Failed to fetch admin cars (status: ${response.status})`;
                try {
                    const text = await response.text();
                    try {
                        const parsed = JSON.parse(text);
                        if (parsed && parsed.message) {
                            errorMessage = parsed.message;
                        } else if (parsed && parsed.error) {
                            errorMessage = parsed.error;
                        }
                    } catch (_) {
                        if (text && text.length < 150) {
                            errorMessage = `${errorMessage}: ${text}`;
                        }
                    }
                } catch (_) {}
                
                throw new Error(errorMessage);
            }
            const data = await parseResponseSafe(response);

            if (data && data.cars) {
                setCars(data.cars);
                setTotal(data.total || 0);
                setPages(data.pages || 0);
                setPage(data.page || 1);
                setSummary(data.summary || null);
                setBrands(data.brands || []);
                return data;
            } else {
                setCars(data || []);
                return { cars: data || [] };
            }
        } catch (err) {
            console.error("Error fetching admin cars:", err);
            setError(err.message);
            return { cars: [] };
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCars();
    }, []);

    const deleteCar = async (id) => {
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

    const swapCars = async (id1, id2, direction) => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const endpoint = `${baseUrl}/api/cars/reorder/swap`;

            const token = localStorage.getItem('token');
            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ id1, id2, direction })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                if (res.status === 401 || res.status === 403) {
                    toast.error('Sesión expirada');
                    logout();
                    return false;
                }
                throw new Error(errData.message || 'Error al cambiar el orden');
            }

            return true;
        } catch (err) {
            console.error("Error swapping cars:", err);
            toast.error(err.message || "Error al cambiar el orden");
            return false;
        }
    };

    return { cars, loading, error, refresh: fetchCars, deleteCar, setCars, total, pages, page, summary, brands, swapCars };
};
