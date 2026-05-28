import { useState, useCallback } from 'react';

export function useAdminCrmTasks() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token'); // Fixed from adminToken to token
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    const parseErrorResponse = async (res) => {
        const contentType = res.headers.get("content-type") || "";
        
        if (contentType.includes("application/json")) {
            const data = await res.json().catch(() => ({}));
            return new Error(data.message || data.error || `Error ${res.status}`);
        }
        
        const text = await res.text().catch(() => "");
        if (res.status === 403) {
            return new Error('Sesión no autorizada para tareas CRM. Volvé a iniciar sesión.');
        }
        
        return new Error(text || `Error ${res.status}`);
    };

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/crm-tasks', {
                headers: getAuthHeaders()
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
            const response = await fetch('/api/admin/crm-tasks', {
                method: 'POST',
                headers: getAuthHeaders(),
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
            const response = await fetch(`/api/admin/crm-tasks/${id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
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
