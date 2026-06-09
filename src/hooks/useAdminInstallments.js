import { useState } from 'react';

export const useAdminInstallments = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const parseErrorResponse = async (res) => {
        const contentType = res.headers.get("content-type") || "";
        
        if (contentType.includes("application/json")) {
            const data = await res.json().catch(() => ({}));
            return new Error(data.message || data.error || `Error ${res.status}`);
        }
        
        const text = await res.text().catch(() => "");
        if (text.includes("<!DOCTYPE html>")) {
            return new Error(`Error ${res.status}: el servidor devolvió una página de error. Revisar logs del backend.`);
        }
        
        if (res.status === 403 && text === 'Forbidden') {
            return new Error('Sesión vencida o acceso denegado. Por favor, inicie sesión nuevamente.');
        }
        
        return new Error(text || `Error ${res.status}`);
    };

    const fetchInstallments = async (filters = {}) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams();
            if (filters.saleId) queryParams.append('saleId', filters.saleId);
            if (filters.status) queryParams.append('status', filters.status);

            const res = await fetch(`/api/admin/installments?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                throw await parseErrorResponse(res);
            }
            const data = await res.json();
            return data;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const fetchInstallmentById = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/installments/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                throw await parseErrorResponse(res);
            }
            const data = await res.json();
            return data;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const createInstallment = async (installmentData) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/installments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(installmentData)
            });

            if (!res.ok) {
                throw await parseErrorResponse(res);
            }
            const data = await res.json();
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateInstallment = async (id, updateData) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/installments/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateData)
            });

            if (!res.ok) {
                throw await parseErrorResponse(res);
            }
            const data = await res.json();
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const generateInstallments = async (saleId, generateData) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/sales/${saleId}/installments/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(generateData)
            });

            if (!res.ok) {
                throw await parseErrorResponse(res);
            }
            const data = await res.json();
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteInstallment = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/installments/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                throw await parseErrorResponse(res);
            }
            const data = await res.json();
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };


    const deleteInstallmentPlan = async (saleId) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/sales/${saleId}/installments`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                throw await parseErrorResponse(res);
            }
            const data = await res.json();
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        fetchInstallments,
        fetchInstallmentById,
        createInstallment,
        updateInstallment,
        generateInstallments,
        deleteInstallment,
        deleteInstallmentPlan,
        loading,
        error
    };
};
