"use client";
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import styles from './Preloader.module.css';

const Preloader = () => {
    const [intro, setIntro] = useState(null);
    const pathname = usePathname();
    const enabled = pathname === '/' || /^\/portal\/[^/]+\/?$/.test(pathname || '');

    useEffect(() => {
        if (!enabled) return;
        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (motion.matches) return;
        const visibleViewport = window.visualViewport;
        const bounds = () => ({
            width: visibleViewport?.width || window.innerWidth,
            height: visibleViewport?.height || window.innerHeight,
            left: visibleViewport?.offsetLeft || 0,
            top: visibleViewport?.offsetTop || 0
        });
        const dismiss = () => setIntro(null);
        const resize = () => setIntro(current => current?.pathname === pathname ? { ...current, viewport: bounds() } : current);
        setIntro({ pathname, fading: false, viewport: bounds() });
        const fade = setTimeout(() => setIntro(current => current?.pathname === pathname ? { ...current, fading: true } : current), 2800);
        const remove = setTimeout(dismiss, 3300);
        // The intro is decorative: anyone who starts using the page can
        // continue immediately, including keyboard and assistive-tool users.
        window.addEventListener('pointerdown', dismiss, { once: true });
        window.addEventListener('focusin', dismiss, { once: true });
        motion.addEventListener('change', dismiss);
        visibleViewport?.addEventListener('resize', resize);
        visibleViewport?.addEventListener('scroll', resize);
        window.addEventListener('resize', resize);
        return () => {
            clearTimeout(fade); clearTimeout(remove);
            window.removeEventListener('pointerdown', dismiss);
            window.removeEventListener('focusin', dismiss);
            motion.removeEventListener('change', dismiss);
            visibleViewport?.removeEventListener('resize', resize);
            visibleViewport?.removeEventListener('scroll', resize);
            window.removeEventListener('resize', resize);
        };
    }, [pathname, enabled]);

    if (!enabled || intro?.pathname !== pathname) return null;

    // Anchor the image itself to the visible screen, rather than centering a
    // logo-and-slogan group inside mobile Safari's larger layout viewport.
    return createPortal(
        <div className={`${styles.overlay} ${intro.fading ? styles.fading : ''}`} aria-hidden="true" data-brand-intro
            style={{ width: intro.viewport.width, height: intro.viewport.height, left: intro.viewport.left, top: intro.viewport.top }}>
            <div className={styles.mark}>
                <div className={styles.flare}/>
                <div className={styles.reveal}>
                    <Image
                        src="/logo-header-final-user.png"
                        alt="Autosporting"
                        width={866}
                        height={180}
                        className={styles.logo}
                        data-intro-logo
                        priority
                    />
                    <div className={styles.sweep}/>
                </div>
                <p className={styles.slogan}><span>Elegí con seguridad, conducí con confianza.</span></p>
            </div>
        </div>, document.body
    );
};

export default Preloader;
