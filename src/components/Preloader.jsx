import React, { useEffect, useState } from 'react';

const Preloader = () => {
    const [loading, setLoading] = useState(true);
    // Create consistent random stars for the background
    const [stars] = useState(() =>
        Array.from({ length: 40 }).map(() => ({
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            size: `${Math.random() * 3 + 1}px`, // 1px to 4px
            animationDuration: `${Math.random() * 1.5 + 0.5}s`, // 0.5s to 2.0s
            animationDelay: `${Math.random()}s`,
        }))
    );

    useEffect(() => {
        // El logo se revela y brilla. A los 2 segundos inicia la apertura del telón.
        const timer = setTimeout(() => {
            setLoading(false);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className={`preloader-overlay ${!loading ? 'slide-out' : ''}`}>
            {/* Blinking Red Stars Background */}
            <div className="preloader-stars-container">
                {stars.map((star, i) => (
                    <div
                        key={i}
                        className="preloader-star"
                        style={{
                            top: star.top,
                            left: star.left,
                            width: star.size,
                            height: star.size,
                            animationDuration: star.animationDuration,
                            animationDelay: star.animationDelay
                        }}
                    ></div>
                ))}
            </div>

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
