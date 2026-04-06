"use client";
import { AuthProvider } from '../context/AuthContext';
import { FavoritesProvider } from '../context/FavoritesContext';

export default function ClientProviders({ children }) {
    return (
        <FavoritesProvider>
            <AuthProvider>
                {children}
            </AuthProvider>
        </FavoritesProvider>
    );
}
