import React, { useEffect, useState } from 'react';

const Preloader = () => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // El logo se revela y brilla. A los 2 segundos inicia la apertura del telón.
        const timer = setTimeout(() => {
            setLoading(false);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className={`preloader-overlay ${!loading ? 'slide-out' : ''}`}>
            {/* Telón que se divide */}
            <div className="preloader-panel preloader-panel-top"></div>
            <div className="preloader-panel preloader-panel-bottom"></div>

            <div className="preloader-content">
                <div className="ambient-glow"></div>
                <div className="preloader-logo-container">
                    <img
                        src="/logo-header-final-user.png"
                        alt="Autosporting"
                        className="preloader-logo"
                    />
                    <div className="light-sweep"></div>
                </div>
            </div>
        </div>
    );
};

export default Preloader;
