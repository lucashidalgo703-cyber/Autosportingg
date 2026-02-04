import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Car } from 'lucide-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  // Verified Navbar Structure - Logo v5
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar">
      <div className="container navbar-content">
        <Link to="/" className="logo">
          <img src="/logo-header-v7-hq.png" alt="AutoSporting" className="navbar-logo-img" />
        </Link>


        {/* Desktop Menu */}
        <nav className="desktop-nav">
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>Inicio</Link>
          <Link to="/catalogo" className={`nav-link ${isActive('/catalogo') ? 'active' : ''}`}>Catálogo</Link>
          <Link to="/nosotros" className={`nav-link ${isActive('/nosotros') ? 'active' : ''}`}>Nosotros</Link>
          <Link to="/contacto" className={`nav-link ${isActive('/contacto') ? 'active' : ''}`}>Contacto</Link>
          <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'text-primary' : ''}`}>Admin</Link>
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
            <a href="#nosotros" onClick={() => setIsOpen(false)}>Nosotros</a>
            <a href="#contacto" onClick={() => setIsOpen(false)}>Contacto</a>
            <Link to="/admin" onClick={() => setIsOpen(false)} style={{ color: '#EB2628' }}>Admin</Link>
          </div>
        )}
      </div>

      <style>{`
        .navbar {
          background-color: rgba(0, 0, 0, 0.95);
          backdrop-filter: blur(10px);
          position: sticky;
          top: 0;
          z-index: 1000;
          border-bottom: 1px solid var(--color-surface);
          height: var(--header-height);
          display: flex;
          align-items: center;
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
          height: 55px; 
          width: auto;
          object-fit: contain;
        }
        
        @media (min-width: 768px) {
            .navbar-logo-img { height: 90px; } /* Balanced 90px/110px */
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

        @media (max-width: 768px) {
          .desktop-nav { display: none; }
          .mobile-toggle { display: block; }
        }
      `}</style>
    </header>
  );
};

export default Navbar;
