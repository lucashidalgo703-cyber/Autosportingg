import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  // Verified Navbar Structure - Logo v5
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar">
      <div className="container navbar-content">
        <Link to="/" className="logo">
          <img src="/logo-header-final-user.png" alt="AutoSporting" className="navbar-logo-img" />
        </Link>

        {/* Desktop Menu */}
        <nav className="desktop-nav">
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>Inicio</Link>
          <Link to="/catalogo" className={`nav-link ${isActive('/catalogo') ? 'active' : ''}`}>Catálogo</Link>
          <Link to="/financiacion" className={`nav-link ${isActive('/financiacion') ? 'active' : ''}`}>Financiación</Link>
          <Link to="/nosotros" className={`nav-link ${isActive('/nosotros') ? 'active' : ''}`}>Nosotros</Link>
          <Link to="/contacto" className={`nav-link ${isActive('/contacto') ? 'active' : ''}`}>Contacto</Link>

          {isAuthenticated && (
            <>
              <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'text-primary' : ''}`}>Admin</Link>
              <button onClick={logout} className="nav-link btn-logout">
                <LogOut size={18} />
              </button>
            </>
          )}
        </nav>

        {/* Mobile Menu Toggle */}
        <button className="mobile-toggle" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X color="white" /> : <Menu color="white" />}
        </button>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="mobile-nav">
            <Link to="/" onClick={() => setIsOpen(false)}>Inicio</Link>
            <Link to="/catalogo" onClick={() => setIsOpen(false)}>Catálogo</Link>
            <Link to="/financiacion" onClick={() => setIsOpen(false)}>Financiación</Link>
            <Link to="/nosotros" onClick={() => setIsOpen(false)}>Nosotros</Link>
            <Link to="/contacto" onClick={() => setIsOpen(false)}>Contacto</Link>

            {isAuthenticated && (
              <>
                <Link to="/admin" onClick={() => setIsOpen(false)} style={{ color: '#EB2628' }}>Admin</Link>
                <button onClick={() => { logout(); setIsOpen(false); }} className="mobile-logout">
                  Cerrar Sesión
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        .navbar {
          background-color: rgba(5, 5, 5, 0.6); /* More transparent */
          backdrop-filter: blur(16px); /* Stronger blur */
          position: sticky;
          top: 0;
          z-index: 1000;
          height: var(--header-height);
          display: flex;
          align-items: center;
          /* Shadow for depth */
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        }
        
        /* Gradient Border Bottom */
        .navbar::after {
            content: '';
            position: absolute;
            bottom: 0; left: 0; right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%);
        }

        .navbar-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .logo {
          text-decoration: none;
          display: flex;
          align-items: center;
        }

        .navbar-logo-img {
          height: 40px; 
          width: auto;
          object-fit: contain;
          margin-left: 3px; /* Precise adjustment requested */
        }
        
        @media (min-width: 768px) {
            .navbar-logo-img { height: 60px; }
        }

        .desktop-nav {
          display: flex;
          gap: 2rem;
        }

        .nav-link {
          color: var(--color-text-muted);
          font-weight: 500;
          transition: color 0.2s;
          font-size: 0.95rem;
        }

        .nav-link:hover, .nav-link.active {
          color: var(--color-primary);
        }

        .mobile-toggle {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
        }

        .mobile-nav {
          position: absolute;
          top: 100%;
          left: 0;
          width: 100%;
          background-color: var(--color-bg);
          border-bottom: 1px solid var(--color-surface);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .mobile-nav a {
          color: white;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--color-surface);
        }
        
        .btn-logout {
            background: none;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            padding: 0;
        }
        
        .btn-logout:hover {
            color: #EB2628;
        }

        .mobile-logout {
            background: rgba(235, 38, 40, 0.1);
            color: #EB2628;
            border: 1px solid rgba(235, 38, 40, 0.3);
            padding: 0.8rem;
            border-radius: 6px;
            margin-top: 1rem;
            cursor: pointer;
            width: 100%;
            text-align: center;
            font-weight: 600;
        }

        @media (max-width: 768px) {
          .desktop-nav { display: none; }
          .mobile-toggle { display: block; }
        }
      `}</style>
    </header>
  );
};

export default Navbar;
