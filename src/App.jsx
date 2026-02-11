import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home'; // Critical route, keep eager
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

// Lazy load other routes
const Catalog = lazy(() => import('./pages/Catalog'));
const CarDetail = lazy(() => import('./pages/CarDetail'));
const About = lazy(() => import('./pages/About'));
const Financing = lazy(() => import('./pages/Financing'));
const Contact = lazy(() => import('./pages/Contact'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Login = lazy(() => import('./pages/Login'));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-black text-white">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <ScrollToTop />
          <Navbar />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/catalogo" element={<Catalog />} />
              <Route path="/nosotros" element={<About />} />
              <Route path="/contacto" element={<Contact />} />
              <Route path="/financiacion" element={<Financing />} />
              <Route path="/auto/:id" element={<CarDetail />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

// Utility to reset scroll on route change
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

export default App;
