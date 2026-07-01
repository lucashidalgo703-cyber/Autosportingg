import { useState, useCallback } from 'react';

export function useAdminCrmTasks() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getStoredToken = () => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('token');
    };

    const notifyExpiredSession = () => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem('token');
        window.dispatchEvent(new Event('autosporting-auth-expired'));
    };

    const getAuthHeaders = () => {
        const token = getStoredToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    };

    const parseErrorResponse = async (res) => {
        if (res.status === 401 || res.status === 403) {
            notifyExpiredSession();
            return new Error('Tu sesion vencio o no esta autorizada. Volve a iniciar sesion para crear eventos.');
        }

        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            const data = await res.json().catch(() => ({}));
            return new Error(data.message || data.error || `Error ${res.status}`);
        }

        const text = await res.text().catch(() => "");
        return new Error(text || `Error ${res.status}`);
    };

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/crm-tasks', {
                headers: getAuthHeaders(),
                cache: 'no-store'
            });
            if (!response.ok) throw await parseErrorResponse(response);
            const data = await response.json();
            setTasks(data);
            return data;
        } catch (err) {
            setError(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const createTask = async (taskData) => {
        setLoading(true);
        setError(null);
        try {
            const headers = getAuthHeaders();
            if (!headers.Authorization) {
                notifyExpiredSession();
                throw new Error('No hay una sesion activa. Volve a iniciar sesion para crear eventos.');
            }

            const response = await fetch('/api/admin/crm-tasks', {
                method: 'POST',
                headers,
                body: JSON.stringify(taskData)
            });
            if (!response.ok) throw await parseErrorResponse(response);
            const data = await response.json();
            await fetchTasks();
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateTask = async (id, updateData) => {
        setLoading(true);
        setError(null);
        try {
            const headers = getAuthHeaders();
            if (!headers.Authorization) {
                notifyExpiredSession();
                throw new Error('No hay una sesion activa. Volve a iniciar sesion para editar eventos.');
            }

            const response = await fetch(`/api/admin/crm-tasks/${id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(updateData)
            });
            if (!response.ok) throw await parseErrorResponse(response);
            const data = await response.json();
            await fetchTasks();
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        tasks,
        loading,
        error,
        fetchTasks,
        createTask,
        updateTask
    };
}
