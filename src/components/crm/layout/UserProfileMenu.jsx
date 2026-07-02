"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Sun, Moon, User, BookOpen, LogOut } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';

export default function UserProfileMenu() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    const buttonRef = useRef(null);

    // Eventos de cierre
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
                buttonRef.current?.focus();
            }
        };

        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target) &&
                buttonRef.current && !buttonRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Cerrar al cambiar de ruta
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Datos del usuario con fallbacks de seguridad
    const safeRole = user?.role || 'usuario';
    const roleLabel = (safeRole === 'owner' || safeRole === 'admin') 
        ? 'Administrador' 
        : safeRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    const rawEmail = user?.email || '';
    const safeEmail = rawEmail;
    const safeName = user?.displayName || (rawEmail ? rawEmail.split('@')[0] : 'Usuario');
    const safeInitials = (user?.displayName || safeEmail || 'U').charAt(0).toUpperCase();

    const handleLogout = async () => {
        setIsOpen(false);
        try {
            await logout();
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    };

    const handleThemeToggle = () => {
        toggleTheme();
    };

    return (
        <div className="relative inline-block text-left">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label="Menú de perfil"
                className="flex items-center h-[46px] gap-2 p-[4px] pr-2 rounded-lg bg-transparent hover:bg-crm-surface transition-colors focus:outline-none focus:ring-2 focus:ring-crm-red md:pr-[8px]"
            >
                <div className="hidden md:flex flex-col items-end px-2">
                    <span className="text-sm font-bold text-crm-fg leading-none truncate max-w-[120px]">{safeName}</span>
                    <span className="text-[10px] font-bold text-crm-fg-muted mt-1 leading-none uppercase">{roleLabel}</span>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-crm-border bg-crm-surface-raised text-sm font-bold text-crm-fg">
                    {safeInitials}
                </div>
            </button>

            {isOpen && (
                <div
                    ref={menuRef}
                    role="menu"
                    className="absolute right-0 top-[calc(100%+8px)] z-[100] w-[224px] min-w-[224px] rounded-lg border border-[#33333a] bg-[#28282e] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden origin-top-right animate-in fade-in slide-in-from-top-2 duration-200"
                    style={{
                        backgroundColor: 'var(--color-bg-surface, #28282e)',
                        borderColor: 'var(--color-border, #33333a)'
                    }}
                >
                    <div className="p-3 border-b border-crm-border">
                        <p className="text-sm font-semibold text-crm-fg truncate mb-0.5">{safeName}</p>
                        {safeEmail && (
                            <p className="text-xs text-crm-fg-muted truncate mb-2">{safeEmail}</p>
                        )}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-crm-red/10 text-[10px] font-bold text-crm-red uppercase tracking-wider">
                            {roleLabel}
                        </span>
                    </div>

                    <div className="p-1">
                        <button
                            role="menuitem"
                            onClick={handleThemeToggle}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-crm-fg hover:bg-crm-surface-raised transition-colors focus:bg-crm-surface-raised focus:outline-none h-[36px]"
                        >
                            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                            {theme === 'dark' ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
                        </button>

                        <Link
                            role="menuitem"
                            href="/admin/configuracion/perfil"
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-crm-fg hover:bg-crm-surface-raised transition-colors focus:bg-crm-surface-raised focus:outline-none h-[36px]"
                        >
                            <User size={16} />
                            Mi perfil
                        </Link>

                        {/* Feature Flag del manual: Siempre visible pero controlado por rutas si existiera flag */}
                        <Link
                            role="menuitem"
                            href="/admin/ayuda"
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-crm-fg hover:bg-crm-surface-raised transition-colors focus:bg-crm-surface-raised focus:outline-none h-[36px]"
                        >
                            <BookOpen size={16} />
                            Manual de uso
                        </Link>
                    </div>

                    <div className="p-1 border-t border-crm-border">
                        <button
                            role="menuitem"
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-crm-red hover:bg-crm-red/10 transition-colors focus:bg-crm-red/10 focus:outline-none h-[36px]"
                        >
                            <LogOut size={16} />
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
