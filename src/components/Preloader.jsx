import React, { useEffect, useState } from 'react';

const Preloader = () => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // The animation takes about 1.2s total (1s reveal + light sweep), wait a bit more then fade out
        const timer = setTimeout(() => {
            setLoading(false);
        }, 1800);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className={`preloader-overlay ${!loading ? 'fade-out' : ''}`}>
            <div className="preloader-content">
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
