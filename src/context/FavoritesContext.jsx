"use client";
import React, { createContext, useState, useEffect, useContext } from 'react';

const FavoritesContext = createContext();

export const FavoritesProvider = ({ children }) => {
    const [favorites, setFavorites] = useState(() => {
        if (typeof window === 'undefined') return [];
        try {
            const saved = window.localStorage.getItem('autosporting_favorites');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error("Error loading favorites:", error);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('autosporting_favorites', JSON.stringify(favorites));
        } catch (error) {
            console.error("Error saving favorites:", error);
        }
    }, [favorites]);

    const toggleFavorite = (id) => {
        if (!id) return;
        const stringId = id.toString();
        setFavorites(prev => {
            if (prev.includes(stringId)) {
                return prev.filter(fId => fId !== stringId);
            } else {
                return [...prev, stringId];
            }
        });
    };

    const isFavorite = (id) => {
        if (!id) return false;
        return favorites.includes(id.toString());
    };

    return (
        <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
            {children}
        </FavoritesContext.Provider>
    );
};

export const useFavorites = () => useContext(FavoritesContext);
