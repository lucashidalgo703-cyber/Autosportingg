"use client";
import { AuthProvider } from '../context/AuthContext';
import { FavoritesProvider } from '../context/FavoritesContext';
import { ThemeProvider } from '../context/ThemeContext';
import { Toaster } from 'react-hot-toast';

export default function ClientProviders({ children }) {
    return (
        <ThemeProvider>
            <FavoritesProvider>
                <AuthProvider>
                    {children}
                    <Toaster
                        position="bottom-right"
                        toastOptions={{
                            style: { background: '#1C1C1F', color: '#F8F9FA', border: '1px solid #2A2A2F', fontSize: '14px', borderRadius: '8px' },
                            success: { iconTheme: { primary: '#E63027', secondary: '#F8F9FA' } },
                            error: { iconTheme: { primary: '#E63027', secondary: '#F8F9FA' } }
                        }}
                    />
                </AuthProvider>
            </FavoritesProvider>
        </ThemeProvider>
    );
}
