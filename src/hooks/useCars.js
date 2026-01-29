import { useState, useEffect } from 'react';

export const useCars = () => {
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCars = async () => {
        try {
            setLoading(true);
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const response = await fetch(`${API_URL}/api/cars`);
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
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            await fetch(`${API_URL}/api/cars/${id}`, { method: 'DELETE' });
            setCars(prev => prev.filter(c => c._id !== id));
        } catch (err) {
            console.error("Error deleting car:", err);
            alert("Error deleting car");
        }
    };

    return { cars, loading, error, refresh: fetchCars, deleteCar };
};
