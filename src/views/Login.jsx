"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Lock, KeyRound, ArrowLeft, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2, AlertTriangle, Terminal, Cpu } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [matrixSpeed, setMatrixSpeed] = useState(1);
  const [decryptText, setDecryptText] = useState('DECODIFICANDO CREDENCIALES...');
  
  // 2FA state
  const [challengeId, setChallengeId] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);

  const { login } = useAuth();
  const router = useRouter();
  const canvasRef = useRef(null);

  // Matrix Rain Canvas Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const chars = '0123456789ABCDEF010101XYZアイウエオカキクケコサシスセソタチツテト';
    const fontSize = 13;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array.from({ length: columns }, () => Math.floor(Math.random() * (canvas.height / fontSize)));

    let lastTime = 0;

    const draw = (currentTime) => {
      animationFrameId = requestAnimationFrame(draw);
      const fps = loading ? 45 : 24; // Más rápido cuando está autenticando
      const interval = 1000 / fps;
      const delta = currentTime - lastTime;
      if (delta < interval) return;
      lastTime = currentTime - (delta % interval);

      ctx.fillStyle = 'rgba(7, 7, 9, 0.12)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const isRed = Math.random() > 0.88;
        const isBrightWhite = Math.random() > 0.96;

        ctx.fillStyle = isBrightWhite
          ? '#FFFFFF'
          : isRed
            ? '#EF3329'
            : 'rgba(34, 197, 94, 0.55)';

        ctx.fillText(char, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [loading]);

  // Texto cambiante durante la decodificación futurista
  useEffect(() => {
    if (!loading) return;
    const messages = [
      'INICIANDO HANDSHAKE SSL...',
      'DECODIFICANDO CREDENCIALES SHA-256...',
      'COMPROBANDO FIRMA DE NODO CRM...',
      'AUTORIZANDO ACCESO A TERMINAL...'
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % messages.length;
      setDecryptText(messages[idx]);
    }, 450);
    return () => clearInterval(interval);
  }, [loading]);

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
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-[#070709] text-white">
      {/* 1. Canvas Matrix Rain de fondo */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-0 opacity-25" />

      {/* 2. Cuadrícula digital espacial (Cyber Grid) */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 opacity-40"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />

      {/* 3. Viñeta radial oscura para enfocar el centro */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_20%,#070709_92%)]" />

      {/* 4. Contenedor HUD Futurista */}
      <div className="relative w-full max-w-[430px] z-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Corchetes decorativos HUD Sci-Fi en las 4 esquinas */}
        <div className="pointer-events-none absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-crm-red z-20 shadow-[0_0_8px_#EF3329]" />
        <div className="pointer-events-none absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-crm-red z-20 shadow-[0_0_8px_#EF3329]" />
        <div className="pointer-events-none absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-crm-red z-20 shadow-[0_0_8px_#EF3329]" />
        <div className="pointer-events-none absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-crm-red z-20 shadow-[0_0_8px_#EF3329]" />

        {/* Resplandor perimetral de energía */}
        <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-b from-crm-red/35 via-red-950/20 to-black opacity-80 blur-md" />

        <div className="relative overflow-hidden rounded-2xl border border-crm-red/30 bg-[#0d0e12]/92 backdrop-blur-2xl p-7 sm:p-9 shadow-2xl">
          
          {/* Scanline láser animado estilo Matrix */}
          <div 
            className="pointer-events-none absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-crm-red to-transparent shadow-[0_0_12px_#EF3329] z-20"
            style={{
              animation: loading ? 'matrixScan 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite' : 'matrixScan 3s cubic-bezier(0.4, 0, 0.2, 1) infinite'
            }}
          />

          {/* Barra superior de Telemetría Sci-Fi */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-6 font-mono text-[10px]">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
              <span className="tracking-widest text-emerald-400 uppercase font-bold">CORE ONLINE</span>
            </div>
            <div className="text-zinc-500 tracking-wider">
              PORT // 443 [TLS 1.3]
            </div>
          </div>

          {!challengeId ? (
            <>
              {/* Icono central de seguridad tecnológica */}
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-crm-red/40 bg-red-950/30 text-crm-red shadow-[0_0_20px_rgba(239,51,41,0.25)]">
                <ShieldCheck className="h-7 w-7 text-crm-red" />
              </div>

              <div className="text-center mb-6">
                <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-white font-mono">
                  AUTOSPORTING <span className="text-crm-red">TERMINAL</span>
                </h1>
                <p className="text-xs text-zinc-400 mt-1 font-mono tracking-wide">
                  SISTEMA DE AUTENTICACIÓN CENTRAL
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Campo Email */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-zinc-400 mb-1.5 uppercase">
                    <span>&gt; OPERADOR_ID (EMAIL)</span>
                    <span className="text-red-400/80">[AUTH]</span>
                  </div>
                  <div className="group relative flex items-center rounded-xl border border-zinc-700/80 bg-black/60 focus-within:border-crm-red focus-within:ring-1 focus-within:ring-crm-red/40 transition-all shadow-inner">
                    <span className="pl-3.5 text-zinc-500 font-mono text-xs select-none group-focus-within:text-crm-red transition-colors">&gt;</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="id@autosporting.com"
                      autoComplete="username"
                      required
                      disabled={loading}
                      className="w-full bg-transparent py-2.5 pl-2.5 pr-4 text-xs sm:text-sm font-mono text-zinc-100 placeholder-zinc-600 outline-none disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Campo Contraseña con Toggle Show/Hide */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-zinc-400 mb-1.5 uppercase">
                    <span>&gt; CLAVE_ACCESO (PASSWORD)</span>
                    <span className="text-emerald-400/80">[SHA-256]</span>
                  </div>
                  <div className="group relative flex items-center rounded-xl border border-zinc-700/80 bg-black/60 focus-within:border-crm-red focus-within:ring-1 focus-within:ring-crm-red/40 transition-all shadow-inner">
                    <span className="pl-3.5 text-zinc-500 font-mono text-xs select-none group-focus-within:text-crm-red transition-colors">&gt;</span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      required
                      disabled={loading}
                      className="w-full bg-transparent py-2.5 pl-2.5 pr-10 text-xs sm:text-sm font-mono text-zinc-100 placeholder-zinc-600 outline-none tracking-widest disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                      className="absolute right-3 p-1 text-zinc-500 hover:text-white transition-colors focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-mono text-rose-300 animate-in fade-in duration-200">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                    <span>[ERR_AUTH]: {error}</span>
                  </div>
                )}

                {/* Botón de Ingreso con Animación de Decodificación Matrix al autenticarse */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative mt-3 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 py-3.5 px-4 font-mono font-bold text-xs uppercase tracking-widest text-white shadow-[0_0_20px_rgba(239,51,41,0.4)] hover:shadow-[0_0_35px_rgba(239,51,41,0.65)] hover:brightness-110 active:scale-[0.99] disabled:opacity-80 disabled:cursor-wait transition-all cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center gap-2.5 text-center">
                      <Cpu size={16} className="animate-spin text-white" />
                      <span className="tracking-wider text-[11px] animate-pulse">{decryptText}</span>
                    </div>
                  ) : (
                    <>
                      <span>INICIAR SESIÓN // LOGIN</span>
                      <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
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
                className="absolute top-6 left-6 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Volver"
              >
                <ArrowLeft size={16} />
              </button>

              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-500/40 bg-purple-950/30 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.25)]">
                <KeyRound className="h-7 w-7 text-purple-400" />
              </div>

              <div className="text-center mb-6 font-mono">
                <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-white">
                  VERIFICACIÓN <span className="text-purple-400">2FA</span>
                </h1>
                <p className="mt-1 text-xs text-zinc-400 tracking-wide">
                  {recoveryMode
                    ? '[EMERGENCIA] INGRESÁ TU CÓDIGO DE RECUPERACIÓN'
                    : '[TOTP] CÓDIGO DE 6 DÍGITOS DE TU AUTENTICADOR'}
                </p>
              </div>

              <form onSubmit={handle2FASubmit} className="space-y-4">
                <div>
                  <div className="group relative flex items-center rounded-xl border border-purple-500/40 bg-black/60 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-500/40 transition-all shadow-inner">
                    <input
                      type="text"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\s/g, ''))}
                      placeholder={recoveryMode ? "EMERGENCY_KEY" : "000000"}
                      autoComplete="one-time-code"
                      maxLength={recoveryMode ? 64 : 6}
                      required
                      autoFocus
                      disabled={loading}
                      className="w-full bg-transparent py-3 text-center text-xl font-mono font-black tracking-[0.4em] text-white placeholder-zinc-700 outline-none disabled:opacity-50"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-mono text-rose-300 animate-in fade-in duration-200">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                    <span>[ERR_2FA]: {error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative mt-3 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 py-3.5 px-4 font-mono font-bold text-xs uppercase tracking-widest text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_35px_rgba(168,85,247,0.65)] hover:brightness-110 active:scale-[0.99] disabled:opacity-80 disabled:cursor-wait transition-all cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center gap-2 text-center font-mono">
                      <Cpu size={16} className="animate-spin text-white" />
                      <span className="tracking-wider text-[11px] animate-pulse">VALIDANDO TOKEN CRIPTOGRÁFICO...</span>
                    </div>
                  ) : (
                    <>
                      <span>VALIDAR CÓDIGO // AUTH</span>
                      <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
                    </>
                  )}
                </button>

                <div className="pt-2 text-center font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryMode(!recoveryMode);
                      setTwoFactorCode('');
                      setError('');
                    }}
                    className="text-[11px] text-zinc-400 hover:text-white transition-colors underline underline-offset-4 cursor-pointer"
                  >
                    {recoveryMode
                      ? '&gt; VOLVER A CÓDIGO TOTP ESTÁNDAR'
                      : '&gt; ¿SIN ACCESO AL DISPOSITIVO? USAR CÓDIGO DE RECUPERACIÓN'}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Pie informativo tech */}
          <div className="mt-7 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
            <span>NODE // AS-CENTRAL-01</span>
            <span className="text-zinc-400">ENCRYPTION: 256-BIT</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes matrixScan {
          0% { top: 0%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Login;
