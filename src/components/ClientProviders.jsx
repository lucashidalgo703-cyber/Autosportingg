"use client";
import { AuthProvider } from '../context/AuthContext';
import { FavoritesProvider } from '../context/FavoritesContext';
import { Toaster } from 'react-hot-toast';

export default function ClientProviders({ children }) {
    return (
        <FavoritesProvider>
            <AuthProvider>
                {children}
                <Toaster
                    position="bottom-right"
                    toastOptions={{
                        style: { background: '#111', color: '#fff', border: '1px solid #333', fontSize: '14px' },
                        success: { iconTheme: { primary: '#EB2628', secondary: '#fff' } }
                    }}
                />
            </AuthProvider>
        </FavoritesProvider>
    );
}
