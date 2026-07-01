"use client";

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Key, Copy, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import SettingsTabs from '../../../../components/crm/settings/SettingsTabs';
import toast from 'react-hot-toast';
import Image from 'next/image';
import InputModal from '../../../../components/crm/ui/InputModal';

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
        navigator.clipboard.writeText(recoveryCodes.join('\\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Códigos copiados al portapapeles');
    };

    return (
        <div className="mx-auto w-full max-w-7xl p-4 md:p-6 pb-20 text-white">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-white">Configuración</h1>
                <p className="text-crm-fg-muted mt-1 text-sm">Roster del CRM, roles y 2FA</p>
            </div>

            <SettingsTabs />

            {loading && !setupData && status !== 'success' ? (
                <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div></div>
            ) : (
                <div className="bg-crm-surface border border-crm-border rounded-2xl p-6 max-w-2xl">
                    <div className="flex items-center gap-3 mb-6 border-b border-crm-border pb-4">
                        <ShieldCheck className={status === 'active' || status === 'success' ? 'text-green-500' : 'text-crm-fg-muted'} size={24} />
                        <div>
                            <h2 className="text-lg font-bold">Seguridad de la Cuenta</h2>
                            <p className="text-sm text-crm-fg-muted">Añade una capa extra de protección usando Google Authenticator o Authy.</p>
                        </div>
                    </div>

                    {status === 'inactive' && (
                        <div className="space-y-6">
                            <div className="bg-crm-bg border border-crm-border rounded-xl p-6 text-center">
                                <ShieldAlert size={48} className="mx-auto text-crm-fg-muted mb-4" />
                                <h3 className="text-lg font-bold mb-2">2FA No Configurado</h3>
                                <p className="text-sm text-crm-fg-muted mb-6">Tu cuenta es vulnerable. Te recomendamos encarecidamente activar la autenticación de dos factores.</p>
                                <button 
                                    onClick={handleBeginSetup}
                                    className="bg-crm-red-gradient text-white px-6 py-3 rounded-xl font-black shadow-crm-shadow-red hover:opacity-90 transition-opacity"
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
                                        onChange={e => setVerifyCode(e.target.value.replace(/\\D/g, ''))}
                                        required
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    disabled={verifyCode.length !== 6 || loading}
                                    className="w-full mt-4 bg-crm-red-gradient text-white px-6 py-3 rounded-xl font-black hover:opacity-90 transition-opacity disabled:opacity-50"
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
                                    className="flex items-center justify-center gap-2 w-full bg-red-500 text-white font-bold py-2.5 rounded-xl hover:bg-red-600 transition-colors"
                                >
                                    {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                                    {copied ? 'Copiados' : 'Copiar Códigos'}
                                </button>
                            </div>
                            
                            <button 
                                onClick={() => { setStatus('active'); setRecoveryCodes(null); }}
                                className="text-crm-fg-muted font-bold hover:text-white text-sm"
                            >
                                He guardado los códigos, continuar
                            </button>
                        </div>
                    )}

                    {status === 'active' && (
                        <div className="space-y-6">
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center">
                                <ShieldCheck size={48} className="mx-auto text-green-500 mb-4" />
                                <h3 className="text-lg font-bold text-green-500 mb-2">Cuenta Protegida</h3>
                                <p className="text-sm text-green-400/80 mb-6">Tu cuenta requiere un código temporal para iniciar sesión.</p>
                                <button 
                                    onClick={handleDisable}
                                    className="bg-crm-surface border border-crm-border text-crm-fg px-6 py-3 rounded-xl font-bold hover:bg-crm-bg hover:text-crm-red transition-colors"
                                >
                                    Desactivar 2FA
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

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
        </div>
    );
}
