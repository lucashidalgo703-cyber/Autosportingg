"use client";

import React, { useEffect, useState } from 'react';
import { Star, AlertTriangle, TrendingUp, Users, CheckCircle, MessageCircle, Copy, Link, Plus } from 'lucide-react';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS } from '../../../utils/adminPermissions';
import { parseResponseSafe } from '../../../utils/apiHelper';
import toast from 'react-hot-toast';

export default function NpsDashboardPage() {
    const [data, setData] = useState({ metrics: {}, recentResponses: [], actionRequired: [] });
    const [loading, setLoading] = useState(true);
    const [isGenerateModalOpen, setGenerateModalOpen] = useState(false);
    const [isCallModalOpen, setCallModalOpen] = useState(false);
    const [timeFilter, setTimeFilter] = useState('Este mes');

    const fetchDashboard = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/nps/dashboard', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const d = await parseResponseSafe(res);
            setData(d);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    const handleFollowUp = async (id, status) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/nps/follow-up/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status, notes: '' })
            });
            if (!res.ok) throw new Error('Error actualizando seguimiento');
            toast.success('Estado actualizado');
            fetchDashboard();
        } catch (error) {
            toast.error(error.message);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-crm-bg">
                <div className="w-8 h-8 border-4 border-crm-red border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const { metrics, recentResponses, actionRequired } = data;
    const npsColor = metrics.npsScore > 50 ? 'text-green-500' : metrics.npsScore > 0 ? 'text-yellow-500' : 'text-crm-warning';

    return (
        <PermissionGuard permission={PERMISSIONS.NPS_READ}>
            <div className="flex h-[calc(100vh-64px)] w-full flex-col bg-crm-bg p-4 md:p-6 overflow-y-auto">
                <div className="max-w-7xl mx-auto w-full space-y-6">
                    
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-black text-crm-fg">NPS — Satisfacción de clientes</h1>
                            <p className="text-sm text-crm-fg-muted mt-1">Encuestas de satisfacción agregadas por periodo y vendedor.</p>
                        </div>
                        <PermissionGuard permission={PERMISSIONS.NPS_WRITE}>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setCallModalOpen(true)}
                                    className="flex items-center gap-2 bg-crm-surface text-crm-fg border border-crm-border px-4 py-2 rounded-xl text-sm font-bold transition-all hover:bg-crm-bg"
                                >
                                    Cargar llamada
                                </button>
                                <button 
                                    onClick={() => setGenerateModalOpen(true)}
                                    className="flex items-center gap-2 bg-crm-red-gradient text-white px-4 py-2 rounded-xl text-sm font-black shadow-crm-shadow-red transition-opacity hover:opacity-90"
                                >
                                    Enviar
                                </button>
                            </div>
                        </PermissionGuard>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                        {['Hoy', 'Esta semana', 'Este mes', 'Este año', 'Histórico'].map(f => (
                            <button
                                key={f}
                                onClick={() => setTimeFilter(f)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                                    timeFilter === f 
                                    ? 'bg-crm-red-gradient text-white shadow-crm-shadow-red' 
                                    : 'bg-crm-surface text-crm-fg-muted border border-crm-border hover:text-crm-fg'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="bg-crm-surface border border-crm-border p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Promedio /10</span>
                                <Star size={18} className="text-yellow-500" />
                            </div>
                            <div>
                                <span className="text-4xl font-black text-crm-fg">{metrics.averageScore || '0.0'}</span>
                                <p className="text-[10px] text-crm-fg-subtle mt-1">Calificación media</p>
                            </div>
                        </div>

                        <div className="bg-crm-surface border border-crm-border p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-bold text-crm-fg-muted uppercase tracking-wider">NPS Score</span>
                                <TrendingUp size={18} className={npsColor} />
                            </div>
                            <div>
                                <span className={`text-4xl font-black ${npsColor}`}>{metrics.npsScore || 0}</span>
                                <p className="text-[10px] text-crm-fg-subtle mt-1">% Promotores - % Detractores</p>
                            </div>
                        </div>

                        <div className="bg-crm-surface border border-crm-border p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Promotores</span>
                                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-black">9-10</div>
                            </div>
                            <div>
                                <span className="text-3xl font-black text-crm-fg">{metrics.promoters || 0}</span>
                            </div>
                        </div>

                        <div className="bg-crm-surface border border-crm-border p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Pasivos</span>
                                <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 font-black">7-8</div>
                            </div>
                            <div>
                                <span className="text-3xl font-black text-crm-fg">{metrics.passives || 0}</span>
                            </div>
                        </div>

                        <div className="bg-crm-surface border border-crm-border p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Detractores</span>
                                <div className="w-8 h-8 rounded-full bg-crm-warning/10 flex items-center justify-center text-crm-warning font-black">0-6</div>
                            </div>
                            <div>
                                <span className="text-3xl font-black text-crm-fg">{metrics.detractors || 0}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Requieren Seguimiento */}
                        <div className="bg-crm-surface border border-crm-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-crm-border bg-crm-bg/50 flex items-center gap-2">
                                <AlertTriangle size={18} className="text-crm-warning" />
                                <h2 className="text-sm font-black text-crm-fg">Detractores sin Seguimiento</h2>
                                <span className="ml-auto bg-crm-warning text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                    {actionRequired.length}
                                </span>
                            </div>
                            <div className="p-4 flex-1 overflow-y-auto max-h-[400px]">
                                {actionRequired.length === 0 ? (
                                    <div className="text-center p-8 text-crm-fg-muted text-sm font-medium">No hay detractores pendientes de seguimiento.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {actionRequired.map(r => (
                                            <div key={r._id} className="border border-crm-warning/30 bg-crm-warning/5 p-3 rounded-xl">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <span className="text-sm font-bold text-crm-fg">
                                                            {r.survey?.client?.firstName} {r.survey?.client?.lastName}
                                                        </span>
                                                        <p className="text-xs text-crm-fg-subtle">Puntuación: <strong className="text-crm-warning">{r.score}/10</strong></p>
                                                    </div>
                                                    <PermissionGuard permission={PERMISSIONS.NPS_WRITE}>
                                                        <button 
                                                            onClick={() => handleFollowUp(r._id, 'resolved')}
                                                            className="text-xs font-bold bg-white text-crm-fg border border-crm-border px-2 py-1 rounded-lg hover:bg-crm-bg transition-colors"
                                                        >
                                                            Marcar Resuelto
                                                        </button>
                                                    </PermissionGuard>
                                                </div>
                                                {r.comment && (
                                                    <p className="text-sm text-crm-fg italic bg-white p-2 rounded-lg border border-crm-border">"{r.comment}"</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Respuestas Recientes */}
                        <div className="bg-crm-surface border border-crm-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-crm-border bg-crm-bg/50 flex items-center gap-2">
                                <MessageCircle size={18} className="text-crm-fg-muted" />
                                <h2 className="text-sm font-black text-crm-fg">Respuestas — últimos 30 días</h2>
                            </div>
                            <div className="p-0 flex-1 overflow-y-auto max-h-[400px]">
                                {recentResponses.length === 0 ? (
                                    <div className="text-center p-8 text-crm-fg-muted text-sm font-medium">Sin respuestas en este periodo.</div>
                                ) : (
                                    <table className="w-full text-left text-sm text-crm-fg whitespace-nowrap">
                                        <thead className="bg-crm-bg text-xs font-bold uppercase text-crm-fg-muted sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3">Cliente</th>
                                                <th className="px-4 py-3 text-center">Score</th>
                                                <th className="px-4 py-3">Comentario</th>
                                                <th className="px-4 py-3 text-right">Fecha</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-crm-border">
                                            {recentResponses.map(r => (
                                                <tr key={r._id} className="hover:bg-crm-bg/50 transition-colors">
                                                    <td className="px-4 py-3 font-medium">
                                                        {r.survey?.client?.firstName} {r.survey?.client?.lastName}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-bold text-xs ${
                                                            r.classification === 'promoter' ? 'bg-green-500 text-white' :
                                                            r.classification === 'passive' ? 'bg-yellow-500 text-white' : 'bg-crm-warning text-white'
                                                        }`}>
                                                            {r.score}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-crm-fg-subtle truncate max-w-[150px]" title={r.comment}>
                                                        {r.comment || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-xs text-crm-fg-subtle">
                                                        {new Date(r.createdAt).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <GenerateSurveyModal 
                isOpen={isGenerateModalOpen} 
                onClose={() => setGenerateModalOpen(false)} 
                onSuccess={() => fetchDashboard()}
            />


            <ManualCallModal
                isOpen={isCallModalOpen}
                onClose={() => setCallModalOpen(false)}
                onSuccess={() => fetchDashboard()}
            />

        </PermissionGuard>
    );
}

function GenerateSurveyModal({ isOpen, onClose, onSuccess }) {
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState('');

    useEffect(() => {
        if (isOpen && clients.length === 0) {
            const token = localStorage.getItem('token');
            fetch('/api/admin/clients?limit=1000', { headers: { 'Authorization': `Bearer ${token}` }})
                .then(parseResponseSafe)
                .then(data => {
                    const clientsList = data.clients || data || [];
                    if (Array.isArray(clientsList)) {
                        setClients(clientsList);
                    }
                })
                .catch(err => {
                    toast.error(err.message || 'Error al cargar clientes');
                    console.error(err);
                });
        }
    }, [isOpen]);

    const handleGenerate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/nps/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ clientId: selectedClient })
            });
            const data = await parseResponseSafe(res);
            setGeneratedUrl(data.url);
            toast.success('Enlace generado con éxito');
            onSuccess();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedUrl);
        toast.success('Copiado al portapapeles');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-crm-surface shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between border-b border-crm-border px-6 py-4 bg-crm-bg/50">
                    <h3 className="text-lg font-black text-crm-fg flex items-center gap-2"><Star size={18} className="text-yellow-500"/> Nueva Encuesta NPS</h3>
                    <button onClick={() => { onClose(); setGeneratedUrl(''); }} className="text-crm-fg-muted hover:text-crm-fg transition-colors">✕</button>
                </div>
                
                <div className="p-6">
                    {!generatedUrl ? (
                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">Cliente Destinatario</label>
                                <select
                                    required
                                    className="w-full h-11 rounded-xl border border-crm-border bg-crm-bg px-4 text-sm text-crm-fg outline-none focus:border-crm-red transition-colors"
                                    value={selectedClient}
                                    onChange={e => setSelectedClient(e.target.value)}
                                >
                                    <option value="">Seleccionar cliente...</option>
                                    {clients.map(c => <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>)}
                                </select>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-crm-fg-muted hover:text-crm-fg">Cancelar</button>
                                <button disabled={loading || !selectedClient} type="submit" className="rounded-xl bg-crm-red-gradient px-6 py-2 text-sm font-black text-white shadow-crm-shadow-red disabled:opacity-50">
                                    Generar Link
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4 text-center">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                                <CheckCircle size={32} className="text-green-500" />
                            </div>
                            <h4 className="text-base font-bold text-crm-fg">¡Enlace Listo!</h4>
                            <p className="text-sm text-crm-fg-muted">Envía este enlace al cliente para que complete la encuesta. El enlace expirará en 7 días.</p>
                            
                            <div className="flex items-center gap-2 mt-4 bg-crm-bg border border-crm-border rounded-xl p-2">
                                <input readOnly value={generatedUrl} className="flex-1 bg-transparent text-xs text-crm-fg-muted outline-none px-2" />
                                <button onClick={copyToClipboard} className="p-2 bg-crm-surface border border-crm-border rounded-lg text-crm-fg hover:bg-crm-bg transition-colors" title="Copiar">
                                    <Copy size={14} />
                                </button>
                            </div>
                            <div className="pt-4">
                                <button onClick={() => { onClose(); setGeneratedUrl(''); }} className="text-sm font-bold text-blue-500 hover:text-blue-600 transition-colors">
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


function ManualCallModal({ isOpen, onClose, onSuccess }) {
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState('');
    const [score, setScore] = useState('10');
    const [comment, setComment] = useState('');
    const [callDate, setCallDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || clients.length > 0) return;

        const token = localStorage.getItem('token');
        fetch('/api/admin/clients?limit=1000', { headers: { 'Authorization': 'Bearer ' + token } })
            .then(parseResponseSafe)
            .then(data => {
                const clientsList = Array.isArray(data) ? data : (data.clients || []);
                setClients(Array.isArray(clientsList) ? clientsList : []);
            })
            .catch(err => toast.error(err.message || 'Error al cargar clientes'));
    }, [isOpen, clients.length]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/nps/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({
                    clientId: selectedClient,
                    score: Number(score),
                    comment,
                    callDate
                })
            });
            await parseResponseSafe(res);
            toast.success('Llamada NPS registrada');
            onSuccess();
            onClose();
            setSelectedClient('');
            setScore('10');
            setComment('');
        } catch (error) {
            toast.error(error.message || 'Error al registrar llamada');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl bg-crm-surface shadow-2xl overflow-hidden">
                <div className="border-b border-crm-border bg-crm-bg/50 px-6 py-4">
                    <h3 className="text-lg font-black text-crm-fg">Cargar llamada NPS</h3>
                    <p className="mt-1 text-xs text-crm-fg-muted">Registro interno. No envia emails ni mensajes al cliente.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 p-6">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">Cliente</label>
                        <select required value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="w-full h-11 rounded-xl border border-crm-border bg-crm-bg px-4 text-sm text-crm-fg outline-none focus:border-crm-red">
                            <option value="">Seleccionar cliente...</option>
                            {clients.map(c => {
                                const label = c.fullName || [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || c.phone || c._id;
                                return <option key={c._id} value={c._id}>{label}</option>;
                            })}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">Puntaje</label>
                            <input required min="0" max="10" type="number" value={score} onChange={(e) => setScore(e.target.value)} className="w-full h-11 rounded-xl border border-crm-border bg-crm-bg px-4 text-sm text-crm-fg outline-none focus:border-crm-red" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">Fecha llamada</label>
                            <input required type="date" value={callDate} onChange={(e) => setCallDate(e.target.value)} className="w-full h-11 rounded-xl border border-crm-border bg-crm-bg px-4 text-sm text-crm-fg outline-none focus:border-crm-red" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">Comentario</label>
                        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-3 text-sm text-crm-fg outline-none focus:border-crm-red" placeholder="Detalle de la llamada..." />
                    </div>
                    <div className="flex justify-end gap-3 border-t border-crm-border pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-crm-fg-muted hover:text-crm-fg">Cancelar</button>
                        <button disabled={loading || !selectedClient} type="submit" className="rounded-xl bg-crm-red-gradient px-6 py-2 text-sm font-black text-white shadow-crm-shadow-red disabled:opacity-50">
                            {loading ? 'Guardando...' : 'Guardar llamada'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
