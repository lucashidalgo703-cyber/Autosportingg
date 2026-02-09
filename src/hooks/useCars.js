import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const useCars = () => {
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { logout } = useAuth();

    const fetchCars = async () => {
        try {
            setLoading(true);
            const API_URL = import.meta.env.VITE_API_URL;
            const baseUrl = API_URL || 'http://localhost:3001';
            const endpoint = baseUrl === '/' ? '/api/cars' : `${baseUrl}/api/cars`;

            // Add cache busting to ensure fresh data
            const response = await fetch(`${endpoint}?t=${Date.now()}`);
            if (!response.ok) throw new Error('Failed to fetch cars');
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
        fetchCars();
    }, []);

    const deleteCar = async (id) => {
        if (!confirm('Are you sure?')) return;
        try {
            const API_URL = import.meta.env.VITE_API_URL;
            const baseUrl = API_URL || 'http://localhost:3001';
            const endpoint = baseUrl === '/' ? `/api/cars/${id}` : `${baseUrl}/api/cars/${id}`;

            const res = await fetch(endpoint, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    alert('Session expired');
                    logout();
                    return;
                }
                throw new Error('Failed to delete');
            }

            setCars(prev => prev.filter(c => c._id !== id));
        } catch (err) {
            console.error("Error deleting car:", err);
            alert("Error deleting car");
        }
    };

    return { cars, loading, error, refresh: fetchCars, deleteCar };
};
