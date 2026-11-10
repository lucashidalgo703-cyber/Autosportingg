"use client";
import { parseResponseSafe } from '../utils/apiHelper';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getActiveOfflineSnapshot } from '../services/offlineSyncService';
import toast from 'react-hot-toast';
import { buildStockQuery, filterStockSnapshot, parseStockFilters, stockOptions, normalizeStockText, STOCK_FILTER_KEYS } from '../utils/stockFilters.js';

export const useAdminCars = () => {
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(0);
    const [page, setPage] = useState(1);
    const [summary, setSummary] = useState(null);
    const [brands, setBrands] = useState([]);
    const [models, setModels] = useState([]);
    const [isOffline, setIsOffline] = useState(false);
    const [filteredTotalUSD, setFilteredTotalUSD] = useState(0);
    const [filteredTotalARS, setFilteredTotalARS] = useState(0);
    const [filteredCostUSD, setFilteredCostUSD] = useState(0);
    const [filteredCostARS, setFilteredCostARS] = useState(0);
    const [filteredPropioARS, setFilteredPropioARS] = useState(0);
    const [filteredInversionistasARS, setFilteredInversionistasARS] = useState(0);
    const [filteredPropioUSD, setFilteredPropioUSD] = useState(0);
    const [filteredInversionistasUSD, setFilteredInversionistasUSD] = useState(0);

    const { logout, user } = useAuth();
    const sessionKey = String(user?._id || user?.id || user?.username || user?.email || '');
    const activeRequestIdRef = useRef(0);
    const lastFiltersRef = useRef({ page: 1, limit: 20 });

    const clearFinancialData = useCallback(() => {
        setSummary(null);
        setFilteredTotalUSD(0); setFilteredTotalARS(0);
        setFilteredCostUSD(0); setFilteredCostARS(0);
        setFilteredPropioARS(0); setFilteredInversionistasARS(0);
        setFilteredPropioUSD(0); setFilteredInversionistasUSD(0);
    }, []);

    useEffect(() => {
        activeRequestIdRef.current++;
        setCars([]); setBrands([]); setModels([]);
        setTotal(0); setPages(0); setPage(1); setIsOffline(false);
        clearFinancialData();
    }, [sessionKey, clearFinancialData]);

    const applyOfflineFallback = useCallback((filters = {}) => {
        const snap = getActiveOfflineSnapshot();
        const cachedVehicles = snap?.data?.vehicles;
        if (!Array.isArray(cachedVehicles)) return null;

        const effective = parseStockFilters(filters);
        const filtered = filterStockSnapshot(cachedVehicles, effective);
        const page = effective.page;
        const paged = filtered.slice((page - 1) * effective.limit, page * effective.limit);
        const uniqueBrands = stockOptions(cachedVehicles.map(v => v.brand));
        const modelOptions = stockOptions(cachedVehicles.filter(v => !effective.brand || effective.brand === 'todas' || normalizeStockText(v.brand) === normalizeStockText(effective.brand)).map(v => v.name));
        setCars(paged);
        setTotal(filtered.length);
        setPages(Math.max(1, Math.ceil(filtered.length / effective.limit)));
        setPage(page);
        setBrands(uniqueBrands);
        setModels(modelOptions);
        setIsOffline(true);
        clearFinancialData();
        setError(null);
        return { cars: paged, total: filtered.length, pages: Math.max(1, Math.ceil(filtered.length / effective.limit)), page, brands: uniqueBrands, models: modelOptions, offline: true };
    }, [clearFinancialData]);

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
            // Un filtro inválido no es un fallo de conexión ni habilita fallback offline.
            try { buildStockQuery(effectiveFilters); }
            catch (error) { throw Object.assign(error, { status: 400 }); }

            if (typeof window !== 'undefined' && navigator.onLine === false) {
                setIsOffline(true);
                clearFinancialData();
                const offlineResult = applyOfflineFallback(effectiveFilters);
                if (offlineResult) return offlineResult;
                throw new Error('No hay una instantánea autorizada de stock disponible sin conexión.');
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
            for (const key of STOCK_FILTER_KEYS) {
                const value = effectiveFilters[key];
                if (value !== undefined && value !== null && value !== '') queryParams.append(key, String(value));
            }

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

                throw Object.assign(new Error(errorMessage), { status: response.status });
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
                setModels(data.models || []);
                setIsOffline(false);
                setFilteredTotalUSD(data.filteredTotalUSD || 0);
                setFilteredTotalARS(data.filteredTotalARS || 0);
                setFilteredCostUSD(data.filteredCostUSD || 0);
                setFilteredCostARS(data.filteredCostARS || 0);
                setFilteredPropioARS(data.filteredPropioARS || 0);
                setFilteredInversionistasARS(data.filteredInversionistasARS || 0);
                setFilteredPropioUSD(data.filteredPropioUSD || 0);
                setFilteredInversionistasUSD(data.filteredInversionistasUSD || 0);
                return data;
            } else {
                setCars(Array.isArray(data) ? data : []);
                setFilteredTotalUSD(0);
                setFilteredTotalARS(0);
                setFilteredCostUSD(0);
                setFilteredCostARS(0);
                setFilteredPropioARS(0);
                setFilteredInversionistasARS(0);
                setFilteredPropioUSD(0);
                setFilteredInversionistasUSD(0);
                return { cars: Array.isArray(data) ? data : [] };
            }
        } catch (err) {
            if (requestId !== activeRequestIdRef.current) return;
            if (!err.status || err.status === 503) {
                setIsOffline(true);
                clearFinancialData();
            }
            const offlineResult = !err.status || err.status === 503 ? applyOfflineFallback(effectiveFilters) : null;
            if (offlineResult) return offlineResult;
            console.error("Error fetching admin cars:", err);
            setError(err.message);
            return { cars: [] };
        } finally {
            if (requestId === activeRequestIdRef.current) {
                setLoading(false);
            }
        }
    }, [logout, applyOfflineFallback, sessionKey, clearFinancialData]);

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
        models,
        isOffline,
        swapCars,
        filteredTotalUSD,
        filteredTotalARS,
        filteredCostUSD,
        filteredCostARS,
        filteredPropioARS,
        filteredInversionistasARS,
        filteredPropioUSD,
        filteredInversionistasUSD
    };
};
