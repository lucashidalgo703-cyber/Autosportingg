import { useState, useCallback } from 'react';

export function useAdminCrmTasks() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('adminToken');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/crm-tasks', {
                headers: getAuthHeaders()
            });
            if (!response.ok) throw new Error('Error al cargar tareas del CRM');
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
            if (!response.ok) throw new Error('Error al crear tarea');
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
            if (!response.ok) throw new Error('Error al actualizar tarea');
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
