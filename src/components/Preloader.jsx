"use client";
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const Preloader = () => {
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();

    useEffect(() => {
        // Extended timing holding the final frame longer so text can be read
        const timer = setTimeout(() => {
            setLoading(false);
        }, 2800);

        return () => clearTimeout(timer);
    }, []);

    // Desactivar en todo el sitio menos en el inicio
    if (pathname !== '/') return null;

    return (
        <div className={`preloader-overlay ${!loading ? 'fade-out' : ''}`}>
            <div className="preloader-content">
                {/* converging particles simulation */}
                <div className="preloader-particles-flare"></div>

                <div className="preloader-logo-container">
                    <img
                        src="/logo-header-final-user.png"
                        alt="Autosporting"
                        className="preloader-logo"
                    />
                    {/* The metallic/red light sweep */}
                    <div className="light-sweep red-sweep"></div>
                </div>

                {/* Slogan just like e11even */}
                <div className="preloader-slogan">Elegí con seguridad, conducí con confianza.</div>
            </div>
        </div>
    );
};

export default Preloader;
