"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        const storedTheme = localStorage.getItem('crm-theme');
        const validTheme = (storedTheme === 'dark' || storedTheme === 'light') ? storedTheme : 'dark';
        setTheme(validTheme);
        
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(validTheme);
    }, []);

    const toggleTheme = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        localStorage.setItem('crm-theme', nextTheme);
        
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(nextTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
