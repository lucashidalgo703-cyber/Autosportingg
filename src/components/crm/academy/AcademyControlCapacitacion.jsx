'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';

const CATEGORY_NAMES = {
    precio: 'Precios',
    kilometraje: 'Kilometraje',
    version_equipamiento: 'Versión y Equipamiento',
    reconocimiento: 'Reconocimiento',
    procedimiento: 'Procedimientos',
    negociacion: 'Negociación'
};

export default function AcademyControlCapacitacion() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [overviewData, setOverviewData] = useState(null);
    const [notificationsData, setNotificationsData] = useState({ notifications: [], unreadCount: 0 });
    const [selectedSellerCard, setSelectedSellerCard] = useState(null);
    const [loadingSellerCard, setLoadingSellerCard] = useState(false);
    const [selectedAttemptDetail, setSelectedAttemptDetail] = useState(null);
    const [loadingAttempt, setLoadingAttempt] = useState(false);
    const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);
    const [showIntakeModal, setShowIntakeModal] = useState(false);
    const [intakeCarId, setIntakeCarId] = useState('');
    const [intakeValidation, setIntakeValidation] = useState(null);
    const [intakeGenerating, setIntakeGenerating] = useState(false);
    const [invalidateReason, setInvalidateReason] = useState('');
    const [invalidatingQId, setInvalidatingQId] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            const token = localStorage.getItem('token');
            const [overviewRes, notifRes] = await Promise.all([
                fetch('/api/admin/academy/control/overview', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/admin/academy/notifications', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (!overviewRes.ok) throw new Error('Error al consultar métricas de control.');
            const oData = await overviewRes.json();
            setOverviewData(oData);

            if (notifRes.ok) {
                const nData = await notifRes.json();
                setNotificationsData(nData);
            }
        } catch (err) {
            setErrorMsg(err.message || 'Error de conexión.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenSellerCard = async (sellerId) => {
        setLoadingSellerCard(true);
        setErrorMsg('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/academy/control/seller/${sellerId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al cargar la ficha del vendedor.');
            const data = await res.json();
            setSelectedSellerCard(data);
        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setLoadingSellerCard(false);
        }
    };

    const handleOpenAttemptDetail = async (attemptId) => {
        setLoadingAttempt(true);
        setErrorMsg('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/academy/control/attempt/${attemptId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al abrir el examen detallado.');
            const data = await res.json();
            setSelectedAttemptDetail(data);
        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setLoadingAttempt(false);
        }
    };

    const handleInvalidateQuestion = async (attemptId, questionId) => {
        if (!invalidateReason.trim()) {
            alert('Debe indicar un motivo de invalidación auditado.');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/academy/control/attempt/${attemptId}/invalidate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ questionId, reason: invalidateReason })
            });

            if (!res.ok) throw new Error('Error al invalidar la pregunta.');
            setSuccessMsg('Pregunta invalidada con éxito y puntaje actualizado.');
            setInvalidatingQId(null);
            setInvalidateReason('');
            // Recargar el examen
            await handleOpenAttemptDetail(attemptId);
            await loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleMarkNotificationRead = async (notifId) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/admin/academy/notifications/${notifId}/read`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotificationsData(prev => ({
                ...prev,
                unreadCount: Math.max(0, prev.unreadCount - 1),
                notifications: prev.notifications.map(n => String(n._id) === String(notifId) ? { ...n, read: true } : n)
            }));
        } catch {}
    };

    const handleMarkAllNotificationsRead = async () => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/admin/academy/notifications/read-all`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotificationsData(prev => ({
                ...prev,
                unreadCount: 0,
                notifications: prev.notifications.map(n => ({ ...n, read: true }))
            }));
        } catch {}
    };

    const handleValidateIntakeCar = async () => {
        if (!intakeCarId.trim()) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/academy/intake/validate/${intakeCarId.trim()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setIntakeValidation(data);
        } catch (err) {
            alert('Error al validar la unidad: ' + err.message);
        }
    };

    const handleGenerateIntakeChallenge = async () => {
        if (!intakeCarId.trim()) return;
        setIntakeGenerating(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/academy/intake/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ carId: intakeCarId.trim() })
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Error al generar examen de nuevo ingreso.');
            }
            setSuccessMsg('Mini-examen de nuevo ingreso generado y asignado al equipo.');
            setShowIntakeModal(false);
            setIntakeCarId('');
            setIntakeValidation(null);
            await loadData();
        } catch (err) {
            alert(err.message);
        } finally {
            setIntakeGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[300px] items-center justify-center p-8 text-zinc-400">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                    <span className="text-sm font-medium">Cargando métricas de supervisión...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header del tablero de control */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600/10 border border-red-600/30 text-sm">
                            📊
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-crm-red">
                            Supervisión Inteligente de Dirección
                        </span>
                        <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 text-[11px] text-zinc-400 font-mono">
                            {overviewData?.targetDate}
                        </span>
                    </div>
                    <h2 className="mt-1 text-xl sm:text-2xl font-bold text-white tracking-tight">
                        Control de Capacitación y Seguimiento de Vendedores
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                        Comprobación diaria de exámenes completados, resultados individuales, temas con error y alertas en tiempo real.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    {/* Botón de Notificaciones con badge */}
                    <button
                        onClick={() => setShowNotificationsDrawer(true)}
                        className="relative inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 text-xs font-bold text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 transition-all cursor-pointer"
                    >
                        <span>🔔 Notificaciones</span>
                        {notificationsData.unreadCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-black text-white">
                                {notificationsData.unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Botón Evaluar Nuevo Ingreso */}
                    <button
                        onClick={() => setShowIntakeModal(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all cursor-pointer"
                    >
                        🚗 + Evaluar Nuevo Ingreso
                    </button>
                </div>
            </div>

            {successMsg && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 text-xs font-semibold text-emerald-300 flex items-center justify-between">
                    <span>✓ {successMsg}</span>
                    <button onClick={() => setSuccessMsg('')} className="text-zinc-400 hover:text-white">✕</button>
                </div>
            )}

            {/* KPI Cards principales */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Vendedores asignados</span>
                    <p className="text-2xl font-black text-white mt-1">{overviewData?.totalSellers || 0}</p>
                    <span className="text-[11px] text-zinc-400">Plantel activo</span>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Completaron hoy</span>
                    <p className="text-2xl font-black text-emerald-400 mt-1">{overviewData?.completedSellersCount || 0}</p>
                    <span className="text-[11px] text-zinc-400">{overviewData?.participationPercentage || 0}% de participación</span>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Pendientes</span>
                    <p className={`text-2xl font-black mt-1 ${overviewData?.pendingSellersCount > 0 ? 'text-amber-400' : 'text-zinc-400'}`}>
                        {overviewData?.pendingSellersCount || 0}
                    </p>
                    <span className="text-[11px] text-zinc-400">Aún no realizaron el desafío</span>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Promedio general</span>
                    <p className="text-2xl font-black text-white mt-1">
                        {overviewData?.averageScore !== null ? `${overviewData.averageScore} / 100` : '—'}
                    </p>
                    <span className="text-[11px] text-zinc-400">Exámenes del día</span>
                </div>
            </div>

            {/* Temas con mayor cantidad de errores */}
            {overviewData?.mostFailedCategories && overviewData.mostFailedCategories.length > 0 && (
                <div className="rounded-xl border border-zinc-800 bg-[#0e0e12] p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
                        Temas con mayor cantidad de errores (Jornada):
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                        {overviewData.mostFailedCategories.map(cat => (
                            <div
                                key={cat.category}
                                className={`rounded-lg border p-2.5 text-center ${
                                    cat.errorCount > 0
                                        ? 'border-red-500/30 bg-red-950/10 text-red-300'
                                        : 'border-zinc-800 bg-zinc-900/40 text-zinc-400'
                                }`}
                            >
                                <span className="block text-[11px] font-bold truncate">{CATEGORY_NAMES[cat.category] || cat.category}</span>
                                <span className="block text-lg font-black mt-0.5">{cat.errorCount} errores</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Listado diario de colaboradores */}
            <div className="rounded-xl border border-zinc-800 bg-[#0e0e12] overflow-hidden">
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        Seguimiento Diario por Vendedor
                    </h3>
                    <span className="text-xs text-zinc-500">Haz clic en un colaborador para ver su ficha individual</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-zinc-300">
                        <thead className="bg-zinc-900/60 text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                            <tr>
                                <th className="p-3">Vendedor</th>
                                <th className="p-3">Estado</th>
                                <th className="p-3">Calificación</th>
                                <th className="p-3">Duración</th>
                                <th className="p-3">Temas con error</th>
                                <th className="p-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {overviewData?.teamDailyStatus?.map(seller => (
                                <tr key={seller.sellerId} className="hover:bg-zinc-900/40 transition-colors">
                                    <td className="p-3 font-semibold text-white">
                                        {seller.name}
                                        <span className="block text-[11px] text-zinc-500">{seller.email}</span>
                                    </td>
                                    <td className="p-3">
                                        {seller.status === 'completado' ? (
                                            <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                                                ✓ Completado
                                            </span>
                                        ) : (
                                            <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
                                                ⏳ Pendiente
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {seller.score !== null ? (
                                            <span className={`font-mono font-bold text-sm ${seller.score >= 80 ? 'text-emerald-400' : (seller.score >= 60 ? 'text-amber-400' : 'text-red-400')}`}>
                                                {seller.score} / 100
                                            </span>
                                        ) : (
                                            <span className="text-zinc-600">—</span>
                                        )}
                                    </td>
                                    <td className="p-3 font-mono text-zinc-400">
                                        {seller.durationSeconds ? `${seller.durationSeconds}s` : '—'}
                                    </td>
                                    <td className="p-3 text-zinc-400">
                                        {seller.weakCategories && seller.weakCategories.length > 0
                                            ? seller.weakCategories.map(c => CATEGORY_NAMES[c] || c).join(', ')
                                            : (seller.status === 'completado' ? 'Ninguno' : '—')}
                                    </td>
                                    <td className="p-3 text-right space-x-2">
                                        {seller.attemptId && (
                                            <button
                                                onClick={() => handleOpenAttemptDetail(seller.attemptId)}
                                                className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-bold text-zinc-200 hover:bg-zinc-800 cursor-pointer"
                                            >
                                                🔍 Ver Examen
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleOpenSellerCard(seller.sellerId)}
                                            className="rounded-lg border border-red-600/30 bg-red-600/10 px-2.5 py-1 text-[11px] font-bold text-red-400 hover:bg-red-600/20 cursor-pointer"
                                        >
                                            Ficha Individual →
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ============================================================= */}
            {/* MODAL: FICHA INDIVIDUAL DEL VENDEDOR */}
            {/* ============================================================= */}
            {selectedSellerCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="relative w-full max-w-3xl rounded-2xl border border-zinc-800 bg-[#0e0e12] p-6 shadow-2xl space-y-6 my-8">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-crm-red">Ficha de Capacitación Comercial</span>
                                <h3 className="text-xl font-bold text-white">{selectedSellerCard.seller.name}</h3>
                                <p className="text-xs text-zinc-400">{selectedSellerCard.seller.email} · Rol: {selectedSellerCard.seller.role}</p>
                            </div>
                            <button
                                onClick={() => setSelectedSellerCard(null)}
                                className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Métricas clave */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                                <span className="text-[10px] font-bold uppercase text-zinc-500">Desafíos Realizados</span>
                                <p className="text-xl font-black text-white mt-0.5">{selectedSellerCard.metrics.totalChallenges}</p>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                                <span className="text-[10px] font-bold uppercase text-zinc-500">Promedio Calificaciones</span>
                                <p className="text-xl font-black text-emerald-400 mt-0.5">{selectedSellerCard.metrics.averageScore || '—'} / 100</p>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                                <span className="text-[10px] font-bold uppercase text-zinc-500">Participación</span>
                                <p className="text-xl font-black text-white mt-0.5">{selectedSellerCard.metrics.participationPercentage}%</p>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                                <span className="text-[10px] font-bold uppercase text-zinc-500">Último Examen</span>
                                <p className="text-xs font-bold text-zinc-300 mt-1 truncate">
                                    {selectedSellerCard.metrics.lastExamDate ? new Date(selectedSellerCard.metrics.lastExamDate).toLocaleDateString() : '—'}
                                </p>
                            </div>
                        </div>

                        {/* Desglose por categoría de conocimiento */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                                Desempeño por Categoría de Conocimiento:
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {selectedSellerCard.categoryPerformance.map(cat => (
                                    <div key={cat.category} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-semibold text-zinc-300">{CATEGORY_NAMES[cat.category] || cat.category}</span>
                                            <span className="font-mono font-bold text-white">{cat.score}%</span>
                                        </div>
                                        <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                                            <div
                                                className={`h-full ${cat.score >= 80 ? 'bg-emerald-500' : (cat.score >= 60 ? 'bg-amber-500' : 'bg-red-500')}`}
                                                style={{ width: `${cat.score}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Conceptos confundidos vs dominados */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-3.5 space-y-2">
                                <h5 className="text-[11px] font-bold uppercase text-red-400">⚠️ Conceptos con errores recurrentes</h5>
                                {selectedSellerCard.weakConcepts?.length > 0 ? (
                                    <ul className="text-xs space-y-1.5 text-zinc-300">
                                        {selectedSellerCard.weakConcepts.map(c => (
                                            <li key={c.conceptKey} className="flex justify-between">
                                                <span>{c.entityLabel}</span>
                                                <span className="text-red-400 font-bold">{c.errorCount} fallos</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-xs text-zinc-500">Sin debilidades críticas registradas.</p>
                                )}
                            </div>

                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-3.5 space-y-2">
                                <h5 className="text-[11px] font-bold uppercase text-emerald-400">✓ Conceptos dominados tras repaso</h5>
                                {selectedSellerCard.masteredConcepts?.length > 0 ? (
                                    <ul className="text-xs space-y-1.5 text-zinc-300">
                                        {selectedSellerCard.masteredConcepts.map(c => (
                                            <li key={c.conceptKey} className="flex justify-between">
                                                <span>{c.entityLabel}</span>
                                                <span className="text-emerald-400 font-bold">✓ Dominado</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-xs text-zinc-500">Aún en proceso de consolidación.</p>
                                )}
                            </div>
                        </div>

                        {/* Historial de exámenes */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Historial de Desafíos Realizados:</h4>
                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                {selectedSellerCard.history.map(att => (
                                    <div key={att.attemptId} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5 text-xs">
                                        <div>
                                            <span className="font-mono text-zinc-400">{att.challengeDate}</span>
                                            <span className="ml-2 text-zinc-300 font-semibold">{att.attemptType === 'official_daily' ? 'Oficial' : 'Repaso'}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-bold text-white">{att.score} / 100</span>
                                            <button
                                                onClick={() => { setSelectedSellerCard(null); handleOpenAttemptDetail(att.attemptId); }}
                                                className="text-xs text-red-400 hover:text-red-300 underline"
                                            >
                                                Abrir examen
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================= */}
            {/* MODAL: REVISIÓN PREGUNTA POR PREGUNTA (CON INVALIDACIÓN) */}
            {/* ============================================================= */}
            {selectedAttemptDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="relative w-full max-w-3xl rounded-2xl border border-zinc-800 bg-[#0e0e12] p-6 shadow-2xl space-y-6 my-8">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-crm-red">Revisión de Examen Completado</span>
                                <h3 className="text-xl font-bold text-white">{selectedAttemptDetail.sellerName} · {selectedAttemptDetail.challengeDate}</h3>
                                <p className="text-xs text-zinc-400">
                                    Calificación: <strong className="text-white">{selectedAttemptDetail.score} / 100</strong> · Correctas: {selectedAttemptDetail.correctCount} de {selectedAttemptDetail.totalQuestions}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedAttemptDetail(null)}
                                className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                            {selectedAttemptDetail.questions?.map(q => (
                                <div
                                    key={q.questionId}
                                    className={`rounded-xl border p-4 ${
                                        q.isInvalidated
                                            ? 'border-amber-500/40 bg-amber-950/10'
                                            : (q.isCorrect ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-red-500/30 bg-red-950/10')
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono font-bold text-zinc-400">#{q.index}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                                                {CATEGORY_NAMES[q.category] || q.category}
                                            </span>
                                            {q.isInvalidated && (
                                                <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                                    ⚠️ Pregunta Invalidada por Dirección
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-xs font-bold ${q.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {q.isCorrect ? `✓ Correcto (+${q.scoreAwarded} pts)` : '✗ Incorrecto (0 pts)'}
                                        </span>
                                    </div>

                                    <p className="mt-2 text-sm font-semibold text-white">{q.questionText}</p>

                                    {/* Fotografía si existió */}
                                    {q.imageUrl && (
                                        <div className="mt-2 max-w-xs rounded-lg overflow-hidden border border-zinc-800">
                                            <img src={q.imageUrl} alt="Fotografía evaluada" className="w-full object-cover" />
                                        </div>
                                    )}

                                    {/* Datos congelados del vehículo si aplica */}
                                    {q.carSnapshot && (
                                        <div className="mt-2 rounded-lg bg-black/40 p-2.5 text-[11px] text-zinc-400 font-mono">
                                            <span>Vehículo evaluado: {q.carSnapshot.brand} {q.carSnapshot.name} ({q.carSnapshot.year}) · Precio: {q.carSnapshot.currency} ${q.carSnapshot.price?.toLocaleString('es-AR')} · Km: {q.carSnapshot.km?.toLocaleString('es-AR')}</span>
                                        </div>
                                    )}

                                    {/* Respuesta seleccionada vs correcta */}
                                    <div className="mt-3 rounded-lg bg-black/50 p-3 text-xs space-y-1">
                                        <div>
                                            <span className="text-zinc-500">Respuesta del vendedor:</span>{' '}
                                            <span className={q.isCorrect ? 'text-emerald-300 font-semibold' : 'text-red-300'}>
                                                {q.selectedOptionText || q.numericResponse || q.textResponse || 'Sin respuesta'}
                                            </span>
                                        </div>
                                        {!q.isCorrect && (
                                            <div>
                                                <span className="text-zinc-500">Respuesta correcta:</span>{' '}
                                                <span className="text-emerald-400 font-semibold">
                                                    {q.correctOptionText || q.correctNumericValue || 'N/A'}
                                                </span>
                                            </div>
                                        )}
                                        <div className="text-zinc-400 pt-1 border-t border-zinc-800/80">
                                            <span className="text-zinc-500">Explicación oficial:</span> {q.explanation}
                                        </div>
                                        {q.isInvalidated && (
                                            <div className="text-amber-300 pt-1 text-[11px]">
                                                <span>Motivo de invalidación:</span> {q.invalidationReason} (por {q.invalidatedBy})
                                            </div>
                                        )}
                                    </div>

                                    {/* Acción de invalidación si la pregunta tiene un defecto */}
                                    {!q.isInvalidated && (
                                        <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                                            {invalidatingQId === q.questionId ? (
                                                <div className="w-full flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={invalidateReason}
                                                        onChange={(e) => setInvalidateReason(e.target.value)}
                                                        placeholder="Motivo (ej: error tipográfico en opción, cambio de precio previo)"
                                                        className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white"
                                                    />
                                                    <button
                                                        onClick={() => handleInvalidateQuestion(selectedAttemptDetail.attemptId, q.questionId)}
                                                        className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
                                                    >
                                                        Confirmar
                                                    </button>
                                                    <button
                                                        onClick={() => setInvalidatingQId(null)}
                                                        className="text-xs text-zinc-400 hover:text-white"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => { setInvalidatingQId(q.questionId); setInvalidateReason(''); }}
                                                    className="text-[11px] font-semibold text-zinc-500 hover:text-amber-400 cursor-pointer"
                                                >
                                                    ⚠️ Invalidar pregunta defectuosa...
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================= */}
            {/* DRAWER: NOTIFICACIONES AUTOMÁTICAS DE ACADEMY */}
            {/* ============================================================= */}
            {showNotificationsDrawer && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
                    <div className="h-full w-full max-w-md border-l border-zinc-800 bg-[#0e0e12] p-6 shadow-2xl flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-base">🔔</span>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                                        Notificaciones de Capacitación
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowNotificationsDrawer(false)}
                                    className="rounded-lg p-1.5 text-zinc-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="mt-3 flex items-center justify-between text-xs text-zinc-400 pb-2">
                                <span>{notificationsData.unreadCount} pendientes de lectura</span>
                                {notificationsData.unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllNotificationsRead}
                                        className="text-red-400 hover:text-red-300 font-semibold"
                                    >
                                        Marcar todas como leídas
                                    </button>
                                )}
                            </div>

                            <div className="mt-4 space-y-2.5 max-h-[75vh] overflow-y-auto pr-1">
                                {notificationsData.notifications?.length > 0 ? (
                                    notificationsData.notifications.map(n => (
                                        <div
                                            key={n._id}
                                            onClick={() => {
                                                handleMarkNotificationRead(n._id);
                                                if (n.attemptId) {
                                                    setShowNotificationsDrawer(false);
                                                    handleOpenAttemptDetail(n.attemptId);
                                                }
                                            }}
                                            className={`rounded-xl border p-3.5 transition-all cursor-pointer ${
                                                !n.read
                                                    ? 'border-red-600/40 bg-red-950/10'
                                                    : 'border-zinc-800 bg-zinc-900/40'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-1 text-[11px]">
                                                <span className="font-bold text-white">{n.title}</span>
                                                <span className="text-zinc-500 font-mono">
                                                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs text-zinc-300">{n.message}</p>
                                            <span className="mt-2 inline-block text-[11px] font-bold text-red-400 hover:underline">
                                                Abrir examen →
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-xs text-zinc-500 py-8">
                                        No hay notificaciones recientes.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================= */}
            {/* MODAL: EVALUAR NUEVO INGRESO */}
            {/* ============================================================= */}
            {showIntakeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#0e0e12] p-6 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <h3 className="text-base font-bold text-white">🚗 Generar Mini-Examen de Nuevo Ingreso</h3>
                            <button onClick={() => setShowIntakeModal(false)} className="text-zinc-400 hover:text-white">✕</button>
                        </div>

                        <p className="text-xs text-zinc-400 leading-relaxed">
                            Crea un mini examen de 5 preguntas (versión, año, kilometraje, precio publicado y equipamiento) sobre una unidad recién ingresada para que el equipo memorice sus argumentos de venta.
                        </p>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-300">ID del Vehículo en Stock:</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={intakeCarId}
                                    onChange={(e) => setIntakeCarId(e.target.value)}
                                    placeholder="Pegá el ID del vehículo (ej: 6738...)"
                                    className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-mono text-white"
                                />
                                <button
                                    onClick={handleValidateIntakeCar}
                                    className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-700"
                                >
                                    Validar
                                </button>
                            </div>
                        </div>

                        {intakeValidation && (
                            <div className={`rounded-xl border p-3 text-xs ${intakeValidation.allowed ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300' : 'border-red-500/30 bg-red-950/20 text-red-300'}`}>
                                <p className="font-bold">{intakeValidation.message}</p>
                                {!intakeValidation.allowed && intakeValidation.missingFields?.length > 0 && (
                                    <p className="mt-1 text-[11px] text-red-400">
                                        Campos faltantes requeridos: {intakeValidation.missingFields.join(', ')}.
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setShowIntakeModal(false)}
                                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-zinc-800"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={!intakeValidation?.allowed || intakeGenerating}
                                onClick={handleGenerateIntakeChallenge}
                                className={`rounded-xl px-4 py-2 text-xs font-bold text-white ${
                                    !intakeValidation?.allowed || intakeGenerating
                                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                        : 'bg-red-600 hover:bg-red-700 cursor-pointer'
                                }`}
                            >
                                {intakeGenerating ? 'Generando...' : 'Generar y Asignar Examen'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
