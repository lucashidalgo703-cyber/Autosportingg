"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export const useCars = () => {
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { logout } = useAuth();
    const fetchCars = async () => {
        try {
            setLoading(true);
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            
            const endpoint = `${baseUrl}/api/public/cars`;

            const response = await fetch(`${endpoint}?t=${Date.now()}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch public cars');
            }
            let data = await response.json();
            
            // Heurística para inferir tipo de vehículo basado en marca, modelo o campo type
            data = data.map(car => {
                const searchString = `${car.brand} ${car.name} ${car.vehicleType || ''} ${car.type || ''} ${car.category || ''}`.toLowerCase();
                let inferredType = car.vehicleType || 'Auto';

                if (searchString.includes('pickup') || searchString.includes('pick-up') || searchString.includes('pick up') || searchString.includes('camioneta') || searchString.includes('hilux') || searchString.includes('amarok') || searchString.includes('ranger') || searchString.includes('s10') || searchString.includes('frontier') || searchString.includes('alaskan') || searchString.includes('toro') || searchString.includes('saveiro') || searchString.includes('strada')) {
                    inferredType = 'Pickup';
                } else if (searchString.includes('suv') || searchString.includes('utilitario') || searchString.includes('sw4') || searchString.includes('tracker') || searchString.includes('kicks') || searchString.includes('hrv') || searchString.includes('corolla cross') || searchString.includes('taos') || searchString.includes('renegade') || searchString.includes('compass') || searchString.includes('ecosport') || searchString.includes('duster') || searchString.includes('nivus') || searchString.includes('t-cross')) {
                    inferredType = 'SUV';
                } else if (searchString.includes('hatchback') || searchString.includes('hatch') || searchString.includes('208') || searchString.includes('gol') || searchString.includes('sandero') || searchString.includes('yaris hatch') || searchString.includes('onix') && !searchString.includes('plus') || searchString.includes('polo') || searchString.includes('cruze 5') || searchString.includes('fiesta') || searchString.includes('focus') || searchString.includes('clio') || searchString.includes('ka') || searchString.includes('up') || searchString.includes('kwid')) {
                    inferredType = 'Hatchback';
                } else if (searchString.includes('sedan') || searchString.includes('sedán') || searchString.includes('corolla') || searchString.includes('cruze 4') || searchString.includes('cronos') || searchString.includes('vento') || searchString.includes('sentra') || searchString.includes('onix plus') || searchString.includes('virtus') || searchString.includes('logan') || searchString.includes('siena') || searchString.includes('prisma') || searchString.includes('yaris sedan') || searchString.includes('civic') || searchString.includes('focus sedan') || searchString.includes('etios sedan') || searchString.includes('voyage')) {
                    inferredType = 'Sedan';
                }

                return { ...car, computedType: inferredType };
            });

            setCars(data);
        } catch (err) {
            console.error("Error fetching public cars:", err);
            setError(err.message);
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
            const endpoint = `${baseUrl}/api/cars/${id}`; // Delete uses the admin endpoint still

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

    return { cars, loading, error, refresh: fetchCars, deleteCar, setCars };
};
