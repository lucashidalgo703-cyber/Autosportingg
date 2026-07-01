"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Lock, KeyRound, ArrowLeft } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 2FA state
  const [challengeId, setChallengeId] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
      const response = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.require2FA) {
          setChallengeId(data.challengeId);
        } else {
          login(data.token);
          router.push('/admin');
        }
      } else {
        setError(data.message || 'No se pudo iniciar sesión');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
      
      const payload = { challengeId };
      if (recoveryMode) {
        payload.recoveryCode = twoFactorCode.trim();
      } else {
        payload.code = twoFactorCode.trim();
      }

      const response = await fetch(`${baseUrl}/api/login/2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${challengeId}` // Send challenge token in header for verify step
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.token);
        router.push('/admin');
      } else {
        setError(data.message || 'Código inválido');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const cancel2FA = () => {
    setChallengeId(null);
    setTwoFactorCode('');
    setError('');
    setRecoveryMode(false);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="icon-wrapper">
          {challengeId ? <KeyRound size={32} color="var(--color-primary)" /> : <Lock size={32} color="var(--color-primary)" />}
        </div>
        
        {!challengeId ? (
          <>
            <h1>Acceso Admin</h1>
            <p>Ingresa con tu usuario autorizado para gestionar el CRM.</p>

            <form onSubmit={handleLoginSubmit}>
              <div className="input-group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email..."
                  autoComplete="username"
                  required
                />
              </div>
              <div className="input-group">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña..."
                  autoComplete="current-password"
                  required
                />
              </div>

              {error && <div className="error-msg">{error}</div>}

              <button type="submit" disabled={loading} className="btn-login">
                {loading ? 'Verificando...' : 'Ingresar'}
              </button>
            </form>
          </>
        ) : (
          <>
            <button type="button" onClick={cancel2FA} className="btn-back" title="Volver">
              <ArrowLeft size={20} />
            </button>
            <h1>Verificación 2FA</h1>
            <p>{recoveryMode ? 'Ingresa uno de tus códigos de recuperación de emergencia.' : 'Ingresa el código de 6 dígitos generado por tu aplicación autenticadora.'}</p>

            <form onSubmit={handle2FASubmit}>
              <div className="input-group">
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\s/g, ''))}
                  placeholder={recoveryMode ? "Código de recuperación" : "000000"}
                  autoComplete="one-time-code"
                  maxLength={recoveryMode ? 64 : 6}
                  required
                  style={{ textAlign: 'center', letterSpacing: '2px', fontSize: '1.2rem' }}
                />
              </div>

              {error && <div className="error-msg">{error}</div>}

              <button type="submit" disabled={loading} className="btn-login">
                {loading ? 'Verificando...' : 'Verificar Código'}
              </button>

              <button 
                type="button" 
                onClick={() => { setRecoveryMode(!recoveryMode); setTwoFactorCode(''); setError(''); }} 
                className="btn-recovery-toggle"
              >
                {recoveryMode ? 'Usar código TOTP normal' : '¿No tienes tu dispositivo? Usar código de recuperación'}
              </button>
            </form>
          </>
        )}
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
          position: relative;
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

        .btn-back {
          position: absolute;
          top: 24px;
          left: 24px;
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s;
        }

        .btn-back:hover {
          color: white;
          background: rgba(255, 255, 255, 0.1);
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

        .btn-recovery-toggle {
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          font-size: 0.85rem;
          margin-top: 1.5rem;
          cursor: pointer;
          text-decoration: underline;
          transition: color 0.2s;
        }

        .btn-recovery-toggle:hover {
          color: white;
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
