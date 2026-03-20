import React, { useEffect, useState } from 'react';

const Preloader = () => {
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        // E11EVEN timing: fast. Around 1.5s - 1.8s total
        const timer = setTimeout(() => {
            setLoading(false);
        }, 1800);

        return () => clearTimeout(timer);
    }, []);

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
