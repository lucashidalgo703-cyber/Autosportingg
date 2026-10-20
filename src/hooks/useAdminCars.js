"use client";
import { parseResponseSafe } from '../utils/apiHelper';
import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getActiveOfflineSnapshot } from '../services/offlineSyncService';
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
    const [filteredTotalUSD, setFilteredTotalUSD] = useState(0);
    const [filteredTotalARS, setFilteredTotalARS] = useState(0);
    const [filteredCostUSD, setFilteredCostUSD] = useState(0);
    const [filteredCostARS, setFilteredCostARS] = useState(0);

    const { logout } = useAuth();
    const activeRequestIdRef = useRef(0);
    const lastFiltersRef = useRef({ page: 1, limit: 20 });

    const applyOfflineFallback = useCallback((filters = {}) => {
        const snap = getActiveOfflineSnapshot();
        const cachedVehicles = snap?.data?.vehicles;
        if (!Array.isArray(cachedVehicles)) return null;

        let filtered = [...cachedVehicles];
        if (filters.status && filters.status !== 'todos') {
            const st = String(filters.status).toLowerCase();
            filtered = filtered.filter(v => String(v.status || 'disponible').toLowerCase() === st);
        }
        if (filters.brand && filters.brand !== 'todas') {
            filtered = filtered.filter(v => String(v.brand || '').toLowerCase() === String(filters.brand).toLowerCase());
        }
        if (filters.search) {
            const q = String(filters.search).toLowerCase().trim();
            filtered = filtered.filter(v =>
                String(v.brand || '').toLowerCase().includes(q) ||
                String(v.name || '').toLowerCase().includes(q) ||
                String(v.plateOrVin || '').toLowerCase().includes(q)
            );
        }

        const uniqueBrands = Array.from(new Set(cachedVehicles.map(v => v.brand).filter(Boolean))).sort();
        setCars(filtered);
        setTotal(filtered.length);
        setPages(Math.max(1, Math.ceil(filtered.length / (Number(filters.limit) || 20))));
        setPage(Number(filters.page) || 1);
        setBrands(uniqueBrands);
        setError(null);
        return { cars: filtered, total: filtered.length, pages: 1, page: 1, brands: uniqueBrands, offline: true };
    }, []);

    const fetchCars = useCallback(async (incomingFilters) => {
        const requestId = ++activeRequestIdRef.current;

        // Si se llama sin argumentos (o undefined), reutilizamos los últimos filtros activos
        const effectiveFilters = incomingFilters !== undefined
            ? { ...lastFiltersRef.current, ...incomingFilters }
            : { ...lastFiltersRef.current };

        lastFiltersRef.current = effectiveFilters;

        try {
            setLoading(true);
            setError(null);

            if (typeof window !== 'undefined' && navigator.onLine === false) {
                const offlineResult = applyOfflineFallback(effectiveFilters);
                if (offlineResult) return offlineResult;
            }

            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');

            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!token) {
                throw new Error('No admin token found');
            }

            const queryParams = new URLSearchParams();
            queryParams.append('t', String(Date.now()));
            if (effectiveFilters.page) queryParams.append('page', String(effectiveFilters.page));
            if (effectiveFilters.limit) queryParams.append('limit', String(effectiveFilters.limit));
            if (effectiveFilters.search) queryParams.append('search', String(effectiveFilters.search));
            if (effectiveFilters.status) queryParams.append('status', String(effectiveFilters.status));
            if (effectiveFilters.brand) queryParams.append('brand', String(effectiveFilters.brand));
            if (effectiveFilters.tab) queryParams.append('tab', String(effectiveFilters.tab));
            if (effectiveFilters.ml) queryParams.append('ml', String(effectiveFilters.ml));

            const endpoint = `${baseUrl}/api/admin/cars?${queryParams.toString()}`;
            const headers = {
                'Authorization': `Bearer ${token}`
            };

            const response = await fetch(endpoint, {
                headers,
                cache: 'no-store'
            });

            // Si llegó una petición posterior antes de que esta termine, descartamos esta respuesta
            if (requestId !== activeRequestIdRef.current) {
                return;
            }

            if (!response.ok) {
                if (response.status === 503) {
                    const offlineResult = applyOfflineFallback(effectiveFilters);
                    if (offlineResult) return offlineResult;
                }
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

            // Verificamos nuevamente la vigencia de la respuesta
            if (requestId !== activeRequestIdRef.current) {
                return;
            }

            if (data && data.cars) {
                setCars(data.cars);
                setTotal(data.total || 0);
                setPages(data.pages || 0);
                setPage(data.page || 1);
                if (data.summary) {
                    setSummary(data.summary);
                }
                setBrands(data.brands || []);
                setFilteredTotalUSD(data.filteredTotalUSD || 0);
                setFilteredTotalARS(data.filteredTotalARS || 0);
                setFilteredCostUSD(data.filteredCostUSD || 0);
                setFilteredCostARS(data.filteredCostARS || 0);
                return data;
            } else {
                setCars(Array.isArray(data) ? data : []);
                setFilteredTotalUSD(0);
                setFilteredTotalARS(0);
                setFilteredCostUSD(0);
                setFilteredCostARS(0);
                return { cars: Array.isArray(data) ? data : [] };
            }
        } catch (err) {
            if (requestId !== activeRequestIdRef.current) return;
            const offlineResult = applyOfflineFallback(effectiveFilters);
            if (offlineResult) return offlineResult;
            console.error("Error fetching admin cars:", err);
            setError(err.message);
            return { cars: [] };
        } finally {
            if (requestId === activeRequestIdRef.current) {
                setLoading(false);
            }
        }
    }, [logout, applyOfflineFallback]);

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
            // Actualizamos la lista y el resumen global
            fetchCars();
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

    return {
        cars,
        loading,
        error,
        refresh: fetchCars,
        deleteCar,
        setCars,
        total,
        pages,
        page,
        summary,
        brands,
        swapCars,
        filteredTotalUSD,
        filteredTotalARS,
        filteredCostUSD,
        filteredCostARS
    };
};
