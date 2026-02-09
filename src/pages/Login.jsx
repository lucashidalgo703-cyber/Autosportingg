import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock } from 'lucide-react';

const Login = () => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('http://localhost:3001/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }),
            });

            const data = await response.json();

            if (response.ok) {
                login(data.token);
                navigate('/admin');
            } else {
                setError(data.message || 'Contraseña incorrecta');
            }
        } catch (err) {
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <div className="icon-wrapper">
                    <Lock size={32} color="var(--color-primary)" />
                </div>
                <h1>Acceso Admin</h1>
                <p>Ingresa la contraseña maestra para gestionar el sitio.</p>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Contraseña..."
                            required
                        />
                    </div>

                    {error && <div className="error-msg">{error}</div>}

                    <button type="submit" disabled={loading} className="btn-login">
                        {loading ? 'Verificando...' : 'Ingresar'}
                    </button>
                </form>
            </div>

            <style>{`
        .login-container {
          min-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .login-box {
          background: rgba(20, 20, 20, 0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 3rem;
          border-radius: 16px;
          width: 100%;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .icon-wrapper {
          background: rgba(235, 38, 40, 0.1);
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          border: 1px solid rgba(235, 38, 40, 0.2);
        }

        h1 {
          font-size: 1.8rem;
          margin-bottom: 0.5rem;
          color: white;
        }

        p {
          color: var(--color-text-muted);
          margin-bottom: 2rem;
          font-size: 0.95rem;
        }

        .input-group {
          margin-bottom: 1.5rem;
        }

        input {
          width: 100%;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          font-size: 1rem;
          transition: all 0.2s;
        }

        input:focus {
          outline: none;
          border-color: var(--color-primary);
          background: rgba(0, 0, 0, 0.6);
        }

        .btn-login {
          width: 100%;
          padding: 1rem;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-login:hover {
          background: var(--color-primary-dark);
        }

        .btn-login:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .error-msg {
          background: rgba(235, 38, 40, 0.1);
          color: #ff4d4d;
          padding: 0.75rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
          border: 1px solid rgba(235, 38, 40, 0.2);
        }
      `}</style>
        </div>
    );
};

export default Login;
