"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Lock, KeyRound, ArrowLeft, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    } catch {
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
          'Authorization': `Bearer ${challengeId}`
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
    } catch {
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
    <div className="relative min-h-[90vh] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Elementos ambientales de fondo (Glow tecnológico y profundidad) */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[480px] w-[480px] rounded-full bg-crm-red/10 blur-[120px] -translate-y-12" />
        <div className="absolute h-[360px] w-[360px] rounded-full bg-purple-600/10 blur-[100px] translate-x-32 translate-y-20" />
      </div>
      
      {/* Contenedor central con resplandor perimetral */}
      <div className="relative w-full max-w-[420px]">
        {/* Glow de borde activo */}
        <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-b from-crm-red/30 via-white/5 to-crm-red/20 opacity-70 blur-sm" />

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-crm-surface/85 p-7 sm:p-9 shadow-2xl backdrop-blur-2xl">
          {/* Línea de acento superior estilo cyber-tech */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-crm-red to-transparent opacity-90" />

          {/* Badge superior de estado tecnológico */}
          <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-crm-fg-muted">
                Terminal CRM · Autosporting
              </span>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-mono font-semibold tracking-wider text-crm-fg-subtle">
              SSL v3
            </span>
          </div>

          {!challengeId ? (
            <>
              {/* Icono central de seguridad tecnológica */}
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-crm-red/30 bg-gradient-to-br from-crm-red/20 via-crm-surface to-black/60 shadow-lg shadow-crm-red/10">
                <ShieldCheck className="h-7 w-7 text-crm-red animate-in zoom-in-75 duration-300" />
              </div>

              <div className="text-center mb-6">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Acceso Autorizado
                </h1>
                <p className="mt-1.5 text-xs text-crm-fg-muted">
                  Ingresá tus credenciales para acceder al panel de control.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Campo Email */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted flex items-center gap-1.5">
                      Correo Electrónico
                    </label>
                    <span className="text-[9px] font-mono tracking-wider text-crm-fg-subtle">ID USUARIO</span>
                  </div>
                  <div className="group relative flex items-center rounded-xl border border-white/10 bg-black/40 transition-all duration-200 focus-within:border-crm-red focus-within:bg-black/60 focus-within:ring-2 focus-within:ring-crm-red/20 shadow-inner">
                    <div className="pointer-events-none pl-3.5 text-crm-fg-muted group-focus-within:text-crm-red transition-colors">
                      <Mail size={17} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario@autosporting.com"
                      autoComplete="username"
                      required
                      className="w-full bg-transparent py-2.5 pl-2.5 pr-4 text-xs sm:text-sm font-medium text-white placeholder-crm-fg-muted/40 outline-none"
                    />
                  </div>
                </div>

                {/* Campo Contraseña con Toggle Show/Hide */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted flex items-center gap-1.5">
                      Contraseña
                    </label>
                    <span className="text-[9px] font-mono tracking-wider text-crm-fg-subtle">ENCRIPTADA</span>
                  </div>
                  <div className="group relative flex items-center rounded-xl border border-white/10 bg-black/40 transition-all duration-200 focus-within:border-crm-red focus-within:bg-black/60 focus-within:ring-2 focus-within:ring-crm-red/20 shadow-inner">
                    <div className="pointer-events-none pl-3.5 text-crm-fg-muted group-focus-within:text-crm-red transition-colors">
                      <Lock size={17} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      required
                      className="w-full bg-transparent py-2.5 pl-2.5 pr-10 text-xs sm:text-sm font-medium text-white placeholder-crm-fg-muted/40 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                      className="absolute right-3 p-1 text-crm-fg-muted hover:text-white transition-colors focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 animate-in fade-in duration-200">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-crm-red-soft/30 bg-gradient-to-r from-crm-red via-red-600 to-crm-red-hover py-3 px-4 text-xs sm:text-sm font-bold text-white shadow-lg shadow-crm-red/25 transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Verificando credenciales...</span>
                    </>
                  ) : (
                    <>
                      <span>Ingresar al Sistema</span>
                      <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Paso 2FA Tecnológico */}
              <button
                type="button"
                onClick={cancel2FA}
                className="absolute top-6 left-6 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-crm-fg-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Volver"
              >
                <ArrowLeft size={16} />
              </button>

              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 via-crm-surface to-black/60 shadow-lg shadow-purple-500/10">
                <KeyRound className="h-7 w-7 text-purple-400" />
              </div>

              <div className="text-center mb-6">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Verificación 2FA
                </h1>
                <p className="mt-1.5 text-xs text-crm-fg-muted">
                  {recoveryMode
                    ? 'Ingresá tu código de recuperación de emergencia.'
                    : 'Ingresá el código de 6 dígitos de tu app autenticadora.'}
                </p>
              </div>

              <form onSubmit={handle2FASubmit} className="space-y-4">
                <div>
                  <div className="group relative flex items-center rounded-xl border border-purple-500/30 bg-black/40 transition-all duration-200 focus-within:border-purple-400 focus-within:bg-black/60 focus-within:ring-2 focus-within:ring-purple-500/20 shadow-inner">
                    <input
                      type="text"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\s/g, ''))}
                      placeholder={recoveryMode ? "CÓDIGO DE EMERGENCIA" : "000000"}
                      autoComplete="one-time-code"
                      maxLength={recoveryMode ? 64 : 6}
                      required
                      autoFocus
                      className="w-full bg-transparent py-3 text-center text-xl font-mono font-black tracking-[0.4em] text-white placeholder-crm-fg-muted/30 outline-none"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 animate-in fade-in duration-200">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-purple-500/40 bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 py-3 px-4 text-xs sm:text-sm font-bold text-white shadow-lg shadow-purple-600/25 transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Comprobando código...</span>
                    </>
                  ) : (
                    <>
                      <span>Validar Código</span>
                      <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryMode(!recoveryMode);
                      setTwoFactorCode('');
                      setError('');
                    }}
                    className="text-[11px] font-medium text-crm-fg-muted hover:text-white transition-colors underline underline-offset-4 cursor-pointer"
                  >
                    {recoveryMode
                      ? 'Volver a autenticación normal (código TOTP)'
                      : '¿No tenés acceso a tu app? Usar código de recuperación'}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Pie informativo tech */}
          <div className="mt-7 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-crm-fg-subtle font-mono">
            <span>AUTOSPORTING v2.4</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              SISTEMA PROTEGIDO
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
