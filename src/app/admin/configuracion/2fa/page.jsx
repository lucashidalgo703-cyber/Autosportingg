"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
    ShieldCheck, ShieldAlert, Key, Copy, CheckCircle2, 
    Fingerprint, Plus, Trash2, Clock, Laptop, Smartphone, 
    AlertTriangle, RefreshCw 
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import SettingsTabs from '../../../../components/crm/settings/SettingsTabs';
import toast from 'react-hot-toast';
import Image from 'next/image';
import InputModal from '../../../../components/crm/ui/InputModal';
import { ConfigSkeleton } from '../../../../components/crm/layout/ConfigLoaders';
import { 
    registerNewPasskey, 
    fetchUserPasskeys, 
    revokeUserPasskey, 
    isWebAuthnSupported 
} from '../../../../services/passkeyClientService';

export default function TwoFactorConfigPage() {
    const { token, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState(null); // 'checking', 'active', 'inactive'
    
    // Setup state
    const [setupData, setSetupData] = useState(null);
    const [verifyCode, setVerifyCode] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState(null);
    const [copied, setCopied] = useState(false);
    const [disableModal, setDisableModal] = useState(false);

    // Passkeys state
    const [passkeys, setPasskeys] = useState([]);
    const [loadingPasskeys, setLoadingPasskeys] = useState(false);
    const [registerPasskeyModal, setRegisterPasskeyModal] = useState(false);
    const [revokeModalPasskeyId, setRevokeModalPasskeyId] = useState(null);

    // Cargar estado de 2FA
    useEffect(() => {
        if (!token) return;

        fetch('/api/admin/2fa/status', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => setStatus(data.active ? 'active' : 'inactive'))
            .catch(() => setStatus('inactive'))
            .finally(() => setLoading(false));
    }, [token]);

    // Cargar passkeys registradas
    const loadPasskeys = useCallback(async () => {
        if (!token) return;
        setLoadingPasskeys(true);
        try {
            const list = await fetchUserPasskeys({ token });
            setPasskeys(list);
        } catch (err) {
            console.error('Error al cargar passkeys:', err);
        } finally {
            setLoadingPasskeys(false);
        }
    }, [token]);

    useEffect(() => {
        loadPasskeys();
    }, [loadPasskeys]);

    const handleBeginSetup = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/2fa/generate', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al generar secreto');
            const data = await res.json();
            setSetupData(data);
            setStatus('setup');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/admin/2fa/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ token: verifyCode, secret: setupData.secret })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Código inválido');
            
            setRecoveryCodes(data.recoveryCodes);
            setStatus('success');
            toast.success('2FA activado con éxito');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDisable = () => {
        setDisableModal(true);
    };

    const confirmDisable = async (code) => {
        if (!code) return;
        
        setLoading(true);
        try {
            const res = await fetch('/api/admin/2fa/disable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ token: code })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Error al desactivar');
            }
            toast.success('2FA desactivado');
            setStatus('inactive');
            setSetupData(null);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const copyCodes = () => {
        if (!recoveryCodes) return;
        navigator.clipboard.writeText(recoveryCodes.join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Códigos copiados al portapapeles');
    };

    // Registrar nueva Passkey
    const handleRegisterPasskey = async (name) => {
        if (!name || !name.trim()) {
            toast.error('Ingresá un nombre identificador para la passkey');
            return;
        }

        const toastId = toast.loading('Iniciando ceremonia WebAuthn en tu dispositivo...');
        try {
            await registerNewPasskey({ name: name.trim(), token });
            toast.success(`Passkey "${name}" registrada con éxito`, { id: toastId });
            setRegisterPasskeyModal(false);
            loadPasskeys();
        } catch (err) {
            toast.error(err.message || 'Error al registrar la passkey', { id: toastId });
        }
    };

    // Revocar Passkey
    const handleRevokePasskey = async (reason) => {
        if (!revokeModalPasskeyId) return;

        const toastId = toast.loading('Revocando passkey...');
        try {
            await revokeUserPasskey({
                credentialId: revokeModalPasskeyId,
                reason: reason || 'Revocada desde el panel del propietario',
                token
            });
            toast.success('Passkey revocada correctamente', { id: toastId });
            setRevokeModalPasskeyId(null);
            loadPasskeys();
        } catch (err) {
            toast.error(err.message || 'Error al revocar la passkey', { id: toastId });
        }
    };

    return (
        <div className="mx-auto w-full max-w-7xl p-4 md:p-6 pb-20 text-white">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-white">Configuración</h1>
                <p className="text-crm-fg-muted mt-1 text-sm">Roster del CRM, roles y 2FA</p>
            </div>

            <SettingsTabs />

            {loading && !setupData && status !== 'success' ? (
                <div className="mt-6"><ConfigSkeleton /></div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                    {/* COLUMNA 1: GOOGLE AUTHENTICATOR (TOTP) */}
                    <div className="lg:col-span-6 bg-crm-surface border border-crm-border rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6 border-b border-crm-border pb-4">
                            <ShieldCheck className={status === 'active' || status === 'success' ? 'text-green-500' : 'text-crm-fg-muted'} size={24} />
                            <div>
                                <h2 className="text-lg font-bold">Google Authenticator (TOTP)</h2>
                                <p className="text-sm text-crm-fg-muted">Códigos temporales de 6 dígitos mediante app de autenticación.</p>
                            </div>
                        </div>

                        {status === 'inactive' && (
                            <div className="space-y-6">
                                <div className="bg-crm-bg border border-crm-border rounded-xl p-6 text-center">
                                    <ShieldAlert size={48} className="mx-auto text-crm-fg-muted mb-4" />
                                    <h3 className="text-lg font-bold mb-2">2FA No Configurado</h3>
                                    <p className="text-sm text-crm-fg-muted mb-6">Tu cuenta requiere un segundo factor de autenticación para proteger las finanzas y auditoría.</p>
                                    <button 
                                        onClick={handleBeginSetup}
                                        className="bg-crm-red-gradient text-white px-6 py-3 rounded-xl font-black shadow-crm-shadow-red hover:opacity-90 transition-opacity cursor-pointer"
                                    >
                                        Comenzar Configuración
                                    </button>
                                </div>
                            </div>
                        )}

                        {status === 'setup' && setupData && (
                            <div className="space-y-6">
                                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-xl text-sm mb-6">
                                    <strong>Paso 1:</strong> Escanea este código QR con tu aplicación de autenticación (Google Authenticator, Authy, etc).
                                </div>
                                
                                <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl mx-auto w-max mb-6">
                                    <Image src={setupData.qrCode} alt="QR Code" width={200} height={200} />
                                </div>
                                
                                <div className="text-center mb-6">
                                    <p className="text-xs text-crm-fg-muted mb-1">¿No puedes escanearlo? Usa este código manual:</p>
                                    <code className="bg-crm-bg px-3 py-1.5 rounded-lg text-crm-red font-bold text-sm tracking-widest">{setupData.secret}</code>
                                </div>

                                <form onSubmit={handleVerify} className="pt-6 border-t border-crm-border max-w-sm mx-auto">
                                    <label className="block text-sm font-bold text-crm-fg-muted mb-2 text-center">
                                        Paso 2: Ingresa el código de 6 dígitos
                                    </label>
                                    <div className="flex gap-3">
                                        <input 
                                            type="text" 
                                            maxLength={6}
                                            placeholder="000000"
                                            className="flex-1 bg-crm-bg border border-crm-border rounded-xl px-4 py-3 text-center text-white text-xl tracking-[0.5em] font-mono outline-none focus:border-crm-red"
                                            value={verifyCode}
                                            onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                                            required
                                        />
                                    </div>
                                    <button 
                                        type="submit"
                                        disabled={verifyCode.length !== 6 || loading}
                                        className="w-full mt-4 bg-crm-red-gradient text-white px-6 py-3 rounded-xl font-black hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                                    >
                                        {loading ? 'Verificando...' : 'Verificar y Activar'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {status === 'success' && recoveryCodes && (
                            <div className="space-y-6 text-center">
                                <CheckCircle2 size={64} className="mx-auto text-green-500 mb-4" />
                                <h3 className="text-2xl font-black text-white">¡2FA Activado!</h3>
                                
                                <div className="bg-red-500/10 border border-crm-red/20 rounded-xl p-6 text-left mt-6">
                                    <h4 className="font-bold text-red-500 flex items-center gap-2 mb-2">
                                        <Key size={18} /> Códigos de Recuperación
                                    </h4>
                                    <p className="text-sm text-red-400 mb-4">
                                        Guarda estos códigos en un lugar muy seguro. Son la <strong>ÚNICA</strong> forma de acceder a tu cuenta si pierdes tu dispositivo móvil. Solo se mostrarán esta vez.
                                    </p>
                                    
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        {recoveryCodes.map((code, idx) => (
                                            <div key={idx} className="bg-crm-bg border border-crm-red/20 px-3 py-2 rounded-lg font-mono text-sm text-crm-fg text-center">
                                                {code.substring(0, 10)}...
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <button 
                                        onClick={copyCodes}
                                        className="flex items-center justify-center gap-2 w-full bg-red-500 text-white font-bold py-2.5 rounded-xl hover:bg-red-600 transition-colors cursor-pointer"
                                    >
                                        {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                                        {copied ? 'Copiados' : 'Copiar Códigos'}
                                    </button>
                                </div>
                                
                                <button 
                                    onClick={() => { setStatus('active'); setRecoveryCodes(null); }}
                                    className="text-crm-fg-muted font-bold hover:text-white text-sm cursor-pointer"
                                >
                                    He guardado los códigos, continuar
                                </button>
                            </div>
                        )}

                        {status === 'active' && (
                            <div className="space-y-6">
                                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center">
                                    <ShieldCheck size={48} className="mx-auto text-green-500 mb-4" />
                                    <h3 className="text-lg font-bold text-green-500 mb-2">Segundo Factor Activo</h3>
                                    <p className="text-sm text-green-400/80 mb-6">Tu cuenta requiere un código de 6 dígitos para iniciar sesión.</p>
                                    <button 
                                        onClick={handleDisable}
                                        className="bg-crm-surface border border-crm-border text-crm-fg px-6 py-3 rounded-xl font-bold hover:bg-crm-bg hover:text-crm-red transition-colors cursor-pointer"
                                    >
                                        Desactivar 2FA
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* COLUMNA 2: PASSKEYS / WEBAUTHN */}
                    <div className="lg:col-span-6 bg-crm-surface border border-crm-border rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6 border-b border-crm-border pb-4">
                            <div className="flex items-center gap-3">
                                <Fingerprint className="text-emerald-400" size={24} />
                                <div>
                                    <h2 className="text-lg font-bold">Passkeys / WebAuthn</h2>
                                    <p className="text-sm text-crm-fg-muted">Windows Hello, Touch ID, Face ID o PIN.</p>
                                </div>
                            </div>
                            <button
                                onClick={loadPasskeys}
                                disabled={loadingPasskeys}
                                className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                title="Recargar lista"
                            >
                                <RefreshCw size={16} className={loadingPasskeys ? "animate-spin" : ""} />
                            </button>
                        </div>

                        {/* Botón registrar */}
                        <div className="mb-6">
                            <button
                                onClick={() => setRegisterPasskeyModal(true)}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                            >
                                <Plus size={16} />
                                <span>Registrar Nueva Passkey en este Dispositivo</span>
                            </button>
                        </div>

                        {/* Lista de Passkeys */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 uppercase tracking-wider px-1">
                                <span>Credenciales Registradas ({passkeys.length})</span>
                                <span>Estado</span>
                            </div>

                            {loadingPasskeys ? (
                                <div className="p-8 text-center text-zinc-500 font-mono text-xs">
                                    Cargando credenciales WebAuthn...
                                </div>
                            ) : passkeys.length === 0 ? (
                                <div className="border border-zinc-800 rounded-xl p-6 text-center bg-black/30">
                                    <Fingerprint size={36} className="mx-auto text-zinc-600 mb-2" />
                                    <p className="text-sm text-zinc-300 font-bold mb-1">No hay passkeys registradas</p>
                                    <p className="text-xs text-zinc-500">Registrá este dispositivo para ingresar con tu huella, rostro o PIN.</p>
                                </div>
                            ) : (
                                passkeys.map((pk) => {
                                    const isActive = pk.status === 'active';
                                    const regDate = pk.registeredAt ? new Date(pk.registeredAt).toLocaleDateString('es-AR') : '-';
                                    const lastUse = pk.lastUsedAt ? new Date(pk.lastUsedAt).toLocaleDateString('es-AR', { hour: '2-digit', minute: '2-digit' }) : 'Nunca';

                                    return (
                                        <div
                                            key={pk.credentialId}
                                            className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-800/80 bg-black/40 hover:border-zinc-700 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2.5 rounded-xl border ${
                                                    isActive 
                                                        ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400' 
                                                        : 'border-zinc-700 bg-zinc-900 text-zinc-500'
                                                }`}>
                                                    <Fingerprint size={18} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm text-zinc-100">{pk.name}</span>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-bold ${
                                                            isActive
                                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                                        }`}>
                                                            {isActive ? 'Activa' : 'Revocada'}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-zinc-400 font-mono mt-0.5 flex gap-3">
                                                        <span>Registrada: {regDate}</span>
                                                        <span>Último uso: {lastUse}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {isActive && (
                                                <button
                                                    onClick={() => setRevokeModalPasskeyId(pk.credentialId)}
                                                    className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                                    title="Revocar passkey"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para desactivar 2FA */}
            <InputModal
                isOpen={disableModal}
                onClose={() => setDisableModal(false)}
                onConfirm={confirmDisable}
                title="Desactivar 2FA"
                message="Ingresa un código de tu app de autenticación para desactivar 2FA:"
                label="Código 2FA"
                placeholder="000000"
                variant="danger"
                confirmText="Desactivar"
            />

            {/* Modal para registrar nueva passkey */}
            <InputModal
                isOpen={registerPasskeyModal}
                onClose={() => setRegisterPasskeyModal(false)}
                onConfirm={handleRegisterPasskey}
                title="Registrar Nueva Passkey"
                message="Asignale un nombre descriptivo a esta credencial (ej. AutoSporting — PRUEBA LOCAL):"
                label="Nombre del Dispositivo"
                placeholder="AutoSporting — PRUEBA LOCAL"
                variant="primary"
                confirmText="Comenzar Registro"
            />

            {/* Modal para revocar passkey */}
            <InputModal
                isOpen={Boolean(revokeModalPasskeyId)}
                onClose={() => setRevokeModalPasskeyId(null)}
                onConfirm={handleRevokePasskey}
                title="Revocar Passkey"
                message="¿Estás seguro de que deseas revocar esta credencial? Ya no podrás utilizarla para iniciar sesión. Ingresa el motivo:"
                label="Motivo de la revocación"
                placeholder="Dispositivo reemplazado o extraviado"
                variant="danger"
                confirmText="Revocar Credencial"
            />
        </div>
    );
}
