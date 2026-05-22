"use client";
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Menu, X, LogOut, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const { favorites } = useFavorites();
  const pathname = usePathname();

  const isActive = (path) => pathname === path;

  const menuVariants = {
    closed: {
      opacity: 0,
      y: -20,
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1
      }
    },
    open: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    closed: { opacity: 0, x: -10 },
    open: { opacity: 1, x: 0 }
  };

  return (
    <header className="navbar">
      <div className="container navbar-content">
        <Link href="/" className="logo">
          <Image src="/logo-header-final-user.png" alt="AutoSporting" width={220} height={60} className="navbar-logo-img" style={{ width: 'auto', height: '100%' }} priority />
        </Link>

        {/* Desktop Menu */}
        <nav className="desktop-nav">
          <Link href="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>Inicio</Link>
          <Link href="/catalogo" className={`nav-link ${isActive('/catalogo') ? 'active' : ''}`}>Catálogo</Link>
          <Link href="/financiacion" className={`nav-link ${isActive('/financiacion') ? 'active' : ''}`}>Financiación</Link>
          <Link href="/nosotros" className={`nav-link ${isActive('/nosotros') ? 'active' : ''}`}>Nosotros</Link>
          <Link href="/contacto" className={`nav-link ${isActive('/contacto') ? 'active' : ''}`}>Contacto</Link>

          <Link href="/favoritos" className={`nav-link flex items-center gap-1 ${isActive('/favoritos') ? 'active' : ''}`} style={{ position: 'relative' }}>
            <Heart size={20} fill={isActive('/favoritos') ? "var(--color-primary)" : "none"} color={isActive('/favoritos') ? "var(--color-primary)" : "currentColor"} />
            {favorites.length > 0 && (
              <span className="favorites-badge">{favorites.length}</span>
            )}
          </Link>

          {isAuthenticated && (
            <>
              <Link href="/admin" className={`nav-link ${isActive('/admin') ? 'text-primary' : ''}`}>Admin</Link>
              <button onClick={logout} className="nav-link btn-logout">
                <LogOut size={18} />
              </button>
            </>
          )}
        </nav>

        {/* Mobile Menu Toggle */}
        <button className="mobile-toggle" onClick={() => setIsOpen(!isOpen)} aria-label="Menu">
          {isOpen ? <X size={28} color="white" /> : <Menu size={28} color="white" />}
        </button>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="mobile-nav"
              initial="closed"
              animate="open"
              exit="closed"
              variants={menuVariants}
            >
              <motion.div variants={itemVariants}>
                <Link href="/" onClick={() => setIsOpen(false)} className={isActive('/') ? 'active' : ''}>Inicio</Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Link href="/catalogo" onClick={() => setIsOpen(false)} className={isActive('/catalogo') ? 'active' : ''}>Catálogo</Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Link href="/financiacion" onClick={() => setIsOpen(false)} className={isActive('/financiacion') ? 'active' : ''}>Financiación</Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Link href="/nosotros" onClick={() => setIsOpen(false)} className={isActive('/nosotros') ? 'active' : ''}>Nosotros</Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Link href="/contacto" onClick={() => setIsOpen(false)} className={isActive('/contacto') ? 'active' : ''}>Contacto</Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Link href="/favoritos" onClick={() => setIsOpen(false)} className={`mobile-fav-link ${isActive('/favoritos') ? 'active' : ''}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Heart size={22} fill={isActive('/favoritos') ? "var(--color-primary)" : "none"} color={isActive('/favoritos') ? "var(--color-primary)" : "white"} />
                    Favoritos
                  </div>
                  {favorites.length > 0 && (
                    <span className="favorites-badge-mobile">{favorites.length}</span>
                  )}
                </Link>
              </motion.div>

              {isAuthenticated && (
                <motion.div variants={itemVariants}>
                  <Link href="/admin" onClick={() => setIsOpen(false)} style={{ color: '#EB2628', fontWeight: '700' }}>Admin</Link>
                  <button onClick={() => { logout(); setIsOpen(false); }} className="mobile-logout">
                    Cerrar Sesión
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .navbar {
          background-color: rgba(5, 5, 5, 0.75);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          position: sticky;
          top: 0;
          z-index: 1000;
          height: var(--header-height);
          display: flex;
          align-items: center;
          box-shadow: 0 4px 30px rgba(0,0,0,0.5);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .navbar-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .logo {
          display: flex;
          align-items: center;
          transition: transform 0.3s ease;
        }
        
        .logo:hover {
            transform: scale(1.02);
        }

        .navbar-logo-img {
          height: 38px; 
          width: auto;
          object-fit: contain;
        }
        
        @media (min-width: 768px) {
            .navbar-logo-img { height: 50px; }
        }

        .desktop-nav {
          display: flex;
          gap: 1.5rem;
          align-items: center;
        }
        
        @media (min-width: 1024px) {
            .desktop-nav { gap: 2.25rem; }
        }

        .nav-link {
          color: var(--color-text-muted);
          font-weight: 500;
          transition: all 0.3s ease;
          font-size: 0.95rem;
          letter-spacing: 0.01em;
        }

        .nav-link:hover, .nav-link.active {
          color: white;
          text-shadow: 0 0 15px rgba(255,255,255,0.3);
        }
        
        .nav-link.active {
            color: var(--color-primary);
        }

        .mobile-toggle {
          display: none;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .mobile-toggle:active {
            background: rgba(255,255,255,0.15);
        }

        .mobile-nav {
          position: absolute;
          top: 100%;
          left: 0;
          width: 100%;
          background-color: rgba(10, 10, 10, 0.98);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          border-bottom: 1px solid var(--color-primary);
          box-shadow: 0 20px 40px rgba(0,0,0,0.6);
          max-height: calc(100vh - var(--header-height));
          overflow-y: auto;
        }

        .mobile-nav a {
          color: #eee;
          padding: 1rem 0.5rem;
          font-size: 1.1rem;
          font-weight: 500;
          display: block;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          transition: color 0.2s;
        }
        
        .mobile-nav a.active {
            color: var(--color-primary);
            padding-left: 0.75rem;
            border-left: 2px solid var(--color-primary);
        }
        
        .mobile-fav-link {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
        }

        .btn-logout {
            background: none;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            color: var(--color-text-muted);
            transition: color 0.2s;
        }
        
        .btn-logout:hover {
            color: var(--color-primary);
        }

        .mobile-logout {
            background: rgba(235, 38, 40, 0.1);
            color: #EB2628;
            border: 1px solid rgba(235, 38, 40, 0.3);
            padding: 1rem;
            border-radius: 8px;
            margin-top: 1.5rem;
            cursor: pointer;
            width: 100%;
            text-align: center;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .favorites-badge {
            position: absolute;
            top: -8px;
            right: -12px;
            background-color: var(--color-primary);
            color: white;
            font-size: 0.7rem;
            font-weight: 700;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            border: 2px solid #050505;
        }

        .favorites-badge-mobile {
            background-color: var(--color-primary);
            color: white;
            font-size: 0.8rem;
            font-weight: 700;
            padding: 4px 12px;
            border-radius: 20px;
            box-shadow: 0 0 10px rgba(235, 38, 40, 0.4);
        }

        @media (max-width: 850px) {
          .desktop-nav { display: none; }
          .mobile-toggle { display: block; }
        }
      `}</style>
    </header>
  );
};

export default Navbar;
