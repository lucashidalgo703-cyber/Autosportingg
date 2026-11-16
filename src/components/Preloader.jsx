"use client";
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const Preloader = () => {
    const [intro, setIntro] = useState(null);
    const pathname = usePathname();
    const enabled = pathname === '/' || /^\/portal\/[^/]+\/?$/.test(pathname || '');

    useEffect(() => {
        if (!enabled) return;
        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (motion.matches) return;
        const dismiss = () => setIntro(null);
        setIntro({ pathname, fading: false });
        const fade = setTimeout(() => setIntro(current => current?.pathname === pathname ? { ...current, fading: true } : current), 2800);
        const remove = setTimeout(dismiss, 3300);
        // The intro is decorative: anyone who starts using the page can
        // continue immediately, including keyboard and assistive-tool users.
        window.addEventListener('pointerdown', dismiss, { once: true });
        window.addEventListener('focusin', dismiss, { once: true });
        motion.addEventListener('change', dismiss);
        return () => {
            clearTimeout(fade); clearTimeout(remove);
            window.removeEventListener('pointerdown', dismiss);
            window.removeEventListener('focusin', dismiss);
            motion.removeEventListener('change', dismiss);
        };
    }, [pathname, enabled]);

    if (!enabled || intro?.pathname !== pathname) return null;

    return (
        <div className={`preloader-overlay ${intro.fading ? 'fade-out' : ''}`} aria-hidden="true" data-brand-intro style={{ pointerEvents: 'none' }}>
            <div className="preloader-content">
                {/* converging particles simulation */}
                <div className="preloader-particles-flare"></div>

                <div className="preloader-logo-container">
                    <Image
                        src="/logo-header-final-user.png"
                        alt="Autosporting"
                        width={250}
                        height={80}
                        style={{ width: 'auto', height: '100%' }}
                        className="preloader-logo"
                        priority
                    />
                    {/* The metallic/red light sweep */}
                    <div className="light-sweep red-sweep"></div>
                </div>

                {/* Slogan just like e11even */}
                <div className="preloader-slogan" style={{ maxWidth: '90vw' }}>Elegí con seguridad, conducí con confianza.</div>
            </div>
        </div>
    );
};

export default Preloader;
